//! WHAT THE NFT?! marketplace — fixed-price listings for the single WHAT THE NFT?! collection.
//!
//! List:   owner calls core `nft_approve(token_id, market, msg = {"price":"<yocto>"})`
//!         → core calls `nft_on_approve` here → listing stored (one per token).
//! Buy:    buyer calls `buy(token_id)` attaching ≥ price. The listing is removed FIRST (no double sale),
//!         then core `nft_transfer_payout` moves the NFT (and its whole token bag) and returns the exact
//!         royalty split (3%: 50% creator / 50% buyback treasury; rest to the seller). `on_bought` pays
//!         everyone and refunds any excess. If the transfer fails, the buyer gets everything back.
//! Delist / change price: listing owner only (1 yoctoNEAR, so a full-access key confirms it).
//! Stale listings (NFT moved, approval revoked by redeem/reload, …) can be removed by anyone.
//!
//! The market never holds user funds between transactions: every buy pays out in its own callback.

use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::store::IterableMap;
use near_sdk::{assert_one_yocto, env, ext_contract, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise, PromiseError};
use std::collections::HashMap;

pub type TokenId = String;

pub const EVENT_STANDARD: &str = "wtn-market";
pub const EVENT_VERSION: &str = "1.0.0";
/// Most recent sales kept on-chain for the Activity feed.
pub const RECENT_SALES: usize = 100;
pub const MAX_PAYOUT_LEN: u32 = 10;
/// 1,000,000 NEAR — guards against fat-finger listings.
pub const MAX_PRICE: u128 = 1_000_000 * 10u128.pow(24);

const G_TRANSFER_PAYOUT: Gas = Gas::from_tgas(60);
const G_ON_BOUGHT: Gas = Gas::from_tgas(30);
const G_VIEW: Gas = Gas::from_tgas(10);
const G_ON_STALE: Gas = Gas::from_tgas(10);

#[ext_contract(ext_nft)]
pub trait ExtNft {
    fn nft_transfer_payout(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>, balance: U128, max_len_payout: Option<u32>) -> Payout;
    fn nft_token(&self, token_id: TokenId) -> Option<TokenView>;
}

#[near(serializers = [json])]
pub struct Payout {
    pub payout: HashMap<AccountId, U128>,
}

/// The parts of a NEP-171 `Token` we need.
#[near(serializers = [json])]
pub struct TokenView {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub approved_account_ids: Option<HashMap<AccountId, u64>>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Listing {
    pub token_id: TokenId,
    pub owner_id: AccountId,
    pub approval_id: u64,
    pub price: U128,
    pub listed_ns: U64,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Sale {
    pub token_id: TokenId,
    pub seller: AccountId,
    pub buyer: AccountId,
    pub price: U128,
    pub sold_ns: U64,
}

#[near(serializers = [json])]
struct ListMsg {
    price: U128,
}

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Listings,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Market {
    pub owner: AccountId,
    /// The only NFT contract allowed to create listings (the WHAT THE NFT?! core contract).
    pub nft_contract: AccountId,
    listings: IterableMap<TokenId, Listing>,
    recent_sales: Vec<Sale>,
    pub sale_count: u64,
    pub total_volume: u128,
    pub paused: bool,
}

pub fn emit(event: &str, data: Value) {
    env::log_str(&format!("EVENT_JSON:{}", json!({ "standard": EVENT_STANDARD, "version": EVENT_VERSION, "event": event, "data": [data] })));
}

/// Pay out a sale: validated payout (sum ≤ price, ≤ MAX_PAYOUT_LEN entries, all non-zero) or, if the
/// NFT contract returned something invalid, the whole price to the seller.
pub fn settle(payout: Option<HashMap<AccountId, U128>>, seller: &AccountId, price: u128) -> Vec<(AccountId, u128)> {
    if let Some(p) = payout {
        let sum: u128 = p.values().map(|v| v.0).sum();
        if !p.is_empty() && p.len() as u32 <= MAX_PAYOUT_LEN && sum <= price {
            let mut out: Vec<(AccountId, u128)> = p.into_iter().filter(|(_, v)| v.0 > 0).map(|(k, v)| (k, v.0)).collect();
            // Any rounding remainder goes to the seller.
            if sum < price {
                match out.iter_mut().find(|(a, _)| a == seller) {
                    Some(e) => e.1 += price - sum,
                    None => out.push((seller.clone(), price - sum)),
                }
            }
            out.sort_by(|a, b| a.0.cmp(&b.0));
            return out;
        }
    }
    vec![(seller.clone(), price)]
}

#[near]
impl Market {
    #[init]
    pub fn new(owner: AccountId, nft_contract: AccountId) -> Self {
        Self { owner, nft_contract, listings: IterableMap::new(Key::Listings), recent_sales: Vec::new(), sale_count: 0, total_volume: 0, paused: false }
    }

    // ───────────── listing (NEP-178 receiver) ─────────────

    /// Called by the NFT contract when an owner approves this market with msg `{"price":"<yocto>"}`.
    pub fn nft_on_approve(&mut self, token_id: TokenId, owner_id: AccountId, approval_id: u64, msg: String) {
        require!(env::predecessor_account_id() == self.nft_contract, "only the WHAT THE NFT?! collection can list here");
        require!(!self.paused, "market paused");
        let m: ListMsg = serde_json::from_str(&msg).unwrap_or_else(|_| env::panic_str("msg must be {\"price\":\"<yoctoNEAR>\"}"));
        require!(m.price.0 > 0 && m.price.0 <= MAX_PRICE, "price out of range");
        let l = Listing { token_id: token_id.clone(), owner_id: owner_id.clone(), approval_id, price: m.price, listed_ns: U64(env::block_timestamp()) };
        self.listings.insert(token_id.clone(), l);
        emit("list", json!({ "token_id": token_id, "owner_id": owner_id, "price": m.price, "approval_id": approval_id }));
    }

    #[payable]
    pub fn update_price(&mut self, token_id: TokenId, price: U128) {
        assert_one_yocto();
        require!(price.0 > 0 && price.0 <= MAX_PRICE, "price out of range");
        let l = self.listings.get_mut(&token_id).unwrap_or_else(|| env::panic_str("not listed"));
        require!(env::predecessor_account_id() == l.owner_id, "only the seller can change the price");
        l.price = price;
        emit("price_updated", json!({ "token_id": token_id, "price": price }));
    }

    #[payable]
    pub fn delist(&mut self, token_id: TokenId) {
        assert_one_yocto();
        let l = self.listings.get(&token_id).cloned().unwrap_or_else(|| env::panic_str("not listed"));
        require!(env::predecessor_account_id() == l.owner_id || env::predecessor_account_id() == self.owner, "only the seller can delist");
        self.listings.remove(&token_id);
        emit("delist", json!({ "token_id": token_id, "owner_id": l.owner_id }));
    }

    // ───────────── buying ─────────────

    /// Buy a listed NFT. Attach at least the price (excess is refunded) and ~150 Tgas.
    #[payable]
    pub fn buy(&mut self, token_id: TokenId) -> Promise {
        require!(!self.paused, "market paused");
        let l = self.listings.get(&token_id).cloned().unwrap_or_else(|| env::panic_str("not listed"));
        let buyer = env::predecessor_account_id();
        require!(buyer != l.owner_id, "you can't buy your own listing");
        let deposit = env::attached_deposit().as_yoctonear();
        require!(deposit >= l.price.0, "attached deposit is below the price");
        // Remove first: a second buyer in the same block can never get the same NFT.
        self.listings.remove(&token_id);
        emit("buy_started", json!({ "token_id": token_id, "buyer": buyer, "price": l.price }));
        ext_nft::ext(self.nft_contract.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(G_TRANSFER_PAYOUT)
            .nft_transfer_payout(buyer.clone(), token_id, Some(l.approval_id), Some("WHAT THE NFT?! market sale".into()), l.price, Some(MAX_PAYOUT_LEN))
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_BOUGHT).on_bought(l, buyer, U128(deposit)))
    }

    #[private]
    pub fn on_bought(&mut self, listing: Listing, buyer: AccountId, deposit: U128, #[callback_result] payout: Result<Payout, PromiseError>) -> bool {
        let Ok(payout) = payout else {
            // NFT did not move (sold elsewhere, approval revoked, mid-redemption…): refund in full.
            Promise::new(buyer.clone()).transfer(NearToken::from_yoctonear(deposit.0)).detach();
            emit("buy_failed", json!({ "token_id": listing.token_id, "buyer": buyer, "refunded": deposit }));
            return false;
        };
        let price = listing.price.0;
        let paid = settle(Some(payout.payout), &listing.owner_id, price);
        for (acc, amt) in &paid {
            Promise::new(acc.clone()).transfer(NearToken::from_yoctonear(*amt)).detach();
        }
        if deposit.0 > price {
            Promise::new(buyer.clone()).transfer(NearToken::from_yoctonear(deposit.0 - price)).detach();
        }
        let sale = Sale { token_id: listing.token_id.clone(), seller: listing.owner_id.clone(), buyer: buyer.clone(), price: listing.price, sold_ns: U64(env::block_timestamp()) };
        self.recent_sales.push(sale);
        if self.recent_sales.len() > RECENT_SALES {
            self.recent_sales.remove(0);
        }
        self.sale_count += 1;
        self.total_volume += price;
        emit(
            "sale",
            json!({ "token_id": listing.token_id, "seller": listing.owner_id, "buyer": buyer, "price": listing.price,
                    "payouts": paid.iter().map(|(a, v)| json!({ "account_id": a, "amount": U128(*v) })).collect::<Vec<_>>() }),
        );
        true
    }

    // ───────────── housekeeping ─────────────

    /// Anyone may clear a listing whose NFT changed owner or whose approval is gone.
    pub fn remove_stale(&mut self, token_id: TokenId) -> Promise {
        require!(self.listings.get(&token_id).is_some(), "not listed");
        ext_nft::ext(self.nft_contract.clone())
            .with_static_gas(G_VIEW)
            .nft_token(token_id.clone())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_STALE).on_stale_checked(token_id))
    }

    #[private]
    pub fn on_stale_checked(&mut self, token_id: TokenId, #[callback_result] token: Result<Option<TokenView>, PromiseError>) -> bool {
        let Some(l) = self.listings.get(&token_id).cloned() else {
            return false;
        };
        let stale = match token {
            Ok(None) => true,
            Ok(Some(t)) => t.owner_id != l.owner_id || t.approved_account_ids.and_then(|m| m.get(&env::current_account_id()).copied()) != Some(l.approval_id),
            Err(_) => false,
        };
        if stale {
            self.listings.remove(&token_id);
            emit("delist", json!({ "token_id": token_id, "owner_id": l.owner_id, "reason": "stale" }));
        }
        stale
    }

    pub fn set_paused(&mut self, paused: bool) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
        self.paused = paused;
        emit("paused", json!({ "paused": paused }));
    }

    pub fn set_owner(&mut self, owner: AccountId) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
        self.owner = owner;
    }

    // ───────────── views ─────────────

    pub fn get_listing(&self, token_id: TokenId) -> Option<Listing> {
        self.listings.get(&token_id).cloned()
    }

    pub fn get_listings(&self, from_index: Option<u32>, limit: Option<u32>) -> Vec<Listing> {
        let from = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(100).min(200) as usize;
        self.listings.values().skip(from).take(limit).cloned().collect()
    }

    pub fn get_listings_by_owner(&self, owner_id: AccountId) -> Vec<Listing> {
        self.listings.values().filter(|l| l.owner_id == owner_id).cloned().collect()
    }

    /// Newest first.
    pub fn get_recent_sales(&self, limit: Option<u32>) -> Vec<Sale> {
        let n = limit.unwrap_or(50).min(RECENT_SALES as u32) as usize;
        self.recent_sales.iter().rev().take(n).cloned().collect()
    }

    pub fn get_stats(&self) -> Value {
        let floor = self.listings.values().map(|l| l.price.0).min();
        let top = self.recent_sales.iter().map(|s| s.price.0).max();
        json!({
            "listed": self.listings.len(), "sale_count": self.sale_count, "total_volume": U128(self.total_volume),
            "floor": floor.map(U128), "top_recent_sale": top.map(U128), "paused": self.paused, "nft_contract": self.nft_contract,
        })
    }
}

#[cfg(test)]
mod tests;

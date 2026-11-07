//! WHAT THE NFT?! core contract: NEP-171 collection + season registry + mint orchestrator +
//! per-NFT basket vault ledger, in ONE contract so NFT ownership and basket claims can never
//! diverge across contract boundaries.
//!
//! Custody rules enforced here (see docs/THREAT_MODEL.md):
//! * Fungible tokens leave the vault ONLY via (a) redemption signed by the CURRENT NFT owner
//!   after unlock, (b) swaps into season-whitelisted Rhea pools with on-chain-quoted min_out,
//!   (c) recovery unwinds whose proceeds can only go to the order payer.
//! * There is no admin method that withdraws backed balances, seizes NFTs, edits minted
//!   traits/composition, or blocks redemption.
//! * `accounted[token]` is the sum of every claim on `token`; actual balance >= accounted is
//!   the conservation invariant (checked off-chain by the reconciler, on-chain by
//!   `check_conservation`).

use near_contract_standards::non_fungible_token::metadata::{NFTContractMetadata, NFT_METADATA_SPEC};
use near_contract_standards::non_fungible_token::NonFungibleToken;
use near_sdk::borsh::BorshSerialize;
use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::{json, Value};
use near_sdk::store::{LookupMap, LookupSet};
use near_sdk::{env, near, require, AccountId, BorshStorageKey, NearToken, PanicOnDefault, Promise};

pub mod ext;
pub mod nft;
pub mod order;
pub mod traits;
pub mod types;
pub mod vault;

#[cfg(test)]
mod tests;

pub use types::*;

#[near]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    NftOwner,
    NftMetadata,
    NftEnumeration,
    NftApproval,
    Seasons,
    Orders,
    TokenInfo,
    Accounted,
    Busy,
    Operators,
    Registered,
    RoutePaused,
}

pub const EVENT_STANDARD: &str = "wtn";
pub const EVENT_VERSION: &str = "1.0.0";
pub const MAX_LEG_ATTEMPTS: u8 = 3;

pub fn emit(event: &str, data: Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({ "standard": EVENT_STANDARD, "version": EVENT_VERSION, "event": event, "data": [data] })
    ));
}

pub fn sha256_arr(data: &[u8]) -> [u8; 32] {
    env::sha256_array(data)
}

pub fn to_hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{:02x}", x)).collect()
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub owner: AccountId,
    pub pending_owner: Option<AccountId>,
    pub operators: LookupSet<AccountId>,
    pub creator_account: AccountId,
    pub treasury_account: AccountId,
    pub wrap_near: AccountId,
    pub rhea_v2: AccountId,
    pub rhea_dcl: AccountId,
    pub mints_paused: bool,
    pub route_paused: LookupSet<AccountId>,
    pub seasons: LookupMap<u32, Season>,
    pub season_count: u32,
    pub orders: LookupMap<u64, Order>,
    pub next_order_id: u64,
    pub next_token_id: u64,
    pub tokens: NonFungibleToken,
    pub token_info: LookupMap<String, TokenInfo>,
    /// Total claims per FT contract (holdings + pending redemptions + in-flight orders).
    pub accounted: LookupMap<AccountId, u128>,
    /// wNEAR held for orders that have wrapped but not yet swapped.
    pub wnear_accounted: u128,
    /// Per-token swap mutex so balance deltas are attributable to exactly one leg.
    pub busy: LookupSet<AccountId>,
    /// Forward legs currently inside wNEAR ft_transfer_call (unwind must wait for 0).
    pub wnear_ops_in_flight: u32,
    /// Set while an unwind measures wNEAR balance deltas; blocks new forward legs.
    pub wnear_measuring: bool,
    /// FT contracts on which this vault has a storage registration.
    pub registered: LookupSet<AccountId>,
    pub metadata: NFTContractMetadata,
}

#[near]
impl Contract {
    #[init]
    pub fn new(
        owner: AccountId,
        creator_account: AccountId,
        treasury_account: AccountId,
        wrap_near: AccountId,
        rhea_v2: AccountId,
        rhea_dcl: AccountId,
    ) -> Self {
        let metadata = NFTContractMetadata {
            spec: NFT_METADATA_SPEC.to_string(),
            name: "WHAT THE NFT?!".to_string(),
            symbol: "WTNFT".to_string(),
            icon: None,
            base_uri: None,
            reference: None,
            reference_hash: None,
        };
        Self {
            tokens: NonFungibleToken::new(
                StorageKey::NftOwner,
                env::current_account_id(),
                Some(StorageKey::NftMetadata),
                Some(StorageKey::NftEnumeration),
                Some(StorageKey::NftApproval),
            ),
            owner,
            pending_owner: None,
            operators: LookupSet::new(StorageKey::Operators),
            creator_account,
            treasury_account,
            wrap_near,
            rhea_v2,
            rhea_dcl,
            mints_paused: false,
            route_paused: LookupSet::new(StorageKey::RoutePaused),
            seasons: LookupMap::new(StorageKey::Seasons),
            season_count: 0,
            orders: LookupMap::new(StorageKey::Orders),
            next_order_id: 1,
            next_token_id: 1,
            token_info: LookupMap::new(StorageKey::TokenInfo),
            accounted: LookupMap::new(StorageKey::Accounted),
            wnear_accounted: 0,
            busy: LookupSet::new(StorageKey::Busy),
            wnear_ops_in_flight: 0,
            wnear_measuring: false,
            registered: LookupSet::new(StorageKey::Registered),
            metadata,
        }
    }

    // ───────────────────────── roles ─────────────────────────

    pub(crate) fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "Only owner");
    }

    pub(crate) fn assert_operator(&self) {
        let p = env::predecessor_account_id();
        require!(p == self.owner || self.operators.contains(&p), "Only operator");
    }

    /// Two-step ownership transfer (owner should be a multisig / DAO account).
    pub fn propose_owner(&mut self, new_owner: AccountId) {
        self.assert_owner();
        self.pending_owner = Some(new_owner.clone());
        emit("owner_proposed", json!({ "new_owner": new_owner }));
    }

    pub fn accept_owner(&mut self) {
        let p = env::predecessor_account_id();
        require!(self.pending_owner.as_ref() == Some(&p), "Not the proposed owner");
        self.owner = p.clone();
        self.pending_owner = None;
        emit("owner_changed", json!({ "owner": p }));
    }

    pub fn set_operator(&mut self, account_id: AccountId, enabled: bool) {
        self.assert_owner();
        if enabled {
            self.operators.insert(account_id.clone());
        } else {
            self.operators.remove(&account_id);
        }
        emit("operator_set", json!({ "account_id": account_id, "enabled": enabled }));
    }

    /// Affects only FUTURE fee payouts. Never touches backed baskets.
    pub fn set_revenue_accounts(&mut self, creator_account: AccountId, treasury_account: AccountId) {
        self.assert_owner();
        self.creator_account = creator_account.clone();
        self.treasury_account = treasury_account.clone();
        emit("revenue_accounts_set", json!({ "creator": creator_account, "treasury": treasury_account }));
    }

    /// Circuit breaker for NEW mints only. In-flight orders, transfers and redemptions continue.
    pub fn set_mints_paused(&mut self, paused: bool) {
        self.assert_operator();
        self.mints_paused = paused;
        emit("mints_paused", json!({ "paused": paused }));
    }

    /// Circuit breaker for a token's swap route. Pending legs on that token wait; if they
    /// cannot complete, the order follows the documented failure policy.
    pub fn set_route_paused(&mut self, token: AccountId, paused: bool) {
        self.assert_operator();
        if paused {
            self.route_paused.insert(token.clone());
        } else {
            self.route_paused.remove(&token);
        }
        emit("route_paused", json!({ "token": token, "paused": paused }));
    }

    /// Register this vault's storage on FT contracts (paid from contract balance).
    pub fn register_tokens(&mut self, tokens: Vec<AccountId>, deposit_each: U128) -> Promise {
        self.assert_operator();
        require!(!tokens.is_empty() && tokens.len() <= 10, "1..10 tokens");
        require!(deposit_each.0 <= NearToken::from_millinear(100).as_yoctonear(), "deposit too large");
        let mut p: Option<Promise> = None;
        for t in tokens {
            let call = ext::ext_ft::ext(t.clone())
                .with_attached_deposit(NearToken::from_yoctonear(deposit_each.0))
                .with_static_gas(ext::G_STORAGE_DEPOSIT)
                .storage_deposit(Some(env::current_account_id()), Some(true))
                .then(Self::ext(env::current_account_id()).with_static_gas(ext::G_CALLBACK_SMALL).on_registered(t));
            p = Some(match p {
                None => call,
                Some(prev) => prev.and(call),
            });
        }
        p.unwrap()
    }

    #[private]
    pub fn on_registered(&mut self, token: AccountId, #[callback_result] r: Result<Value, near_sdk::PromiseError>) -> bool {
        let ok = r.is_ok();
        if ok {
            self.registered.insert(token.clone());
        }
        emit("token_registered", json!({ "token": token, "ok": ok }));
        ok
    }

    // ───────────────────────── seasons ─────────────────────────

    pub fn create_season(&mut self, config: SeasonConfig) -> u32 {
        self.assert_operator();
        validate_season(&config, &self.wrap_near);
        self.season_count += 1;
        let id = self.season_count;
        let s = Season {
            id,
            current_min_base: config.min_base_floor,
            config,
            status: SeasonStatus::Draft,
            minted: 0,
            in_flight: 0,
            opened_at_ns: None,
            config_hash: None,
        };
        self.seasons.insert(id, s);
        emit("season_created", json!({ "season_id": id }));
        id
    }

    /// Only drafts can be edited. Once open, the config is frozen forever.
    pub fn update_season(&mut self, season_id: u32, config: SeasonConfig) {
        self.assert_operator();
        validate_season(&config, &self.wrap_near);
        let s = self.seasons.get_mut(&season_id).expect("Unknown season");
        require!(s.status == SeasonStatus::Draft, "Season config is immutable once opened");
        s.current_min_base = config.min_base_floor;
        s.config = config;
        emit("season_updated", json!({ "season_id": season_id }));
    }

    pub fn open_season(&mut self, season_id: u32) {
        self.assert_operator();
        let wrap = self.wrap_near.clone();
        let registered_all = {
            let s = self.seasons.get(&season_id).expect("Unknown season");
            self.registered.contains(&wrap) && s.config.memes.iter().all(|m| self.registered.contains(&m.token))
        };
        require!(registered_all, "Vault must be storage-registered on wNEAR and every season token");
        let s = self.seasons.get_mut(&season_id).expect("Unknown season");
        require!(s.status == SeasonStatus::Draft, "Season not in draft");
        require!(env::block_timestamp() < s.config.mint_end_ns.0, "Mint window already over");
        let mut buf = vec![];
        s.config.serialize(&mut buf).unwrap();
        let hash = to_hex(&env::sha256_array(&buf));
        s.status = SeasonStatus::Open;
        s.opened_at_ns = Some(U64(env::block_timestamp()));
        s.config_hash = Some(hash.clone());
        emit("season_opened", json!({ "season_id": season_id, "config_hash": hash, "manifest_hash": s.config.manifest_hash }));
    }

    pub fn close_season(&mut self, season_id: u32) {
        self.assert_operator();
        let s = self.seasons.get_mut(&season_id).expect("Unknown season");
        require!(s.status == SeasonStatus::Open, "Season not open");
        s.status = SeasonStatus::Closed;
        emit("season_closed", json!({ "season_id": season_id, "minted": s.minted }));
    }

    /// Live executable minimum (from the off-chain quote engine), bounded by the frozen
    /// [min_base_floor, max_base] range published in the manifest.
    pub fn set_current_min_base(&mut self, season_id: u32, min_base: U128) {
        self.assert_operator();
        let s = self.seasons.get_mut(&season_id).expect("Unknown season");
        require!(min_base.0 >= s.config.min_base_floor.0 && min_base.0 <= s.config.max_base.0, "Outside frozen bounds");
        s.current_min_base = min_base;
        emit("min_base_set", json!({ "season_id": season_id, "min_base": min_base }));
    }

    // ───────────────────────── views ─────────────────────────

    pub fn get_season(&self, season_id: u32) -> Option<Season> {
        self.seasons.get(&season_id).cloned()
    }

    pub fn get_seasons(&self) -> Vec<Season> {
        (1..=self.season_count).filter_map(|i| self.seasons.get(&i).cloned()).collect()
    }

    pub fn get_order(&self, order_id: U64) -> Option<Order> {
        self.orders.get(&order_id.0).cloned()
    }

    pub fn get_orders(&self, from_id: U64, limit: u32) -> Vec<Order> {
        let limit = limit.min(50) as u64;
        (from_id.0..self.next_order_id).take(limit as usize).filter_map(|i| self.orders.get(&i).cloned()).collect()
    }

    pub fn get_accounted(&self, token: AccountId) -> U128 {
        U128(if token == self.wrap_near { self.wnear_accounted } else { *self.accounted.get(&token).unwrap_or(&0) })
    }

    pub fn get_config(&self) -> Value {
        json!({
            "owner": self.owner,
            "creator_account": self.creator_account,
            "treasury_account": self.treasury_account,
            "wrap_near": self.wrap_near,
            "rhea_v2": self.rhea_v2,
            "rhea_dcl": self.rhea_dcl,
            "mints_paused": self.mints_paused,
            "season_count": self.season_count,
            "next_order_id": U64(self.next_order_id),
            "next_token_id": U64(self.next_token_id),
            "wnear_ops_in_flight": self.wnear_ops_in_flight,
            "wnear_measuring": self.wnear_measuring,
            "storage_byte_cost": U128(env::storage_byte_cost().as_yoctonear()),
        })
    }

    pub fn is_operator(&self, account_id: AccountId) -> bool {
        account_id == self.owner || self.operators.contains(&account_id)
    }

    pub fn is_registered(&self, token: AccountId) -> bool {
        self.registered.contains(&token)
    }

    pub fn is_route_paused(&self, token: AccountId) -> bool {
        self.route_paused.contains(&token)
    }
}

pub fn validate_season(c: &SeasonConfig, wrap_near: &AccountId) {
    require!(!c.name.is_empty() && c.name.len() <= 60, "name 1..60 chars");
    require!(c.mint_end_ns.0 > c.mint_start_ns.0, "mint window invalid");
    require!(c.max_supply > 0 && c.max_supply <= 100_000, "max_supply 1..100000");
    require!(c.min_base_floor.0 > 0 && c.min_base_floor.0 <= c.max_base.0, "base bounds invalid");
    require!(c.target_base.0 > 0, "target_base must be > 0");
    require!(c.lock_ns.0 <= 366 * 24 * 3600 * 1_000_000_000, "lock too long");
    require!(c.fees.basket_bps as u32 + c.fees.creator_bps as u32 + c.fees.treasury_bps as u32 == 10_000, "fees must sum to 10000");
    require!(c.fees.basket_bps >= 5_000, "basket share below 50% not allowed");
    require!(c.royalty.royalty_bps <= 1_000 && c.royalty.creator_share_bps <= 10_000, "royalty out of range");
    require!(c.allocation.core_wth_bps <= 10_000, "core_wth_bps out of range");
    require!(c.allocation.slot_weights_bps.iter().map(|x| *x as u32).sum::<u32>() == 10_000, "slot weights must sum to 10000");
    require!(c.rarity_bps.iter().map(|x| *x as u32).sum::<u32>() == 10_000, "rarity must sum to 10000");
    require!(c.wth_slot_bps <= 10_000, "wth_slot_bps out of range");
    require!(!c.memes.is_empty() && c.memes.len() <= 16, "1..16 memes");
    require!(c.memes[0].slot_variants.iter().all(|v| *v >= 1), "memes[0] must be WTH with art for every slot");
    require!(!c.tiers.is_empty(), "tiers required");
    for w in c.tiers.windows(2) {
        require!(w[0].min_base.0 < w[1].min_base.0, "tiers must be sorted ascending");
    }
    require!(c.tiers.iter().all(|t| t.max_partners <= 5), "max_partners <= 5");
    for (i, m) in c.memes.iter().enumerate() {
        require!(&m.token != wrap_near, "wNEAR cannot be a basket meme");
        require!(m.max_slippage_bps >= 1 && m.max_slippage_bps <= 1_000, "slippage 1..1000 bps");
        require!(!m.meme_id.is_empty() && m.meme_id.len() <= 32, "meme_id 1..32");
        require!(!m.route.pool_id.is_empty(), "pool_id required");
        if m.route.kind == RouteKind::RheaV2 {
            require!(m.route.pool_id.parse::<u64>().is_ok(), "v2 pool_id must be numeric");
        }
        for o in c.memes.iter().skip(i + 1) {
            require!(o.token != m.token, "duplicate token contract in season");
            require!(o.meme_id != m.meme_id, "duplicate meme_id in season");
        }
    }
    require!(c.manifest_hash.len() == 64 && c.manifest_hash.chars().all(|ch| ch.is_ascii_hexdigit()), "manifest_hash must be 64 hex chars");
    require!(!c.media_base_uri.is_empty(), "media_base_uri required");
    require!(c.reserve.advance_fee.0 <= c.reserve.retry_reserve.0, "advance_fee above retry_reserve");
}

//! NEP-171 core, NEP-177 metadata, NEP-178 approvals, NEP-181 enumeration, NEP-199 payouts.
//! Transfers are allowed while LOCKED (the whole basket claim follows the NFT) but blocked
//! while a redemption or reload is in flight, so a card can never change hands mid-settlement.

use crate::vault::effective_state;
use crate::*;
use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApproval;
use near_contract_standards::non_fungible_token::core::{NonFungibleTokenCore, NonFungibleTokenResolver};
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_contract_standards::non_fungible_token::metadata::NonFungibleTokenMetadataProvider;
use near_contract_standards::non_fungible_token::{Token, TokenId};
use near_sdk::{assert_one_yocto, PromiseOrValue};
use std::collections::HashMap;

#[near(serializers = [json])]
pub struct Payout {
    pub payout: HashMap<AccountId, U128>,
}

impl Contract {
    pub(crate) fn assert_transferable(&self, token_id: &TokenId) {
        let info = self.info(token_id);
        let st = effective_state(&info, env::block_timestamp());
        require!(st != BackingState::Redeeming && st != BackingState::Reloading, "Token is mid redemption/reload and cannot move right now");
    }

    /// Royalty split for a completed sale of `balance`. creator = floor(floor(balance*r)*c),
    /// treasury = royalty - creator, owner = balance - royalty. Sums to `balance` exactly.
    pub(crate) fn compute_payout(&self, token_id: &TokenId, owner: &AccountId, balance: u128, max_len: Option<u32>) -> Payout {
        let info = self.info(token_id);
        let r = &self.seasons.get(&info.season_id).expect("season").config.royalty;
        let royalty = balance * r.royalty_bps as u128 / BPS;
        let creator = royalty * r.creator_share_bps as u128 / BPS;
        let treasury = royalty - creator;
        let mut m: HashMap<AccountId, u128> = HashMap::new();
        for (acc, amt) in [(self.creator_account.clone(), creator), (self.treasury_account.clone(), treasury), (owner.clone(), balance - royalty)] {
            if amt > 0 {
                *m.entry(acc).or_insert(0) += amt;
            }
        }
        if let Some(max) = max_len {
            require!(m.len() as u32 <= max, "Payout exceeds max_len_payout");
        }
        Payout { payout: m.into_iter().map(|(k, v)| (k, U128(v))).collect() }
    }
}

#[near]
impl NonFungibleTokenCore for Contract {
    #[payable]
    fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>) {
        self.assert_transferable(&token_id);
        self.tokens.nft_transfer(receiver_id, token_id, approval_id, memo)
    }

    #[payable]
    fn nft_transfer_call(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>, msg: String) -> PromiseOrValue<bool> {
        self.assert_transferable(&token_id);
        self.tokens.nft_transfer_call(receiver_id, token_id, approval_id, memo, msg)
    }

    fn nft_token(&self, token_id: TokenId) -> Option<Token> {
        self.tokens.nft_token(token_id)
    }
}

#[near]
impl NonFungibleTokenResolver for Contract {
    #[private]
    fn nft_resolve_transfer(&mut self, previous_owner_id: AccountId, receiver_id: AccountId, token_id: TokenId, approved_account_ids: Option<HashMap<AccountId, u64>>) -> bool {
        self.tokens.nft_resolve_transfer(previous_owner_id, receiver_id, token_id, approved_account_ids)
    }
}

#[near]
impl NonFungibleTokenApproval for Contract {
    #[payable]
    fn nft_approve(&mut self, token_id: TokenId, account_id: AccountId, msg: Option<String>) -> Option<Promise> {
        self.assert_transferable(&token_id);
        self.tokens.nft_approve(token_id, account_id, msg)
    }

    #[payable]
    fn nft_revoke(&mut self, token_id: TokenId, account_id: AccountId) {
        self.tokens.nft_revoke(token_id, account_id)
    }

    #[payable]
    fn nft_revoke_all(&mut self, token_id: TokenId) {
        self.tokens.nft_revoke_all(token_id)
    }

    fn nft_is_approved(&self, token_id: TokenId, approved_account_id: AccountId, approval_id: Option<u64>) -> bool {
        self.tokens.nft_is_approved(token_id, approved_account_id, approval_id)
    }
}

#[near]
impl NonFungibleTokenEnumeration for Contract {
    fn nft_total_supply(&self) -> U128 {
        self.tokens.nft_total_supply()
    }
    fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens(from_index, limit)
    }
    fn nft_supply_for_owner(&self, account_id: AccountId) -> U128 {
        self.tokens.nft_supply_for_owner(account_id)
    }
    fn nft_tokens_for_owner(&self, account_id: AccountId, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
        self.tokens.nft_tokens_for_owner(account_id, from_index, limit)
    }
}

#[near]
impl NonFungibleTokenMetadataProvider for Contract {
    fn nft_metadata(&self) -> near_contract_standards::non_fungible_token::metadata::NFTContractMetadata {
        self.metadata.clone()
    }
}

#[near]
impl Contract {
    /// NEP-199 view.
    pub fn nft_payout(&self, token_id: TokenId, balance: U128, max_len_payout: Option<u32>) -> Payout {
        let owner = self.tokens.owner_by_id.get(&token_id).expect("Unknown token");
        self.compute_payout(&token_id, &owner, balance.0, max_len_payout)
    }

    /// NEP-199 transfer + payout. Called by an approved marketplace; the payout is computed
    /// for the owner BEFORE transfer. Blocked mid-redemption; approvals are revoked by
    /// redeem/reload so a stale listing cannot complete against an emptied card.
    #[payable]
    pub fn nft_transfer_payout(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>, balance: U128, max_len_payout: Option<u32>) -> Payout {
        assert_one_yocto();
        self.assert_transferable(&token_id);
        let owner = self.tokens.owner_by_id.get(&token_id).expect("Unknown token");
        let payout = self.compute_payout(&token_id, &owner, balance.0, max_len_payout);
        self.tokens.nft_transfer(receiver_id, token_id, approval_id, memo);
        payout
    }
}

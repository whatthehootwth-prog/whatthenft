//! Basket vault: redemption by the CURRENT owner after unlock, reload of the same
//! composition, recovery unwind, anomaly reconcile, conservation check, media pinning.

use crate::ext::*;
use crate::order::reload_legs;
use crate::*;
use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
use near_sdk::json_types::Base64VecU8;
use near_sdk::serde_json;
use near_sdk::{assert_one_yocto, PromiseError, PromiseOrValue};

pub fn effective_state(info: &TokenInfo, now: u64) -> BackingState {
    match info.state {
        BackingState::FullyBackedLocked if now >= info.lock_until_ns.0 => BackingState::Unlocked,
        ref s => s.clone(),
    }
}

impl Contract {
    pub(crate) fn info(&self, token_id: &String) -> TokenInfo {
        self.token_info.get(token_id).cloned().unwrap_or_else(|| env::panic_str("Unknown token"))
    }

    pub(crate) fn revoke_all_approvals(&mut self, token_id: &String) {
        if let Some(a) = self.tokens.approvals_by_id.as_mut() {
            a.remove(token_id);
        }
    }

    pub(crate) fn token_view(&self, token_id: &String) -> Option<TokenView> {
        let info = self.token_info.get(token_id)?.clone();
        Some(TokenView {
            token_id: token_id.clone(),
            owner_id: self.tokens.owner_by_id.get(token_id),
            effective_state: effective_state(&info, env::block_timestamp()),
            info,
        })
    }

    fn needs_unwind(l: &Leg) -> bool {
        l.spent && l.acquired.0 > 0 && l.status != LegStatus::Unwound
    }
}

#[near]
impl Contract {
    // ───────────── redemption ─────────────

    /// Redeem the exact underlying token amounts to `receiver_id` (default: owner).
    /// Only the current owner, only after unlock, 1 yocto (full-access key) required.
    /// Revokes every marketplace approval first so a stale listing can never sell an
    /// emptied card. Receiver must be storage-registered on each FT (UI checks this).
    #[payable]
    pub fn redeem(&mut self, token_id: String, receiver_id: Option<AccountId>, tokens: Option<Vec<AccountId>>) {
        assert_one_yocto();
        let owner = self.tokens.owner_by_id.get(&token_id).expect("Unknown token");
        require!(env::predecessor_account_id() == owner, "Only the current NFT owner can redeem");
        let mut info = self.info(&token_id);
        let now = env::block_timestamp();
        require!(effective_state(&info, now) == BackingState::Unlocked, "Token is not unlocked (locked, redeeming, reloading or empty)");
        let receiver = receiver_id.unwrap_or(owner.clone());
        let mut selected: Vec<(AccountId, u128)> = vec![];
        for h in info.holdings.iter_mut() {
            let wanted = tokens.as_ref().map(|t| t.contains(&h.token)).unwrap_or(true);
            if wanted && h.amount.0 > 0 {
                selected.push((h.token.clone(), h.amount.0));
                h.pending_out = U128(h.pending_out.0 + h.amount.0);
                h.amount = U128(0);
            }
        }
        require!(!selected.is_empty(), "Nothing to redeem");
        info.state = BackingState::Redeeming;
        self.token_info.insert(token_id.clone(), info);
        self.revoke_all_approvals(&token_id);
        let me = env::current_account_id();
        // One detached transfer→callback chain per token: the NEAR runtime forbids returning a joint
        // promise, and each `on_redeem_transfer` settles its own token (success or rollback).
        for (t, amt) in selected.iter() {
            ext_ft::ext(t.clone())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(G_FT_TRANSFER)
                .ft_transfer(receiver.clone(), U128(*amt), Some(format!("WHAT THE NFT?! redeem #{}", token_id)))
                .then(Self::ext(me.clone()).with_static_gas(G_REDEEM_CB).on_redeem_transfer(token_id.clone(), t.clone(), U128(*amt), receiver.clone()))
                .detach();
        }
        let sel: Vec<_> = selected.iter().map(|(t, a)| json!({ "token": t, "amount": U128(*a) })).collect();
        emit("redeem_started", json!({ "token_id": token_id, "owner": owner, "receiver": receiver, "holdings": sel }));
    }

    #[private]
    pub fn on_redeem_transfer(&mut self, token_id: String, token: AccountId, amount: U128, receiver: AccountId, #[callback_result] r: Result<(), PromiseError>) -> bool {
        let mut info = self.info(&token_id);
        let ok = r.is_ok();
        {
            let h = info.holdings.iter_mut().find(|h| h.token == token).expect("holding");
            h.pending_out = U128(h.pending_out.0.checked_sub(amount.0).expect("pending underflow"));
            if !ok {
                h.amount = U128(h.amount.0 + amount.0);
            }
        }
        if ok {
            self.sub_accounted(&token, amount.0);
            emit("redeemed", json!({ "token_id": token_id, "token": token, "amount": amount, "receiver": receiver }));
        } else {
            emit("redeem_failed", json!({ "token_id": token_id, "token": token, "amount": amount, "receiver": receiver, "reason": "ft_transfer failed (receiver not registered on token?)" }));
        }
        if info.holdings.iter().all(|h| h.pending_out.0 == 0) {
            info.state = if info.holdings.iter().all(|h| h.amount.0 == 0) { BackingState::RedeemedEmpty } else { BackingState::Unlocked };
            if info.state == BackingState::RedeemedEmpty {
                emit("token_emptied", json!({ "token_id": token_id }));
            }
        }
        self.token_info.insert(token_id, info);
        ok
    }

    // ───────────── reload ─────────────

    /// Re-fund an EMPTY card with its ORIGINAL composition at current prices in an open
    /// season that allows reloads. No new randomness, no new rarity, new 30-day lock.
    #[payable]
    pub fn reload(&mut self, token_id: String, season_id: u32, base: U128) -> U64 {
        require!(!self.mints_paused, "Minting/reloading is paused");
        require!(env::prepaid_gas() >= near_sdk::Gas::from_tgas(100), "Attach at least 100 Tgas");
        let owner = self.tokens.owner_by_id.get(&token_id).expect("Unknown token");
        let payer = env::predecessor_account_id();
        require!(payer == owner, "Only the current NFT owner");
        let mut info = self.info(&token_id);
        require!(info.state == BackingState::RedeemedEmpty, "Only EMPTY cards can be reloaded");
        let s = self.seasons.get(&season_id).cloned().expect("Unknown season");
        let now = env::block_timestamp();
        require!(s.status == SeasonStatus::Open && s.config.reload_enabled, "Season does not accept reloads");
        require!(now >= s.config.mint_start_ns.0 && now < s.config.mint_end_ns.0, "Outside mint window");
        require!(base.0 >= s.current_min_base.0 && base.0 <= s.config.max_base.0, "Base outside executable range");
        for h in info.holdings.iter() {
            require!(!self.route_paused.contains(&h.token), format!("Route for {} is paused; reload disabled", h.token));
        }
        let retry = s.config.reserve.retry_reserve.0;
        let required = base.0 + retry;
        let attached = env::attached_deposit().as_yoctonear();
        require!(attached >= required, format!("Attach {} yoctoNEAR (base + refundable retry reserve)", required));
        let (basket, creator, treasury) = crate::order::split_mint(base.0, &s.config.fees);
        let legs = reload_legs(&info.holdings, &s.config, basket);
        require!(legs.iter().all(|l| l.amount_in.0 >= s.config.min_leg.0), "A reload leg would be below the minimum leg size");
        info.state = BackingState::Reloading;
        self.token_info.insert(token_id.clone(), info.clone());
        self.revoke_all_approvals(&token_id);
        let id = self.next_order_id;
        self.next_order_id += 1;
        let o = Order {
            id: U64(id),
            kind: OrderKind::Reload { token_id: token_id.clone() },
            payer: payer.clone(),
            season_id,
            base,
            basket: U128(basket),
            creator_fee: U128(creator),
            treasury_fee: U128(treasury),
            storage_fee: U128(0),
            retry_reserve: U128(retry),
            keeper_fees_paid: U128(0),
            status: OrderStatus::TraitsAssigned,
            created_ns: U64(now),
            updated_ns: U64(now),
            request_block: U64(env::block_height()),
            reveal: Some(info.reveal.clone()),
            traits: Some(info.traits.clone()),
            legs,
            wrapped: false,
            token_id: Some(token_id.clone()),
            refunded: U128(0),
            note: None,
        };
        self.orders.insert(id, o);
        emit("reload_escrowed", json!({ "order_id": U64(id), "token_id": token_id, "payer": payer, "base": base, "basket": U128(basket) }));
        if attached > required {
            Promise::new(payer).transfer(NearToken::from_yoctonear(attached - required)).detach();
        }
        if let Some(p) = self.internal_wrap(id) {
            p.detach();
        }
        U64(id)
    }

    // ───────────── recovery ─────────────

    /// Unwind one executed leg of a recovery-state order back to wNEAR (on-chain quoted
    /// min_out). When nothing remains to unwind, the payer is refunded what was actually
    /// recovered plus unspent wNEAR, fees and unused reserve. Payer or operator only;
    /// proceeds can only ever go to the payer.
    pub fn unwind_order(&mut self, order_id: U64) -> PromiseOrValue<bool> {
        let id = order_id.0;
        let mut o = self.order(id);
        let caller = env::predecessor_account_id();
        require!(caller == o.payer || self.is_operator(caller), "Only payer or operator");
        require!(o.status == OrderStatus::PartialExecutionRecovery, "Not in recovery");
        let idx = match o.legs.iter().position(Self::needs_unwind) {
            Some(i) => i,
            None => return match self.internal_refund(id) {
                Some(p) => PromiseOrValue::Promise(p),
                None => PromiseOrValue::Value(true),
            },
        };
        let l = o.legs[idx].clone();
        require!(!self.busy.contains(&l.token), "Token busy (anomaly pending reconcile or another swap); retry later");
        require!(self.wnear_ops_in_flight == 0 && !self.wnear_measuring, "wNEAR operations in flight; retry shortly");
        let cfg = self.seasons.get(&o.season_id).unwrap().config.clone();
        let meme = cfg.memes.iter().find(|m| m.token == l.token).unwrap().clone();
        self.busy.insert(l.token.clone());
        self.wnear_measuring = true;
        o.legs[idx].status = LegStatus::Unwinding;
        self.save_order(o);
        let me = env::current_account_id();
        let bal = ext_ft::ext(self.wrap_near.clone()).with_static_gas(G_VIEW).ft_balance_of(me.clone());
        let quote = match meme.route.kind {
            RouteKind::RheaDcl => ext_rhea_dcl::ext(self.rhea_dcl.clone()).with_static_gas(G_QUOTE).quote(vec![meme.route.pool_id.clone()], l.token.clone(), self.wrap_near.clone(), l.acquired, None),
            RouteKind::RheaV2 => ext_rhea_v2::ext(self.rhea_v2.clone()).with_static_gas(G_QUOTE).get_return(meme.route.pool_id.parse().unwrap(), l.token.clone(), l.acquired, self.wrap_near.clone()),
        };
        PromiseOrValue::Promise(bal.and(quote).then(Self::ext(me).with_static_gas(G_ON_LEG_PREPARED).on_unwind_prepared(order_id, idx as u8)))
    }

    #[private]
    pub fn on_unwind_prepared(&mut self, order_id: U64, leg: u8) -> PromiseOrValue<bool> {
        let idx = leg as usize;
        let mut o = self.order(order_id.0);
        let l = o.legs[idx].clone();
        let before = env::promise_result_checked(0, 128).ok().and_then(|v| serde_json::from_slice::<U128>(&v).ok());
        let quote = env::promise_result_checked(1, 512).ok().and_then(|v| crate::order::parse_quote(&v));
        let cfg = self.seasons.get(&o.season_id).unwrap().config.clone();
        let meme = cfg.memes.iter().find(|m| m.token == l.token).unwrap().clone();
        // The DEX only receives `acquired` minus the token's transfer fee, so size min_out on that.
        let quote = quote.map(|q| min_received(&l.token, q));
        let (before, min_out) = match (before, quote) {
            (Some(b), Some(q)) if q * (BPS - meme.max_slippage_bps as u128) / BPS > 0 => (b.0, q * (BPS - meme.max_slippage_bps as u128) / BPS),
            _ => {
                self.busy.remove(&l.token);
                self.wnear_measuring = false;
                o.legs[idx].status = LegStatus::Done;
                o.legs[idx].last_error = Some("unwind quote unavailable".into());
                self.save_order(o);
                return PromiseOrValue::Value(false);
            }
        };
        o.legs[idx].min_out = U128(min_out);
        self.save_order(o);
        let (dex, msg) = match meme.route.kind {
            RouteKind::RheaDcl => (self.rhea_dcl.clone(), json!({ "Swap": { "pool_ids": [meme.route.pool_id], "output_token": self.wrap_near, "min_output_amount": U128(min_out), "client_id": "" } })),
            RouteKind::RheaV2 => (
                self.rhea_v2.clone(),
                json!({ "force": 0, "actions": [{ "pool_id": meme.route.pool_id.parse::<u64>().unwrap(), "token_in": l.token, "token_out": self.wrap_near, "amount_in": l.acquired, "min_amount_out": U128(min_out) }] }),
            ),
        };
        PromiseOrValue::Promise(
            ext_ft::ext(l.token.clone())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(G_FT_TRANSFER_CALL)
                .ft_transfer_call(dex, l.acquired, Some(format!("wtn unwind order {} leg {}", order_id.0, idx)), msg.to_string())
                .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_LEG_SWAPPED).on_unwind_swapped(order_id, leg, U128(before))),
        )
    }

    #[private]
    pub fn on_unwind_swapped(&mut self, order_id: U64, leg: u8, before: U128, #[callback_result] used: Result<U128, PromiseError>) -> Promise {
        ext_ft::ext(self.wrap_near.clone())
            .with_static_gas(G_VIEW)
            .ft_balance_of(env::current_account_id())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_LEG_VERIFIED).on_unwind_verified(order_id, leg, before, used.ok()))
    }

    #[private]
    pub fn on_unwind_verified(&mut self, order_id: U64, leg: u8, before: U128, used: Option<U128>, #[callback_result] after: Result<U128, PromiseError>) -> bool {
        let idx = leg as usize;
        let mut o = self.order(order_id.0);
        let l = o.legs[idx].clone();
        self.wnear_measuring = false;
        let after = after.ok().map(|a| a.0);
        let ok = match (used.map(|u| u.0), after) {
            (Some(u), Some(a)) if u == l.acquired.0 && a >= before.0.saturating_add(l.min_out.0) => {
                let out = a - before.0;
                self.sub_accounted(&l.token, l.acquired.0);
                self.wnear_accounted += out;
                o.legs[idx].unwind_out = U128(out);
                o.legs[idx].status = LegStatus::Unwound;
                self.busy.remove(&l.token);
                emit("leg_unwound", json!({ "order_id": order_id, "leg": idx, "token": l.token, "sold": l.acquired, "wnear_out": U128(out), "original_wnear_in": l.amount_in }));
                true
            }
            (Some(0), _) => {
                o.legs[idx].status = LegStatus::Done;
                o.legs[idx].last_error = Some("unwind swap rejected; retry".into());
                self.busy.remove(&l.token);
                false
            }
            (u, a) => {
                let delta = a.map(|a| a.saturating_sub(before.0)).unwrap_or(0);
                let sold = u.unwrap_or(l.acquired.0).min(l.acquired.0);
                self.sub_accounted(&l.token, sold);
                self.wnear_accounted += delta;
                o.legs[idx].acquired = U128(l.acquired.0 - sold);
                o.legs[idx].unwind_out = U128(l.unwind_out.0 + delta);
                o.legs[idx].status = if o.legs[idx].acquired.0 == 0 { LegStatus::Unwound } else { LegStatus::Failed };
                o.legs[idx].last_error = Some(format!("unwind anomaly: used={:?} delta={}", u, delta));
                emit("execution_anomaly", json!({ "order_id": order_id, "leg": idx, "phase": "unwind", "used": u.map(U128), "delta": U128(delta) }));
                // token mutex is kept until operator reconcile
                false
            }
        };
        self.save_order(o);
        ok
    }

    /// Operator tool for a leg frozen only because the token took its transfer fee: if what
    /// arrived covers the DEX-guaranteed min_out minus the token's fee tolerance, mark the leg
    /// done and let the order continue. Moves no funds; a larger shortfall stays frozen.
    pub fn accept_fee_shortfall(&mut self, order_id: U64, leg: u8) -> bool {
        self.assert_operator();
        let id = order_id.0;
        let idx = leg as usize;
        let mut o = self.order(id);
        let l = o.legs.get(idx).cloned().expect("leg");
        require!(o.status == OrderStatus::PartialExecutionRecovery && l.spent && l.status == LegStatus::Failed, "Leg is not in anomaly state");
        require!(crate::transfer_fee_bps(&l.token) > 0, "No transfer fee set for this token (set_transfer_fees first)");
        require!(l.min_out.0 > 0 && l.acquired.0 > 0 && l.acquired.0 >= crate::min_received(&l.token, l.min_out.0), "Shortfall is larger than the token's transfer fee");
        o.legs[idx].status = LegStatus::Done;
        o.legs[idx].last_error = None;
        self.busy.remove(&l.token);
        emit("fee_shortfall_accepted", json!({ "order_id": order_id, "leg": idx, "token": l.token, "acquired": l.acquired, "min_out": l.min_out }));
        let all_done = o.legs.iter().all(|x| x.status == LegStatus::Done);
        let pending_others = o.legs.iter().any(|x| x.status == LegStatus::Pending || (x.status == LegStatus::Failed && !x.spent));
        if all_done || pending_others {
            o.status = OrderStatus::SwapsPending;
            o.note = None;
        }
        self.save_order(o);
        if all_done {
            self.internal_finalize(id);
        }
        true
    }

    /// Operator tool for an execution anomaly: attribute the vault's UNCLAIMED surplus of
    /// the leg's token (balance - accounted) to that leg. It can only add to an order's
    /// claim, never move funds out, so it cannot be used to steal.
    pub fn reconcile_anomaly(&mut self, order_id: U64, leg: u8) -> Promise {
        self.assert_operator();
        let o = self.order(order_id.0);
        let l = o.legs.get(leg as usize).cloned().expect("leg");
        require!(o.status == OrderStatus::PartialExecutionRecovery && l.spent && l.status == LegStatus::Failed, "Leg is not in anomaly state");
        require!(self.busy.contains(&l.token), "Token mutex not held by an anomaly");
        ext_ft::ext(l.token.clone())
            .with_static_gas(G_VIEW)
            .ft_balance_of(env::current_account_id())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_CALLBACK_SMALL).on_reconcile(order_id, leg))
    }

    #[private]
    pub fn on_reconcile(&mut self, order_id: U64, leg: u8, #[callback_result] bal: Result<U128, PromiseError>) -> bool {
        let bal = match bal {
            Ok(b) => b.0,
            Err(_) => return false,
        };
        let idx = leg as usize;
        let mut o = self.order(order_id.0);
        let token = o.legs[idx].token.clone();
        let accounted = *self.accounted.get(&token).unwrap_or(&0);
        let surplus = bal.saturating_sub(accounted);
        if surplus > 0 {
            self.add_accounted_pub(&token, surplus);
            o.legs[idx].acquired = U128(o.legs[idx].acquired.0 + surplus);
        }
        self.busy.remove(&token);
        if o.legs[idx].min_out.0 > 0 && o.legs[idx].acquired.0 >= o.legs[idx].min_out.0 {
            o.legs[idx].status = LegStatus::Done;
            o.legs[idx].last_error = None;
        }
        emit("anomaly_reconciled", json!({ "order_id": order_id, "leg": idx, "token": token, "credited": U128(surplus), "acquired": o.legs[idx].acquired }));
        let all_done = o.legs.iter().all(|l| l.status == LegStatus::Done);
        let pending_others = o.legs.iter().any(|l| l.status == LegStatus::Pending || (l.status == LegStatus::Failed && !l.spent));
        if all_done || (o.legs[idx].status == LegStatus::Done && pending_others) {
            o.status = OrderStatus::SwapsPending;
        }
        self.save_order(o);
        if all_done {
            self.internal_finalize(order_id.0);
        }
        true
    }

    /// Permissionless read of the conservation invariant for one token; emits an event.
    pub fn check_conservation(&mut self, token: AccountId) -> Promise {
        ext_ft::ext(token.clone())
            .with_static_gas(G_VIEW)
            .ft_balance_of(env::current_account_id())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_CALLBACK_SMALL).on_conservation(token))
    }

    #[private]
    pub fn on_conservation(&mut self, token: AccountId, #[callback_result] bal: Result<U128, PromiseError>) -> bool {
        let accounted = if token == self.wrap_near { self.wnear_accounted } else { *self.accounted.get(&token).unwrap_or(&0) };
        match bal {
            Ok(b) => {
                let ok = b.0 >= accounted;
                emit(if ok { "conservation_ok" } else { "conservation_violation" }, json!({ "token": token, "balance": b, "accounted": U128(accounted) }));
                ok
            }
            Err(_) => {
                emit("conservation_unknown", json!({ "token": token }));
                false
            }
        }
    }

    /// Pin the deterministic render once. Immutable afterwards.
    pub fn set_token_media(&mut self, token_id: String, media_uri: String, media_sha256_b64: Base64VecU8) {
        self.assert_operator();
        let mut info = self.info(&token_id);
        require!(info.media_cid.is_none(), "Media already pinned (immutable)");
        require!(media_uri.starts_with("ipfs://") || media_uri.starts_with("ar://"), "Media must be content-addressed (ipfs:// or ar://)");
        require!(media_sha256_b64.0.len() == 32, "media hash must be a sha256");
        let mds = self.tokens.token_metadata_by_id.as_mut().expect("metadata ext");
        let mut md: TokenMetadata = mds.get(&token_id).expect("metadata");
        md.media = Some(media_uri.clone());
        md.media_hash = Some(media_sha256_b64.clone());
        mds.insert(&token_id, &md);
        info.media_cid = Some(media_uri.clone());
        self.token_info.insert(token_id.clone(), info);
        emit("media_pinned", json!({ "token_id": token_id, "media": media_uri, "media_hash": media_sha256_b64 }));
    }

    // ───────────── views ─────────────

    pub fn nft_basket(&self, token_id: String) -> Option<TokenView> {
        self.token_view(&token_id)
    }

    pub fn get_tokens(&self, from_index: u64, limit: u64) -> Vec<TokenView> {
        let limit = limit.min(50);
        (from_index.max(1)..self.next_token_id).take(limit as usize).filter_map(|i| self.token_view(&i.to_string())).collect()
    }

    pub fn get_tokens_for_owner(&self, account_id: AccountId) -> Vec<TokenView> {
        let ids: Vec<String> = match self.tokens.tokens_per_owner.as_ref().and_then(|m| m.get(&account_id)) {
            Some(set) => set.iter().take(200).collect(),
            None => vec![],
        };
        ids.iter().filter_map(|i| self.token_view(i)).collect()
    }
}

impl Contract {
    pub(crate) fn add_accounted_pub(&mut self, token: &AccountId, delta: u128) {
        let cur = *self.accounted.get(token).unwrap_or(&0);
        self.accounted.insert(token.clone(), cur.checked_add(delta).expect("accounted overflow"));
    }
}

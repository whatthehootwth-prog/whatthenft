//! Mint / reload order pipeline.
//!
//! mint() ──► on_reveal (later block, env::random_seed) ──► near_deposit (wrap) ──► per leg:
//!   [ft_balance_of(vault) ∧ on-chain quote] ──► ft_transfer_call(wNEAR → Rhea, min_out)
//!   ──► ft_balance_of(vault) ──► credit verified delta ──► … ──► finalize: mint NFT, pay fees.
//!
//! Every step persists state first and can be resumed by anyone via `advance_order`, with no
//! caller-chosen parameters. Failure handling follows docs/FAILURE_POLICY.md.

use crate::ext::*;
use crate::traits::{derive_seed, derive_traits, leg_amounts, TRAITS_DOMAIN};
use crate::*;
use near_contract_standards::non_fungible_token::events::NftMint;
use near_contract_standards::non_fungible_token::metadata::TokenMetadata;
use near_sdk::serde_json;
use near_sdk::{Gas, PromiseError, PromiseOrValue};

pub fn split_mint(base: u128, f: &MintFees) -> (u128, u128, u128) {
    let creator = base * f.creator_bps as u128 / BPS;
    let treasury = base * f.treasury_bps as u128 / BPS;
    (base - creator - treasury, creator, treasury)
}

fn one_yocto() -> NearToken {
    NearToken::from_yoctonear(1)
}

fn gas_left() -> Gas {
    env::prepaid_gas().saturating_sub(env::used_gas())
}

fn opt(p: Option<Promise>) -> PromiseOrValue<bool> {
    match p {
        Some(p) => PromiseOrValue::Promise(p),
        None => PromiseOrValue::Value(false),
    }
}

/// Parse a Rhea quote: v2 returns "123" (U128 string); DCL returns {"amount":"123",...}.
pub fn parse_quote(raw: &[u8]) -> Option<u128> {
    if let Ok(u) = serde_json::from_slice::<U128>(raw) {
        return Some(u.0);
    }
    let v: serde_json::Value = serde_json::from_slice(raw).ok()?;
    v.get("amount")?.as_str()?.parse::<u128>().ok()
}

impl Contract {
    pub(crate) fn order(&self, id: u64) -> Order {
        self.orders.get(&id).cloned().unwrap_or_else(|| env::panic_str("Unknown order"))
    }

    pub(crate) fn save_order(&mut self, mut o: Order) {
        o.updated_ns = U64(env::block_timestamp());
        self.orders.insert(o.id.0, o);
    }

    fn season_cfg(&self, id: u32) -> SeasonConfig {
        self.seasons.get(&id).expect("Unknown season").config.clone()
    }

    fn max_partners_for(cfg: &SeasonConfig, base: u128) -> u8 {
        cfg.tiers.iter().filter(|t| base >= t.min_base.0).map(|t| t.max_partners).last().unwrap_or(0)
    }

    fn add_accounted(&mut self, token: &AccountId, delta: u128) {
        let cur = *self.accounted.get(token).unwrap_or(&0);
        self.accounted.insert(token.clone(), cur.checked_add(delta).expect("accounted overflow"));
    }

    pub(crate) fn sub_accounted(&mut self, token: &AccountId, delta: u128) {
        let cur = *self.accounted.get(token).unwrap_or(&0);
        self.accounted.insert(token.clone(), cur.checked_sub(delta).expect("accounted underflow"));
    }

    fn sub_wnear(&mut self, v: u128) {
        self.wnear_accounted = self.wnear_accounted.checked_sub(v).expect("wnear underflow");
    }

    // ───────────── steps ─────────────

    pub(crate) fn internal_reveal(&mut self, id: u64) -> Option<Promise> {
        let mut o = self.order(id);
        if o.status != OrderStatus::Escrowed {
            return None;
        }
        if env::block_height() <= o.request_block.0 {
            // Never reveal in the request block: the seed must be unknown when the user commits.
            return Some(Self::ext(env::current_account_id()).with_static_gas(G_ON_REVEAL).on_reveal(o.id));
        }
        let rs = env::random_seed_array();
        let seed = derive_seed(sha256_arr, &rs, id);
        let cfg = self.season_cfg(o.season_id);
        let max_partners = Self::max_partners_for(&cfg, o.base.0);
        let derived = derive_traits(sha256_arr, seed, &cfg, max_partners, o.basket.0);
        o.legs = derived
            .legs
            .iter()
            .map(|(m, bps, amt)| Leg {
                meme_idx: *m,
                token: cfg.memes[*m as usize].token.clone(),
                bps: *bps,
                amount_in: U128(*amt),
                acquired: U128(0),
                min_out: U128(0),
                attempts: 0,
                status: LegStatus::Pending,
                last_error: None,
                unwind_out: U128(0),
                spent: false,
            })
            .collect();
        o.reveal = Some(RevealProof {
            block_height: U64(env::block_height()),
            random_seed_hex: to_hex(&rs),
            seed_hex: to_hex(&seed),
            version: String::from_utf8(TRAITS_DOMAIN.to_vec()).unwrap(),
        });
        o.traits = Some(derived.traits.clone());
        o.status = OrderStatus::TraitsAssigned;
        let legs_json: Vec<_> = o.legs.iter().map(|l| json!({ "token": l.token, "bps": l.bps, "amount_in": l.amount_in })).collect();
        emit(
            "traits_assigned",
            json!({ "order_id": o.id, "rarity": RARITY_NAMES[derived.traits.rarity as usize], "attempt": derived.traits.attempt,
                    "slots": derived.traits.slots, "legs": legs_json, "random_seed": to_hex(&rs), "block_height": U64(env::block_height()) }),
        );
        self.save_order(o);
        if gas_left() >= G_WRAP.saturating_add(G_ON_WRAPPED) {
            self.internal_wrap(id)
        } else {
            None
        }
    }

    pub(crate) fn internal_wrap(&mut self, id: u64) -> Option<Promise> {
        let o = self.order(id);
        if o.status != OrderStatus::TraitsAssigned || o.wrapped {
            return None;
        }
        Some(
            ext_wrap::ext(self.wrap_near.clone())
                .with_attached_deposit(NearToken::from_yoctonear(o.basket.0))
                .with_static_gas(G_WRAP)
                .near_deposit()
                .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_WRAPPED).on_wrapped(o.id)),
        )
    }

    pub(crate) fn internal_advance(&mut self, id: u64) -> Option<Promise> {
        let o = self.order(id);
        match o.status {
            OrderStatus::Escrowed => self.internal_reveal(id),
            OrderStatus::TraitsAssigned => self.internal_wrap(id),
            OrderStatus::SwapsPending => {
                if o.legs.iter().all(|l| l.status == LegStatus::Done) {
                    self.internal_finalize(id);
                    return None;
                }
                let next = o.legs.iter().position(|l| l.status == LegStatus::Pending || (l.status == LegStatus::Failed && !l.spent && l.attempts < MAX_LEG_ATTEMPTS));
                match next {
                    Some(idx) => self.internal_execute_leg(id, idx),
                    None => None,
                }
            }
            _ => None,
        }
    }

    fn internal_execute_leg(&mut self, id: u64, idx: usize) -> Option<Promise> {
        let mut o = self.order(id);
        let leg = o.legs[idx].clone();
        if self.busy.contains(&leg.token) || self.wnear_measuring || self.route_paused.contains(&leg.token) {
            return None;
        }
        let cfg = self.season_cfg(o.season_id);
        let meme = cfg.memes.iter().find(|m| m.token == leg.token).expect("leg token not in season").clone();
        self.busy.insert(leg.token.clone());
        self.wnear_ops_in_flight += 1;
        o.legs[idx].status = LegStatus::InFlight;
        o.legs[idx].attempts += 1;
        self.save_order(o);
        let me = env::current_account_id();
        let balance = ext_ft::ext(leg.token.clone()).with_static_gas(G_VIEW).ft_balance_of(me.clone());
        let quote = match meme.route.kind {
            RouteKind::RheaDcl => ext_rhea_dcl::ext(self.rhea_dcl.clone()).with_static_gas(G_QUOTE).quote(
                vec![meme.route.pool_id.clone()],
                self.wrap_near.clone(),
                leg.token.clone(),
                leg.amount_in,
                None,
            ),
            RouteKind::RheaV2 => ext_rhea_v2::ext(self.rhea_v2.clone()).with_static_gas(G_QUOTE).get_return(
                meme.route.pool_id.parse().unwrap(),
                self.wrap_near.clone(),
                leg.amount_in,
                leg.token.clone(),
            ),
        };
        Some(balance.and(quote).then(Self::ext(me).with_static_gas(G_ON_LEG_PREPARED).on_leg_prepared(U64(id), idx as u8)))
    }

    /// A leg attempt failed without spending wNEAR.
    fn leg_attempt_failed(&mut self, id: u64, idx: usize, reason: String) {
        let mut o = self.order(id);
        o.legs[idx].status = LegStatus::Failed;
        o.legs[idx].last_error = Some(reason.clone());
        let exhausted = o.legs[idx].attempts >= MAX_LEG_ATTEMPTS;
        let token = o.legs[idx].token.clone();
        emit("leg_failed", json!({ "order_id": o.id, "leg": idx, "token": token, "attempt": o.legs[idx].attempts, "reason": reason }));
        if exhausted {
            if o.legs.iter().any(|l| l.spent) {
                o.status = OrderStatus::PartialExecutionRecovery;
                o.note = Some("A required swap failed after other legs executed; recovery required".into());
                emit("order_partial_recovery", json!({ "order_id": o.id }));
                self.save_order(o);
            } else {
                o.status = OrderStatus::FailedPreExecution;
                o.note = Some(format!("Swap route failed before any execution: {}", reason));
                self.save_order(o);
                self.internal_refund(id);
            }
        } else {
            self.save_order(o);
        }
    }

    pub(crate) fn internal_finalize(&mut self, id: u64) {
        let mut o = self.order(id);
        require!(o.status == OrderStatus::SwapsPending, "not swapping");
        require!(o.legs.iter().all(|l| l.status == LegStatus::Done && l.acquired.0 > 0), "legs incomplete");
        let now = env::block_timestamp();
        let storage_before = env::storage_usage();
        let season = self.seasons.get(&o.season_id).cloned().expect("season");
        let cfg = &season.config;
        let holdings: Vec<Holding> = o
            .legs
            .iter()
            .map(|l| Holding {
                meme_id: cfg.memes.iter().find(|m| m.token == l.token).map(|m| m.meme_id.clone()).unwrap_or_default(),
                token: l.token.clone(),
                bps: l.bps,
                amount: l.acquired,
                pending_out: U128(0),
            })
            .collect();
        let lock_until = now + cfg.lock_ns.0;
        let token_id: String;
        match o.kind.clone() {
            OrderKind::Mint => {
                token_id = self.next_token_id.to_string();
                self.next_token_id += 1;
                let serial = season.minted + 1;
                let traits = o.traits.clone().expect("traits");
                let mut meme_ids: Vec<String> = vec![];
                for s in traits.slots.iter() {
                    let id = cfg.memes[s.meme_idx as usize].meme_id.clone();
                    if !meme_ids.contains(&id) {
                        meme_ids.push(id);
                    }
                }
                let info = TokenInfo {
                    season_id: o.season_id,
                    serial,
                    traits: traits.clone(),
                    meme_ids,
                    holdings,
                    state: BackingState::FullyBackedLocked,
                    funded_at_ns: U64(now),
                    lock_until_ns: U64(lock_until),
                    origin_order_id: o.id,
                    reload_count: 0,
                    season_manifest_hash: cfg.manifest_hash.clone(),
                    reveal: o.reveal.clone().expect("reveal"),
                    media_cid: None,
                };
                let metadata = TokenMetadata {
                    title: Some(format!("{} #{}", cfg.name, serial)),
                    description: Some("WHAT THE NFT?! collectible. Owns a separately held basket of real meme tokens; see nft_basket on this contract.".into()),
                    issued_at: Some((now / 1_000_000).to_string()),
                    extra: Some(json!({ "season": o.season_id, "serial": serial, "rarity": RARITY_NAMES[traits.rarity as usize] }).to_string()),
                    ..Default::default()
                };
                self.tokens.internal_mint_with_refund(token_id.clone(), o.payer.clone(), Some(metadata), None);
                NftMint { owner_id: &o.payer, token_ids: &[&token_id], memo: None }.emit();
                self.token_info.insert(token_id.clone(), info);
                let s = self.seasons.get_mut(&o.season_id).unwrap();
                s.minted += 1;
                s.in_flight -= 1;
            }
            OrderKind::Reload { token_id: tid } => {
                token_id = tid.clone();
                let mut info = self.token_info.get(&tid).cloned().expect("token");
                require!(info.state == BackingState::Reloading, "token not reloading");
                info.holdings = holdings;
                info.state = BackingState::FullyBackedLocked;
                info.funded_at_ns = U64(now);
                info.lock_until_ns = U64(lock_until);
                info.reload_count += 1;
                self.token_info.insert(tid, info);
            }
        }
        o.status = OrderStatus::FullyBackedLocked;
        o.token_id = Some(token_id.clone());
        let storage_used = env::storage_usage().saturating_sub(storage_before);
        let refund = o.retry_reserve.0.saturating_sub(o.keeper_fees_paid.0);
        if o.creator_fee.0 > 0 {
            Promise::new(self.creator_account.clone()).transfer(NearToken::from_yoctonear(o.creator_fee.0)).detach();
        }
        if o.treasury_fee.0 > 0 {
            Promise::new(self.treasury_account.clone()).transfer(NearToken::from_yoctonear(o.treasury_fee.0)).detach();
        }
        if refund > 0 {
            Promise::new(o.payer.clone()).transfer(NearToken::from_yoctonear(refund)).detach();
        }
        o.refunded = U128(refund);
        let legs_json: Vec<_> = o
            .legs
            .iter()
            .map(|l| json!({ "token": l.token, "bps": l.bps, "amount_in": l.amount_in, "acquired": l.acquired, "min_out": l.min_out, "attempts": l.attempts }))
            .collect();
        emit(
            "mint_settled",
            json!({ "order_id": o.id, "token_id": token_id, "owner": o.payer, "kind": if matches!(o.kind, OrderKind::Mint) { "mint" } else { "reload" },
                    "base": o.base, "basket": o.basket, "creator_fee": o.creator_fee, "treasury_fee": o.treasury_fee,
                    "creator_account": self.creator_account, "treasury_account": self.treasury_account,
                    "storage_fee": o.storage_fee, "storage_bytes_used": storage_used, "keeper_fees_paid": o.keeper_fees_paid,
                    "reserve_refunded": U128(refund), "lock_until_ns": U64(lock_until), "legs": legs_json }),
        );
        self.save_order(o);
    }

    /// Refund an order that failed before ANY swap executed. Full base + storage fee +
    /// unused retry reserve go back to the payer (keeper fees already paid are not refundable).
    ///
    /// Also used after a recovery unwind: then the refunded wNEAR is whatever the unwind
    /// actually recovered (market losses are realized and recorded, never hidden).
    pub(crate) fn internal_refund(&mut self, id: u64) -> Option<Promise> {
        let mut o = self.order(id);
        let all_clear = o.legs.iter().all(|l| !l.spent || l.status == LegStatus::Unwound);
        require!(
            matches!(o.status, OrderStatus::FailedPreExecution | OrderStatus::PartialExecutionRecovery) && all_clear,
            "not refundable: executed legs must be unwound first"
        );
        let wnear: u128 = if o.wrapped {
            if o.legs.is_empty() {
                o.basket.0
            } else {
                o.legs.iter().map(|l| if l.spent { l.unwind_out.0 } else { l.amount_in.0 }).sum()
            }
        } else {
            0
        };
        let near_part = (if o.wrapped { 0 } else { o.basket.0 }) + (o.base.0 - o.basket.0) + o.storage_fee.0 + o.retry_reserve.0.saturating_sub(o.keeper_fees_paid.0);
        let total = near_part + wnear;
        o.status = OrderStatus::RefundPending;
        let payer = o.payer.clone();
        let wrapped = o.wrapped;
        self.save_order(o);
        if wrapped && wnear > 0 {
            self.sub_wnear(wnear);
            Some(
                ext_wrap::ext(self.wrap_near.clone())
                    .with_attached_deposit(one_yocto())
                    .with_static_gas(G_WRAP)
                    .near_withdraw(U128(wnear))
                    .then(Self::ext(env::current_account_id()).with_static_gas(G_REFUND).on_unwrapped_refund(U64(id), U128(total), U128(wnear))),
            )
        } else {
            self.complete_refund(id, total, payer);
            None
        }
    }

    fn complete_refund(&mut self, id: u64, total: u128, payer: AccountId) {
        let mut o = self.order(id);
        Promise::new(payer.clone()).transfer(NearToken::from_yoctonear(total)).detach();
        o.status = OrderStatus::Refunded;
        o.refunded = U128(total);
        if matches!(o.kind, OrderKind::Mint) {
            if let Some(s) = self.seasons.get_mut(&o.season_id) {
                s.in_flight = s.in_flight.saturating_sub(1);
            }
        } else if let OrderKind::Reload { token_id } = &o.kind {
            if let Some(mut info) = self.token_info.get(token_id).cloned() {
                info.state = BackingState::RedeemedEmpty;
                self.token_info.insert(token_id.clone(), info);
            }
        }
        emit("order_refunded", json!({ "order_id": o.id, "payer": payer, "amount": U128(total) }));
        self.save_order(o);
    }
}

#[near]
impl Contract {
    /// Pay `base + storage_per_mint + retry_reserve` (excess is refunded immediately).
    /// Traits are revealed in a LATER block from env::random_seed, so nobody — user,
    /// keeper or operator — can choose an outcome after seeing the randomness.
    #[payable]
    pub fn mint(&mut self, season_id: u32, base: U128) -> U64 {
        require!(!self.mints_paused, "Minting is paused");
        require!(env::prepaid_gas() >= Gas::from_tgas(100), "Attach at least 100 Tgas");
        let now = env::block_timestamp();
        let payer = env::predecessor_account_id();
        let attached = env::attached_deposit().as_yoctonear();
        let id = self.next_order_id;
        let (order, excess) = {
            let s = self.seasons.get_mut(&season_id).expect("Unknown season");
            require!(s.status == SeasonStatus::Open, "Season is not open");
            require!(now >= s.config.mint_start_ns.0 && now < s.config.mint_end_ns.0, "Outside mint window");
            require!(base.0 >= s.current_min_base.0, "Below current executable minimum");
            require!(base.0 <= s.config.max_base.0, "Above season maximum");
            require!(s.minted + s.in_flight < s.config.max_supply, "Season sold out");
            let storage_fee = s.config.reserve.storage_per_mint.0;
            let retry = s.config.reserve.retry_reserve.0;
            let required = base.0.checked_add(storage_fee).and_then(|x| x.checked_add(retry)).expect("overflow");
            require!(attached >= required, format!("Attach {} yoctoNEAR (base + storage fee + refundable retry reserve)", required));
            let (basket, creator, treasury) = split_mint(base.0, &s.config.fees);
            s.in_flight += 1;
            (
                Order {
                    id: U64(id),
                    kind: OrderKind::Mint,
                    payer: payer.clone(),
                    season_id,
                    base,
                    basket: U128(basket),
                    creator_fee: U128(creator),
                    treasury_fee: U128(treasury),
                    storage_fee: U128(storage_fee),
                    retry_reserve: U128(retry),
                    keeper_fees_paid: U128(0),
                    status: OrderStatus::Escrowed,
                    created_ns: U64(now),
                    updated_ns: U64(now),
                    request_block: U64(env::block_height()),
                    reveal: None,
                    traits: None,
                    legs: vec![],
                    wrapped: false,
                    token_id: None,
                    refunded: U128(0),
                    note: None,
                },
                attached - required,
            )
        };
        self.next_order_id += 1;
        emit(
            "order_escrowed",
            json!({ "order_id": U64(id), "payer": payer, "season_id": season_id, "base": base, "basket": order.basket,
                    "creator_fee": order.creator_fee, "treasury_fee": order.treasury_fee, "storage_fee": order.storage_fee, "retry_reserve": order.retry_reserve }),
        );
        self.orders.insert(id, order);
        if excess > 0 {
            Promise::new(payer).transfer(NearToken::from_yoctonear(excess)).detach();
        }
        Self::ext(env::current_account_id()).with_static_gas(G_ON_REVEAL).on_reveal(U64(id)).detach();
        U64(id)
    }

    #[private]
    pub fn on_reveal(&mut self, order_id: U64) -> PromiseOrValue<bool> {
        opt(self.internal_reveal(order_id.0))
    }

    #[private]
    pub fn on_wrapped(&mut self, order_id: U64, #[callback_result] r: Result<(), PromiseError>) -> PromiseOrValue<bool> {
        let id = order_id.0;
        let mut o = self.order(id);
        if o.status != OrderStatus::TraitsAssigned || o.wrapped {
            return PromiseOrValue::Value(false);
        }
        if r.is_err() {
            // near_deposit failed: wrap.near refunds the attached NEAR to us.
            o.status = OrderStatus::FailedPreExecution;
            o.note = Some("Wrapping NEAR failed".into());
            self.save_order(o);
            return opt(self.internal_refund(id));
        }
        o.wrapped = true;
        o.status = OrderStatus::SwapsPending;
        self.wnear_accounted = self.wnear_accounted.checked_add(o.basket.0).expect("overflow");
        emit("order_wrapped", json!({ "order_id": o.id, "wnear": o.basket }));
        self.save_order(o);
        if gas_left() >= G_LEG_TOTAL {
            opt(self.internal_advance(id))
        } else {
            PromiseOrValue::Value(true)
        }
    }

    #[private]
    pub fn on_leg_prepared(&mut self, order_id: U64, leg: u8) -> PromiseOrValue<bool> {
        let id = order_id.0;
        let idx = leg as usize;
        let before = env::promise_result_checked(0, 128).ok().and_then(|v| serde_json::from_slice::<U128>(&v).ok());
        let quote = env::promise_result_checked(1, 512).ok().and_then(|v| parse_quote(&v));
        let o = self.order(id);
        let l = o.legs[idx].clone();
        let (before, quote) = match (before, quote) {
            (Some(b), Some(q)) if q > 0 => (b.0, q),
            (b, q) => {
                self.busy.remove(&l.token);
                self.wnear_ops_in_flight -= 1;
                let why = if b.is_none() { "vault balance read failed" } else if q.is_none() { "quote unavailable" } else { "quote returned zero (no liquidity)" };
                self.leg_attempt_failed(id, idx, why.into());
                return PromiseOrValue::Value(false);
            }
        };
        let cfg = self.season_cfg(o.season_id);
        let meme = cfg.memes.iter().find(|m| m.token == l.token).unwrap().clone();
        let min_out = quote * (BPS - meme.max_slippage_bps as u128) / BPS;
        if min_out == 0 {
            self.busy.remove(&l.token);
            self.wnear_ops_in_flight -= 1;
            self.leg_attempt_failed(id, idx, "min_out rounds to zero".into());
            return PromiseOrValue::Value(false);
        }
        let mut o = o;
        o.legs[idx].min_out = U128(min_out);
        self.save_order(o);
        let (dex, msg) = match meme.route.kind {
            RouteKind::RheaDcl => (
                self.rhea_dcl.clone(),
                json!({ "Swap": { "pool_ids": [meme.route.pool_id], "output_token": l.token, "min_output_amount": U128(min_out), "client_id": "" } }),
            ),
            RouteKind::RheaV2 => (
                self.rhea_v2.clone(),
                json!({ "force": 0, "actions": [{ "pool_id": meme.route.pool_id.parse::<u64>().unwrap(), "token_in": self.wrap_near,
                        "token_out": l.token, "amount_in": l.amount_in, "min_amount_out": U128(min_out) }] }),
            ),
        };
        PromiseOrValue::Promise(
            ext_ft::ext(self.wrap_near.clone())
                .with_attached_deposit(one_yocto())
                .with_static_gas(G_FT_TRANSFER_CALL)
                .ft_transfer_call(dex, l.amount_in, Some(format!("wtn order {} leg {}", id, idx)), msg.to_string())
                .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_LEG_SWAPPED).on_leg_swapped(order_id, leg, U128(before))),
        )
    }

    #[private]
    pub fn on_leg_swapped(&mut self, order_id: U64, leg: u8, before: U128, #[callback_result] used: Result<U128, PromiseError>) -> Promise {
        self.wnear_ops_in_flight = self.wnear_ops_in_flight.saturating_sub(1);
        let o = self.order(order_id.0);
        let token = o.legs[leg as usize].token.clone();
        ext_ft::ext(token)
            .with_static_gas(G_VIEW)
            .ft_balance_of(env::current_account_id())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_LEG_VERIFIED).on_leg_verified(order_id, leg, before, used.ok()))
    }

    #[private]
    pub fn on_leg_verified(&mut self, order_id: U64, leg: u8, before: U128, used: Option<U128>, #[callback_result] after: Result<U128, PromiseError>) -> bool {
        let id = order_id.0;
        let idx = leg as usize;
        let mut o = self.order(id);
        let l = o.legs[idx].clone();
        let after = after.ok().map(|a| a.0);
        match (used.map(|u| u.0), after) {
            (Some(0), Some(_)) => {
                // DEX rejected the swap (e.g. min_out not met) and wNEAR was fully refunded.
                self.busy.remove(&l.token);
                self.leg_attempt_failed(id, idx, "swap rejected by pool (slippage/liquidity); wNEAR refunded".into());
                false
            }
            (Some(u), Some(a)) if u == l.amount_in.0 && a >= before.0.saturating_add(l.min_out.0) => {
                let acquired = a - before.0;
                o.legs[idx].acquired = U128(acquired);
                o.legs[idx].status = LegStatus::Done;
                o.legs[idx].spent = true;
                o.legs[idx].last_error = None;
                self.add_accounted(&l.token, acquired);
                self.sub_wnear(l.amount_in.0);
                self.busy.remove(&l.token);
                emit("leg_filled", json!({ "order_id": o.id, "leg": idx, "token": l.token, "amount_in": l.amount_in, "acquired": U128(acquired), "min_out": l.min_out }));
                let all_done = o.legs.iter().all(|x| x.status == LegStatus::Done);
                self.save_order(o);
                if all_done {
                    self.internal_finalize(id);
                }
                true
            }
            (u, a) => {
                // Anomaly: partial use, or output below min_out / unreadable. Freeze the order,
                // keep the token mutex so any surplus stays attributable, alert operations.
                let delta = match a {
                    Some(a) => a.saturating_sub(before.0),
                    None => 0,
                };
                let spent = u.unwrap_or(l.amount_in.0); // unknown => assume all spent (conservative)
                if delta > 0 {
                    self.add_accounted(&l.token, delta);
                }
                self.sub_wnear(spent.min(l.amount_in.0));
                o.legs[idx].acquired = U128(delta);
                o.legs[idx].spent = true;
                o.legs[idx].status = LegStatus::Failed;
                o.legs[idx].last_error = Some(format!("execution anomaly: used={:?} delta={} min_out={}", u, delta, l.min_out.0));
                o.status = OrderStatus::PartialExecutionRecovery;
                o.note = Some("Swap result could not be fully verified; operations alerted".into());
                emit("execution_anomaly", json!({ "order_id": o.id, "leg": idx, "token": l.token, "used": u.map(U128), "delta": U128(delta), "min_out": l.min_out }));
                self.save_order(o);
                false
            }
        }
    }

    #[private]
    pub fn on_unwrapped_refund(&mut self, order_id: U64, total: U128, wnear: U128, #[callback_result] r: Result<(), PromiseError>) -> bool {
        let o = self.order(order_id.0);
        if r.is_err() {
            // Unwrap failed: restore accounting and let anyone retry via refund_order.
            self.wnear_accounted += wnear.0;
            let mut o = o;
            o.status = OrderStatus::FailedPreExecution;
            o.note = Some("Unwrap for refund failed; retry with refund_order".into());
            self.save_order(o);
            return false;
        }
        let payer = o.payer.clone();
        self.complete_refund(order_id.0, total.0, payer);
        true
    }

    /// Permissionless liveness: continue an order from its persisted state. Callers other
    /// than the payer are reimbursed a fixed fee from the order's retry reserve, only when a
    /// step actually starts. Nothing about the outcome can be influenced by the caller.
    pub fn advance_order(&mut self, order_id: U64) -> PromiseOrValue<bool> {
        require!(env::prepaid_gas() >= G_LEG_TOTAL.saturating_add(Gas::from_tgas(15)), "Attach at least 250 Tgas");
        let id = order_id.0;
        let caller = env::predecessor_account_id();
        let p = self.internal_advance(id);
        if p.is_some() {
            let mut o = self.order(id);
            if caller != o.payer {
                let fee = self.season_cfg(o.season_id).reserve.advance_fee.0;
                if fee > 0 && o.keeper_fees_paid.0 + fee <= o.retry_reserve.0 {
                    o.keeper_fees_paid = U128(o.keeper_fees_paid.0 + fee);
                    self.save_order(o);
                    Promise::new(caller.clone()).transfer(NearToken::from_yoctonear(fee)).detach();
                    emit("keeper_paid", json!({ "order_id": order_id, "keeper": caller, "fee": U128(fee) }));
                }
            }
        }
        opt(p)
    }

    /// Retry a refund whose unwrap failed. Permissionless; funds can only go to the payer.
    pub fn refund_order(&mut self, order_id: U64) -> PromiseOrValue<bool> {
        opt(self.internal_refund(order_id.0))
    }

    /// Payer may re-arm failed legs of a recovery-state order for another bounded set of
    /// attempts (e.g. after a transient route outage).
    pub fn retry_order(&mut self, order_id: U64) {
        let mut o = self.order(order_id.0);
        require!(env::predecessor_account_id() == o.payer, "Only payer");
        require!(o.status == OrderStatus::PartialExecutionRecovery, "Not in recovery");
        require!(!o.legs.iter().any(|l| l.status == LegStatus::Failed && l.spent), "Anomalous leg needs operator reconcile or unwind");
        for l in o.legs.iter_mut() {
            if l.status == LegStatus::Failed && !l.spent {
                l.status = LegStatus::Pending;
                l.attempts = 0;
            }
        }
        o.status = OrderStatus::SwapsPending;
        emit("order_retry", json!({ "order_id": o.id }));
        self.save_order(o);
    }
}

/// Recompute the reload legs: same original bps, new basket amount.
pub fn reload_legs(holdings: &[Holding], cfg: &SeasonConfig, basket: u128) -> Vec<Leg> {
    let weights: Vec<(u8, u16)> = holdings
        .iter()
        .map(|h| {
            let idx = cfg.memes.iter().position(|m| m.token == h.token).unwrap_or_else(|| env::panic_str(&format!("{} not eligible in this season", h.token)));
            (idx as u8, h.bps)
        })
        .collect();
    require!(weights.iter().map(|w| w.1 as u32).sum::<u32>() == 10_000, "original weights corrupt");
    leg_amounts(basket, &weights)
        .into_iter()
        .map(|(m, bps, amt)| Leg {
            meme_idx: m,
            token: cfg.memes[m as usize].token.clone(),
            bps,
            amount_in: U128(amt),
            acquired: U128(0),
            min_out: U128(0),
            attempts: 0,
            status: LegStatus::Pending,
            last_error: None,
            unwind_out: U128(0),
            spent: false,
        })
        .collect()
}

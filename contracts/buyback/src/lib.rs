//! WHAT THE NFT?! buyback treasury.
//!
//! This account IS the buyback treasury: the core contract's `treasury_account` points here, so it
//! receives the 5% mint share and the treasury half of every marketplace royalty as plain NEAR.
//!
//! Flow (keeper presses the buttons, the contract enforces every limit):
//!   buy(amount) ─► near_deposit (wrap) ─► [ft_balance_of(WTH) ∧ Rhea DCL quote]
//!     ─► ft_transfer_call(wNEAR → Rhea, min_out = quote × (1 − slippage)) ─► ft_balance_of(WTH)
//!     ─► credit the *verified* WTH delta ─► unwrap any unused wNEAR back to NEAR
//!   start_round(snapshot_hash, total) ─► pay(batch…) × N ─► close_round() ─► reconcile from balance
//!
//! Safety:
//! - The keeper can only buy WTH (capped per buy, rate limited, slippage bounded by an on-chain quote)
//!   and pay WTH out inside an open round. It can never send NEAR anywhere.
//! - Only one operation at a time: no buy while a round is open and vice versa.
//! - Round accounting is reconciled from the real WTH balance, so failed payouts are never lost —
//!   they simply roll over into the next round.
//! - The owner (use a multisig) can pause, change limits/keeper, and withdraw only while paused.

use near_sdk::json_types::{U128, U64};
use near_sdk::serde_json::{self, json, Value};
use near_sdk::{env, ext_contract, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise, PromiseError, PromiseOrValue};

pub const EVENT_STANDARD: &str = "wtn-buyback";
pub const EVENT_VERSION: &str = "1.0.0";
pub const BPS: u128 = 10_000;
/// Max payouts per `pay` call (each ft_transfer gets G_FT_TRANSFER).
pub const MAX_BATCH: usize = 20;
/// Hard ceiling the owner cannot exceed when setting slippage.
pub const MAX_SLIPPAGE_CAP_BPS: u16 = 1_000;

const G_WRAP: Gas = Gas::from_tgas(10);
const G_VIEW: Gas = Gas::from_tgas(10);
const G_QUOTE: Gas = Gas::from_tgas(25);
const G_FT_TRANSFER: Gas = Gas::from_tgas(10);
const G_FT_TRANSFER_CALL: Gas = Gas::from_tgas(110);
const G_UNWRAP: Gas = Gas::from_tgas(10);
const G_ON_VERIFIED: Gas = Gas::from_tgas(25);
const G_ON_SWAPPED: Gas = Gas::from_tgas(10 + 10 + 25);
const G_ON_PREPARED: Gas = Gas::from_tgas(15 + 110 + 45);
const G_ON_WRAPPED: Gas = Gas::from_tgas(15 + 10 + 25 + 170);
const G_ON_ROUND_CLOSED: Gas = Gas::from_tgas(10);

#[ext_contract(ext_ft)]
pub trait ExtFt {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String) -> PromiseOrValue<U128>;
    fn ft_balance_of(&self, account_id: AccountId) -> U128;
}

#[ext_contract(ext_wrap)]
pub trait ExtWrap {
    fn near_deposit(&mut self);
    fn near_withdraw(&mut self, amount: U128);
}

#[ext_contract(ext_rhea_dcl)]
pub trait ExtRheaDcl {
    fn quote(&self, pool_ids: Vec<String>, input_token: AccountId, output_token: AccountId, input_amount: U128, tag: Option<String>);
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Limits {
    /// Max slippage vs the on-chain quote taken right before the swap.
    pub max_slippage_bps: u16,
    /// Max NEAR (yocto) spent by a single `buy`.
    pub max_spend_per_buy: U128,
    /// Min time between two buys.
    pub min_buy_interval_ns: U64,
    /// NEAR (yocto) always kept on top of storage, for gas and safety.
    pub reserve: U128,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Round {
    pub id: u64,
    /// sha256 of the published holder snapshot + payout list (hex), so anyone can verify it.
    pub snapshot_hash: String,
    pub total: U128,
    pub paid: U128,
    pub payouts: u32,
    pub opened_ns: U64,
}

#[near(serializers = [json])]
pub struct Payout {
    pub account_id: AccountId,
    pub amount: U128,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Buyback {
    pub owner: AccountId,
    pub keeper: AccountId,
    pub wrap_near: AccountId,
    pub rhea_dcl: AccountId,
    pub wth: AccountId,
    /// Rhea DCL pool id, e.g. "wrap.near|wth-0b2227.launchpad.justhoot.near|10000".
    pub pool_id: String,
    pub limits: Limits,
    pub paused: bool,
    /// A buy is in flight.
    pub busy: bool,
    pub round: Option<Round>,
    pub last_round_id: u64,
    pub last_buy_ns: u64,
    /// Verified WTH held and not reserved by an open round.
    pub wth_unallocated: u128,
    pub total_near_spent: u128,
    pub total_wth_bought: u128,
    pub total_wth_paid: u128,
}

pub fn emit(event: &str, data: Value) {
    env::log_str(&format!("EVENT_JSON:{}", json!({ "standard": EVENT_STANDARD, "version": EVENT_VERSION, "event": event, "data": [data] })));
}

/// Rhea quote results come back either as a bare U128 or as `{ "amount": "…" }`.
pub fn parse_quote(raw: &[u8]) -> Option<u128> {
    if let Ok(u) = serde_json::from_slice::<U128>(raw) {
        return Some(u.0);
    }
    let v: Value = serde_json::from_slice(raw).ok()?;
    v.get("amount")?.as_str()?.parse::<u128>().ok()
}

fn one_yocto() -> NearToken {
    NearToken::from_yoctonear(1)
}

fn validate_limits(l: &Limits) {
    require!(l.max_slippage_bps > 0 && l.max_slippage_bps <= MAX_SLIPPAGE_CAP_BPS, "slippage out of range");
    require!(l.max_spend_per_buy.0 > 0, "max spend must be positive");
}

#[near]
impl Buyback {
    #[init]
    #[allow(clippy::too_many_arguments)]
    pub fn new(owner: AccountId, keeper: AccountId, wrap_near: AccountId, rhea_dcl: AccountId, wth: AccountId, pool_id: String, limits: Limits) -> Self {
        validate_limits(&limits);
        Self {
            owner,
            keeper,
            wrap_near,
            rhea_dcl,
            wth,
            pool_id,
            limits,
            paused: false,
            busy: false,
            round: None,
            last_round_id: 0,
            last_buy_ns: 0,
            wth_unallocated: 0,
            total_near_spent: 0,
            total_wth_bought: 0,
            total_wth_paid: 0,
        }
    }

    // ───────────── views ─────────────

    /// NEAR (yocto) the keeper may spend right now: balance − storage − reserve.
    pub fn available_near(&self) -> U128 {
        let storage = env::storage_byte_cost().as_yoctonear() * env::storage_usage() as u128;
        U128(env::account_balance().as_yoctonear().saturating_sub(storage).saturating_sub(self.limits.reserve.0))
    }

    pub fn get_state(&self) -> Value {
        json!({
            "owner": self.owner, "keeper": self.keeper, "wth": self.wth, "pool_id": self.pool_id,
            "limits": self.limits, "paused": self.paused, "busy": self.busy, "round": self.round,
            "last_round_id": self.last_round_id, "last_buy_ns": U64(self.last_buy_ns),
            "available_near": self.available_near(),
            "wth_unallocated": U128(self.wth_unallocated),
            "total_near_spent": U128(self.total_near_spent),
            "total_wth_bought": U128(self.total_wth_bought),
            "total_wth_paid": U128(self.total_wth_paid),
        })
    }

    // ───────────── keeper: buy WTH ─────────────

    /// Spend `amount` NEAR on WTH via the configured Rhea DCL pool.
    pub fn buy(&mut self, amount: U128) -> Promise {
        self.assert_keeper();
        require!(!self.paused, "paused");
        require!(!self.busy, "a buy is already in flight");
        require!(self.round.is_none(), "close the open round first");
        let now = env::block_timestamp();
        require!(self.last_buy_ns == 0 || now >= self.last_buy_ns + self.limits.min_buy_interval_ns.0, "too soon since the last buy");
        require!(amount.0 > 0, "amount must be positive");
        require!(amount.0 <= self.limits.max_spend_per_buy.0, "above max spend per buy");
        require!(amount.0 <= self.available_near().0, "not enough NEAR above storage + reserve");
        self.busy = true;
        self.last_buy_ns = now;
        emit("buy_started", json!({ "amount": amount }));
        ext_wrap::ext(self.wrap_near.clone())
            .with_attached_deposit(NearToken::from_yoctonear(amount.0))
            .with_static_gas(G_WRAP)
            .near_deposit()
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_WRAPPED).on_wrapped(amount))
    }

    #[private]
    pub fn on_wrapped(&mut self, amount: U128, #[callback_result] r: Result<(), PromiseError>) -> PromiseOrValue<bool> {
        if r.is_err() {
            // wrap.near refunds attached NEAR when near_deposit fails.
            self.busy = false;
            emit("buy_failed", json!({ "amount": amount, "stage": "wrap" }));
            return PromiseOrValue::Value(false);
        }
        let me = env::current_account_id();
        let balance = ext_ft::ext(self.wth.clone()).with_static_gas(G_VIEW).ft_balance_of(me);
        let quote = ext_rhea_dcl::ext(self.rhea_dcl.clone()).with_static_gas(G_QUOTE).quote(
            vec![self.pool_id.clone()],
            self.wrap_near.clone(),
            self.wth.clone(),
            amount,
            None,
        );
        PromiseOrValue::Promise(balance.and(quote).then(Self::ext(env::current_account_id()).with_static_gas(G_ON_PREPARED).on_prepared(amount)))
    }

    #[private]
    pub fn on_prepared(&mut self, amount: U128) -> PromiseOrValue<bool> {
        let before = env::promise_result_checked(0, 128).ok().and_then(|v| serde_json::from_slice::<U128>(&v).ok());
        let quote = env::promise_result_checked(1, 512).ok().and_then(|v| parse_quote(&v));
        let (before, quote) = match (before, quote) {
            (Some(b), Some(q)) if q > 0 => (b.0, q),
            (b, _) => {
                let why = if b.is_none() { "WTH balance read failed" } else { "no quote / no liquidity" };
                return PromiseOrValue::Promise(self.abort_and_unwrap(amount.0, why));
            }
        };
        let min_out = quote * (BPS - self.limits.max_slippage_bps as u128) / BPS;
        if min_out == 0 {
            return PromiseOrValue::Promise(self.abort_and_unwrap(amount.0, "min_out rounds to zero"));
        }
        let msg = json!({ "Swap": { "pool_ids": [self.pool_id], "output_token": self.wth, "min_output_amount": U128(min_out), "client_id": "" } });
        emit("buy_swapping", json!({ "amount": amount, "quote": U128(quote), "min_out": U128(min_out) }));
        PromiseOrValue::Promise(
            ext_ft::ext(self.wrap_near.clone())
                .with_attached_deposit(one_yocto())
                .with_static_gas(G_FT_TRANSFER_CALL)
                .ft_transfer_call(self.rhea_dcl.clone(), amount, Some("wtn buyback".into()), msg.to_string())
                .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_SWAPPED).on_swapped(amount, U128(before))),
        )
    }

    #[private]
    pub fn on_swapped(&mut self, amount: U128, before: U128, #[callback_result] used: Result<U128, PromiseError>) -> Promise {
        ext_ft::ext(self.wth.clone())
            .with_static_gas(G_VIEW)
            .ft_balance_of(env::current_account_id())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_VERIFIED).on_verified(amount, before, used.ok()))
    }

    /// Credit only the WTH that actually arrived; unwrap whatever wNEAR the swap didn't use.
    #[private]
    pub fn on_verified(&mut self, amount: U128, before: U128, used: Option<U128>, #[callback_result] after: Result<U128, PromiseError>) -> bool {
        self.busy = false;
        let Ok(after) = after else {
            // We can't prove what arrived: stop everything until a human reconciles.
            self.paused = true;
            emit("buy_unverified", json!({ "amount": amount, "note": "WTH balance unreadable after swap; contract paused" }));
            return false;
        };
        let got = after.0.saturating_sub(before.0);
        let spent = match used {
            Some(u) => u.0.min(amount.0),
            None => {
                if got > 0 {
                    amount.0
                } else {
                    0
                }
            }
        };
        self.wth_unallocated += got;
        self.total_wth_bought += got;
        self.total_near_spent += spent;
        let leftover = amount.0 - spent;
        if leftover > 0 {
            ext_wrap::ext(self.wrap_near.clone()).with_attached_deposit(one_yocto()).with_static_gas(G_UNWRAP).near_withdraw(U128(leftover)).detach();
        }
        emit("buy_done", json!({ "near_spent": U128(spent), "wth_received": U128(got), "near_unwrapped": U128(leftover) }));
        got > 0
    }

    // ───────────── keeper: distribute to $WTH holders ─────────────

    /// Reserve `total` WTH for a payout round whose snapshot (hash) is published off-chain.
    pub fn start_round(&mut self, snapshot_hash: String, total: U128) -> u64 {
        self.assert_keeper();
        require!(!self.paused, "paused");
        require!(!self.busy, "a buy is in flight");
        require!(self.round.is_none(), "a round is already open");
        require!(snapshot_hash.len() == 64 && snapshot_hash.chars().all(|c| c.is_ascii_hexdigit()), "snapshot_hash must be 64 hex chars (sha256)");
        require!(total.0 > 0 && total.0 <= self.wth_unallocated, "total exceeds unallocated WTH");
        self.wth_unallocated -= total.0;
        self.last_round_id += 1;
        let id = self.last_round_id;
        self.round = Some(Round { id, snapshot_hash: snapshot_hash.clone(), total, paid: U128(0), payouts: 0, opened_ns: U64(env::block_timestamp()) });
        emit("round_started", json!({ "round": id, "snapshot_hash": snapshot_hash, "total": total }));
        id
    }

    /// Send one batch of payouts from the open round. Attach ~300 Tgas.
    pub fn pay(&mut self, batch: Vec<Payout>) -> Promise {
        self.assert_keeper();
        require!(!self.paused, "paused");
        require!(!batch.is_empty() && batch.len() <= MAX_BATCH, "batch must have 1..=20 payouts");
        let mut round = self.round.clone().unwrap_or_else(|| env::panic_str("no open round"));
        let sum: u128 = batch.iter().map(|p| p.amount.0).sum();
        require!(batch.iter().all(|p| p.amount.0 > 0), "zero payout");
        require!(round.paid.0 + sum <= round.total.0, "batch exceeds round total");
        round.paid = U128(round.paid.0 + sum);
        round.payouts += batch.len() as u32;
        let id = round.id;
        self.round = Some(round);
        let memo = format!("WTH buyback round {}", id);
        let mut it = batch.into_iter();
        let first = it.next().unwrap();
        let mut p = ext_ft::ext(self.wth.clone()).with_attached_deposit(one_yocto()).with_static_gas(G_FT_TRANSFER).ft_transfer(first.account_id.clone(), first.amount, Some(memo.clone()));
        let mut accounts = vec![json!({ "account_id": first.account_id, "amount": first.amount })];
        for x in it {
            accounts.push(json!({ "account_id": x.account_id, "amount": x.amount }));
            p = p.and(ext_ft::ext(self.wth.clone()).with_attached_deposit(one_yocto()).with_static_gas(G_FT_TRANSFER).ft_transfer(x.account_id, x.amount, Some(memo.clone())));
        }
        emit("round_paid", json!({ "round": id, "sum": U128(sum), "payouts": accounts }));
        p
    }

    /// Close the round once its pay() transactions are final. Reconciles from the real WTH balance:
    /// unpaid remainder and any failed transfers roll over into the next round.
    pub fn close_round(&mut self) -> Promise {
        self.assert_keeper();
        let round = self.round.clone().unwrap_or_else(|| env::panic_str("no open round"));
        ext_ft::ext(self.wth.clone())
            .with_static_gas(G_VIEW)
            .ft_balance_of(env::current_account_id())
            .then(Self::ext(env::current_account_id()).with_static_gas(G_ON_ROUND_CLOSED).on_round_closed(U64(round.id)))
    }

    #[private]
    pub fn on_round_closed(&mut self, round_id: U64, #[callback_result] balance: Result<U128, PromiseError>) -> bool {
        let Some(round) = self.round.clone().filter(|r| r.id == round_id.0) else {
            return false;
        };
        let Ok(balance) = balance else {
            emit("round_close_failed", json!({ "round": round.id, "note": "WTH balance unreadable; round stays open, retry close_round" }));
            return false;
        };
        // If every transfer succeeded we'd hold exactly: unallocated + (total − paid).
        let expected = self.wth_unallocated + (round.total.0 - round.paid.0);
        let failed = balance.0.saturating_sub(expected).min(round.paid.0);
        let delivered = round.paid.0 - failed;
        self.total_wth_paid += delivered;
        // Everything we actually hold is now unallocated (includes rollover and failed payouts).
        self.wth_unallocated = balance.0;
        self.round = None;
        emit("round_closed", json!({ "round": round.id, "delivered": U128(delivered), "failed": U128(failed), "rollover": U128(balance.0) }));
        true
    }

    // ───────────── owner ─────────────

    pub fn set_keeper(&mut self, keeper: AccountId) {
        self.assert_owner();
        emit("keeper_set", json!({ "keeper": keeper }));
        self.keeper = keeper;
    }

    pub fn set_limits(&mut self, limits: Limits) {
        self.assert_owner();
        validate_limits(&limits);
        emit("limits_set", json!({ "limits": limits }));
        self.limits = limits;
    }

    pub fn set_owner(&mut self, owner: AccountId) {
        self.assert_owner();
        emit("owner_set", json!({ "owner": owner }));
        self.owner = owner;
    }

    pub fn pause(&mut self) {
        require!(env::predecessor_account_id() == self.owner || env::predecessor_account_id() == self.keeper, "owner or keeper only");
        self.paused = true;
        emit("paused", json!({ "by": env::predecessor_account_id() }));
    }

    pub fn unpause(&mut self) {
        self.assert_owner();
        require!(!self.busy, "a buy is in flight");
        self.paused = false;
        emit("unpaused", json!({}));
    }

    /// Owner-only escape hatch, ONLY while paused (e.g. after an unverifiable swap or a migration).
    /// Every use is logged on-chain.
    #[payable]
    pub fn emergency_withdraw(&mut self, receiver_id: AccountId, near_amount: U128, wth_amount: U128) -> Option<Promise> {
        self.assert_owner();
        require!(env::attached_deposit() == one_yocto(), "attach exactly 1 yoctoNEAR");
        require!(self.paused && !self.busy, "pause first");
        require!(near_amount.0 <= self.available_near().0, "NEAR above available");
        require!(wth_amount.0 <= self.wth_unallocated, "WTH above unallocated");
        self.wth_unallocated -= wth_amount.0;
        emit("emergency_withdraw", json!({ "receiver": receiver_id, "near": near_amount, "wth": wth_amount }));
        let mut p: Option<Promise> = None;
        if near_amount.0 > 0 {
            p = Some(Promise::new(receiver_id.clone()).transfer(NearToken::from_yoctonear(near_amount.0)));
        }
        if wth_amount.0 > 0 {
            let t = ext_ft::ext(self.wth.clone()).with_attached_deposit(one_yocto()).with_static_gas(G_FT_TRANSFER).ft_transfer(receiver_id, wth_amount, Some("emergency".into()));
            p = Some(match p {
                Some(x) => x.and(t),
                None => t,
            });
        }
        p
    }

    // ───────────── internal ─────────────

    fn assert_keeper(&self) {
        require!(env::predecessor_account_id() == self.keeper, "keeper only");
    }

    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner, "owner only");
    }

    fn abort_and_unwrap(&mut self, amount: u128, why: &str) -> Promise {
        self.busy = false;
        emit("buy_failed", json!({ "amount": U128(amount), "stage": "prepare", "reason": why }));
        ext_wrap::ext(self.wrap_near.clone()).with_attached_deposit(one_yocto()).with_static_gas(G_UNWRAP).near_withdraw(U128(amount))
    }
}

#[cfg(test)]
mod tests;

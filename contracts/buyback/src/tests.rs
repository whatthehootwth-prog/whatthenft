//! Unit tests: every keeper action and callback, with mocked promise results.

use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{test_vm_config, testing_env, PromiseResult, RuntimeFeesConfig};

const ME: &str = "buyback.near";
const OWNER: &str = "owner.near";
const KEEPER: &str = "keeper.near";
const ALICE: &str = "alice.near";
const BOB: &str = "bob.near";
const WRAP: &str = "wrap.near";
const DCL: &str = "dclv2.ref-labs.near";
const WTH: &str = "wth-0b2227.launchpad.justhoot.near";
const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const SEC: u64 = 1_000_000_000;
const HASH: &str = "aa11bb22cc33dd44ee55ff6600778899aa11bb22cc33dd44ee55ff6600778899";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn set_env(pred: &str, deposit: u128, now: u64, balance_near: u128, results: Vec<PromiseResult>) {
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(acc(ME))
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(300))
        .block_timestamp(now)
        .account_balance(NearToken::from_yoctonear(balance_near));
    testing_env!(ctx.build(), test_vm_config(), RuntimeFeesConfig::test(), Default::default(), results);
}

fn ok_json<T: near_sdk::serde::Serialize>(v: &T) -> PromiseResult {
    PromiseResult::Successful(serde_json::to_vec(v).unwrap())
}

fn limits() -> Limits {
    Limits { max_slippage_bps: 300, max_spend_per_buy: U128(10 * NEAR), min_buy_interval_ns: U64(3600 * SEC), reserve: U128(NEAR) }
}

fn new_contract() -> Buyback {
    set_env(OWNER, 0, 1_000 * SEC, 100 * NEAR, vec![]);
    Buyback::new(acc(OWNER), acc(KEEPER), acc(WRAP), acc(DCL), acc(WTH), format!("{}|{}|10000", WRAP, WTH), limits())
}

fn panics<F: FnOnce()>(f: F) -> bool {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)).is_err()
}

/// Run a full successful buy: `amount` NEAR in, `got` WTH out, `used` wNEAR consumed.
fn do_buy(c: &mut Buyback, now: u64, amount: u128, got: u128, used: u128) {
    set_env(KEEPER, 0, now, 100 * NEAR, vec![]);
    let _ = c.buy(U128(amount));
    set_env(ME, 0, now, 100 * NEAR, vec![ok_json(&U128(5))]);
    let _ = c.on_wrapped(U128(amount), Ok(()));
    set_env(ME, 0, now, 100 * NEAR, vec![ok_json(&U128(5)), ok_json(&U128(got))]);
    let _ = c.on_prepared(U128(amount));
    set_env(ME, 0, now, 100 * NEAR, vec![]);
    assert!(c.on_verified(U128(amount), U128(5), Some(U128(used)), Ok(U128(5 + got))) || got == 0);
}

// ───────────── buy ─────────────

#[test]
fn only_keeper_can_buy_and_limits_apply() {
    let mut c = new_contract();
    set_env(ALICE, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.buy(U128(NEAR));
    }));
    set_env(KEEPER, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.buy(U128(11 * NEAR));
    }), "above max spend");
    set_env(KEEPER, 0, 2_000 * SEC, 5 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.buy(U128(5 * NEAR));
    }), "must keep storage + reserve");
    set_env(KEEPER, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    let _ = c.buy(U128(2 * NEAR));
    assert!(c.busy);
    assert!(panics(|| {
        let _ = c.buy(U128(NEAR));
    }), "one buy at a time");
}

#[test]
fn successful_buy_credits_verified_wth_and_unwraps_leftover() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, 2 * NEAR, 777_000, 2 * NEAR - 1_000);
    assert!(!c.busy);
    assert_eq!(c.wth_unallocated, 777_000);
    assert_eq!(c.total_wth_bought, 777_000);
    assert_eq!(c.total_near_spent, 2 * NEAR - 1_000);
    let logs = get_logs().join("\n");
    assert!(logs.contains("buy_done") && logs.contains("\"near_unwrapped\":\"1000\""), "{logs}");
}

#[test]
fn min_out_uses_quote_minus_slippage() {
    let mut c = new_contract();
    set_env(KEEPER, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    let _ = c.buy(U128(NEAR));
    set_env(ME, 0, 2_000 * SEC, 100 * NEAR, vec![ok_json(&U128(0)), ok_json(&json!({ "amount": "1000000" }))]);
    let _ = c.on_prepared(U128(NEAR));
    let logs = get_logs().join("\n");
    assert!(logs.contains("\"min_out\":\"970000\""), "3% below the 1_000_000 quote: {logs}");
}

#[test]
fn rate_limit_between_buys() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, NEAR, 10, NEAR);
    set_env(KEEPER, 0, 2_000 * SEC + 60 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.buy(U128(NEAR));
    }));
    do_buy(&mut c, 2_000 * SEC + 3_600 * SEC, NEAR, 10, NEAR);
    assert_eq!(c.wth_unallocated, 20);
}

#[test]
fn no_quote_aborts_and_unwraps_everything() {
    let mut c = new_contract();
    set_env(KEEPER, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    let _ = c.buy(U128(NEAR));
    set_env(ME, 0, 2_000 * SEC, 100 * NEAR, vec![ok_json(&U128(0)), PromiseResult::Failed]);
    let _ = c.on_prepared(U128(NEAR));
    assert!(!c.busy);
    assert_eq!(c.wth_unallocated, 0);
    assert!(get_logs().join("").contains("buy_failed"));
}

#[test]
fn failed_swap_credits_nothing() {
    let mut c = new_contract();
    set_env(KEEPER, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    let _ = c.buy(U128(NEAR));
    set_env(ME, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    // ft_transfer_call reported 0 used (slippage hit), balance unchanged
    assert!(!c.on_verified(U128(NEAR), U128(5), Some(U128(0)), Ok(U128(5))));
    assert_eq!(c.wth_unallocated, 0);
    assert_eq!(c.total_near_spent, 0);
    assert!(get_logs().join("").contains(&format!("\"near_unwrapped\":\"{}\"", NEAR)));
}

#[test]
fn unverifiable_swap_pauses_contract() {
    let mut c = new_contract();
    set_env(KEEPER, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    let _ = c.buy(U128(NEAR));
    set_env(ME, 0, 2_000 * SEC, 100 * NEAR, vec![]);
    assert!(!c.on_verified(U128(NEAR), U128(5), Some(U128(NEAR)), Err(PromiseError::Failed)));
    assert!(c.paused && !c.busy);
    set_env(KEEPER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.buy(U128(NEAR));
    }));
}

// ───────────── rounds ─────────────

#[test]
fn round_reserves_wth_and_blocks_buys() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, NEAR, 1_000, NEAR);
    set_env(KEEPER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        c.start_round("nothex".into(), U128(100));
    }));
    assert!(panics(|| {
        c.start_round(HASH.into(), U128(1_001));
    }), "cannot exceed unallocated");
    assert_eq!(c.start_round(HASH.into(), U128(900)), 1);
    assert_eq!(c.wth_unallocated, 100);
    assert!(panics(|| {
        let _ = c.buy(U128(NEAR));
    }), "no buys while a round is open");
}

#[test]
fn pay_enforces_round_total_and_batch_size() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, NEAR, 1_000, NEAR);
    set_env(KEEPER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    c.start_round(HASH.into(), U128(1_000));
    let _ = c.pay(vec![Payout { account_id: acc(ALICE), amount: U128(600) }, Payout { account_id: acc(BOB), amount: U128(300) }]);
    assert_eq!(c.round.as_ref().unwrap().paid, U128(900));
    assert!(panics(|| {
        let _ = c.pay(vec![Payout { account_id: acc(ALICE), amount: U128(101) }]);
    }), "over round total");
    let big: Vec<Payout> = (0..21).map(|_| Payout { account_id: acc(ALICE), amount: U128(1) }).collect();
    assert!(panics(|| {
        let _ = c.pay(big);
    }), "batch too large");
    set_env(ALICE, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.pay(vec![Payout { account_id: acc(ALICE), amount: U128(1) }]);
    }), "keeper only");
}

#[test]
fn close_round_reconciles_unpaid_and_failed_payouts() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, NEAR, 1_000, NEAR);
    set_env(KEEPER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    c.start_round(HASH.into(), U128(1_000));
    let _ = c.pay(vec![Payout { account_id: acc(ALICE), amount: U128(600) }, Payout { account_id: acc(BOB), amount: U128(300) }]);
    // Bob's transfer failed (300 stays) and 100 was never paid → contract still holds 400.
    set_env(ME, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(c.on_round_closed(U64(1), Ok(U128(400))));
    assert!(c.round.is_none());
    assert_eq!(c.total_wth_paid, 600);
    assert_eq!(c.wth_unallocated, 400, "rolls over into the next round");
    assert!(get_logs().join("").contains("\"failed\":\"300\""));
}

#[test]
fn close_round_keeps_round_open_if_balance_unreadable() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, NEAR, 1_000, NEAR);
    set_env(KEEPER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    c.start_round(HASH.into(), U128(1_000));
    set_env(ME, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(!c.on_round_closed(U64(1), Err(PromiseError::Failed)));
    assert!(c.round.is_some());
}

// ───────────── owner ─────────────

#[test]
fn emergency_withdraw_only_by_owner_while_paused() {
    let mut c = new_contract();
    do_buy(&mut c, 2_000 * SEC, NEAR, 1_000, NEAR);
    set_env(OWNER, 1, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.emergency_withdraw(acc(OWNER), U128(0), U128(10));
    }), "must be paused");
    c.pause();
    set_env(KEEPER, 1, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| {
        let _ = c.emergency_withdraw(acc(KEEPER), U128(0), U128(10));
    }), "keeper can never withdraw");
    set_env(OWNER, 1, 9_000 * SEC, 100 * NEAR, vec![]);
    let _ = c.emergency_withdraw(acc(OWNER), U128(NEAR), U128(10));
    assert_eq!(c.wth_unallocated, 990);
}

#[test]
fn limits_are_bounded() {
    let mut c = new_contract();
    set_env(OWNER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    let mut l = limits();
    l.max_slippage_bps = 5_000;
    assert!(panics(|| c.set_limits(l.clone())));
    set_env(KEEPER, 0, 9_000 * SEC, 100 * NEAR, vec![]);
    assert!(panics(|| c.set_limits(limits())), "owner only");
}

#[test]
fn parse_quote_accepts_both_shapes() {
    assert_eq!(parse_quote(br#""123""#), Some(123));
    assert_eq!(parse_quote(br#"{"amount":"456","tag":null}"#), Some(456));
    assert_eq!(parse_quote(b"garbage"), None);
}

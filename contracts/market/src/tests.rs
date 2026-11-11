//! Unit tests for listing, buying (payout settlement, refunds, double-sale guard) and housekeeping.

use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, PromiseError};

const ME: &str = "market.near";
const OWNER: &str = "owner.near";
const CORE: &str = "whatthenft.near";
const ALICE: &str = "alice.near";
const BOB: &str = "bob.near";
const CAROL: &str = "carol.near";
const CREATOR: &str = "creator.near";
const TREASURY: &str = "buyback.near";
const NEAR: u128 = 10u128.pow(24);

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn set_env(pred: &str, deposit: u128) {
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(acc(ME))
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(300))
        .block_timestamp(1_000_000);
    testing_env!(ctx.build());
}

fn panics<F: FnOnce()>(f: F) -> bool {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)).is_err()
}

fn market() -> Market {
    set_env(OWNER, 0);
    Market::new(acc(OWNER), acc(CORE))
}

fn list(m: &mut Market, token: &str, owner: &str, price: u128, approval: u64) {
    set_env(CORE, 0);
    m.nft_on_approve(token.into(), acc(owner), approval, format!("{{\"price\":\"{}\"}}", price));
}

/// 3% royalty, 50/50 — what the core contract returns for `price`.
fn core_payout(seller: &str, price: u128) -> Payout {
    let royalty = price * 300 / 10_000;
    let creator = royalty / 2;
    let mut p = HashMap::new();
    p.insert(acc(seller), U128(price - royalty));
    p.insert(acc(CREATOR), U128(creator));
    p.insert(acc(TREASURY), U128(royalty - creator));
    Payout { payout: p }
}

#[test]
fn only_the_collection_can_list_and_price_is_validated() {
    let mut m = market();
    set_env(ALICE, 0);
    assert!(panics(|| m.nft_on_approve("1".into(), acc(ALICE), 1, "{\"price\":\"5\"}".into())), "random accounts can't list");
    set_env(CORE, 0);
    assert!(panics(|| m.nft_on_approve("1".into(), acc(ALICE), 1, "{\"price\":\"0\"}".into())), "zero price");
    assert!(panics(|| m.nft_on_approve("1".into(), acc(ALICE), 1, "hello".into())), "bad msg");
    list(&mut m, "1", ALICE, 2 * NEAR, 7);
    assert_eq!(m.get_listing("1".into()).unwrap().approval_id, 7);
    // re-approving relists with the new price/approval
    list(&mut m, "1", ALICE, 3 * NEAR, 8);
    assert_eq!(m.get_listings(None, None).len(), 1);
    assert_eq!(m.get_listing("1".into()).unwrap().price, U128(3 * NEAR));
}

#[test]
fn seller_controls_price_and_delisting() {
    let mut m = market();
    list(&mut m, "1", ALICE, 2 * NEAR, 1);
    set_env(BOB, 1);
    assert!(panics(|| m.update_price("1".into(), U128(NEAR))));
    assert!(panics(|| m.delist("1".into())));
    set_env(ALICE, 0);
    assert!(panics(|| m.delist("1".into())), "needs 1 yocto");
    set_env(ALICE, 1);
    m.update_price("1".into(), U128(NEAR));
    assert_eq!(m.get_listing("1".into()).unwrap().price, U128(NEAR));
    m.delist("1".into());
    assert!(m.get_listing("1".into()).is_none());
}

#[test]
fn buy_requires_price_and_blocks_self_purchase() {
    let mut m = market();
    list(&mut m, "1", ALICE, 2 * NEAR, 1);
    set_env(BOB, NEAR);
    assert!(panics(|| {
        let _ = m.buy("1".into());
    }), "under price");
    set_env(ALICE, 2 * NEAR);
    assert!(panics(|| {
        let _ = m.buy("1".into());
    }), "own listing");
}

#[test]
fn buy_removes_listing_first_so_it_cannot_be_sold_twice() {
    let mut m = market();
    list(&mut m, "1", ALICE, 2 * NEAR, 1);
    set_env(BOB, 2 * NEAR);
    let _ = m.buy("1".into());
    assert!(m.get_listing("1".into()).is_none());
    set_env(CAROL, 2 * NEAR);
    assert!(panics(|| {
        let _ = m.buy("1".into());
    }), "second buyer is rejected");
}

#[test]
fn successful_sale_pays_royalty_split_and_refunds_excess() {
    let mut m = market();
    list(&mut m, "1", ALICE, 10 * NEAR, 1);
    let l = m.get_listing("1".into()).unwrap();
    set_env(BOB, 11 * NEAR);
    let _ = m.buy("1".into());
    set_env(ME, 0);
    assert!(m.on_bought(l, acc(BOB), U128(11 * NEAR), Ok(core_payout(ALICE, 10 * NEAR))));
    assert_eq!(m.sale_count, 1);
    assert_eq!(m.total_volume, 10 * NEAR);
    let sales = m.get_recent_sales(None);
    assert_eq!(sales[0].buyer, acc(BOB));
    let logs = get_logs().join("\n");
    // 10 NEAR: seller 9.7, creator 0.15, treasury 0.15
    assert!(logs.contains(&format!("{{\"account_id\":\"{}\",\"amount\":\"{}\"}}", ALICE, 97 * NEAR / 10)), "{logs}");
    assert!(logs.contains(&format!("{{\"account_id\":\"{}\",\"amount\":\"{}\"}}", CREATOR, 15 * NEAR / 100)), "{logs}");
    assert!(logs.contains(&format!("{{\"account_id\":\"{}\",\"amount\":\"{}\"}}", TREASURY, 15 * NEAR / 100)), "{logs}");
}

#[test]
fn failed_transfer_refunds_buyer_in_full() {
    let mut m = market();
    list(&mut m, "1", ALICE, 2 * NEAR, 1);
    let l = m.get_listing("1".into()).unwrap();
    set_env(ME, 0);
    assert!(!m.on_bought(l, acc(BOB), U128(2 * NEAR), Err(PromiseError::Failed)));
    assert_eq!(m.sale_count, 0);
    assert!(get_logs().join("").contains(&format!("\"refunded\":\"{}\"", 2 * NEAR)));
}

#[test]
fn settle_validates_payouts() {
    let seller = acc(ALICE);
    // valid payout with rounding remainder → remainder to seller
    let mut p = HashMap::new();
    p.insert(acc(CREATOR), U128(10));
    p.insert(acc(ALICE), U128(80));
    let s = settle(Some(p), &seller, 100);
    assert_eq!(s.iter().map(|x| x.1).sum::<u128>(), 100);
    assert!(s.contains(&(acc(ALICE), 90)));
    // payout larger than price → everything to seller
    let mut bad = HashMap::new();
    bad.insert(acc(CREATOR), U128(101));
    assert_eq!(settle(Some(bad), &seller, 100), vec![(seller.clone(), 100)]);
    // empty / missing → seller
    assert_eq!(settle(Some(HashMap::new()), &seller, 100), vec![(seller.clone(), 100)]);
    assert_eq!(settle(None, &seller, 100), vec![(seller, 100)]);
}

#[test]
fn stale_listings_are_removed_only_when_really_stale() {
    let mut m = market();
    list(&mut m, "1", ALICE, NEAR, 4);
    set_env(ME, 0);
    let mut ap = HashMap::new();
    ap.insert(acc(ME), 4u64);
    // still valid
    assert!(!m.on_stale_checked("1".into(), Ok(Some(TokenView { token_id: "1".into(), owner_id: acc(ALICE), approved_account_ids: Some(ap) }))));
    assert!(m.get_listing("1".into()).is_some());
    // owner changed
    assert!(m.on_stale_checked("1".into(), Ok(Some(TokenView { token_id: "1".into(), owner_id: acc(BOB), approved_account_ids: None }))));
    assert!(m.get_listing("1".into()).is_none());
    // view failure never removes
    list(&mut m, "2", ALICE, NEAR, 1);
    set_env(ME, 0);
    assert!(!m.on_stale_checked("2".into(), Err(PromiseError::Failed)));
    assert!(m.get_listing("2".into()).is_some());
}

#[test]
fn stats_and_pause() {
    let mut m = market();
    list(&mut m, "1", ALICE, 3 * NEAR, 1);
    list(&mut m, "2", BOB, 2 * NEAR, 1);
    let st = m.get_stats();
    assert_eq!(st["listed"], 2);
    assert_eq!(st["floor"], json!(U128(2 * NEAR)));
    assert_eq!(m.get_listings_by_owner(acc(BOB)).len(), 1);
    set_env(ALICE, 0);
    assert!(panics(|| m.set_paused(true)));
    set_env(OWNER, 0);
    m.set_paused(true);
    assert!(panics(|| list(&mut m, "3", ALICE, NEAR, 1)));
}

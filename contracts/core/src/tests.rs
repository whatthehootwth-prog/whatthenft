//! Unit tests: drive every callback with mocked promise results.

use super::*;
use crate::order::split_mint;
use crate::traits::{derive_seed, derive_traits, token_weights};
use crate::vault::effective_state;
use near_contract_standards::non_fungible_token::approval::NonFungibleTokenApproval;
use near_contract_standards::non_fungible_token::core::NonFungibleTokenCore;
use near_contract_standards::non_fungible_token::enumeration::NonFungibleTokenEnumeration;
use near_sdk::serde_json;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{test_vm_config, testing_env, Gas, PromiseResult, RuntimeFeesConfig};

const VAULT: &str = "wtn.near";
const OWNER: &str = "owner.near";
const CREATOR: &str = "creator.near";
const TREASURY: &str = "treasury.near";
const ALICE: &str = "alice.near";
const BOB: &str = "bob.near";
const KEEPER: &str = "keeper.near";
const MARKET: &str = "market.near";
const WRAP: &str = "wrap.near";
const WTH: &str = "wth-0b2227.launchpad.justhoot.near";
const SHITZU: &str = "token.0xshitzu.near";
const BLACKDRAGON: &str = "blackdragon.tkn.near";
const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const MILLI: u128 = NEAR / 1000;
const DAY_NS: u64 = 86_400 * 1_000_000_000;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}

struct H {
    c: Contract,
    height: u64,
    now: u64,
    seed: [u8; 32],
}

fn set_env(height: u64, now: u64, seed: [u8; 32], pred: &str, deposit: u128, tgas: u64, results: Vec<PromiseResult>) {
    let mut ctx = VMContextBuilder::new();
    ctx.current_account_id(acc(VAULT))
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .prepaid_gas(Gas::from_tgas(tgas))
        .block_height(height)
        .block_timestamp(now)
        .random_seed(seed)
        .account_balance(NearToken::from_near(1_000_000));
    testing_env!(ctx.build(), test_vm_config(), RuntimeFeesConfig::test(), Default::default(), results);
}

impl H {
    fn env(&mut self, pred: &str, deposit: u128, tgas: u64, results: Vec<PromiseResult>) {
        set_env(self.height, self.now, self.seed, pred, deposit, tgas, results);
    }

    fn new() -> Self {
        let (height, now, seed) = (100, 1_800_000_000 * 1_000_000_000, [7u8; 32]);
        set_env(height, now, seed, OWNER, 0, 300, vec![]);
        let c = Contract::new(acc(OWNER), acc(CREATOR), acc(TREASURY), acc(WRAP), acc("v2.ref-finance.near"), acc("dclv2.ref-labs.near"));
        H { c, height, now, seed }
    }

    fn json_result<T: near_sdk::serde::Serialize>(v: T) -> PromiseResult {
        PromiseResult::Successful(serde_json::to_vec(&v).unwrap())
    }

    fn setup_season(&mut self, max_supply: u32) -> u32 {
        self.env(OWNER, 0, 300, vec![]);
        let id = self.c.create_season(season_cfg(self.now, max_supply));
        for t in [WRAP, WTH, SHITZU, BLACKDRAGON] {
            self.env(VAULT, 0, 300, vec![Self::json_result(json!({ "total": "1250000000000000000000", "available": "0" }))]);
            assert!(self.c.on_registered(acc(t), Ok(json!({}))));
        }
        self.env(OWNER, 0, 300, vec![]);
        self.c.open_season(id);
        id
    }

    fn required(&self, base: u128) -> u128 {
        base + 12 * MILLI + 30 * MILLI
    }

    /// Runs a mint all the way to settlement with mocked DEX results.
    /// `out_per_leg` = how many token units each leg "receives".
    fn mint_funded(&mut self, payer: &str, base: u128) -> (u64, String) {
        self.env(payer, self.required(base), 300, vec![]);
        let id = self.c.mint(1, U128(base)).0;
        self.reveal_and_wrap(id);
        let legs = self.c.get_order(U64(id)).unwrap().legs.len();
        for i in 0..legs {
            self.run_leg_ok(id, i, 1_000_000 + i as u128);
        }
        let o = self.c.get_order(U64(id)).unwrap();
        assert_eq!(o.status, OrderStatus::FullyBackedLocked, "order should settle: {:?}", o.legs);
        (id, o.token_id.unwrap())
    }

    fn reveal_and_wrap(&mut self, id: u64) {
        self.height += 1;
        self.env(VAULT, 0, 300, vec![]);
        let _ = self.c.on_reveal(U64(id));
        assert_eq!(self.c.get_order(U64(id)).unwrap().status, OrderStatus::TraitsAssigned);
        self.env(VAULT, 0, 100, vec![PromiseResult::Successful(vec![])]);
        let _ = self.c.on_wrapped(U64(id), Ok(()));
        assert_eq!(self.c.get_order(U64(id)).unwrap().status, OrderStatus::SwapsPending);
    }

    fn start_leg(&mut self, id: u64, who: &str) {
        self.env(who, 0, 300, vec![]);
        let _ = self.c.advance_order(U64(id));
    }

    fn run_leg_ok(&mut self, id: u64, idx: usize, out: u128) {
        self.start_leg(id, KEEPER);
        let o = self.c.get_order(U64(id)).unwrap();
        assert_eq!(o.legs[idx].status, LegStatus::InFlight);
        let before: u128 = 5_000;
        self.env(VAULT, 0, 300, vec![Self::json_result(U128(before)), Self::json_result(U128(out))]);
        let _ = self.c.on_leg_prepared(U64(id), idx as u8);
        let amount_in = self.c.get_order(U64(id)).unwrap().legs[idx].amount_in;
        self.env(VAULT, 0, 300, vec![Self::json_result(amount_in)]);
        let _ = self.c.on_leg_swapped(U64(id), idx as u8, U128(before), Ok(amount_in));
        self.env(VAULT, 0, 300, vec![Self::json_result(U128(before + out))]);
        assert!(self.c.on_leg_verified(U64(id), idx as u8, U128(before), Some(amount_in), Ok(U128(before + out))));
    }
}

fn meme(id: &str, token: &str, weight: u32, v: [u16; 6], kind: RouteKind, pool: &str) -> SeasonMeme {
    SeasonMeme { meme_id: id.into(), token: acc(token), weight, slot_variants: v, route: Route { kind, pool_id: pool.into() }, max_slippage_bps: 200 }
}

fn season_cfg(now: u64, max_supply: u32) -> SeasonConfig {
    SeasonConfig {
        name: "MEME GENESIS".into(),
        mint_start_ns: U64(now - 1),
        mint_end_ns: U64(now + 7 * DAY_NS),
        max_supply,
        target_base: U128(100 * MILLI),
        min_base_floor: U128(100 * MILLI),
        max_base: U128(50 * NEAR),
        min_leg: U128(5 * MILLI),
        tiers: vec![Tier { min_base: U128(0), max_partners: 1 }, Tier { min_base: U128(NEAR), max_partners: 2 }],
        lock_ns: U64(30 * DAY_NS),
        fees: MintFees { basket_bps: 9000, creator_bps: 500, treasury_bps: 500 },
        royalty: RoyaltyConfig { royalty_bps: 250, creator_share_bps: 1000 },
        allocation: AllocationConfig { core_wth_bps: 2000, slot_weights_bps: [2000, 1000, 2500, 1000, 1000, 2500] },
        rarity_bps: [7000, 2200, 700, 100],
        wth_slot_bps: 3000,
        memes: vec![
            meme("wth", WTH, 0, [3; 6], RouteKind::RheaDcl, "wrap.near|wth-0b2227.launchpad.justhoot.near|10000"),
            meme("shitzu", SHITZU, 50, [2, 2, 2, 2, 0, 2], RouteKind::RheaV2, "4369"),
            meme("blackdragon", BLACKDRAGON, 30, [1; 6], RouteKind::RheaV2, "4276"),
        ],
        reserve: ExecutionReserveConfig { storage_per_mint: U128(12 * MILLI), retry_reserve: U128(30 * MILLI), advance_fee: U128(10 * MILLI) },
        manifest_hash: "ab".repeat(32),
        media_base_uri: "ipfs://pending".into(),
        reload_enabled: true,
    }
}

// ───────────────────────── economics ─────────────────────────

#[test]
fn mint_split_is_exact() {
    let f = MintFees { basket_bps: 9000, creator_bps: 500, treasury_bps: 500 };
    assert_eq!(split_mint(100 * MILLI, &f), (90 * MILLI, 5 * MILLI, 5 * MILLI));
    for base in [0u128, 1, 7, 19, 10_001, 123_456_789_012_345_678_901_234, u128::MAX / 10_000] {
        let (b, c, t) = split_mint(base, &f);
        assert_eq!(b + c + t, base);
    }
}

#[test]
fn allocation_matches_brief_44_16_40() {
    // Head=WTH Face=BONK Body=BATMAN Arms=BONK Legs=WTH Accessory=BATMAN (idx 0,1,2)
    let a = AllocationConfig { core_wth_bps: 2000, slot_weights_bps: [2000, 1000, 2500, 1000, 1000, 2500] };
    assert_eq!(token_weights(&[0, 1, 2, 1, 0, 2], &a), vec![(0, 4400), (1, 1600), (2, 4000)]);
    let legs = crate::traits::leg_amounts(90 * MILLI, &[(0, 4400), (1, 1600), (2, 4000)]);
    assert_eq!(legs.iter().map(|l| l.2).collect::<Vec<_>>(), vec![39_600_000_000_000_000_000_000, 14_400_000_000_000_000_000_000, 36 * MILLI]);
}

#[test]
fn traits_match_typescript_vectors() {
    let mut h = H::new();
    h.env(OWNER, 0, 300, vec![]);
    let raw = include_str!("../../../test-vectors/traits-v1.json");
    let file: serde_json::Value = serde_json::from_str(raw).unwrap();
    let vecs = file["vectors"].as_array().unwrap();
    assert!(vecs.len() >= 40);
    let names = ["wth", "shitzu", "blackdragon", "jambo"];
    for v in vecs {
        let mut cfg = season_cfg(h.now, 10);
        cfg.memes = vec![
            meme("wth", WTH, 0, [3; 6], RouteKind::RheaDcl, "x"),
            meme("shitzu", SHITZU, 50, [2, 2, 2, 2, 0, 2], RouteKind::RheaV2, "1"),
            meme("blackdragon", BLACKDRAGON, 30, [1; 6], RouteKind::RheaV2, "2"),
            meme("jambo", "jambo-1679.meme-cooking.near", 20, [1, 0, 1, 0, 1, 1], RouteKind::RheaV2, "3"),
        ];
        cfg.min_leg = U128(v["minLegYocto"].as_str().unwrap().parse().unwrap());
        let rs: [u8; 32] = hex_to(v["randomSeed"].as_str().unwrap());
        let order_id: u64 = v["orderId"].as_str().unwrap().parse().unwrap();
        let seed = derive_seed(sha256_arr, &rs, order_id);
        assert_eq!(to_hex(&seed), v["seed"].as_str().unwrap());
        let basket: u128 = v["basketYocto"].as_str().unwrap().parse().unwrap();
        let d = derive_traits(sha256_arr, seed, &cfg, v["maxPartners"].as_u64().unwrap() as u8, basket);
        assert_eq!(RARITY_NAMES[d.traits.rarity as usize], v["rarity"].as_str().unwrap());
        assert_eq!(d.traits.attempt as u64, v["attempt"].as_u64().unwrap());
        for (i, s) in v["slots"].as_array().unwrap().iter().enumerate() {
            assert_eq!(names[d.traits.slots[i].meme_idx as usize], s[0].as_str().unwrap());
            assert_eq!(d.traits.slots[i].variant as u64, s[1].as_u64().unwrap());
        }
        for (i, l) in v["legs"].as_array().unwrap().iter().enumerate() {
            assert_eq!(names[d.legs[i].0 as usize], l[0].as_str().unwrap());
            assert_eq!(d.legs[i].2.to_string(), l[1].as_str().unwrap());
        }
        assert_eq!(d.legs.len(), v["legs"].as_array().unwrap().len());
    }
}

fn hex_to(s: &str) -> [u8; 32] {
    core::array::from_fn(|i| u8::from_str_radix(&s[i * 2..i * 2 + 2], 16).unwrap())
}

#[test]
fn royalty_payout_10_near() {
    let mut h = H::new();
    h.setup_season(111);
    let (_, tid) = h.mint_funded(ALICE, 100 * MILLI);
    h.env(ALICE, 0, 300, vec![]);
    let p = h.c.nft_payout(tid, U128(10 * NEAR), Some(5)).payout;
    assert_eq!(p[&acc(ALICE)].0, 9_750 * MILLI);
    assert_eq!(p[&acc(CREATOR)].0, 25 * MILLI);
    assert_eq!(p[&acc(TREASURY)].0, 225 * MILLI);
}

// ───────────────────────── mint lifecycle ─────────────────────────

#[test]
fn full_mint_mints_only_after_all_legs_verified() {
    let mut h = H::new();
    h.setup_season(111);
    h.env(ALICE, h.required(100 * MILLI), 300, vec![]);
    let storage0 = env::storage_usage();
    let id = h.c.mint(1, U128(100 * MILLI)).0;
    assert_eq!(h.c.nft_total_supply().0, 0);
    // same block reveal is refused (rescheduled)
    h.env(VAULT, 0, 300, vec![]);
    let _ = h.c.on_reveal(U64(id));
    assert_eq!(h.c.get_order(U64(id)).unwrap().status, OrderStatus::Escrowed);
    h.reveal_and_wrap(id);
    let o = h.c.get_order(U64(id)).unwrap();
    assert!(o.legs.len() <= 2, "low tier is WTH + at most one partner");
    assert_eq!(o.legs.iter().map(|l| l.amount_in.0).sum::<u128>(), 90 * MILLI);
    assert_eq!(o.legs.iter().map(|l| l.bps as u32).sum::<u32>(), 10_000);
    assert_eq!(h.c.wnear_accounted, 90 * MILLI);
    for i in 0..o.legs.len() {
        assert_eq!(h.c.nft_total_supply().0, 0, "no tradable NFT while underfunded");
        h.run_leg_ok(id, i, 777 + i as u128);
    }
    let o = h.c.get_order(U64(id)).unwrap();
    assert_eq!(o.status, OrderStatus::FullyBackedLocked);
    assert_eq!(h.c.nft_total_supply().0, 1);
    assert_eq!(h.c.wnear_accounted, 0);
    let view = h.c.nft_basket(o.token_id.clone().unwrap()).unwrap();
    assert_eq!(view.owner_id, Some(acc(ALICE)));
    assert_eq!(view.effective_state, BackingState::FullyBackedLocked);
    for (i, hd) in view.info.holdings.iter().enumerate() {
        assert_eq!(hd.amount.0, 777 + i as u128);
        assert_eq!(h.c.get_accounted(hd.token.clone()).0, 777 + i as u128);
    }
    // keeper was paid only for steps it started, from the retry reserve
    assert_eq!(o.keeper_fees_paid.0, 10 * MILLI * o.legs.len() as u128);
    assert_eq!(o.refunded.0, 30 * MILLI - o.keeper_fees_paid.0);
    let bytes = env::storage_usage() - storage0;
    let cost = bytes as u128 * env::storage_byte_cost().as_yoctonear();
    println!("storage per mint: {} bytes = {} yoctoNEAR (charged {})", bytes, cost, 12 * MILLI);
    assert!(cost <= 12 * MILLI, "storage_per_mint must cover measured storage ({} bytes)", bytes);
    assert!(get_logs().iter().any(|l| l.contains("mint_settled")));
}

#[test]
fn below_minimum_and_outside_window_rejected() {
    let mut h = H::new();
    h.setup_season(111);
    h.env(ALICE, h.required(99 * MILLI), 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.mint(1, U128(99 * MILLI)))).is_err());
    h.env(ALICE, 100 * MILLI, 300, vec![]); // underpayment (no reserve)
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.mint(1, U128(100 * MILLI)))).is_err());
    h.now += 8 * DAY_NS;
    h.env(ALICE, h.required(100 * MILLI), 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.mint(1, U128(100 * MILLI)))).is_err());
}

#[test]
fn season_is_immutable_once_open_and_capped() {
    let mut h = H::new();
    let sid = h.setup_season(3);
    h.env(OWNER, 0, 300, vec![]);
    let cfg = season_cfg(h.now, 3);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.update_season(sid, cfg.clone()))).is_err());
    assert!(h.c.get_season(sid).unwrap().config_hash.is_some());
    // 3 in-flight orders fill the cap even before settlement
    for _ in 0..3 {
        h.env(ALICE, h.required(100 * MILLI), 300, vec![]);
        h.c.mint(1, U128(100 * MILLI));
    }
    h.env(BOB, h.required(100 * MILLI), 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.mint(1, U128(100 * MILLI)))).is_err());
}

#[test]
fn many_parallel_orders_never_share_ids() {
    let mut h = H::new();
    h.setup_season(150);
    let mut ids = std::collections::HashSet::new();
    for i in 0..120 {
        h.env(if i % 2 == 0 { ALICE } else { BOB }, h.required(100 * MILLI), 300, vec![]);
        assert!(ids.insert(h.c.mint(1, U128(100 * MILLI)).0));
    }
    assert_eq!(h.c.get_season(1).unwrap().in_flight, 120);
    // interleaved settlement of several orders yields unique token ids
    let mut tids = std::collections::HashSet::new();
    for id in [5u64, 2, 9] {
        h.reveal_and_wrap(id);
        let n = h.c.get_order(U64(id)).unwrap().legs.len();
        for i in 0..n {
            h.run_leg_ok(id, i, 1000);
        }
        assert!(tids.insert(h.c.get_order(U64(id)).unwrap().token_id.unwrap()));
    }
}

#[test]
fn token_mutex_blocks_parallel_swaps_on_same_token() {
    let mut h = H::new();
    h.setup_season(10);
    let mut ids = vec![];
    for _ in 0..2 {
        h.env(ALICE, h.required(100 * MILLI), 300, vec![]);
        ids.push(h.c.mint(1, U128(100 * MILLI)).0);
    }
    for id in ids.iter() {
        h.reveal_and_wrap(*id);
    }
    h.start_leg(ids[0], KEEPER); // leg 0 is always WTH
    h.start_leg(ids[1], KEEPER);
    assert_eq!(h.c.get_order(U64(ids[1])).unwrap().legs[0].status, LegStatus::Pending, "second WTH swap must wait");
}

// ───────────────────────── failure policy ─────────────────────────

#[test]
fn quote_failure_before_any_swap_refunds_everything() {
    let mut h = H::new();
    h.setup_season(10);
    let base = 100 * MILLI;
    h.env(ALICE, h.required(base), 300, vec![]);
    let id = h.c.mint(1, U128(base)).0;
    h.reveal_and_wrap(id);
    for attempt in 1..=MAX_LEG_ATTEMPTS {
        h.start_leg(id, ALICE); // payer advancing pays no keeper fee
        h.env(VAULT, 0, 300, vec![H::json_result(U128(0)), PromiseResult::Failed]);
        let _ = h.c.on_leg_prepared(U64(id), 0);
        let o = h.c.get_order(U64(id)).unwrap();
        assert_eq!(o.legs[0].attempts, attempt);
    }
    let o = h.c.get_order(U64(id)).unwrap();
    assert_eq!(o.status, OrderStatus::RefundPending, "{:?}", o.note);
    assert_eq!(h.c.wnear_accounted, 0);
    h.env(VAULT, 0, 100, vec![PromiseResult::Successful(vec![])]);
    assert!(h.c.on_unwrapped_refund(U64(id), U128(base + 42 * MILLI), U128(90 * MILLI), Ok(())));
    let o = h.c.get_order(U64(id)).unwrap();
    assert_eq!(o.status, OrderStatus::Refunded);
    assert_eq!(o.refunded.0, base + 12 * MILLI + 30 * MILLI, "full base + storage + unused reserve");
    assert_eq!(h.c.nft_total_supply().0, 0);
    assert_eq!(h.c.get_season(1).unwrap().in_flight, 0);
}

#[test]
fn rejected_swap_retries_then_partial_recovery_and_unwind_refund() {
    let mut h = H::new();
    h.setup_season(10);
    // find an order with 2 legs (WTH + partner)
    let mut id = 0;
    for _ in 0..20 {
        h.seed[0] = h.seed[0].wrapping_add(1);
        h.env(ALICE, h.required(100 * MILLI), 300, vec![]);
        id = h.c.mint(1, U128(100 * MILLI)).0;
        h.reveal_and_wrap(id);
        if h.c.get_order(U64(id)).unwrap().legs.len() == 2 {
            break;
        }
    }
    assert_eq!(h.c.get_order(U64(id)).unwrap().legs.len(), 2);
    h.run_leg_ok(id, 0, 4242);
    // leg 1: DEX rejects three times (used = 0)
    for _ in 0..MAX_LEG_ATTEMPTS {
        h.start_leg(id, KEEPER);
        h.env(VAULT, 0, 300, vec![H::json_result(U128(10)), H::json_result(U128(500))]);
        let _ = h.c.on_leg_prepared(U64(id), 1);
        h.env(VAULT, 0, 300, vec![H::json_result(U128(0))]);
        let _ = h.c.on_leg_swapped(U64(id), 1, U128(10), Ok(U128(0)));
        h.env(VAULT, 0, 300, vec![H::json_result(U128(10))]);
        assert!(!h.c.on_leg_verified(U64(id), 1, U128(10), Some(U128(0)), Ok(U128(10))));
    }
    let o = h.c.get_order(U64(id)).unwrap();
    assert_eq!(o.status, OrderStatus::PartialExecutionRecovery);
    assert_eq!(h.c.nft_total_supply().0, 0, "never mint a partially funded NFT");
    // unwind leg 0 back to wNEAR at a realized loss, then refund
    h.env(ALICE, 0, 300, vec![]);
    let _ = h.c.unwind_order(U64(id));
    assert!(h.c.wnear_measuring);
    h.env(VAULT, 0, 300, vec![H::json_result(U128(1_000)), H::json_result(U128(40 * MILLI))]);
    let _ = h.c.on_unwind_prepared(U64(id), 0);
    h.env(VAULT, 0, 300, vec![H::json_result(U128(4242))]);
    let _ = h.c.on_unwind_swapped(U64(id), 0, U128(1_000), Ok(U128(4242)));
    let after = 1_000 + 395 * MILLI / 10;
    h.env(VAULT, 0, 300, vec![H::json_result(U128(after))]);
    assert!(h.c.on_unwind_verified(U64(id), 0, U128(1_000), Some(U128(4242)), Ok(U128(after))));
    assert_eq!(h.c.get_accounted(acc(WTH)).0, 0);
    h.env(ALICE, 0, 300, vec![]);
    let _ = h.c.unwind_order(U64(id)); // nothing left: triggers refund
    let o = h.c.get_order(U64(id)).unwrap();
    assert_eq!(o.status, OrderStatus::RefundPending);
    let leg1_unspent = o.legs[1].amount_in.0;
    let expected = 395 * MILLI / 10 + leg1_unspent + 10 * MILLI + 12 * MILLI + (30 * MILLI - o.keeper_fees_paid.0);
    h.env(VAULT, 0, 100, vec![PromiseResult::Successful(vec![])]);
    assert!(h.c.on_unwrapped_refund(U64(id), U128(expected), U128(395 * MILLI / 10 + leg1_unspent), Ok(())));
    assert_eq!(h.c.get_order(U64(id)).unwrap().refunded.0, expected);
    assert_eq!(h.c.wnear_accounted, 0);
}

#[test]
fn anomaly_freezes_order_and_keeps_mutex_until_reconcile() {
    let mut h = H::new();
    h.setup_season(10);
    h.env(ALICE, h.required(100 * MILLI), 300, vec![]);
    let id = h.c.mint(1, U128(100 * MILLI)).0;
    h.reveal_and_wrap(id);
    h.start_leg(id, KEEPER);
    h.env(VAULT, 0, 300, vec![H::json_result(U128(0)), H::json_result(U128(1000))]);
    let _ = h.c.on_leg_prepared(U64(id), 0);
    let amt = h.c.get_order(U64(id)).unwrap().legs[0].amount_in;
    // used full amount but balance unreadable -> anomaly
    h.env(VAULT, 0, 300, vec![PromiseResult::Failed]);
    assert!(!h.c.on_leg_verified(U64(id), 0, U128(0), Some(amt), Err(near_sdk::PromiseError::Failed)));
    assert_eq!(h.c.get_order(U64(id)).unwrap().status, OrderStatus::PartialExecutionRecovery);
    assert!(h.c.busy.contains(&acc(WTH)));
    // reconcile credits the vault's unclaimed surplus only
    h.env(VAULT, 0, 300, vec![H::json_result(U128(990))]);
    assert!(h.c.on_reconcile(U64(id), 0, Ok(U128(990))));
    let o = h.c.get_order(U64(id)).unwrap();
    assert_eq!(o.legs[0].acquired.0, 990);
    assert!(!h.c.busy.contains(&acc(WTH)));
    assert_eq!(o.legs[0].status, LegStatus::Done);
}

// ───────────────────────── ownership, redemption, marketplace ─────────────────────────

#[test]
fn sold_while_locked_buyer_inherits_full_claim_seller_cannot_redeem() {
    let mut h = H::new();
    h.setup_season(10);
    let (_, tid) = h.mint_funded(ALICE, 100 * MILLI);
    // redeem while locked fails even for owner
    h.env(ALICE, 1, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.redeem(tid.clone(), None, None))).is_err());
    // marketplace sale while locked via approval + nft_transfer_payout
    h.env(ALICE, 10 * MILLI, 300, vec![]);
    let _ = h.c.nft_approve(tid.clone(), acc(MARKET), None);
    let appr = *h.c.nft_token(tid.clone()).unwrap().approved_account_ids.unwrap().get(&acc(MARKET)).unwrap();
    h.env(MARKET, 1, 300, vec![]);
    let payout = h.c.nft_transfer_payout(acc(BOB), tid.clone(), Some(appr), None, U128(10 * NEAR), Some(10)).payout;
    assert_eq!(payout[&acc(ALICE)].0, 9_750 * MILLI);
    assert_eq!(h.c.nft_token(tid.clone()).unwrap().owner_id, acc(BOB));
    // stale approval cannot be reused
    h.env(MARKET, 1, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.nft_transfer(acc(MARKET), tid.clone(), Some(appr), None))).is_err());
    // after unlock, only Bob can redeem
    h.now += 31 * DAY_NS;
    h.env(ALICE, 1, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.redeem(tid.clone(), None, None))).is_err());
    h.env(BOB, 1, 300, vec![]);
    let _ = h.c.redeem(tid.clone(), None, None);
    let info = h.c.nft_basket(tid.clone()).unwrap().info;
    assert_eq!(info.state, BackingState::Redeeming);
    // cannot transfer or list mid-redemption
    h.env(BOB, 1, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.nft_transfer(acc(ALICE), tid.clone(), None, None))).is_err());
    for hd in info.holdings.iter() {
        h.env(VAULT, 0, 100, vec![PromiseResult::Successful(vec![])]);
        assert!(h.c.on_redeem_transfer(tid.clone(), hd.token.clone(), hd.pending_out, acc(BOB), Ok(())));
        assert_eq!(h.c.get_accounted(hd.token.clone()).0, 0);
    }
    let v = h.c.nft_basket(tid.clone()).unwrap();
    assert_eq!(v.effective_state, BackingState::RedeemedEmpty);
    assert!(v.info.holdings.iter().all(|x| x.amount.0 == 0));
    // cannot redeem twice
    h.env(BOB, 1, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.redeem(tid.clone(), None, None))).is_err());
    // EMPTY card is still a transferable collectible
    h.env(BOB, 1, 300, vec![]);
    h.c.nft_transfer(acc(ALICE), tid.clone(), None, None);
}

#[test]
fn redemption_revokes_marketplace_approvals_and_failed_transfer_restores_claim() {
    let mut h = H::new();
    h.setup_season(10);
    let (_, tid) = h.mint_funded(ALICE, 100 * MILLI);
    h.now += 31 * DAY_NS;
    h.env(ALICE, 10 * MILLI, 300, vec![]);
    let _ = h.c.nft_approve(tid.clone(), acc(MARKET), None);
    h.env(ALICE, 1, 300, vec![]);
    let _ = h.c.redeem(tid.clone(), Some(acc(BOB)), None);
    assert!(!h.c.nft_is_approved(tid.clone(), acc(MARKET), None), "listing must die when redemption starts");
    let info = h.c.nft_basket(tid.clone()).unwrap().info;
    let first = info.holdings[0].clone();
    h.env(VAULT, 0, 100, vec![PromiseResult::Failed]);
    assert!(!h.c.on_redeem_transfer(tid.clone(), first.token.clone(), first.pending_out, acc(BOB), Err(near_sdk::PromiseError::Failed)));
    let after = h.c.nft_basket(tid.clone()).unwrap().info;
    assert_eq!(after.holdings[0].amount, first.pending_out, "failed transfer returns the claim to the NFT");
    assert!(h.c.get_accounted(first.token.clone()).0 > 0);
}

#[test]
fn reload_rebuys_same_composition_with_new_lock() {
    let mut h = H::new();
    h.setup_season(10);
    let (_, tid) = h.mint_funded(ALICE, 100 * MILLI);
    let before = h.c.nft_basket(tid.clone()).unwrap().info;
    h.now += 31 * DAY_NS;
    h.env(ALICE, 1, 300, vec![]);
    let _ = h.c.redeem(tid.clone(), None, None);
    for hd in before.holdings.iter() {
        h.env(VAULT, 0, 100, vec![PromiseResult::Successful(vec![])]);
        h.c.on_redeem_transfer(tid.clone(), hd.token.clone(), hd.amount, acc(ALICE), Ok(()));
    }
    // Season 01 window is over; reload happens in an eligible new season
    h.env(OWNER, 0, 300, vec![]);
    let s2 = h.c.create_season(season_cfg(h.now, 50));
    h.c.open_season(s2);
    h.env(ALICE, 200 * MILLI + 30 * MILLI, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.reload(tid.clone(), 1, U128(200 * MILLI)))).is_err(), "closed-window season rejects reload");
    // reload without deposit fails
    h.env(ALICE, 0, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.reload(tid.clone(), s2, U128(200 * MILLI)))).is_err());
    h.env(ALICE, 200 * MILLI + 30 * MILLI, 300, vec![]);
    let oid = h.c.reload(tid.clone(), s2, U128(200 * MILLI)).0;
    let o = h.c.get_order(U64(oid)).unwrap();
    assert_eq!(o.legs.iter().map(|l| (l.token.clone(), l.bps)).collect::<Vec<_>>(), before.holdings.iter().map(|x| (x.token.clone(), x.bps)).collect::<Vec<_>>());
    assert_eq!(h.c.nft_basket(tid.clone()).unwrap().info.state, BackingState::Reloading);
    h.env(VAULT, 0, 100, vec![PromiseResult::Successful(vec![])]);
    let _ = h.c.on_wrapped(U64(oid), Ok(()));
    for i in 0..o.legs.len() {
        h.run_leg_ok(oid, i, 50);
    }
    let v = h.c.nft_basket(tid.clone()).unwrap();
    assert_eq!(v.effective_state, BackingState::FullyBackedLocked);
    assert_eq!(v.info.traits, before.traits, "reload never re-rolls art");
    assert_eq!(v.info.reload_count, 1);
    assert_eq!(v.info.lock_until_ns.0, h.now + 30 * DAY_NS);
    assert_eq!(h.c.nft_total_supply().0, 1, "reload does not mint a new token");
}

#[test]
fn no_admin_path_moves_backed_funds_and_media_pins_once() {
    let mut h = H::new();
    h.setup_season(10);
    let (_, tid) = h.mint_funded(ALICE, 100 * MILLI);
    h.now += 31 * DAY_NS;
    // owner/operator cannot redeem someone else's card
    h.env(OWNER, 1, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.redeem(tid.clone(), Some(acc(OWNER)), None))).is_err());
    h.env(OWNER, 0, 300, vec![]);
    h.c.set_token_media(tid.clone(), "ipfs://bafyexample".into(), near_sdk::json_types::Base64VecU8(vec![1; 32]));
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.set_token_media(tid.clone(), "ipfs://other".into(), near_sdk::json_types::Base64VecU8(vec![2; 32])))).is_err());
    // pausing mints does not block redemption
    h.c.set_mints_paused(true);
    h.env(ALICE, 1, 300, vec![]);
    let _ = h.c.redeem(tid.clone(), None, None);
    assert_eq!(effective_state(&h.c.nft_basket(tid).unwrap().info, h.now), BackingState::Redeeming);
}

#[test]
fn random_operator_cannot_touch_config() {
    let mut h = H::new();
    h.env(ALICE, 0, 300, vec![]);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.create_season(season_cfg(h.now, 5)))).is_err());
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.set_mints_paused(true))).is_err());
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| h.c.set_revenue_accounts(acc(ALICE), acc(ALICE)))).is_err());
}

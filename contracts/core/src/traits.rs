//! WTN-TRAITS-v1 — exact mirror of packages/domain/src/{rng,traits,allocation}.ts.
//! Cross-checked against test-vectors/traits-v1.json in unit tests.

use crate::types::*;

pub const TRAITS_DOMAIN: &[u8] = b"WTN-TRAITS-v1";
pub const MAX_ATTEMPTS: u32 = 8;
const LABELS_PER_ATTEMPT: u32 = 32;

pub type Sha256Fn = fn(&[u8]) -> [u8; 32];

pub fn derive_seed(sha: Sha256Fn, random_seed: &[u8; 32], order_id: u64) -> [u8; 32] {
    let mut buf = Vec::with_capacity(TRAITS_DOMAIN.len() + 40);
    buf.extend_from_slice(TRAITS_DOMAIN);
    buf.extend_from_slice(random_seed);
    buf.extend_from_slice(&order_id.to_le_bytes());
    sha(&buf)
}

pub struct Drawer {
    seed: [u8; 32],
    sha: Sha256Fn,
}

impl Drawer {
    pub fn new(sha: Sha256Fn, seed: [u8; 32]) -> Self {
        Self { seed, sha }
    }
    pub fn draw(&self, label: u32) -> u64 {
        let mut buf = [0u8; 36];
        buf[..32].copy_from_slice(&self.seed);
        buf[32..].copy_from_slice(&label.to_le_bytes());
        let h = (self.sha)(&buf);
        u64::from_le_bytes(h[..8].try_into().unwrap())
    }
    pub fn pick(&self, label: u32, n: u64) -> u64 {
        assert!(n > 0, "pick over zero");
        self.draw(label) % n
    }
}

/// tokenWeightBps with largest-remainder apportionment. Returns (meme_idx, bps) in canonical
/// order (WTH first, then first slot appearance), zero-weight entries removed.
pub fn token_weights(providers: &[u8; SLOT_COUNT], alloc: &AllocationConfig) -> Vec<(u8, u16)> {
    let core = alloc.core_wth_bps as u64;
    let variable = 10_000 - core;
    let mut order: Vec<u8> = vec![0];
    for p in providers.iter() {
        if !order.contains(p) {
            order.push(*p);
        }
    }
    let mut num: Vec<u64> = vec![0; order.len()];
    num[0] = core * 10_000;
    for (s, p) in providers.iter().enumerate() {
        let i = order.iter().position(|x| x == p).unwrap();
        num[i] += alloc.slot_weights_bps[s] as u64 * variable;
    }
    let mut floors: Vec<u64> = num.iter().map(|n| n / 10_000).collect();
    let rems: Vec<u64> = num.iter().map(|n| n % 10_000).collect();
    let mut remaining: i64 = 10_000 - floors.iter().sum::<u64>() as i64;
    let mut idx: Vec<usize> = (0..order.len()).collect();
    // sort by remainder desc, then index asc (stable)
    idx.sort_by(|a, b| rems[*b].cmp(&rems[*a]).then(a.cmp(b)));
    for i in idx {
        if remaining <= 0 {
            break;
        }
        if rems[i] > 0 {
            floors[i] += 1;
            remaining -= 1;
        }
    }
    order.into_iter().zip(floors).filter(|(_, f)| *f > 0).map(|(m, f)| (m, f as u16)).collect()
}

/// floor(basket * bps / 10000) per leg; dust to the first (WTH) leg.
pub fn leg_amounts(basket: u128, weights: &[(u8, u16)]) -> Vec<(u8, u16, u128)> {
    let mut legs: Vec<(u8, u16, u128)> = weights.iter().map(|(m, b)| (*m, *b, basket * (*b as u128) / BPS)).collect();
    let sum: u128 = legs.iter().map(|l| l.2).sum();
    if let Some(first) = legs.first_mut() {
        first.2 += basket - sum;
    }
    legs
}

pub fn roll_rarity(d: &Drawer, bps: &[u16; crate::types::RARITY_TIERS]) -> u8 {
    let r = d.pick(0, 10_000);
    let mut acc = 0u64;
    for (i, b) in bps.iter().enumerate() {
        acc += *b as u64;
        if r < acc {
            return i as u8;
        }
    }
    unreachable!("rarity bps must sum to 10000")
}

fn compose(d: &Drawer, memes: &[SeasonMeme], wth_slot_bps: u16, max_partners: u8, base: u32, partners_allowed: bool) -> [SlotPick; SLOT_COUNT] {
    let mut partners: Vec<usize> = vec![];
    if partners_allowed {
        let mut pool: Vec<usize> = (1..memes.len()).filter(|i| memes[*i].weight > 0).collect();
        let mut j = 0u32;
        while j < max_partners as u32 && !pool.is_empty() {
            let total: u64 = pool.iter().map(|i| memes[*i].weight as u64).sum();
            let mut r = d.pick(base + j, total);
            let mut k = 0usize;
            while r >= memes[pool[k]].weight as u64 {
                r -= memes[pool[k]].weight as u64;
                k += 1;
            }
            partners.push(pool.remove(k));
            j += 1;
        }
    }
    core::array::from_fn(|s| {
        let eligible: Vec<usize> = partners.iter().copied().filter(|p| memes[*p].slot_variants[s] > 0).collect();
        let mut provider = 0usize;
        if !eligible.is_empty() && d.pick(base + 8 + s as u32, 10_000) >= wth_slot_bps as u64 {
            provider = eligible[d.pick(base + 16 + s as u32, eligible.len() as u64) as usize];
        }
        let variant = d.pick(base + 24 + s as u32, memes[provider].slot_variants[s] as u64) as u16;
        SlotPick { meme_idx: provider as u8, variant }
    })
}

pub struct Derived {
    pub traits: Traits,
    pub legs: Vec<(u8, u16, u128)>,
}

pub fn derive_traits(sha: Sha256Fn, seed: [u8; 32], cfg: &SeasonConfig, max_partners: u8, basket: u128) -> Derived {
    let d = Drawer::new(sha, seed);
    let rarity = roll_rarity(&d, &cfg.rarity_bps);
    let min_leg = cfg.min_leg.0;
    for attempt in 0..=MAX_ATTEMPTS {
        let base = 1 + attempt * LABELS_PER_ATTEMPT;
        let slots = compose(&d, &cfg.memes, cfg.wth_slot_bps, max_partners, base, attempt < MAX_ATTEMPTS);
        let providers: [u8; SLOT_COUNT] = core::array::from_fn(|i| slots[i].meme_idx);
        let weights = token_weights(&providers, &cfg.allocation);
        let legs = leg_amounts(basket, &weights);
        if legs.iter().all(|l| l.2 >= min_leg) || attempt == MAX_ATTEMPTS {
            return Derived { traits: Traits { rarity, attempt: attempt as u8, slots }, legs };
        }
    }
    unreachable!()
}

import { DEFAULT_ALLOCATION_RULE, SLOTS, legAmounts, tokenWeights, type AllocationRule, type LegAmount, type Slot, type SlotProviders, type TokenWeight } from "./allocation";
import { Drawer } from "./rng";

export const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
export type Rarity = (typeof RARITIES)[number];
export const DEFAULT_RARITY_BPS: [number, number, number, number] = [7000, 2200, 700, 100];

export const MAX_ATTEMPTS = 8;
const LABELS_PER_ATTEMPT = 32;

export interface DerivationMeme {
  memeId: string;
  /** Partner selection weight (ignored for index 0 / WTH). */
  weight: number;
  /** Variant count per slot in SLOTS order; 0 = no approved art for that slot. */
  slotVariants: [number, number, number, number, number, number];
}

export interface DerivationConfig {
  /** memes[0] MUST be WTH and must have >=1 variant for every slot. */
  memes: DerivationMeme[];
  rarityBps: [number, number, number, number];
  /** Chance (bps) that a slot stays WTH even when a chosen partner has art for it. */
  wthSlotBps: number;
  /** Max partner memes for this price tier (1 => WTH + one partner). */
  maxPartners: number;
  /** Every nonzero leg must be >= this amount of basket principal (yoctoNEAR). */
  minLegAmount: bigint;
  allocationRule?: AllocationRule;
}

export interface SlotTrait {
  slot: Slot;
  memeId: string;
  variant: number;
}

export interface DerivedTraits {
  rarity: Rarity;
  /** Which attempt produced the composition; MAX_ATTEMPTS means the all-WTH fallback. */
  attempt: number;
  partners: string[];
  slots: SlotTrait[];
  weights: TokenWeight[];
  legs: LegAmount[];
}

export function validateDerivationConfig(c: DerivationConfig): void {
  if (c.memes.length < 1) throw new Error("season needs WTH as memes[0]");
  const wth = c.memes[0]!;
  if (wth.slotVariants.some((v) => v < 1)) throw new Error("WTH must provide art for every slot");
  const ids = new Set<string>();
  for (const m of c.memes) {
    if (ids.has(m.memeId)) throw new Error(`duplicate memeId ${m.memeId}`);
    ids.add(m.memeId);
    if (m.slotVariants.length !== 6 || m.slotVariants.some((v) => !Number.isInteger(v) || v < 0 || v > 65535)) throw new Error(`bad slotVariants for ${m.memeId}`);
    if (!Number.isInteger(m.weight) || m.weight < 0) throw new Error(`bad weight for ${m.memeId}`);
  }
  if (c.rarityBps.reduce((a, b) => a + b, 0) !== 10_000 || c.rarityBps.some((b) => !Number.isInteger(b) || b < 0)) {
    throw new Error("rarity bps must be non-negative integers summing to 10000");
  }
  if (!Number.isInteger(c.wthSlotBps) || c.wthSlotBps < 0 || c.wthSlotBps > 10_000) throw new Error("wthSlotBps out of range");
  if (!Number.isInteger(c.maxPartners) || c.maxPartners < 0 || c.maxPartners > 5) throw new Error("maxPartners must be 0..5");
  if (c.minLegAmount < 0n) throw new Error("minLegAmount negative");
}

export function rollRarity(d: Drawer, bps: readonly number[]): Rarity {
  const r = d.pick(0, 10_000);
  let acc = 0;
  for (let i = 0; i < bps.length; i++) {
    acc += bps[i]!;
    if (r < acc) return RARITIES[i]!;
  }
  throw new Error("unreachable rarity");
}

function compose(d: Drawer, c: DerivationConfig, base: number, partnersAllowed: boolean): { partners: string[]; slots: SlotTrait[] } {
  const partners: DerivationMeme[] = [];
  if (partnersAllowed) {
    const pool = c.memes.slice(1).filter((m) => m.weight > 0);
    for (let j = 0; j < c.maxPartners && pool.length > 0; j++) {
      const total = pool.reduce((a, m) => a + m.weight, 0);
      let r = d.pick(base + j, total);
      let idx = 0;
      while (r >= pool[idx]!.weight) {
        r -= pool[idx]!.weight;
        idx++;
      }
      partners.push(pool[idx]!);
      pool.splice(idx, 1);
    }
  }
  const wth = c.memes[0]!;
  const slots: SlotTrait[] = SLOTS.map((slot, s) => {
    const eligible = partners.filter((p) => p.slotVariants[s]! > 0);
    let provider = wth;
    if (eligible.length > 0 && d.pick(base + 8 + s, 10_000) >= c.wthSlotBps) {
      provider = eligible[d.pick(base + 16 + s, eligible.length)]!;
    }
    return { slot, memeId: provider.memeId, variant: d.pick(base + 24 + s, provider.slotVariants[s]!) };
  });
  return { partners: partners.map((p) => p.memeId), slots };
}

/**
 * Deterministically derive rarity + composition + leg amounts from a 32-byte seed.
 * Nobody (user, keeper, admin) can choose among outcomes: non-viable compositions are
 * re-drawn with the next attempt's labels, and the final fallback is all-WTH.
 * Mirrored by contracts/core/src/traits.rs (see test-vectors/traits-v1.json).
 */
export function deriveTraits(seed: Uint8Array, c: DerivationConfig, basket: bigint): DerivedTraits {
  validateDerivationConfig(c);
  const d = new Drawer(seed);
  const rule = c.allocationRule ?? DEFAULT_ALLOCATION_RULE;
  const wthId = c.memes[0]!.memeId;
  const rarity = rollRarity(d, c.rarityBps);
  for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
    const base = 1 + attempt * LABELS_PER_ATTEMPT;
    const { partners, slots } = compose(d, c, base, attempt < MAX_ATTEMPTS);
    const providers = Object.fromEntries(slots.map((s) => [s.slot, s.memeId])) as SlotProviders;
    const weights = tokenWeights(providers, wthId, rule);
    const legs = legAmounts(basket, weights);
    if (legs.every((l) => l.amountIn >= c.minLegAmount) || attempt === MAX_ATTEMPTS) {
      const used = new Set(weights.map((w) => w.memeId));
      return { rarity, attempt, partners: partners.filter((p) => used.has(p)), slots, weights, legs };
    }
  }
  throw new Error("unreachable");
}

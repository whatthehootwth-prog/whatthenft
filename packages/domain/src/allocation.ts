import { BPS } from "./units";

export const SLOTS = ["head", "face", "body", "arms", "legs", "accessory"] as const;
export type Slot = (typeof SLOTS)[number];

/** Share of the variable allocation each economic slot controls (bps, sums to 10000). */
export const DEFAULT_SLOT_WEIGHTS_BPS: Record<Slot, number> = {
  head: 2000,
  face: 1000,
  body: 2500,
  arms: 1000,
  legs: 1000,
  accessory: 2500,
};

export interface AllocationRule {
  /** Guaranteed WTH share of the whole basket, bps. Default 2000. */
  coreWthBps: number;
  slotWeightsBps: Record<Slot, number>;
}

export const DEFAULT_ALLOCATION_RULE: AllocationRule = {
  coreWthBps: 2000,
  slotWeightsBps: DEFAULT_SLOT_WEIGHTS_BPS,
};

export function validateAllocationRule(r: AllocationRule): void {
  if (!Number.isInteger(r.coreWthBps) || r.coreWthBps < 0 || r.coreWthBps > 10_000) throw new Error("coreWthBps out of range");
  let sum = 0;
  for (const s of SLOTS) {
    const w = r.slotWeightsBps[s];
    if (!Number.isInteger(w) || w < 0) throw new Error(`slot weight ${s} invalid`);
    sum += w;
  }
  if (sum !== 10_000) throw new Error(`slot weights must sum to 10000, got ${sum}`);
}

/** Composition: which token (by memeId) provides each slot. */
export type SlotProviders = Record<Slot, string>;

export interface TokenWeight {
  memeId: string;
  bps: number;
}

/**
 * tokenWeightBps[t] = (t == WTH ? core : 0) + sum(slotWeight * (10000 - core) / 10000)
 *
 * Integer-exact via largest-remainder apportionment on numerators scaled by 10000.
 * Ties broken by canonical order (WTH first, then first slot appearance), which is
 * also how contracts/core breaks them. The result always sums to exactly 10000.
 */
export function tokenWeights(providers: SlotProviders, wthId: string, rule: AllocationRule = DEFAULT_ALLOCATION_RULE): TokenWeight[] {
  validateAllocationRule(rule);
  const variable = 10_000 - rule.coreWthBps;
  // canonical order
  const order: string[] = [wthId];
  for (const s of SLOTS) if (!order.includes(providers[s])) order.push(providers[s]);
  // numerators in units of 1/10000 bps
  const num = new Map<string, number>(order.map((id) => [id, 0]));
  num.set(wthId, rule.coreWthBps * 10_000);
  for (const s of SLOTS) {
    const id = providers[s];
    num.set(id, num.get(id)! + rule.slotWeightsBps[s] * variable);
  }
  const floors = order.map((id) => ({ id, floor: Math.floor(num.get(id)! / 10_000), rem: num.get(id)! % 10_000 }));
  let remaining = 10_000 - floors.reduce((a, f) => a + f.floor, 0);
  const byRem = floors.map((f, i) => ({ ...f, i })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const f of byRem) {
    if (remaining <= 0) break;
    if (f.rem > 0) {
      floors[f.i]!.floor += 1;
      remaining -= 1;
    }
  }
  return floors.filter((f) => f.floor > 0).map((f) => ({ memeId: f.id, bps: f.floor }));
}

export interface LegAmount {
  memeId: string;
  bps: number;
  amountIn: bigint;
}

/**
 * Apply weights to the basket principal. Each leg = floor(basket * bps / 10000);
 * leftover dust is added to the first (WTH) leg so sum(amountIn) === basket exactly.
 */
export function legAmounts(basket: bigint, weights: TokenWeight[]): LegAmount[] {
  const total = weights.reduce((a, w) => a + w.bps, 0);
  if (total !== 10_000) throw new Error(`weights must sum to 10000, got ${total}`);
  const legs = weights.map((w) => ({ memeId: w.memeId, bps: w.bps, amountIn: (basket * BigInt(w.bps)) / BPS }));
  const dust = basket - legs.reduce((a, l) => a + l.amountIn, 0n);
  if (legs.length > 0) legs[0]!.amountIn += dust;
  return legs;
}

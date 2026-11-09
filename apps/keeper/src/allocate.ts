/**
 * Pure, exact (bigint) payout math for a buyback round:
 * split `total` WTH across $WTH holders in proportion to their balance.
 */
import { createHash } from "node:crypto";

export interface Holder {
  account_id: string;
  /** Raw token units (18 decimals for WTH). */
  balance: bigint;
}

export interface AllocationRules {
  /** Accounts that never receive a payout (pools, launchpad, custody contracts, the treasury itself). */
  exclude: string[];
  /** Holders below this balance don't qualify. */
  minHolding: bigint;
  /** Payouts below this are dropped; their WTH rolls over to the next round. */
  minPayout: bigint;
}

export interface Allocation {
  payouts: { account_id: string; amount: bigint }[];
  /** Sum of payouts (≤ total). */
  allocated: bigint;
  /** total − allocated: stays in the treasury for the next round. */
  rollover: bigint;
  /** Combined balance of qualifying holders (the denominator). */
  eligibleBalance: bigint;
  skipped: { account_id: string; reason: "excluded" | "below_min_holding" | "below_min_payout" }[];
}

export function allocate(holders: Holder[], total: bigint, rules: AllocationRules): Allocation {
  if (total < 0n) throw new Error("total must be non-negative");
  const excluded = new Set(rules.exclude.map((a) => a.toLowerCase()));
  const seen = new Set<string>();
  const skipped: Allocation["skipped"] = [];
  const eligible: Holder[] = [];
  for (const h of holders) {
    const id = h.account_id.toLowerCase();
    if (seen.has(id)) throw new Error(`duplicate holder ${id}`);
    seen.add(id);
    if (h.balance <= 0n) continue;
    if (excluded.has(id)) skipped.push({ account_id: id, reason: "excluded" });
    else if (h.balance < rules.minHolding) skipped.push({ account_id: id, reason: "below_min_holding" });
    else eligible.push({ account_id: id, balance: h.balance });
  }
  const eligibleBalance = eligible.reduce((a, h) => a + h.balance, 0n);
  if (eligibleBalance === 0n || total === 0n) return { payouts: [], allocated: 0n, rollover: total, eligibleBalance, skipped };

  // Floor division: never over-allocates. Deterministic order (largest first, then name).
  eligible.sort((a, b) => (a.balance === b.balance ? a.account_id.localeCompare(b.account_id) : a.balance > b.balance ? -1 : 1));
  const payouts: Allocation["payouts"] = [];
  for (const h of eligible) {
    const amount = (total * h.balance) / eligibleBalance;
    if (amount < rules.minPayout || amount === 0n) skipped.push({ account_id: h.account_id, reason: "below_min_payout" });
    else payouts.push({ account_id: h.account_id, amount });
  }
  const allocated = payouts.reduce((a, p) => a + p.amount, 0n);
  return { payouts, allocated, rollover: total - allocated, eligibleBalance, skipped };
}

/** Canonical JSON for a round snapshot → sha256 hex (recorded on-chain by start_round). */
export function snapshotHash(doc: unknown): string {
  return createHash("sha256").update(canonical(doc)).digest("hex");
}

export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) => {
    if (typeof x === "bigint") return x.toString();
    if (x && typeof x === "object" && !Array.isArray(x)) return Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]]));
    return x;
  });
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

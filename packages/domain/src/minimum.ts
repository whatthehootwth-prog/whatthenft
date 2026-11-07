import { DEFAULT_ALLOCATION_RULE, SLOTS, type AllocationRule } from "./allocation";
import { DEFAULT_MINT_FEES, type MintFeeSchedule } from "./fees";
import { ceilDiv } from "./units";

export type RouteKind = "rhea-dcl" | "rhea-v2" | "1click";

export interface MemeRouteInfo {
  memeId: string;
  isWth: boolean;
  /** Slots this meme has approved art for (WTH: all). */
  eligibleSlots: (typeof SLOTS)[number][];
  route: RouteKind | null;
  /** Route-imposed minimum input (yoctoNEAR of wNEAR). 0n if the venue has none. */
  routeMinInput: bigint;
  enabled: boolean;
}

/** A real quote observed for wNEAR -> meme at a given input size. */
export interface ProbeQuote {
  memeId: string;
  amountIn: bigint;
  /** null when the provider returned an error / no liquidity. */
  amountOut: bigint | null;
  /** Price impact vs a tiny reference trade, bps. null if not measurable. */
  priceImpactBps: number | null;
  quotedAt: number; // epoch ms
  provider: string;
  error?: string;
}

export interface ExecutionCostModel {
  /** NEAR storage staked for one minted NFT + ledger rows (yocto). */
  storagePerMint: bigint;
  /** Fixed per-step reimbursement to whoever advances the order (yocto). */
  advanceFeePerStep: bigint;
  /** Steps independent of leg count (wrap, reveal, finalize). */
  baseSteps: number;
  /** Steps per token leg (quote, swap, verify). */
  stepsPerLeg: number;
}

export interface PriceTier {
  minBase: bigint;
  maxPartners: number;
}

export interface MinimumInputs {
  seasonId: number;
  targetBase: bigint;
  maxBase: bigint;
  fees?: MintFeeSchedule;
  allocationRule?: AllocationRule;
  minLegAmount: bigint;
  maxPriceImpactBps: number;
  quoteMaxAgeMs: number;
  tiers: PriceTier[];
  memes: MemeRouteInfo[];
  quotes: ProbeQuote[];
  costs: ExecutionCostModel;
  now: number;
}

export type MemeBlocker = "ROUTE_DISABLED" | "NO_ROUTE" | "NO_QUOTE" | "QUOTE_EXPIRED" | "NO_LIQUIDITY" | "PRICE_IMPACT_TOO_HIGH";

export interface MemeMinimum {
  memeId: string;
  minShareBps: number;
  requiredLeg: bigint | null;
  requiredBase: bigint | null;
  blocker: MemeBlocker | null;
  detail: string;
}

export interface MinimumResult {
  seasonId: number;
  targetBase: bigint;
  /** null => minting is not currently executable at any amount. */
  executableMinimum: bigint | null;
  targetFeasible: boolean;
  perMeme: MemeMinimum[];
  reasons: string[];
  /** Max execution reserve charged ON TOP of the base price (unused part refunded). */
  executionReserve(maxDistinctAssets: number): bigint;
  maxPartnersFor(base: bigint): number;
  check(base: bigint): { ok: boolean; reason: string | null; maxPartners: number };
}

/** Smallest nonzero share of the whole basket this meme can receive. */
export function minShareBps(m: MemeRouteInfo, rule: AllocationRule = DEFAULT_ALLOCATION_RULE): number {
  const variable = 10_000 - rule.coreWthBps;
  if (m.isWth) return rule.coreWthBps > 0 ? rule.coreWthBps : Math.min(...SLOTS.map((s) => Math.floor((rule.slotWeightsBps[s] * variable) / 10_000)));
  const shares = m.eligibleSlots.map((s) => Math.floor((rule.slotWeightsBps[s] * variable) / 10_000)).filter((x) => x > 0);
  return shares.length ? Math.min(...shares) : 0;
}

/**
 * getExecutableMintMinimum: the smallest base mint price at which EVERY meme in the
 * frozen season pool can be bought at its smallest possible share, using real quotes.
 * Never invents a quote: missing/expired/failed quotes block the result.
 */
export function getExecutableMintMinimum(i: MinimumInputs): MinimumResult {
  const fees = i.fees ?? DEFAULT_MINT_FEES;
  const rule = i.allocationRule ?? DEFAULT_ALLOCATION_RULE;
  const reasons: string[] = [];
  const perMeme: MemeMinimum[] = [];

  for (const m of i.memes) {
    const share = minShareBps(m, rule);
    const base: Omit<MemeMinimum, "blocker" | "detail"> = { memeId: m.memeId, minShareBps: share, requiredLeg: null, requiredBase: null };
    if (!m.enabled) {
      perMeme.push({ ...base, blocker: "ROUTE_DISABLED", detail: "Route disabled by operator circuit breaker" });
      continue;
    }
    if (!m.route) {
      perMeme.push({ ...base, blocker: "NO_ROUTE", detail: "No verified swap route" });
      continue;
    }
    const qs = i.quotes.filter((q) => q.memeId === m.memeId).sort((a, b) => (a.amountIn < b.amountIn ? -1 : 1));
    if (qs.length === 0) {
      perMeme.push({ ...base, blocker: "NO_QUOTE", detail: "No live quote available" });
      continue;
    }
    if (qs.some((q) => i.now - q.quotedAt > i.quoteMaxAgeMs)) {
      perMeme.push({ ...base, blocker: "QUOTE_EXPIRED", detail: `Quote older than ${Math.round(i.quoteMaxAgeMs / 1000)}s` });
      continue;
    }
    // Smallest probe size that executes within the impact ceiling.
    const good = qs.find((q) => q.amountOut !== null && q.amountOut > 0n && q.priceImpactBps !== null && q.priceImpactBps <= i.maxPriceImpactBps && q.amountIn >= m.routeMinInput);
    if (!good) {
      const anyLiquidity = qs.some((q) => q.amountOut !== null && q.amountOut > 0n);
      perMeme.push({
        ...base,
        blocker: anyLiquidity ? "PRICE_IMPACT_TOO_HIGH" : "NO_LIQUIDITY",
        detail: anyLiquidity ? `Price impact above ${i.maxPriceImpactBps} bps at probed sizes` : qs[0]!.error ?? "Provider returned no output",
      });
      continue;
    }
    // Probes above the smallest working size must also stay within impact limits, otherwise
    // larger mints would exceed the ceiling; that bounds the max base instead.
    let requiredLeg = i.minLegAmount;
    if (m.routeMinInput > requiredLeg) requiredLeg = m.routeMinInput;
    if (good.amountIn > requiredLeg) requiredLeg = good.amountIn;
    if (share <= 0) {
      perMeme.push({ ...base, blocker: "NO_ROUTE", detail: "Meme has no eligible slot" });
      continue;
    }
    const requiredBasket = ceilDiv(requiredLeg * 10_000n, BigInt(share));
    const requiredBase = ceilDiv(requiredBasket * 10_000n, BigInt(fees.basketBps));
    perMeme.push({ ...base, requiredLeg, requiredBase, blocker: null, detail: `via ${good.provider}` });
  }

  const blocked = perMeme.filter((p) => p.blocker);
  for (const b of blocked) reasons.push(`${b.memeId}: ${b.blocker} — ${b.detail}`);
  let executableMinimum: bigint | null = null;
  if (blocked.length === 0 && perMeme.length > 0) {
    executableMinimum = perMeme.reduce((a, p) => (p.requiredBase! > a ? p.requiredBase! : a), 0n);
    if (executableMinimum < i.targetBase) executableMinimum = i.targetBase;
    if (executableMinimum > i.maxBase) {
      reasons.push(`Executable minimum exceeds season maximum`);
      executableMinimum = null;
    }
  }
  if (perMeme.length === 0) reasons.push("Season has no memes configured");
  const targetFeasible = executableMinimum !== null && executableMinimum <= i.targetBase;
  if (executableMinimum !== null && !targetFeasible) reasons.push(`Target base is below the executable minimum`);

  const tiers = [...i.tiers].sort((a, b) => (a.minBase < b.minBase ? -1 : 1));
  const maxPartnersFor = (b: bigint): number => tiers.filter((t) => b >= t.minBase).reduce((_, t) => t.maxPartners, 0);

  return {
    seasonId: i.seasonId,
    targetBase: i.targetBase,
    executableMinimum,
    targetFeasible,
    perMeme,
    reasons,
    executionReserve: (maxDistinct: number) =>
      i.costs.storagePerMint + i.costs.advanceFeePerStep * BigInt(i.costs.baseSteps + i.costs.stepsPerLeg * Math.max(1, maxDistinct)),
    maxPartnersFor,
    check(b: bigint) {
      if (executableMinimum === null) return { ok: false, reason: reasons[0] ?? "Minting not executable", maxPartners: 0 };
      if (b < executableMinimum) return { ok: false, reason: "Below current executable minimum", maxPartners: 0 };
      if (b > i.maxBase) return { ok: false, reason: "Above season maximum", maxPartners: 0 };
      return { ok: true, reason: null, maxPartners: maxPartnersFor(b) };
    },
  };
}

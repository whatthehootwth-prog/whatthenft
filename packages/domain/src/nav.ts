/**
 * NAV for a basket. Values come only from executable SELL quotes (meme -> wNEAR) when
 * available; otherwise an indicative spot value is labelled ESTIMATED. A missing price
 * is UNAVAILABLE — never zero, never invented.
 */
export type ValuationMethod = "EXECUTABLE_SELL_QUOTE" | "ESTIMATED_SPOT" | "UNAVAILABLE";

export interface HoldingValuationInput {
  memeId: string;
  balance: bigint;
  /** wNEAR out (yocto) for selling the full balance, from a live sell quote. */
  sellQuoteOut?: bigint | null;
  /** Indicative spot: yocto NEAR per 1 whole token, scaled by 1e24 / 10^decimals. */
  spotYoctoPerUnit?: { num: bigint; den: bigint } | null;
  quotedAt?: number | null;
}

export interface HoldingValuation {
  memeId: string;
  balance: bigint;
  valueYocto: bigint | null;
  method: ValuationMethod;
  quotedAt: number | null;
}

export interface BasketValuation {
  holdings: HoldingValuation[];
  /** null if ANY nonzero holding is UNAVAILABLE: a partial total would understate risk. */
  totalYocto: bigint | null;
  method: ValuationMethod;
  oldestQuoteAt: number | null;
}

export function valueHolding(h: HoldingValuationInput): HoldingValuation {
  if (h.balance === 0n) return { memeId: h.memeId, balance: 0n, valueYocto: 0n, method: "EXECUTABLE_SELL_QUOTE", quotedAt: h.quotedAt ?? null };
  if (h.sellQuoteOut !== undefined && h.sellQuoteOut !== null) {
    return { memeId: h.memeId, balance: h.balance, valueYocto: h.sellQuoteOut, method: "EXECUTABLE_SELL_QUOTE", quotedAt: h.quotedAt ?? null };
  }
  if (h.spotYoctoPerUnit && h.spotYoctoPerUnit.den > 0n) {
    return {
      memeId: h.memeId,
      balance: h.balance,
      valueYocto: (h.balance * h.spotYoctoPerUnit.num) / h.spotYoctoPerUnit.den,
      method: "ESTIMATED_SPOT",
      quotedAt: h.quotedAt ?? null,
    };
  }
  return { memeId: h.memeId, balance: h.balance, valueYocto: null, method: "UNAVAILABLE", quotedAt: null };
}

export function valueBasket(hs: HoldingValuationInput[]): BasketValuation {
  const holdings = hs.map(valueHolding);
  const live = holdings.filter((h) => h.balance > 0n);
  const unavailable = live.some((h) => h.method === "UNAVAILABLE");
  const estimated = live.some((h) => h.method === "ESTIMATED_SPOT");
  const times = live.map((h) => h.quotedAt).filter((t): t is number => t !== null);
  return {
    holdings,
    totalYocto: unavailable ? null : holdings.reduce((a, h) => a + (h.valueYocto ?? 0n), 0n),
    method: unavailable ? "UNAVAILABLE" : estimated ? "ESTIMATED_SPOT" : "EXECUTABLE_SELL_QUOTE",
    oldestQuoteAt: times.length ? Math.min(...times) : null,
  };
}

/**
 * NEAR/USD price for the "$20" trigger. Two independent sources must agree, otherwise we don't act:
 * a wrong price could trigger a buyback far too early (or never).
 */

export interface PriceQuote {
  source: string;
  usd: number;
}

export type PriceFetcher = () => Promise<PriceQuote>;

const getJson = async (url: string, f: typeof fetch): Promise<unknown> => {
  const r = await f(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return r.json();
};

export const refIndexer =
  (f: typeof fetch = fetch): PriceFetcher =>
  async () => {
    const j = (await getJson("https://indexer.ref.finance/get-token-price?token_id=wrap.near", f)) as { price?: string };
    return { source: "ref-indexer", usd: Number(j.price) };
  };

export const coingecko =
  (f: typeof fetch = fetch): PriceFetcher =>
  async () => {
    const j = (await getJson("https://api.coingecko.com/api/v3/simple/price?ids=near&vs_currencies=usd", f)) as { near?: { usd?: number } };
    return { source: "coingecko", usd: Number(j.near?.usd) };
  };

export interface AgreedPrice {
  usd: number | null;
  quotes: PriceQuote[];
  errors: string[];
  reason?: string;
}

/**
 * Returns the lower of the agreeing quotes (conservative: needs *more* NEAR to reach the threshold),
 * or null if fewer than `minSources` answered or they differ by more than `maxDivergence`.
 */
export async function agreedNearUsd(fetchers: PriceFetcher[], maxDivergence = 0.1, minSources = 2): Promise<AgreedPrice> {
  const quotes: PriceQuote[] = [];
  const errors: string[] = [];
  for (const r of await Promise.allSettled(fetchers.map((f) => f()))) {
    if (r.status === "fulfilled" && Number.isFinite(r.value.usd) && r.value.usd > 0) quotes.push(r.value);
    else errors.push(r.status === "rejected" ? String(r.reason) : `bad price from ${r.value.source}`);
  }
  if (quotes.length < minSources) return { usd: null, quotes, errors, reason: `only ${quotes.length} price source(s) answered` };
  const lo = Math.min(...quotes.map((q) => q.usd));
  const hi = Math.max(...quotes.map((q) => q.usd));
  if ((hi - lo) / lo > maxDivergence) return { usd: null, quotes, errors, reason: `price sources disagree: ${quotes.map((q) => `${q.source}=$${q.usd}`).join(", ")}` };
  return { usd: lo, quotes, errors };
}

/** Native USDC on NEAR (6 decimals) and the deep 0.01% Rhea DCL pool against wNEAR. */
export const USDC = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
export const RHEA_NEAR_USDC_POOL = `${USDC}|wrap.near|100`;

/** On-chain: quote 1 NEAR → USDC on Rhea DCL (read-only view call). */
export const rheaOnchain =
  (rpc: { view<T>(accountId: string, methodName: string, args?: unknown): Promise<T> }, pool = RHEA_NEAR_USDC_POOL): PriceFetcher =>
  async () => {
    const r = await rpc.view<{ amount: string } | string>("dclv2.ref-labs.near", "quote", {
      pool_ids: [pool],
      input_token: "wrap.near",
      output_token: USDC,
      input_amount: (10n ** 24n).toString(),
    });
    const raw = typeof r === "string" ? r : r.amount;
    return { source: "rhea-onchain", usd: Number(raw) / 1e6 };
  };

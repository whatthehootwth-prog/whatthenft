/**
 * NEAR Intents 1Click client (https://1click.chaindefuser.com). Used for capability
 * discovery and dry quotes. Live (non-dry) quotes/deposits are NOT used in Milestone A:
 * vault swaps go directly through Rhea from the contract so delivered balances are
 * verified on-chain. 1Click becomes the cross-chain adapter in Milestone C.
 */
export const ONECLICK_BASE = "https://1click.chaindefuser.com";

export interface OneClickToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price: number;
  priceUpdatedAt: string;
  contractAddress?: string;
}

export interface DryQuote {
  ok: boolean;
  status: number;
  amountOut: bigint | null;
  minAmountOut: bigint | null;
  timeEstimateSec: number | null;
  error: string | null;
  correlationId: string | null;
}

export class OneClick {
  constructor(
    private readonly base = ONECLICK_BASE,
    private readonly jwt?: string,
    private readonly f: typeof fetch = fetch,
  ) {}

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (this.jwt) h.authorization = `Bearer ${this.jwt}`;
    return h;
  }

  async tokens(): Promise<OneClickToken[]> {
    const r = await this.f(`${this.base}/v0/tokens`, { headers: this.headers(), signal: AbortSignal.timeout(15_000) });
    if (!r.ok) throw new Error(`1Click /v0/tokens HTTP ${r.status}`);
    return (await r.json()) as OneClickToken[];
  }

  async dryQuote(p: { originAsset: string; destinationAsset: string; amount: bigint; slippageBps: number; account: string }): Promise<DryQuote> {
    const body = {
      dry: true,
      swapType: "EXACT_INPUT",
      slippageTolerance: p.slippageBps,
      originAsset: p.originAsset,
      depositType: "INTENTS",
      destinationAsset: p.destinationAsset,
      amount: p.amount.toString(),
      refundTo: p.account,
      refundType: "INTENTS",
      recipient: p.account,
      recipientType: "INTENTS",
      deadline: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    const r = await this.f(`${this.base}/v0/quote`, { method: "POST", headers: this.headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(20_000) });
    const j = (await r.json().catch(() => ({}))) as { quote?: { amountOut: string; minAmountOut: string; timeEstimate?: number }; message?: string; correlationId?: string };
    if (!r.ok || !j.quote) {
      return { ok: false, status: r.status, amountOut: null, minAmountOut: null, timeEstimateSec: null, error: j.message ?? `HTTP ${r.status}`, correlationId: j.correlationId ?? null };
    }
    return {
      ok: true,
      status: r.status,
      amountOut: BigInt(j.quote.amountOut),
      minAmountOut: BigInt(j.quote.minAmountOut),
      timeEstimateSec: j.quote.timeEstimate ?? null,
      error: null,
      correlationId: j.correlationId ?? null,
    };
  }
}

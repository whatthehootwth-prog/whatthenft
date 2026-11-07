"use client";
import { useEffect, useRef, useState } from "react";

export interface QuoteMeme {
  memeId: string;
  symbol: string;
  contractId: string;
  decimals: number;
  isWth: boolean;
  route: { kind: string; poolId: string };
  poolFeeBps: number | null;
  verified: { metadataOk: boolean; poolOk: boolean; error: string | null };
  approvedForMint: boolean;
  artSupplied: boolean;
  minShareBps: number;
  maxShareBps: number;
  quotes: { amountIn: string; amountOut: string | null; priceImpactBps: number | null; quotedAt: number; provider: string; error: string | null }[];
}

export interface QuoteResponse {
  generatedAt: string;
  source: string;
  season: { id: number; name: string; status: string; maxSupply: number; lockDays: number; wthSlotBps: number };
  base: string;
  split: { basket: string; creator: string; treasury: string; basketBps: number; creatorBps: number; treasuryBps: number };
  execution: { storageFee: string; retryReserve: string; advanceFee: string; estMintTxGas: string; attachTotal: string };
  tier: { maxPartners: number; maxDistinctAssets: number };
  minimum: { target: string; executable: string | null; targetFeasible: boolean; reasons: string[] };
  check: { ok: boolean; reason: string | null; maxPartners: number };
  memes: QuoteMeme[];
}

export type QuoteState = { state: "loading" } | { state: "ok"; data: QuoteResponse; ageMs: number } | { state: "error"; message: string };

/** Fetches /api/quote for a base amount, refreshes every 20s, exposes quote age. */
export function useQuote(base: string | null, refreshMs = 20_000): QuoteState & { refresh: () => void } {
  const [st, setSt] = useState<QuoteState>({ state: "loading" });
  const [tick, setTick] = useState(0);
  const at = useRef(0);
  useEffect(() => {
    if (!base) return;
    let alive = true;
    setSt((p) => (p.state === "ok" ? p : { state: "loading" }));
    const ctl = new AbortController();
    fetch(`/api/quote?base=${encodeURIComponent(base)}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        return j as QuoteResponse;
      })
      .then((data) => {
        if (!alive) return;
        at.current = Date.now();
        setSt({ state: "ok", data, ageMs: 0 });
      })
      .catch((e) => {
        if (alive && e.name !== "AbortError") setSt({ state: "error", message: e instanceof Error ? e.message : String(e) });
      });
    const t = setInterval(() => setTick((x) => x + 1), refreshMs);
    return () => {
      alive = false;
      ctl.abort();
      clearInterval(t);
    };
  }, [base, tick, refreshMs]);
  return { ...st, ...(st.state === "ok" ? { ageMs: Date.now() - at.current } : {}), refresh: () => setTick((x) => x + 1) } as QuoteState & { refresh: () => void };
}

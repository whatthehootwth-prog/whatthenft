/**
 * $WTH holder snapshot. NEP-141 tokens have no on-chain holder list, so candidates come from an
 * indexer (FastNEAR); every balance is then re-read on-chain with ft_balance_of before use.
 */
import type { NearRpc } from "@wtn/chain";
import type { Holder } from "./allocate";

export interface Snapshot {
  token: string;
  takenAt: string;
  source: string;
  holders: Holder[];
  /** The indexer list may be capped (FastNEAR returns the top 100). */
  truncated: boolean;
}

export async function fastnearTopHolders(token: string, f: typeof fetch = fetch): Promise<{ account_id: string; balance: string }[]> {
  const r = await f(`https://api.fastnear.com/v1/ft/${encodeURIComponent(token)}/top`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`FastNEAR holders → HTTP ${r.status}`);
  const j = (await r.json()) as { accounts?: { account_id: string; balance: string }[] };
  if (!Array.isArray(j.accounts)) throw new Error("FastNEAR: unexpected response");
  return j.accounts;
}

export const INDEXER_CAP = 100;

/**
 * Take a snapshot and verify balances on-chain. Throws if the indexer list is capped AND the smallest
 * listed holder still qualifies — then someone eligible might be missing, so we refuse to pay.
 */
export async function takeSnapshot(rpc: NearRpc, token: string, minHolding: bigint, opts: { fetchImpl?: typeof fetch; verify?: boolean } = {}): Promise<Snapshot> {
  const listed = await fastnearTopHolders(token, opts.fetchImpl);
  const truncated = listed.length >= INDEXER_CAP;
  if (truncated) {
    const smallest = listed.reduce((m, h) => (BigInt(h.balance) < m ? BigInt(h.balance) : m), BigInt(listed[0]!.balance));
    if (smallest >= minHolding) throw new Error(`Holder list is capped at ${INDEXER_CAP} and still contains qualifying holders — snapshot may be incomplete, refusing to pay.`);
  }
  const holders: Holder[] = [];
  for (const h of listed) {
    let balance = BigInt(h.balance);
    if (opts.verify !== false && balance > 0n) balance = BigInt(await rpc.view<string>(token, "ft_balance_of", { account_id: h.account_id }));
    holders.push({ account_id: h.account_id, balance });
  }
  return { token, takenAt: new Date().toISOString(), source: "fastnear/top + on-chain ft_balance_of", holders, truncated };
}

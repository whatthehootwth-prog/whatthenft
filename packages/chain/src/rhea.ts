import type { NearRpc } from "./rpc";
import type { NetworkConfig, RouteRef } from "./registry";

/** Exact-input quote on Rhea. Returns raw output base units. Throws on RPC/contract error. */
export async function rheaQuote(rpc: NearRpc, net: NetworkConfig, route: RouteRef, tokenIn: string, tokenOut: string, amountIn: bigint): Promise<bigint> {
  if (amountIn <= 0n) throw new Error("amountIn must be positive");
  if (route.kind === "rhea-dcl") {
    const r = await rpc.view<{ amount: string } | null>(net.rheaDcl, "quote", {
      pool_ids: [route.poolId],
      input_token: tokenIn,
      output_token: tokenOut,
      input_amount: amountIn.toString(),
    });
    if (!r || r.amount === undefined) throw new Error("DCL quote returned no amount");
    return BigInt(r.amount);
  }
  const out = await rpc.view<string>(net.rheaV2, "get_return", {
    pool_id: Number(route.poolId),
    token_in: tokenIn,
    amount_in: amountIn.toString(),
    token_out: tokenOut,
  });
  return BigInt(out);
}

export interface PoolCheck {
  ok: boolean;
  tokens: string[];
  feeBps: number | null;
  detail: string;
}

/** Verify the pool really pairs wNEAR with the expected token contract. */
export async function verifyPool(rpc: NearRpc, net: NetworkConfig, route: RouteRef, tokenContract: string): Promise<PoolCheck> {
  if (route.kind === "rhea-dcl") {
    const p = await rpc.view<{ token_x: string; token_y: string; fee: number; state: string } | null>(net.rheaDcl, "get_pool", { pool_id: route.poolId });
    if (!p) return { ok: false, tokens: [], feeBps: null, detail: "pool not found" };
    const tokens = [p.token_x, p.token_y];
    const ok = tokens.includes(net.wrapNear) && tokens.includes(tokenContract) && p.state === "Running";
    return { ok, tokens, feeBps: p.fee / 100, detail: `state=${p.state}` };
  }
  const p = await rpc.view<{ token_account_ids: string[]; total_fee: number; pool_kind: string; amounts: string[] }>(net.rheaV2, "get_pool", { pool_id: Number(route.poolId) });
  const ok = p.token_account_ids.includes(net.wrapNear) && p.token_account_ids.includes(tokenContract);
  return { ok, tokens: p.token_account_ids, feeBps: p.total_fee, detail: `${p.pool_kind} reserves=${p.amounts.join("/")}` };
}

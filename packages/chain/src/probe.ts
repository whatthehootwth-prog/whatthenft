import type { ProbeQuote } from "@wtn/domain";
import { rheaQuote, verifyPool, type PoolCheck } from "./rhea";
import type { NearRpc } from "./rpc";
import type { AssetEntry, NetworkConfig } from "./registry";

export interface AssetVerification {
  memeId: string;
  contractId: string;
  metadataOk: boolean;
  onchainSymbol: string | null;
  onchainDecimals: number | null;
  storageMinYocto: bigint | null;
  pool: PoolCheck | null;
  error: string | null;
}

/** Confirms the registry entry against chain: metadata (symbol AND decimals) and pool pairing. */
export async function verifyAsset(rpc: NearRpc, net: NetworkConfig, a: AssetEntry): Promise<AssetVerification> {
  try {
    const [md, sb, pool] = await Promise.all([
      rpc.view<{ symbol: string; decimals: number }>(a.contractId, "ft_metadata"),
      rpc.view<{ min: string } | null>(a.contractId, "storage_balance_bounds").catch(() => null),
      verifyPool(rpc, net, a.route, a.contractId),
    ]);
    return {
      memeId: a.memeId,
      contractId: a.contractId,
      metadataOk: md.symbol === a.symbol && md.decimals === a.decimals,
      onchainSymbol: md.symbol,
      onchainDecimals: md.decimals,
      storageMinYocto: sb ? BigInt(sb.min) : null,
      pool,
      error: null,
    };
  } catch (e) {
    return { memeId: a.memeId, contractId: a.contractId, metadataOk: false, onchainSymbol: null, onchainDecimals: null, storageMinYocto: null, pool: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Reference size used to measure price impact (tiny trade ~ marginal price incl. fee). */
export const REFERENCE_IN = 10n ** 20n; // 0.0001 NEAR

/**
 * Real exact-input quotes wNEAR -> asset at each size, with price impact relative to the
 * reference trade. Failed quotes are returned as amountOut=null with the error text.
 */
export async function probeQuotes(rpc: NearRpc, net: NetworkConfig, a: AssetEntry, sizes: bigint[]): Promise<ProbeQuote[]> {
  const provider = `${a.route.kind}:${a.route.poolId}`;
  let ref: bigint | null = null;
  try {
    ref = await rheaQuote(rpc, net, a.route, net.wrapNear, a.contractId, REFERENCE_IN);
  } catch {
    ref = null;
  }
  const out: ProbeQuote[] = [];
  for (const size of sizes) {
    const quotedAt = Date.now();
    try {
      const amountOut = await rheaQuote(rpc, net, a.route, net.wrapNear, a.contractId, size);
      let priceImpactBps: number | null = null;
      if (ref !== null && ref > 0n && amountOut > 0n) {
        // impact = 1 - (out/size) / (ref/REFERENCE_IN)
        const num = amountOut * REFERENCE_IN * 10_000n;
        const den = size * ref;
        const ratioBps = Number(num / den);
        priceImpactBps = Math.max(0, 10_000 - ratioBps);
      }
      out.push({ memeId: a.memeId, amountIn: size, amountOut: amountOut > 0n ? amountOut : null, priceImpactBps, quotedAt, provider, ...(amountOut > 0n ? {} : { error: "zero output" }) });
    } catch (e) {
      out.push({ memeId: a.memeId, amountIn: size, amountOut: null, priceImpactBps: null, quotedAt, provider, error: e instanceof Error ? e.message.slice(0, 200) : String(e) });
    }
  }
  return out;
}

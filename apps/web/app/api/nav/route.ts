import { MAINNET, NETWORK_CONFIGS_FOR_NAV, NearRpc, rheaQuote } from "@/lib/nav-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Executable SELL quotes (token -> wNEAR) for a basket's real balances.
 * GET /api/nav?h=<contract>:<raw amount>,<contract>:<raw amount>
 * Unknown or failing quotes return null (UNAVAILABLE) — never zero, never invented.
 */
export async function GET(req: Request) {
  const h = new URL(req.url).searchParams.get("h") ?? "";
  const items = h
    .split(",")
    .filter(Boolean)
    .slice(0, 8)
    .map((p) => {
      const i = p.lastIndexOf(":");
      return { contract: p.slice(0, i), amount: p.slice(i + 1) };
    })
    .filter((x) => /^\d{1,40}$/.test(x.amount) && x.contract.length > 1);
  const rpc = new NearRpc({ network: "mainnet" });
  const net = NETWORK_CONFIGS_FOR_NAV;
  const out = await Promise.all(
    items.map(async (it) => {
      const asset = MAINNET.assets.find((a) => a.contractId === it.contract);
      const quotedAt = Date.now();
      if (!asset) return { contract: it.contract, amount: it.amount, wnearOut: null, method: "UNAVAILABLE", reason: "token not in verified registry", quotedAt };
      if (BigInt(it.amount) === 0n) return { contract: it.contract, amount: it.amount, wnearOut: "0", method: "EXECUTABLE_SELL_QUOTE", quotedAt };
      try {
        const q = await rheaQuote(rpc, net, asset.route, asset.contractId, net.wrapNear, BigInt(it.amount));
        return { contract: it.contract, amount: it.amount, wnearOut: q.toString(), method: "EXECUTABLE_SELL_QUOTE", provider: `${asset.route.kind}:${asset.route.poolId}`, quotedAt };
      } catch (e) {
        return { contract: it.contract, amount: it.amount, wnearOut: null, method: "UNAVAILABLE", reason: e instanceof Error ? e.message.slice(0, 160) : "quote failed", quotedAt };
      }
    }),
  );
  return NextResponse.json({ generatedAt: new Date().toISOString(), source: "mainnet Rhea pools", holdings: out }, { headers: { "cache-control": "no-store" } });
}

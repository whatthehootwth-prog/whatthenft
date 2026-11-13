import { MAINNET, NearRpc, OneClick, rheaQuote, SEASON_01_DRAFT, findAsset, networkConfig } from "@wtn/chain";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Check = { id: string; label: string; ok: boolean | null; detail: string; ms: number };

async function timed(id: string, label: string, fn: () => Promise<string>): Promise<Check> {
  const t = Date.now();
  try {
    const detail = await fn();
    return { id, label, ok: true, detail, ms: Date.now() - t };
  } catch (e) {
    return { id, label, ok: false, detail: e instanceof Error ? e.message.slice(0, 200) : String(e), ms: Date.now() - t };
  }
}

export async function GET() {
  const network = process.env.NEXT_PUBLIC_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const core = (process.env.NEXT_PUBLIC_CORE_CONTRACT ?? "").trim();
  const appRpc = new NearRpc({ network });
  const mainRpc = new NearRpc({ network: "mainnet" });
  const checks: Promise<Check>[] = [
    timed("rpc-app", `NEAR RPC (${network})`, async () => {
      const s = await appRpc.call<{ sync_info: { latest_block_height: number; latest_block_time: string } }>("status", []);
      return `block ${s.sync_info.latest_block_height} at ${s.sync_info.latest_block_time.slice(0, 19)}Z`;
    }),
    timed("rpc-main", "NEAR RPC (mainnet, quotes)", async () => {
      const g = await mainRpc.call<{ gas_price: string }>("gas_price", [null]);
      return `gas price ${g.gas_price} yocto/gas`;
    }),
    timed("oneclick", "NEAR Intents 1Click API (cross-chain adapter, not used for NEAR baskets)", async () => {
      const t = await new OneClick().tokens();
      return `${t.length} tokens listed; WTH supported: ${t.some((x) => x.assetId.includes("wth-0b2227")) ? "yes" : "no"}`;
    }),
    ...SEASON_01_DRAFT.memes.map((m) =>
      timed(`route-${m.memeId}`, `RHEA route ${m.memeId.toUpperCase()}`, async () => {
        const a = findAsset(MAINNET, m.memeId)!;
        const out = await rheaQuote(mainRpc, MAINNET, a.route, MAINNET.wrapNear, a.contractId, 10n ** 22n);
        if (out <= 0n) throw new Error("zero output — no liquidity");
        return `${a.route.kind}:${a.route.poolId} quotes 0.01 NEAR → ${out.toString()} base units`;
      }),
    ),
  ];
  if (core) {
    checks.push(
      timed("core", `Core contract ${core}`, async () => {
        const acc = await appRpc.viewAccount(core);
        if (acc.code_hash === "11111111111111111111111111111111") throw new Error("account exists but no contract code is deployed");
        const cfg = await appRpc.view<{ mints_paused: boolean; season_count: number; next_token_id: string }>(core, "get_config");
        return `code ${acc.code_hash.slice(0, 10)}… · seasons ${cfg.season_count} · minted ${Number(cfg.next_token_id) - 1} · mints ${cfg.mints_paused ? "PAUSED" : "running"}`;
      }),
    );
  }
  const results = await Promise.all(checks);

  // Conservation: actual FT balance of the vault vs total accounted claims, per season token.
  let conservation: { token: string; balance: string | null; accounted: string | null; ok: boolean | null; detail: string }[] = [];
  if (core) {
    try {
      const seasons = await appRpc.view<{ config: { memes: { token: string }[] } }[]>(core, "get_seasons");
      const net = networkConfig(network);
      const tokens = Array.from(new Set([net.wrapNear, ...seasons.flatMap((s) => s.config.memes.map((m) => m.token))]));
      conservation = await Promise.all(
        tokens.map(async (t) => {
          try {
            const [bal, acc] = await Promise.all([appRpc.view<string>(t, "ft_balance_of", { account_id: core }), appRpc.view<string>(core, "get_accounted", { token: t })]);
            const ok = BigInt(bal) >= BigInt(acc);
            return { token: t, balance: bal, accounted: acc, ok, detail: ok ? "balance ≥ claims" : "VIOLATION: claims exceed balance" };
          } catch (e) {
            return { token: t, balance: null, accounted: null, ok: null, detail: e instanceof Error ? e.message.slice(0, 120) : "read failed" };
          }
        }),
      );
    } catch {
      conservation = [];
    }
  }
  return NextResponse.json({ generatedAt: new Date().toISOString(), network, coreContract: core || null, checks: results, conservation }, { headers: { "cache-control": "no-store" } });
}

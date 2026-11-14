/**
 * Reads each Season 01 token's live transfer fee from chain and writes the core
 * `set_transfer_fees` args → deploy/mainnet/args/transfer-fees.json (read-only; sends nothing).
 *
 *   pnpm --filter @wtn/keeper token-fees
 *
 * Justhoot launchpad tokens expose `get_config().transfer_fee_pips` (1e6 = 100%); tokens without it
 * (plain NEP-141, e.g. nearlytrade) are treated as 0. Token owners can change their fee: re-run this
 * and call set_transfer_fees again if a swap ever freezes with a fee-sized shortfall.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAINNET, SEASON_01_DRAFT } from "@wtn/chain";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const RPC = process.env.RPC_URL ?? "https://rpc.mainnet.fastnear.com";

async function view(account: string, method: string): Promise<unknown | null> {
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "call_function", finality: "final", account_id: account, method_name: method, args_base64: Buffer.from("{}").toString("base64") } }),
  });
  const j = (await r.json()) as { result?: { result?: number[]; error?: string }; error?: unknown };
  if (j.error || j.result?.error || !j.result?.result) return null;
  try {
    return JSON.parse(Buffer.from(j.result.result).toString());
  } catch {
    return null;
  }
}

const fees: { token: string; bps: number }[] = [];
for (const m of SEASON_01_DRAFT.memes) {
  const token = MAINNET.assets.find((a) => a.memeId === m.memeId)!.contractId;
  const cfg = (await view(token, "get_config")) as { transfer_fee_pips?: number } | null;
  const pips = cfg?.transfer_fee_pips ?? 0;
  const bps = Math.ceil(pips / 100);
  console.log(`${m.memeId.padEnd(11)} ${token.padEnd(42)} ${(pips / 10_000).toFixed(2)}%`);
  if (bps > 0) fees.push({ token, bps });
}
const out = join(ROOT, "deploy/mainnet/args/transfer-fees.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ fees }) + "\n");
console.log(`→ ${out} (${fees.length} fee-charging tokens)`);

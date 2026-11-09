/**
 * Buyback keeper CLI.
 *
 *   pnpm --filter @wtn/keeper buyback                 # dry run: check price, plan buy + payouts, send nothing
 *   pnpm --filter @wtn/keeper buyback --distribute    # dry run including the holder split of WTH held now
 *   pnpm --filter @wtn/keeper buyback --send          # execute one cycle (needs KEEPER_ACCOUNT + KEEPER_PRIVATE_KEY)
 *   pnpm --filter @wtn/keeper buyback --send --watch 5   # run every 5 minutes
 *
 * Env: NETWORK, BUYBACK_CONTRACT, WTH_TOKEN (testnet), KEEPER_ACCOUNT, KEEPER_PRIVATE_KEY, THRESHOLD_USD (20),
 *      MIN_HOLDING_WTH (1000), MIN_PAYOUT_WTH (1), EXCLUDE (comma list), RPC_URL, MAX_PRICE_DIVERGENCE (0.1)
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { NearRpc } from "@wtn/chain";
import { loadConfig } from "./config";
import { dryRunCaller, nearCaller, runCycle } from "./cycle";

const args = process.argv.slice(2);
const send = args.includes("--send");
const forceDistribute = args.includes("--distribute");
const watchIdx = args.indexOf("--watch");
const watchMin = watchIdx >= 0 ? Number(args[watchIdx + 1] ?? 5) : 0;

const cfg = loadConfig();
const rpc = new NearRpc({ network: cfg.network, urls: cfg.rpcUrl ? [cfg.rpcUrl] : undefined });
const roundsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "rounds");
const caller = send ? await nearCaller(cfg) : dryRunCaller;
const stamp = () => new Date().toISOString();

console.log(`${stamp()} keeper · ${cfg.network} · ${send ? "LIVE (--send)" : "dry run"} · threshold $${cfg.thresholdUsd}`);

async function once() {
  try {
    await runCycle(cfg, rpc, caller, { send, forceDistribute, roundsDir, log: (m) => console.log(`${stamp()} ${m}`) });
  } catch (e) {
    console.error(`${stamp()} cycle failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}

await once();
if (watchMin > 0) {
  console.log(`${stamp()} watching every ${watchMin} min (Ctrl+C to stop)`);
  setInterval(once, watchMin * 60_000);
}

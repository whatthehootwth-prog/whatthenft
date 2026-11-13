/**
 * One keeper run — what the Railway cron executes every few minutes:
 *   1. order runner   (finish every in-progress mint, push stuck refunds)   — needs CORE_CONTRACT
 *   2. NFT images     (compose → IPFS → set_token_media)                     — needs CORE_CONTRACT + PINATA_JWT
 *   3. WTH buyback    ($20 trigger → buy → pay $WTH holders)                — needs BUYBACK_CONTRACT
 * Each part is skipped (with a log line) when its settings are missing. Dry run unless --send.
 *
 *   pnpm --filter @wtn/keeper run-all            # dry run
 *   pnpm --filter @wtn/keeper run-all --send     # live (needs KEEPER_ACCOUNT + KEEPER_PRIVATE_KEY)
 */
import { join } from "node:path";
import { NearRpc, type Network } from "@wtn/chain";
import { REPO_ROOT, loadArt } from "./compose";
import { loadConfig } from "./config";
import { dryRunCaller, nearCaller, runCycle } from "./cycle";
import { pinataPinner, runMediaCycle } from "./media";
import { runOrderCycle } from "./orders";

const send = process.argv.includes("--send");
const env = process.env;
const network = (env.NETWORK ?? "testnet") as Network;
const rpc = new NearRpc({ network, urls: env.RPC_URL ? [env.RPC_URL] : undefined });
const stamp = () => new Date().toISOString();
const log = (m: string) => console.log(`${stamp()} ${m}`);
const caller = send
  ? await nearCaller({ network, rpcUrl: env.RPC_URL, keeperAccount: env.KEEPER_ACCOUNT, keeperPrivateKey: env.KEEPER_PRIVATE_KEY, buybackContract: env.BUYBACK_CONTRACT })
  : dryRunCaller;
let failed = false;

log(`keeper run · ${network} · ${send ? "LIVE" : "dry run"}`);

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    failed = true;
    log(`✗ ${name} failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const core = env.CORE_CONTRACT;
await step("orders", async () => {
  if (!core) return log("orders: skipped (no CORE_CONTRACT)");
  const r = await runOrderCycle(rpc, caller, { coreContract: core, send, log: (m) => log(`orders: ${m}`) });
  log(`orders: ${r.advanced.length} advanced · ${r.refunded.length} refunds · ${r.needsHuman.length} need attention`);
});

await step("media", async () => {
  if (!core) return log("media: skipped (no CORE_CONTRACT)");
  if (send && !env.PINATA_JWT) return log("media: skipped (no PINATA_JWT)");
  const r = await runMediaCycle(loadArt(), rpc, caller, {
    coreContract: core,
    send,
    pinner: env.PINATA_JWT ? pinataPinner(env.PINATA_JWT) : undefined,
    previewDir: join(REPO_ROOT, "apps/keeper/samples"),
    log: (m) => log(`media: ${m}`),
  });
  log(`media: ${r.done.length} done · ${r.pending} pending`);
});

await step("buyback", async () => {
  if (!env.BUYBACK_CONTRACT) return log("buyback: skipped (no BUYBACK_CONTRACT)");
  await runCycle(loadConfig(env), rpc, caller, { send, roundsDir: join(REPO_ROOT, "apps/keeper/rounds"), log: (m) => log(`buyback: ${m}`) });
});

if (failed) process.exitCode = 1;

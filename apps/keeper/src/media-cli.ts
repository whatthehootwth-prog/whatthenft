/**
 * NFT image CLI.
 *
 *   pnpm --filter @wtn/keeper media --samples 6     # render 6 random owls to apps/keeper/samples/ (no chain, no key)
 *   CORE_CONTRACT=… pnpm --filter @wtn/keeper media              # dry run: compose images for minted tokens without media
 *   CORE_CONTRACT=… PINATA_JWT=… KEEPER_ACCOUNT=… KEEPER_PRIVATE_KEY=… pnpm --filter @wtn/keeper media --send
 *
 * The keeper account must be an operator on the core contract (core.set_operator).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NearRpc, type Network } from "@wtn/chain";
import { REPO_ROOT, composeImage, loadArt, randomSpec } from "./compose";
import { dryRunCaller, nearCaller } from "./cycle";
import { pinataPinner, runMediaCycle } from "./media";

const args = process.argv.slice(2);
const art = loadArt();
const samplesIdx = args.indexOf("--samples");

if (samplesIdx >= 0) {
  const n = Number(args[samplesIdx + 1] ?? 6);
  const dir = join(REPO_ROOT, "apps/keeper/samples");
  mkdirSync(dir, { recursive: true });
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = 1; i <= n; i++) {
    const spec = randomSpec(art, rnd);
    const png = await composeImage(art, spec);
    const file = join(dir, `sample-${i}.png`);
    writeFileSync(file, png);
    console.log(`${file}  ${(png.length / 1024).toFixed(0)} KB  ${Object.entries(spec).map(([s, p]) => `${s}=${p.memeId}`).join(" ")}`);
  }
} else {
  const network = (process.env.NETWORK ?? "testnet") as Network;
  const coreContract = process.env.CORE_CONTRACT;
  if (!coreContract) throw new Error("Set CORE_CONTRACT");
  const send = args.includes("--send");
  const rpc = new NearRpc({ network, urls: process.env.RPC_URL ? [process.env.RPC_URL] : undefined });
  const caller = send ? await nearCaller({ network, rpcUrl: process.env.RPC_URL, keeperAccount: process.env.KEEPER_ACCOUNT, keeperPrivateKey: process.env.KEEPER_PRIVATE_KEY }) : dryRunCaller;
  const r = await runMediaCycle(art, rpc, caller, {
    coreContract,
    send,
    pinner: process.env.PINATA_JWT ? pinataPinner(process.env.PINATA_JWT) : undefined,
    previewDir: join(REPO_ROOT, "apps/keeper/samples"),
  });
  console.log(`done ${r.done.length} · still pending ${r.pending}`);
}

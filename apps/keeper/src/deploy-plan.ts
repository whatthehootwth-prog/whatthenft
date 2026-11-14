/**
 * Mainnet deploy plan generator (writes files only, sends nothing).
 *
 *   pnpm --filter @wtn/keeper deploy-plan                 # all files, Season 01 starting now
 *   pnpm --filter @wtn/keeper deploy-plan --start 2026-11-20T12:00:00Z
 *
 * Output → deploy/mainnet/:
 *   season-01-manifest.json   canonical, public season manifest (art sha256s, tokens, routes, rules); its sha256 goes on-chain
 *   core-init.json, market-init.json, buyback-init.json   init args
 *   register-a.json, register-b.json                      core storage registration on wNEAR + the 12 tokens (≤10 per call)
 *   season-test.json          hidden test season: 0.2 NEAR, 10-minute lock, max 2
 *   season-01.json            MEME GENESIS: fixed 1 NEAR, 30-day lock, 111, open until sold out
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAINNET, SEASON_01_DRAFT } from "@wtn/chain";

/** NEAR string → yocto (exact, no floats). */
const parseNear = (n: string) => { const [i, f = ""] = n.split("."); return BigInt(i!) * 10n ** 24n + BigInt((f + "0".repeat(24)).slice(0, 24)); };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = join(ROOT, "deploy/mainnet");

export const ACCOUNTS = {
  owner: "whatthenft.near",
  creator: "whatthenft.near",
  core: "core.whatthenft.near",
  market: "market.whatthenft.near",
  buyback: "buyback.whatthenft.near",
  keeper: "keeper.whatthenft.near",
};

const SLOTS = ["head", "face", "body", "arms", "legs", "accessory"] as const;
const NS = 1_000_000_000n;
const DAY = 86_400n * NS;

const startArg = process.argv.indexOf("--start");
const startMs = startArg > 0 ? Date.parse(process.argv[startArg + 1]!) : Date.now();
if (Number.isNaN(startMs)) throw new Error("--start must be an ISO date");
const startNs = BigInt(startMs) * 1_000_000n;

// art registry (web copy, same layer list the site and the keeper compositor use)
type Layer = { slot: string; variant: number };
const registry = JSON.parse(readFileSync(join(ROOT, "apps/web/lib/art-registry.json"), "utf8")) as { memes: { memeId: string; layers: Layer[] }[] };
const variantsFor = (memeId: string) =>
  memeId === "wth"
    ? SLOTS.map(() => 1) // WTH = the bare owl for every slot (contract requires art for all six)
    : SLOTS.map((s) => registry.memes.find((m) => m.memeId === memeId)?.layers.filter((l) => l.slot === s).length ?? 0);

// ---- canonical manifest (published in the public repo; sha256 frozen on-chain at open) ----
const memes = SEASON_01_DRAFT.memes.map((m) => {
  const asset = MAINNET.assets.find((a) => a.memeId === m.memeId);
  if (!asset) throw new Error(`no mainnet asset for ${m.memeId}`);
  if (!m.approvedForMint) throw new Error(`${m.memeId} is not approvedForMint in packages/chain/src/seasons.ts`);
  const art = JSON.parse(readFileSync(join(ROOT, "assets/memes", m.memeId, "manifest.json"), "utf8")) as { layers: { slot: string; variant: number; file: string; sha256: string }[] };
  return { memeId: m.memeId, symbol: asset.symbol, token: asset.contractId, route: asset.route, slotVariants: variantsFor(m.memeId), art: art.layers.map((l) => ({ slot: l.slot, variant: l.variant, file: l.file, sha256: l.sha256 })) };
});
const manifest = {
  schema: "wtn-season-manifest/1",
  collection: "WHAT THE NFT?!",
  season: { id: 1, name: SEASON_01_DRAFT.name, maxSupply: SEASON_01_DRAFT.maxSupply, priceNear: "1", lockDays: SEASON_01_DRAFT.lockDays, openUntilSoldOut: true },
  rules: {
    fees: SEASON_01_DRAFT.fees,
    royalty: SEASON_01_DRAFT.royalty,
    allocation: SEASON_01_DRAFT.allocation,
    rarityBps: SEASON_01_DRAFT.rarityBps,
    rarityIsCosmetic: true,
    slotOrder: SLOTS,
  },
  memes,
};
mkdirSync(OUT, { recursive: true });
const manifestText = JSON.stringify(manifest, null, 2) + "\n";
writeFileSync(join(OUT, "season-01-manifest.json"), manifestText);
const manifestHash = createHash("sha256").update(manifestText).digest("hex");

// ---- season configs (contract-shaped) ----
function season(opts: { name: string; base: bigint; maxSupply: number; lockNs: bigint; windowNs: bigint }) {
  const d = SEASON_01_DRAFT;
  return {
    name: opts.name,
    mint_start_ns: startNs.toString(),
    mint_end_ns: (startNs + opts.windowNs).toString(),
    max_supply: opts.maxSupply,
    target_base: opts.base.toString(),
    min_base_floor: opts.base.toString(),
    max_base: opts.base.toString(),
    min_leg: d.minLeg.toString(),
    tiers: d.tiers.map((t) => ({ min_base: t.minBase.toString(), max_partners: t.maxPartners })),
    lock_ns: opts.lockNs.toString(),
    fees: { basket_bps: d.fees.basketBps, creator_bps: d.fees.creatorBps, treasury_bps: d.fees.treasuryBps },
    royalty: { royalty_bps: d.royalty.royaltyBps, creator_share_bps: d.royalty.creatorShareOfRoyaltyBps },
    allocation: { core_wth_bps: d.allocation.coreWthBps, slot_weights_bps: SLOTS.map((s) => d.allocation.slotWeightsBps[s]) },
    rarity_bps: d.rarityBps,
    wth_slot_bps: d.wthSlotBps,
    memes: memes.map((m) => ({
      meme_id: m.memeId,
      token: m.token,
      weight: SEASON_01_DRAFT.memes.find((x) => x.memeId === m.memeId)!.weight,
      slot_variants: m.slotVariants,
      route: { kind: m.route.kind === "rhea-dcl" ? "RheaDcl" : "RheaV2", pool_id: m.route.poolId },
      max_slippage_bps: 200,
    })),
    reserve: { storage_per_mint: d.reserve.storagePerMint.toString(), retry_reserve: d.reserve.retryReserve.toString(), advance_fee: d.reserve.advanceFee.toString() },
    manifest_hash: manifestHash,
    media_base_uri: "ipfs://",
    reload_enabled: true,
  };
}

const write = (name: string, v: unknown) => writeFileSync(join(OUT, name), JSON.stringify(v, null, 2) + "\n");
write("season-test.json", { config: season({ name: "TEST · not for sale", base: parseNear("0.2"), maxSupply: 2, lockNs: 600n * NS, windowNs: 3n * DAY }) });
write("season-01.json", { config: season({ name: SEASON_01_DRAFT.name, base: SEASON_01_DRAFT.targetBase, maxSupply: SEASON_01_DRAFT.maxSupply, lockNs: BigInt(SEASON_01_DRAFT.lockDays) * DAY, windowNs: BigInt(SEASON_01_DRAFT.mintWindowDays) * DAY }) });

write("core-init.json", { owner: ACCOUNTS.owner, creator_account: ACCOUNTS.creator, treasury_account: ACCOUNTS.buyback, wrap_near: MAINNET.wrapNear, rhea_v2: MAINNET.rheaV2, rhea_dcl: MAINNET.rheaDcl });
write("market-init.json", { owner: ACCOUNTS.owner, nft_contract: ACCOUNTS.core });
const wth = MAINNET.assets.find((a) => a.isWth)!;
write("buyback-init.json", {
  owner: ACCOUNTS.owner,
  keeper: ACCOUNTS.keeper,
  wrap_near: MAINNET.wrapNear,
  rhea_dcl: MAINNET.rheaDcl,
  wth: wth.contractId,
  pool_id: wth.route.poolId,
  limits: { max_slippage_bps: 300, max_spend_per_buy: parseNear("5").toString(), min_buy_interval_ns: (3600n * NS).toString(), reserve: parseNear("0.05").toString() },
});
const tokens = [MAINNET.wrapNear, ...memes.map((m) => m.token)];
const deposit = parseNear("0.00125").toString();
write("register-a.json", { tokens: tokens.slice(0, 7), deposit_each: deposit });
write("register-b.json", { tokens: tokens.slice(7), deposit_each: deposit });

// small call-arg files so every command uses file-args (no JSON quoting problems in any shell)
const A = join(OUT, "args");
mkdirSync(A, { recursive: true });
const arg = (name: string, v: unknown) => writeFileSync(join(A, name), JSON.stringify(v) + "\n");
arg("set-operator-keeper.json", { account_id: ACCOUNTS.keeper, enabled: true });
arg("storage-buyback.json", { account_id: ACCOUNTS.buyback, registration_only: true });
arg("storage-owner.json", { account_id: ACCOUNTS.owner, registration_only: true });
arg("season-1.json", { season_id: 1 });
arg("season-2.json", { season_id: 2 });
arg("mint-test.json", { season_id: 1, base: parseNear("0.2").toString() });
arg("order-1.json", { order_id: "1" });
arg("orders.json", { from_id: "1", limit: 10 });
arg("tokens-owner.json", { account_id: ACCOUNTS.owner });
arg("pause-mints.json", { paused: true });
arg("unpause-mints.json", { paused: false });
arg("buyer.json", { account_id: "buyer.whatthenft.near" });

console.log(`deploy/mainnet written · manifest sha256 ${manifestHash} · season start ${new Date(startMs).toISOString()} · ${tokens.length} tokens to register`);

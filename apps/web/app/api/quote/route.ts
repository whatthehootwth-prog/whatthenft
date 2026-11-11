import { MAINNET, NearRpc, SEASON_01_DRAFT, findAsset, probeQuotes, verifyAsset, type AssetVerification } from "@wtn/chain";
import { BPS, getExecutableMintMinimum, minShareBps, parseNear, splitMint, type MemeRouteInfo, type ProbeQuote } from "@wtn/domain";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const rpc = new NearRpc({ network: "mainnet", urls: (process.env.QUOTE_RPC_URLS ?? "").split(",").filter(Boolean) });
const verifyCache = new Map<string, { at: number; v: AssetVerification }>();
const quoteCache = new Map<string, { at: number; body: unknown }>();
const VERIFY_TTL = 10 * 60_000;
const QUOTE_TTL = 15_000;
const QUOTE_MAX_AGE = 60_000;

const s = (v: bigint | null | undefined) => (v === null || v === undefined ? null : v.toString());

async function verified(memeId: string) {
  const c = verifyCache.get(memeId);
  if (c && Date.now() - c.at < VERIFY_TTL) return c.v;
  const a = findAsset(MAINNET, memeId)!;
  const v = await verifyAsset(rpc, MAINNET, a);
  verifyCache.set(memeId, { at: Date.now(), v });
  return v;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("base") ?? "1";
  let base: bigint;
  try {
    base = parseNear(raw);
  } catch {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (base <= 0n || base > parseNear("1000")) return NextResponse.json({ error: "Amount out of range" }, { status: 400 });

  const key = base.toString();
  const hit = quoteCache.get(key);
  if (hit && Date.now() - hit.at < QUOTE_TTL) return NextResponse.json(hit.body, { headers: { "cache-control": "no-store" } });

  const d = SEASON_01_DRAFT;
  const split = splitMint(base, d.fees);
  const tier = [...d.tiers].reverse().find((t) => base >= t.minBase)!;
  const memes: MemeRouteInfo[] = [];
  const quotes: ProbeQuote[] = [];
  const perMeme: unknown[] = [];

  await Promise.all(
    d.memes.map(async (m) => {
      const asset = findAsset(MAINNET, m.memeId);
      if (!asset) {
        perMeme.push({ memeId: m.memeId, error: "not in verified registry" });
        return;
      }
      const info: MemeRouteInfo = { memeId: m.memeId, isWth: asset.isWth, eligibleSlots: m.slots, route: asset.route.kind, routeMinInput: 0n, enabled: true };
      const v = await verified(m.memeId);
      info.enabled = v.metadataOk && !!v.pool?.ok;
      memes.push(info);
      const minShare = minShareBps(info, d.allocation);
      const maxShare = asset.isWth ? 10_000 : 10_000 - d.allocation.coreWthBps;
      const minLeg = (split.basket * BigInt(minShare)) / BPS;
      const maxLeg = (split.basket * BigInt(maxShare)) / BPS;
      const sizes = [minLeg, maxLeg].filter((x) => x > 0n);
      const qs = info.enabled ? await probeQuotes(rpc, MAINNET, asset, sizes) : [];
      if (qs[0]) quotes.push(qs[0]);
      perMeme.push({
        memeId: m.memeId,
        symbol: asset.symbol,
        contractId: asset.contractId,
        decimals: asset.decimals,
        isWth: asset.isWth,
        route: asset.route,
        poolFeeBps: v.pool?.feeBps ?? null,
        verified: { metadataOk: v.metadataOk, poolOk: !!v.pool?.ok, error: v.error },
        approvedForMint: m.approvedForMint,
        artSupplied: m.artSupplied,
        minShareBps: minShare,
        maxShareBps: maxShare,
        quotes: qs.map((q) => ({ amountIn: s(q.amountIn), amountOut: s(q.amountOut), priceImpactBps: q.priceImpactBps, quotedAt: q.quotedAt, provider: q.provider, error: q.error ?? null })),
      });
    }),
  );

  memes.sort((a, b) => d.memes.findIndex((m) => m.memeId === a.memeId) - d.memes.findIndex((m) => m.memeId === b.memeId));
  const minimum = getExecutableMintMinimum({
    seasonId: d.seasonId,
    targetBase: d.targetBase,
    maxBase: d.maxBase,
    minLegAmount: d.minLeg,
    maxPriceImpactBps: d.maxPriceImpactBps,
    quoteMaxAgeMs: QUOTE_MAX_AGE,
    tiers: d.tiers,
    memes,
    quotes,
    costs: { storagePerMint: d.reserve.storagePerMint, advanceFeePerStep: d.reserve.advanceFee, baseSteps: 3, stepsPerLeg: 2 },
    now: Date.now(),
    fees: d.fees,
    allocationRule: d.allocation,
  });
  const check = minimum.check(base);
  const maxDistinct = tier.maxPartners + 1;

  const body = {
    generatedAt: new Date().toISOString(),
    source: "mainnet Rhea pools (read-only quotes)",
    season: { id: d.seasonId, name: d.name, status: d.status, maxSupply: d.maxSupply, lockDays: d.lockDays, wthSlotBps: d.wthSlotBps },
    base: s(base),
    split: { basket: s(split.basket), creator: s(split.creator), treasury: s(split.treasury), basketBps: d.fees.basketBps, creatorBps: d.fees.creatorBps, treasuryBps: d.fees.treasuryBps },
    execution: {
      storageFee: s(d.reserve.storagePerMint),
      retryReserve: s(d.reserve.retryReserve),
      advanceFee: s(d.reserve.advanceFee),
      estMintTxGas: s(d.estMintTxGas),
      attachTotal: s(base + d.reserve.storagePerMint + d.reserve.retryReserve),
    },
    tier: { maxPartners: tier.maxPartners, maxDistinctAssets: maxDistinct },
    minimum: {
      target: s(minimum.targetBase),
      executable: s(minimum.executableMinimum),
      targetFeasible: minimum.targetFeasible,
      reasons: minimum.reasons,
      perMeme: minimum.perMeme.map((p) => ({ ...p, requiredLeg: s(p.requiredLeg), requiredBase: s(p.requiredBase) })),
    },
    check,
    memes: perMeme.sort((a, b) => d.memes.findIndex((m) => m.memeId === (a as { memeId: string }).memeId) - d.memes.findIndex((m) => m.memeId === (b as { memeId: string }).memeId)),
  };
  quoteCache.set(key, { at: Date.now(), body });
  return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
}

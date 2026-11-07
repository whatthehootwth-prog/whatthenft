/**
 * Live feasibility probe. Reads ONLY public chain state and dry quotes; moves no funds.
 *   pnpm feasibility            -> prints a report, writes docs/feasibility-snapshot.json
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SLOTS, formatNear, formatUnits, getExecutableMintMinimum, parseNear, type MemeRouteInfo, type ProbeQuote } from "@wtn/domain";
import { MAINNET, NearRpc, OneClick, probeQuotes, verifyAsset } from "../src";

const SIZES = ["0.0001", "0.0072", "0.0144", "0.018", "0.036", "0.09", "0.45", "0.9", "4.5", "9", "45"].map(parseNear);
const MIN_LEG = parseNear("0.005");
const MAX_IMPACT_BPS = 300;

async function main() {
  const rpc = new NearRpc({ network: "mainnet" });
  const net = MAINNET;
  const started = new Date().toISOString();
  const oc = new OneClick();

  const [tokens, gas] = await Promise.all([
    oc.tokens().catch((e) => {
      console.error("1Click tokens failed:", e.message);
      return null;
    }),
    rpc.call<{ gas_price: string }>("gas_price", [null]),
  ]);

  const rows: unknown[] = [];
  const allQuotes: ProbeQuote[] = [];
  const memes: MemeRouteInfo[] = [];
  console.log(`\nWHAT THE NFT?! feasibility probe — ${started}\nNEAR gas price: ${gas.gas_price} yocto/gas (${formatNear(BigInt(gas.gas_price) * 10n ** 12n, 6)} NEAR per Tgas)\n`);

  for (const a of net.assets) {
    const v = await verifyAsset(rpc, net, a);
    const qs = await probeQuotes(rpc, net, a, SIZES);
    allQuotes.push(...qs.filter((q) => q.amountIn !== parseNear("0.0001")));
    const ocSupported = tokens ? tokens.some((t) => t.assetId === `nep141:${a.contractId}`) : null;
    let ocDry: { size: string; ok: boolean; out: string | null; error: string | null }[] = [];
    if (ocSupported) {
      for (const s of [parseNear("0.0072"), parseNear("0.045")]) {
        const q = await oc.dryQuote({ originAsset: `nep141:${net.wrapNear}`, destinationAsset: `nep141:${a.contractId}`, amount: s, slippageBps: 200, account: "near" });
        ocDry.push({ size: formatNear(s, 6), ok: q.ok, out: q.amountOut?.toString() ?? null, error: q.error });
      }
    }
    memes.push({ memeId: a.memeId, isWth: a.isWth, eligibleSlots: [...SLOTS], route: a.route.kind, routeMinInput: 0n, enabled: v.metadataOk && !!v.pool?.ok });
    console.log(`■ ${a.symbol} ${a.contractId}  metadata=${v.metadataOk ? "OK" : "MISMATCH"} pool=${v.pool?.ok ? "OK" : "FAIL"} (${a.route.kind}:${a.route.poolId}, fee ${v.pool?.feeBps ?? "?"} bps) 1Click=${ocSupported === null ? "unknown" : ocSupported ? "supported" : "NOT supported"}`);
    for (const q of qs) {
      console.log(`    ${formatNear(q.amountIn, 6).padStart(9)} NEAR -> ${q.amountOut === null ? "FAILED " + (q.error ?? "") : formatUnits(q.amountOut, a.decimals, 4).padStart(22) + " " + a.symbol}  impact=${q.priceImpactBps ?? "n/a"} bps`);
    }
    for (const d of ocDry) console.log(`    1Click dry ${d.size} NEAR -> ${d.ok ? d.out : "ERROR " + d.error}`);
    rows.push({
      ...a,
      route: a.route,
      verification: { ...v, storageMinYocto: v.storageMinYocto?.toString() ?? null },
      oneClickSupported: ocSupported,
      oneClickDry: ocDry,
      quotes: qs.map((q) => ({ ...q, amountIn: q.amountIn.toString(), amountOut: q.amountOut?.toString() ?? null })),
    });
  }

  // Season 01 candidate evaluation: WTH + one partner at a time (low tier).
  const evals = [];
  for (const partner of memes.filter((m) => !m.isWth)) {
    const pool = [memes.find((m) => m.isWth)!, partner];
    const r = getExecutableMintMinimum({
      seasonId: 1,
      targetBase: parseNear("0.1"),
      maxBase: parseNear("50"),
      minLegAmount: MIN_LEG,
      maxPriceImpactBps: MAX_IMPACT_BPS,
      quoteMaxAgeMs: 10 * 60_000,
      tiers: [{ minBase: 0n, maxPartners: 1 }],
      memes: pool,
      quotes: allQuotes.filter((q) => pool.some((p) => p.memeId === q.memeId) && q.amountIn <= parseNear("0.09")),
      costs: { storagePerMint: parseNear("0.01"), advanceFeePerStep: parseNear("0.002"), baseSteps: 3, stepsPerLeg: 2 },
      now: Date.now(),
    });
    evals.push({ pair: `wth+${partner.memeId}`, executableMinimum: r.executableMinimum?.toString() ?? null, targetFeasible: r.targetFeasible, reasons: r.reasons });
    console.log(`\nWTH + ${partner.memeId}: executable minimum ${r.executableMinimum === null ? "NONE" : formatNear(r.executableMinimum, 6) + " NEAR"} (0.1 target ${r.targetFeasible ? "FEASIBLE" : "NOT feasible"})${r.reasons.length ? " — " + r.reasons.join("; ") : ""}`);
  }

  // Max size before WTH impact exceeds ceiling (bounds season max mint).
  const wthQs = allQuotes.filter((q) => q.memeId === "wth" && q.priceImpactBps !== null);
  const wthMaxOk = wthQs.filter((q) => q.priceImpactBps! <= MAX_IMPACT_BPS).reduce((a, q) => (q.amountIn > a ? q.amountIn : a), 0n);
  console.log(`\nLargest probed WTH leg within ${MAX_IMPACT_BPS} bps impact: ${formatNear(wthMaxOk, 4)} NEAR`);

  const snapshot = { generatedAt: started, network: "mainnet", gasPriceYocto: gas.gas_price, minLegYocto: MIN_LEG.toString(), maxImpactBps: MAX_IMPACT_BPS, assets: rows, seasonPairEvaluations: evals, wthMaxLegWithinImpactYocto: wthMaxOk.toString() };
  const out = resolve(import.meta.dirname, "../../../docs/feasibility-snapshot.json");
  writeFileSync(out, JSON.stringify(snapshot, null, 1) + "\n");
  console.log(`\nSnapshot written to ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

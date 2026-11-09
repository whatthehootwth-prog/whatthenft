/**
 * One keeper cycle:
 *   1. If an old round is still open (crash), close it — the remainder rolls over.
 *   2. If the treasury's spendable NEAR is worth ≥ threshold (two agreeing price sources): buy WTH.
 *   3. After a buy (or with --distribute): snapshot $WTH holders, split pro-rata, publish the
 *      snapshot, start_round(sha256, total), pay in batches of 20, close_round.
 * Dry-run by default: computes and prints everything, sends nothing.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NearRpc } from "@wtn/chain";
import { allocate, canonical, chunk, snapshotHash } from "./allocate";
import { type KeeperConfig, ONE_WTH, WTH_DECIMALS, YOCTO, fmt } from "./config";
import { takeSnapshot } from "./holders";
import { agreedNearUsd, coingecko, rheaOnchain, type PriceFetcher } from "./price";

export const BATCH = 20;
const TGAS = 1_000_000_000_000n;

export interface BuybackState {
  paused: boolean;
  busy: boolean;
  round: { id: number; total: string; paid: string } | null;
  last_round_id: number;
  last_buy_ns: string;
  available_near: string;
  wth_unallocated: string;
  limits: { max_spend_per_buy: string; min_buy_interval_ns: string; max_slippage_bps: number };
}

/** Anything that can call a change method (real NEAR account, or a dry-run recorder). */
export interface Caller {
  call(method: string, args: Record<string, unknown>, gasTgas: number): Promise<void>;
}

export interface CycleOptions {
  send: boolean;
  forceDistribute?: boolean;
  roundsDir: string;
  log?: (msg: string) => void;
  prices?: PriceFetcher[];
  now?: () => number;
  /** Injected fetch for the holder indexer (tests). */
  fetchImpl?: typeof fetch;
}

export async function runCycle(cfg: KeeperConfig, rpc: NearRpc, caller: Caller, o: CycleOptions): Promise<{ bought: boolean; distributed: boolean }> {
  const log = o.log ?? console.log;
  const state = () => rpc.view<BuybackState>(cfg.buybackContract, "get_state");
  let s = await state();
  log(`treasury ${cfg.buybackContract}: spendable ${fmt(BigInt(s.available_near), 24n)} NEAR · unallocated ${fmt(BigInt(s.wth_unallocated), WTH_DECIMALS)} WTH`);
  if (s.paused) {
    log("contract is paused — nothing to do");
    return { bought: false, distributed: false };
  }
  if (s.busy) {
    log("a buy is still in flight — try again next cycle");
    return { bought: false, distributed: false };
  }

  if (s.round) {
    log(`round ${s.round.id} was left open — closing it (unpaid WTH rolls over)`);
    await caller.call("close_round", {}, 50);
    s = await state();
  }

  // ── 1. buy ──
  let bought = false;
  const sources: PriceFetcher[] = o.prices ?? (cfg.testNearUsd ? [async () => ({ source: "test-fixed", usd: cfg.testNearUsd! })] : [rheaOnchain(rpc), coingecko()]);
  const price = await agreedNearUsd(sources, cfg.maxPriceDivergence, cfg.testNearUsd && !o.prices ? 1 : 2);
  const avail = BigInt(s.available_near);
  if (price.usd === null) {
    log(`skip buy: ${price.reason}`);
  } else {
    const usd = (Number(avail) / Number(YOCTO)) * price.usd;
    const nowNs = BigInt(Math.floor((o.now?.() ?? Date.now()) * 1e6));
    const nextBuy = BigInt(s.last_buy_ns) + BigInt(s.limits.min_buy_interval_ns);
    log(`NEAR = $${price.usd} (${price.quotes.map((q) => q.source).join(" + ")}) → treasury worth $${usd.toFixed(2)} (threshold $${cfg.thresholdUsd})`);
    if (usd < cfg.thresholdUsd) log("below threshold — holding");
    else if (BigInt(s.last_buy_ns) > 0n && nowNs < nextBuy) log("threshold reached, but still inside the minimum interval between buys");
    else {
      const cap = BigInt(s.limits.max_spend_per_buy);
      const amount = avail < cap ? avail : cap;
      log(`${o.send ? "BUY" : "[dry-run] would buy"}: ${fmt(amount, 24n)} NEAR → WTH (max slippage ${s.limits.max_slippage_bps / 100}%)`);
      if (o.send) {
        await caller.call("buy", { amount: amount.toString() }, 300);
        s = await state();
        log(`after buy: unallocated ${fmt(BigInt(s.wth_unallocated), WTH_DECIMALS)} WTH`);
      }
      bought = true;
    }
  }

  // ── 2. distribute ──
  if (!bought && !o.forceDistribute) return { bought, distributed: false };
  const total = BigInt(s.wth_unallocated);
  if (total === 0n) {
    log(o.send ? "no WTH to distribute" : "[dry-run] (a real buy would add WTH here; showing the split of what's held now: 0)");
    return { bought, distributed: false };
  }
  const snap = await takeSnapshot(rpc, cfg.wthToken, cfg.minHolding, { fetchImpl: o.fetchImpl });
  const rules = { exclude: cfg.exclude, minHolding: cfg.minHolding, minPayout: cfg.minPayout };
  const a = allocate(snap.holders, total, rules);
  log(`snapshot: ${snap.holders.length} holders · ${a.payouts.length} paid · ${a.skipped.length} skipped · allocate ${fmt(a.allocated, WTH_DECIMALS)} / rollover ${fmt(a.rollover, WTH_DECIMALS)} WTH`);
  if (a.payouts.length === 0) {
    log("nobody qualifies for a payout this round — everything rolls over");
    return { bought, distributed: false };
  }

  const roundId = s.last_round_id + 1;
  const doc = {
    round: roundId,
    network: cfg.network,
    contract: cfg.buybackContract,
    token: cfg.wthToken,
    snapshot: { takenAt: snap.takenAt, source: snap.source, truncated: snap.truncated, holders: snap.holders },
    rules: { exclude: rules.exclude, minHolding: rules.minHolding, minPayout: rules.minPayout },
    total: a.allocated,
    rollover: a.rollover,
    payouts: a.payouts,
  };
  const hash = snapshotHash(doc);
  mkdirSync(o.roundsDir, { recursive: true });
  const file = join(o.roundsDir, o.send ? `${cfg.network}-round-${roundId}.json` : `${cfg.network}-dry-run-latest.json`);
  writeFileSync(file, JSON.stringify({ sha256: hash, ...JSON.parse(canonical(doc)) }, null, 2));
  log(`snapshot written: ${file} (sha256 ${hash})`);
  for (const p of a.payouts.slice(0, 10)) log(`  ${p.account_id.padEnd(40)} ${fmt(p.amount, WTH_DECIMALS, 2)} WTH`);
  if (a.payouts.length > 10) log(`  … and ${a.payouts.length - 10} more`);

  if (!o.send) {
    log(`[dry-run] would start round ${roundId}, pay ${a.payouts.length} holders in ${Math.ceil(a.payouts.length / BATCH)} batch(es), then close it`);
    return { bought, distributed: true };
  }
  await caller.call("start_round", { snapshot_hash: hash, total: a.allocated.toString() }, 30);
  for (const [i, batch] of chunk(a.payouts, BATCH).entries()) {
    await caller.call("pay", { batch: batch.map((p) => ({ account_id: p.account_id, amount: p.amount.toString() })) }, 300);
    log(`paid batch ${i + 1}`);
  }
  await caller.call("close_round", {}, 50);
  log(`round ${roundId} closed`);
  return { bought, distributed: true };
}

/** Real signer (near-api-js). Waits for FINAL so the next step sees settled state. */
export async function nearCaller(cfg: KeeperConfig): Promise<Caller> {
  if (!cfg.keeperAccount || !cfg.keeperPrivateKey) throw new Error("--send needs KEEPER_ACCOUNT and KEEPER_PRIVATE_KEY in the environment");
  const { Account, KeyPair, KeyPairSigner, providers } = await import("near-api-js");
  const url = cfg.rpcUrl ?? (cfg.network === "mainnet" ? "https://rpc.mainnet.near.org" : "https://rpc.testnet.near.org");
  const account = new Account(cfg.keeperAccount, new providers.JsonRpcProvider({ url }), new KeyPairSigner(KeyPair.fromString(cfg.keeperPrivateKey as `ed25519:${string}`)));
  return {
    async call(method, args, gasTgas) {
      await account.callFunction({ contractId: cfg.buybackContract, methodName: method, args, gas: BigInt(gasTgas) * TGAS, deposit: 0n, waitUntil: "FINAL" });
    },
  };
}

export const dryRunCaller: Caller = {
  async call() {
    throw new Error("dry-run must not send transactions");
  },
};

export { ONE_WTH };

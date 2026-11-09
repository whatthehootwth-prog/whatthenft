/**
 * Read-only preview of a payout round using LIVE $WTH holders — no contract, no key, sends nothing.
 *
 *   pnpm --filter @wtn/keeper preview 1000       # how 1,000 bought-back WTH would be split today
 */
import { NearRpc } from "@wtn/chain";
import { allocate } from "./allocate";
import { DEFAULT_EXCLUDE, ONE_WTH, WTH_DECIMALS, fmt } from "./config";
import { takeSnapshot } from "./holders";
import { agreedNearUsd, coingecko, rheaOnchain } from "./price";

const token = process.env.WTH_TOKEN ?? "wth-0b2227.launchpad.justhoot.near";
const totalWth = BigInt(process.argv[2] ?? 1000);
const minHolding = BigInt(process.env.MIN_HOLDING_WTH ?? 1000) * ONE_WTH;
const minPayout = BigInt(process.env.MIN_PAYOUT_WTH ?? 1) * ONE_WTH;
const exclude = [...DEFAULT_EXCLUDE, ...(process.env.EXCLUDE ?? "").split(",").map((s) => s.trim()).filter(Boolean)];

const rpc = new NearRpc({ network: "mainnet" });
const price = await agreedNearUsd([rheaOnchain(rpc), coingecko()]);
console.log(`NEAR/USD: ${price.usd === null ? `no agreement (${price.reason})` : `$${price.usd}`}`);

const snap = await takeSnapshot(rpc, token, minHolding);
const a = allocate(snap.holders, totalWth * ONE_WTH, { exclude, minHolding, minPayout });
console.log(`holders listed: ${snap.holders.length}${snap.truncated ? " (indexer cap reached, but every qualifying holder is included)" : ""}`);
console.log(`qualifying: ${a.payouts.length} · skipped: ${a.skipped.length} (excluded ${a.skipped.filter((s) => s.reason === "excluded").length}, small ${a.skipped.filter((s) => s.reason === "below_min_holding").length}, dust ${a.skipped.filter((s) => s.reason === "below_min_payout").length})`);
console.log(`split ${fmt(a.allocated, WTH_DECIMALS, 2)} WTH · rollover ${fmt(a.rollover, WTH_DECIMALS, 2)} WTH\n`);
for (const p of a.payouts.slice(0, 15)) console.log(`  ${p.account_id.slice(0, 44).padEnd(46)} ${fmt(p.amount, WTH_DECIMALS, 2).padStart(12)} WTH`);
if (a.payouts.length > 15) console.log(`  … and ${a.payouts.length - 15} more`);

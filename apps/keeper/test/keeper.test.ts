import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { NearRpc } from "@wtn/chain";
import { allocate, canonical, snapshotHash } from "../src/allocate";
import { ONE_WTH, YOCTO, loadConfig } from "../src/config";
import { type BuybackState, type Caller, runCycle } from "../src/cycle";
import { agreedNearUsd } from "../src/price";

const W = ONE_WTH;
const TMP = join(tmpdir(), "wtn-keeper-test-rounds");
const rules = { exclude: ["pool.near"], minHolding: 1000n * W, minPayout: 1n * W };

describe("pro-rata allocation", () => {
  it("splits in proportion to balance and never over-allocates", () => {
    const a = allocate(
      [
        { account_id: "alice.near", balance: 6000n * W },
        { account_id: "bob.near", balance: 3000n * W },
        { account_id: "carol.near", balance: 1000n * W },
      ],
      100n * W,
      rules,
    );
    expect(a.payouts).toEqual([
      { account_id: "alice.near", amount: 60n * W },
      { account_id: "bob.near", amount: 30n * W },
      { account_id: "carol.near", amount: 10n * W },
    ]);
    expect(a.allocated + a.rollover).toBe(100n * W);
    expect(a.rollover).toBe(0n);
  });

  it("excludes pools, small holders, and dust payouts (which roll over)", () => {
    const a = allocate(
      [
        { account_id: "pool.near", balance: 900_000n * W },
        { account_id: "whale.near", balance: 99_000n * W },
        { account_id: "tiny.near", balance: 999n * W },
        { account_id: "fish.near", balance: 1_000n * W },
      ],
      50n * W,
      rules,
    );
    // eligible = whale + fish = 100_000; fish share = 0.5 WTH < min payout → rolls over
    expect(a.payouts).toEqual([{ account_id: "whale.near", amount: 49_500_000_000_000_000_000n }]);
    expect(a.rollover).toBe(50n * W - 49_500_000_000_000_000_000n);
    expect(a.skipped.map((s) => s.reason).sort()).toEqual(["below_min_holding", "below_min_payout", "excluded"]);
  });

  it("conserves the total for awkward numbers and is deterministic", () => {
    const holders = Array.from({ length: 37 }, (_, i) => ({ account_id: `h${i}.near`, balance: BigInt(1000 + i * 7919) * W + BigInt(i) }));
    const total = 123_456_789_012_345_678_901n;
    const a = allocate(holders, total, { ...rules, minPayout: 0n });
    const b = allocate([...holders].reverse(), total, { ...rules, minPayout: 0n });
    expect(a.allocated + a.rollover).toBe(total);
    expect(a.allocated <= total).toBe(true);
    expect(a.payouts).toEqual(b.payouts);
  });

  it("rejects duplicate holders", () => {
    expect(() => allocate([{ account_id: "a.near", balance: 1n }, { account_id: "A.near", balance: 1n }], 1n, rules)).toThrow(/duplicate/);
  });

  it("snapshot hash is stable regardless of key order", () => {
    expect(snapshotHash({ b: 1n, a: [{ y: 2, x: 1 }] })).toBe(snapshotHash({ a: [{ x: 1, y: 2 }], b: 1n }));
    expect(canonical({ n: 5n })).toBe('{"n":"5"}');
  });
});

describe("price agreement", () => {
  it("uses the lower price when sources agree", async () => {
    const p = await agreedNearUsd([async () => ({ source: "a", usd: 3.6 }), async () => ({ source: "b", usd: 3.5 })]);
    expect(p.usd).toBe(3.5);
  });
  it("refuses when sources disagree or fail", async () => {
    expect((await agreedNearUsd([async () => ({ source: "a", usd: 1.33 }), async () => ({ source: "b", usd: 3.62 })])).usd).toBeNull();
    expect((await agreedNearUsd([async () => ({ source: "a", usd: 3.6 }), async () => Promise.reject(new Error("down"))])).usd).toBeNull();
  });
});

// ───────── full cycle against a fake chain ─────────

function fakeChain(state: Partial<BuybackState>, balances: Record<string, bigint>) {
  const s: BuybackState = {
    paused: false,
    busy: false,
    round: null,
    last_round_id: 0,
    last_buy_ns: "0",
    available_near: (8n * YOCTO).toString(),
    wth_unallocated: "0",
    limits: { max_spend_per_buy: (5n * YOCTO).toString(), min_buy_interval_ns: "3600000000000", max_slippage_bps: 300 },
    ...state,
  };
  const calls: { method: string; args: Record<string, unknown> }[] = [];
  const rpc = {
    async view(_c: string, method: string, args: { account_id?: string }) {
      if (method === "get_state") return JSON.parse(JSON.stringify(s));
      if (method === "ft_balance_of") return (balances[args.account_id!] ?? 0n).toString();
      throw new Error(method);
    },
  } as unknown as NearRpc;
  const caller: Caller = {
    async call(method, args) {
      calls.push({ method, args });
      if (method === "buy") {
        s.available_near = (3n * YOCTO).toString();
        s.wth_unallocated = (100n * W).toString();
        s.last_buy_ns = "1";
      }
      if (method === "start_round") s.last_round_id += 1;
    },
  };
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ accounts: Object.entries(balances).map(([account_id, b]) => ({ account_id, balance: b.toString() })) }))) as typeof fetch;
  return { s, calls, rpc, caller, fetchImpl };
}

const cfg = { ...loadConfig({ NETWORK: "testnet", BUYBACK_CONTRACT: "buyback.testnet", WTH_TOKEN: "wth.testnet", MIN_HOLDING_WTH: "1000" }), exclude: ["pool.testnet", "buyback.testnet"] };
const at = (usd: number) => [async () => ({ source: "a", usd }), async () => ({ source: "b", usd })];

describe("keeper cycle", () => {
  it("holds below $20", async () => {
    const c = fakeChain({ available_near: (4n * YOCTO).toString() }, {}); // 4 NEAR × $3 = $12
    const r = await runCycle(cfg, c.rpc, c.caller, { send: true, roundsDir: TMP, prices: at(3), log: () => {}, fetchImpl: c.fetchImpl });
    expect(r.bought).toBe(false);
    expect(c.calls).toEqual([]);
  });

  it("at ≥ $20: buys (capped), snapshots, pays pro-rata, closes", async () => {
    const c = fakeChain({}, { "alice.testnet": 3000n * W, "bob.testnet": 1000n * W, "pool.testnet": 50_000n * W, "dust.testnet": 10n * W });
    const r = await runCycle(cfg, c.rpc, c.caller, { send: true, roundsDir: TMP, prices: at(3), log: () => {}, fetchImpl: c.fetchImpl });
    expect(r).toEqual({ bought: true, distributed: true });
    expect(c.calls.map((x) => x.method)).toEqual(["buy", "start_round", "pay", "close_round"]);
    expect(c.calls[0]!.args).toEqual({ amount: (5n * YOCTO).toString() }); // capped at max_spend_per_buy
    expect(c.calls[2]!.args).toEqual({
      batch: [
        { account_id: "alice.testnet", amount: (75n * W).toString() },
        { account_id: "bob.testnet", amount: (25n * W).toString() },
      ],
    });
    expect((c.calls[1]!.args.snapshot_hash as string).length).toBe(64);
  });

  it("does not buy when price sources disagree", async () => {
    const c = fakeChain({}, {});
    const r = await runCycle(cfg, c.rpc, c.caller, { send: true, roundsDir: TMP, prices: [async () => ({ source: "a", usd: 1.33 }), async () => ({ source: "b", usd: 3.62 })], log: () => {} });
    expect(r.bought).toBe(false);
    expect(c.calls).toEqual([]);
  });

  it("closes a round left open by a crash before doing anything else", async () => {
    const c = fakeChain({ round: { id: 4, total: "10", paid: "5" }, available_near: "0" }, {});
    await runCycle(cfg, c.rpc, c.caller, { send: true, roundsDir: TMP, prices: at(3), log: () => {} });
    expect(c.calls[0]!.method).toBe("close_round");
  });

  it("dry run never sends", async () => {
    const c = fakeChain({}, { "alice.testnet": 3000n * W });
    const never: Caller = { async call() { throw new Error("sent!"); } };
    const r = await runCycle(cfg, c.rpc, never, { send: false, roundsDir: TMP, prices: at(3), log: () => {}, fetchImpl: c.fetchImpl });
    expect(r.bought).toBe(true);
  });
});

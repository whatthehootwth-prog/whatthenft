import { describe, expect, it } from "vitest";
import type { NearRpc } from "@wtn/chain";
import type { Caller } from "../src/cycle";
import { type OrderJ, runOrderCycle } from "../src/orders";

const NOW_MS = 1_800_000_000_000;
const ns = (msAgo: number) => String(BigInt(NOW_MS - msAgo) * 1_000_000n);

/** Fake chain: each advance_order moves an order one step along its path. */
function chain(orders: OrderJ[], paths: Record<string, string[]> = {}) {
  const byId = new Map(orders.map((o) => [o.id, { ...o }]));
  const calls: { method: string; id: string }[] = [];
  const rpc = {
    async view(_c: string, m: string, a: { order_id?: string }) {
      if (m === "get_config") return { next_order_id: String(orders.length + 1) };
      if (m === "get_orders") return [...byId.values()];
      if (m === "get_order") return byId.get(a.order_id!) ?? null;
      throw new Error(m);
    },
  } as unknown as NearRpc;
  const caller: Caller = {
    async call(method, args) {
      const id = String((args as { order_id: string }).order_id);
      calls.push({ method, id });
      const o = byId.get(id)!;
      const path = paths[id];
      if (method === "advance_order" && path?.length) o.status = path.shift()!;
    },
  };
  return { rpc, caller, calls };
}

const order = (id: string, status: string, msAgo = 60_000): OrderJ => ({ id, payer: "a.near", status, updated_ns: ns(msAgo), legs: [], note: null });
const opts = { coreContract: "core.near", send: true, now: () => NOW_MS, log: () => {} };

describe("order runner", () => {
  it("steps an in-progress mint all the way to minted", async () => {
    const c = chain([order("1", "Escrowed")], { "1": ["TraitsAssigned", "SwapsPending", "FullyBackedLocked"] });
    const r = await runOrderCycle(c.rpc, c.caller, opts);
    expect(c.calls.every((x) => x.method === "advance_order" && x.id === "1")).toBe(true);
    expect(r.advanced[0]).toEqual({ id: "1", steps: 3, status: "FullyBackedLocked" });
  });

  it("leaves fresh orders to the minter's own page, ignores finished ones", async () => {
    const c = chain([order("1", "Escrowed", 5_000), order("2", "FullyBackedLocked"), order("3", "Refunded")]);
    await runOrderCycle(c.rpc, c.caller, opts);
    expect(c.calls).toEqual([]);
  });

  it("pushes stuck refunds and reports orders that need a human", async () => {
    const c = chain([order("1", "RefundPending"), { ...order("2", "PartialExecutionRecovery"), note: "leg 1 failed" }]);
    const r = await runOrderCycle(c.rpc, c.caller, opts);
    expect(c.calls).toEqual([{ method: "refund_order", id: "1" }]);
    expect(r.needsHuman).toEqual([{ id: "2", status: "PartialExecutionRecovery", note: "leg 1 failed" }]);
  });

  it("stops when nothing moves (token busy) instead of burning gas", async () => {
    const c = chain([order("1", "SwapsPending")], { "1": [] });
    const r = await runOrderCycle(c.rpc, c.caller, opts);
    expect(c.calls.length).toBeLessThanOrEqual(2);
    expect(r.advanced[0]!.status).toBe("SwapsPending");
  });

  it("dry run never sends", async () => {
    const c = chain([order("1", "TraitsAssigned"), order("2", "RefundPending")]);
    const never: Caller = { async call() { throw new Error("sent!"); } };
    const r = await runOrderCycle(c.rpc, never, { ...opts, send: false });
    expect(r.advanced.map((a) => a.id)).toEqual(["1"]);
    expect(r.refunded).toEqual(["2"]);
  });
});

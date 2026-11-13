/**
 * Order runner: keeps every mint moving until it's done.
 *
 * A mint goes Escrowed → (reveal) → TraitsAssigned → (wrap) → SwapsPending → (one swap per token)
 * → FullyBackedLocked (NFT minted). Each step is one permissionless `advance_order` call; the keeper
 * is reimbursed a small fee from the order's retry reserve and can never influence the outcome.
 * Stuck refunds are pushed with `refund_order`. Orders that need a human (recovery) are reported.
 */
import type { NearRpc } from "@wtn/chain";
import type { Caller } from "./cycle";

export const IN_PROGRESS = ["Escrowed", "TraitsAssigned", "SwapsPending"] as const;
const DONE = new Set(["FullyBackedLocked", "Refunded"]);

export interface OrderJ {
  id: string;
  payer: string;
  status: string;
  updated_ns: string;
  legs: { status: string }[];
  note: string | null;
}

export interface OrderRunOptions {
  coreContract: string;
  send: boolean;
  /** Leave orders alone this long after their last update (the minter's own page may be driving them). */
  minAgeSec?: number;
  /** Max steps per order per run (each step waits for finality). */
  maxSteps?: number;
  /** How far back to scan. */
  scanBack?: number;
  now?: () => number;
  log?: (m: string) => void;
}

export interface OrderRunResult {
  advanced: { id: string; steps: number; status: string }[];
  refunded: string[];
  needsHuman: { id: string; status: string; note: string | null }[];
}

async function recentOrders(rpc: NearRpc, core: string, scanBack: number): Promise<OrderJ[]> {
  const cfg = await rpc.view<{ next_order_id: string }>(core, "get_config");
  const next = Number(cfg.next_order_id);
  const out: OrderJ[] = [];
  for (let from = Math.max(1, next - scanBack); from < next; from += 50) out.push(...(await rpc.view<OrderJ[]>(core, "get_orders", { from_id: String(from), limit: 50 })));
  return out;
}

export async function runOrderCycle(rpc: NearRpc, caller: Caller, o: OrderRunOptions): Promise<OrderRunResult> {
  const log = o.log ?? console.log;
  const nowNs = BigInt(Math.floor((o.now?.() ?? Date.now()) * 1e6));
  const minAgeNs = BigInt(o.minAgeSec ?? 20) * 1_000_000_000n;
  const maxSteps = o.maxSteps ?? 6;
  const orders = await recentOrders(rpc, o.coreContract, o.scanBack ?? 300);
  const res: OrderRunResult = { advanced: [], refunded: [], needsHuman: [] };

  for (const ord of orders) {
    if (DONE.has(ord.status)) continue;
    if (ord.status === "PartialExecutionRecovery" || ord.status === "FailedPreExecution") {
      res.needsHuman.push({ id: ord.id, status: ord.status, note: ord.note });
      continue;
    }
    if (nowNs - BigInt(ord.updated_ns) < minAgeNs) continue;
    if (ord.status === "RefundPending") {
      log(`${o.send ? "REFUND" : "[dry-run] would refund"} order #${ord.id}`);
      if (o.send) await caller.call("refund_order", { order_id: ord.id }, 120, o.coreContract);
      res.refunded.push(ord.id);
      continue;
    }
    if (!(IN_PROGRESS as readonly string[]).includes(ord.status)) continue;
    if (!o.send) {
      log(`[dry-run] would advance order #${ord.id} (${ord.status})`);
      res.advanced.push({ id: ord.id, steps: 0, status: ord.status });
      continue;
    }
    // Step until finished, stuck, or out of budget; each call waits for FINAL so the next read is settled.
    let steps = 0;
    let status = ord.status;
    let lastSig = "";
    while (steps < maxSteps && (IN_PROGRESS as readonly string[]).includes(status)) {
      await caller.call("advance_order", { order_id: ord.id }, 300, o.coreContract);
      steps++;
      const now = await rpc.view<OrderJ | null>(o.coreContract, "get_order", { order_id: ord.id });
      if (!now) break;
      status = now.status;
      const sig = `${now.status}:${now.legs.map((l) => l.status).join(",")}`;
      if (sig === lastSig) break; // nothing moved (a token is busy with another order) — try next run
      lastSig = sig;
    }
    log(`order #${ord.id}: ${steps} step(s) → ${status}`);
    res.advanced.push({ id: ord.id, steps, status });
  }
  for (const h of res.needsHuman) log(`⚠ order #${h.id} needs attention (${h.status})${h.note ? `: ${h.note}` : ""}`);
  return res;
}

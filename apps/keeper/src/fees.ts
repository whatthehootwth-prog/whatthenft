/**
 * Token transfer-fee sync. Justhoot launchpad tokens take a fee (transfer_fee_pips, 1e6 = 100%) on
 * DEX transfers, and their owners can change it. Core accepts a swap only if it received at least
 * min_out minus the token's fee tolerance, so the tolerance must track the live fee:
 *   1. read every season token's live fee → set_transfer_fees for any that differ (core operator)
 *   2. release legs that froze only because of the fee (accept_fee_shortfall), so the order runner
 *      can finish those mints
 * A shortfall bigger than the fee is never accepted; those orders stay for a human.
 */
import type { NearRpc } from "@wtn/chain";
import type { Caller } from "./cycle";

const MAX_BPS = 1_000;

interface SeasonJ {
  id: number;
  config: { memes: { token: string }[] };
}
interface LegJ {
  status: string;
  spent: boolean;
  token: string;
  acquired: string;
  min_out: string;
}
interface OrderJ {
  id: string;
  status: string;
  legs: LegJ[];
}

/** Live fee in bps (rounded up), 0 for tokens without a fee config. */
export const pipsToBps = (pips: number) => Math.min(MAX_BPS, Math.ceil(pips / 100));

export async function liveFeeBps(rpc: NearRpc, token: string): Promise<number> {
  try {
    const cfg = await rpc.view<{ transfer_fee_pips?: number }>(token, "get_config");
    return pipsToBps(cfg?.transfer_fee_pips ?? 0);
  } catch {
    return 0; // plain NEP-141 without get_config
  }
}

/** Would this frozen leg pass with fee tolerance `bps`? (mirrors core `min_received`) */
export function coveredByFee(leg: LegJ, bps: number): boolean {
  const min = BigInt(leg.min_out);
  const got = BigInt(leg.acquired);
  return leg.status === "Failed" && leg.spent && min > 0n && got > 0n && got >= (min * BigInt(10_000 - bps)) / 10_000n;
}

export async function runFeeSync(
  rpc: NearRpc,
  caller: Caller,
  o: { coreContract: string; send: boolean; log?: (m: string) => void; scanBack?: number },
): Promise<{ updated: { token: string; bps: number }[]; accepted: { order: string; leg: number }[] }> {
  const log = o.log ?? console.log;
  const seasons = await rpc.view<SeasonJ[]>(o.coreContract, "get_seasons");
  const tokens = [...new Set(seasons.flatMap((s) => s.config.memes.map((m) => m.token)))];

  const updated: { token: string; bps: number }[] = [];
  const tolerance = new Map<string, number>();
  for (const token of tokens) {
    const live = await liveFeeBps(rpc, token);
    const set = await rpc.view<number>(o.coreContract, "get_transfer_fee_bps", { token });
    tolerance.set(token, Math.max(live, set));
    if (live !== set) updated.push({ token, bps: live });
  }
  if (updated.length) {
    log(`fee changes: ${updated.map((u) => `${u.token} → ${u.bps / 100}%`).join(", ")}`);
    if (o.send) {
      await caller.call("set_transfer_fees", { fees: updated }, 30, o.coreContract);
      for (const u of updated) tolerance.set(u.token, u.bps);
    }
  }

  // release fee-only anomalies
  const cfg = await rpc.view<{ next_order_id: string }>(o.coreContract, "get_config");
  const next = Number(cfg.next_order_id);
  const accepted: { order: string; leg: number }[] = [];
  for (let from = Math.max(1, next - (o.scanBack ?? 300)); from < next; from += 50) {
    const orders = await rpc.view<OrderJ[]>(o.coreContract, "get_orders", { from_id: String(from), limit: 50 });
    for (const ord of orders) {
      if (ord.status !== "PartialExecutionRecovery") continue;
      for (const [i, leg] of ord.legs.entries()) {
        const bps = tolerance.get(leg.token) ?? 0;
        if (bps > 0 && coveredByFee(leg, bps)) {
          log(`order ${ord.id} leg ${i}: shortfall within ${leg.token}'s ${bps / 100}% fee → accept`);
          if (o.send) await caller.call("accept_fee_shortfall", { order_id: ord.id, leg: i }, 30, o.coreContract);
          accepted.push({ order: ord.id, leg: i });
        }
      }
    }
  }
  return { updated, accepted };
}

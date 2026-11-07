"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArtSlot, Alert, RarityChip, TxLink } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { assetByContract, bpsPct, near, nsToDate, tokenAmount, utc } from "@/lib/format";
import { getOrder, RARITY, type OrderJ, type SeasonJ } from "@/lib/near";
import { useWallet } from "@/lib/wallet";

const SLOT_NAMES = ["head", "face", "body", "arms", "legs", "accessory"];

type StepState = "done" | "current" | "todo" | "failed";

function stepStates(o: OrderJ): { label: string; state: StepState; detail?: string }[] {
  const failed = ["FailedPreExecution", "RefundPending", "Refunded", "PartialExecutionRecovery"].includes(o.status);
  const revealed = !!o.reveal;
  const legsDone = o.legs.filter((l) => l.status === "Done").length;
  const settled = o.status === "FullyBackedLocked";
  return [
    { label: "Payment escrowed in contract", state: "done", detail: `${near(o.base)} NEAR base + ${near(BigInt(o.storage_fee) + BigInt(o.retry_reserve))} NEAR execution` },
    { label: "Randomness revealed (later block)", state: revealed ? "done" : failed ? "failed" : "current", detail: o.reveal ? `block ${o.reveal.block_height}` : undefined },
    { label: "NEAR wrapped for swaps", state: o.wrapped ? "done" : revealed && !failed ? "current" : failed ? "failed" : "todo" },
    {
      label: `Token swaps verified (${legsDone}/${o.legs.length || "?"})`,
      state: settled || (o.legs.length > 0 && legsDone === o.legs.length) ? "done" : o.status === "PartialExecutionRecovery" ? "failed" : o.wrapped ? "current" : "todo",
    },
    { label: "Funded NFT minted to your wallet", state: settled ? "done" : failed ? "failed" : "todo", detail: o.token_id ? `token #${o.token_id}` : undefined },
  ];
}

export function OrderTracker({ orderId, txHash, season }: { orderId: string; txHash?: string | null; season?: SeasonJ | null }) {
  const [o, setO] = useState<OrderJ | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { call, accountId } = useWallet();

  const load = useCallback(() => {
    getOrder(orderId)
      .then((x) => {
        setO(x);
        setErr(null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [orderId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (method: string, label: string, tgas = 280) => {
    if (!CORE_CONTRACT) return;
    setBusy(label);
    try {
      await call({ receiverId: CORE_CONTRACT, method, args: { order_id: orderId }, deposit: 0n, tgas });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (!o) return <div className="panel p-6">{err ? <Alert tone="error" title="Could not read order">{err}</Alert> : <p className="dots">Reading order #{orderId}</p>}</div>;

  const steps = stepStates(o);
  const memes = season?.config.memes;
  const memeName = (idx: number) => memes?.[idx]?.meme_id.toUpperCase() ?? `meme ${idx}`;
  const isPayer = accountId === o.payer;
  const stalled = (o.status === "SwapsPending" || o.status === "TraitsAssigned" || o.status === "Escrowed") && Date.now() - Number(BigInt(o.updated_ns) / 1_000_000n) > 45_000;

  return (
    <section className="panel p-5 sm:p-6" aria-live="polite" aria-labelledby={`order-${orderId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`order-${orderId}`} className="font-display text-2xl">
          Order #{o.id}
        </h2>
        <span className={`chip ${o.status === "FullyBackedLocked" ? "chip-ok" : ["FailedPreExecution", "PartialExecutionRecovery"].includes(o.status) ? "chip-failed" : o.status === "Refunded" ? "chip-ink" : "chip-pending"}`}>
          {o.status === "FullyBackedLocked" ? "Funded" : o.status.replace(/([a-z])([A-Z])/g, "$1 $2")}
        </span>
      </div>
      {txHash && (
        <p className="mt-1 text-sm">
          Payment tx <TxLink hash={txHash} />
        </p>
      )}
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink text-xs font-bold ${s.state === "done" ? "bg-green text-cream" : s.state === "current" ? "bg-yellow" : s.state === "failed" ? "bg-red" : "bg-paper"}`}
            >
              {s.state === "done" ? "✓" : s.state === "failed" ? "!" : i + 1}
            </span>
            <div>
              <p className={`font-semibold ${s.state === "current" ? "dots" : ""}`}>
                {s.label}
                <span className="sr-only"> — {s.state}</span>
              </p>
              {s.detail && <p className="num text-xs text-muted">{s.detail}</p>}
            </div>
          </li>
        ))}
      </ol>

      {o.traits && (
        <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div className={o.status === "FullyBackedLocked" ? "reveal-pop" : ""}>
            <ArtSlot
              rarity={RARITY[o.traits.rarity]}
              label={o.status === "FullyBackedLocked" ? "funded — render pending" : "revealed — not funded yet"}
              traits={o.traits.slots.map((s, i) => ({ slot: SLOT_NAMES[i]!, meme: memeName(s.meme_idx), variant: s.variant }))}
            />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-display text-xl">
              Revealed <RarityChip rarity={RARITY[o.traits.rarity]} />
            </p>
            {o.status !== "FullyBackedLocked" && <p className="mt-1 text-sm font-semibold text-red">Not a tradable NFT yet — the basket is still being bought.</p>}
            <div className="mt-3 overflow-x-auto">
              <table className="ledger min-w-[22rem]">
                <thead>
                  <tr>
                    <th>Token leg</th>
                    <th className="amt">Share</th>
                    <th className="amt">wNEAR in</th>
                    <th className="amt">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {o.legs.map((l, i) => {
                    const a = assetByContract(l.token);
                    return (
                      <tr key={i}>
                        <td>
                          <span className="font-semibold">{a?.symbol ?? l.token}</span>
                          <span className="block text-xs text-muted">
                            {l.status}
                            {l.attempts > 1 ? ` · attempt ${l.attempts}` : ""}
                            {l.last_error ? ` · ${l.last_error}` : ""}
                          </span>
                        </td>
                        <td className="amt">{bpsPct(l.bps)}</td>
                        <td className="amt">{near(l.amount_in, 6)}</td>
                        <td className="amt">{l.status === "Done" ? tokenAmount(l.acquired, a?.decimals) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {o.status === "FullyBackedLocked" && o.token_id && (
        <div className="mt-6">
          <Alert tone="ok" title={`Card #${o.token_id} is funded and in your wallet`}>
            Locked until {utc(new Date(Date.now() + 30 * 86_400_000)).slice(0, 10)} (30 days from funding).{" "}
            <Link className="underline" href={`/nft/${o.token_id}`}>
              Open the card
            </Link>
            . Unused retry reserve refunded: <span className="num">{near(o.refunded)} NEAR</span>.
          </Alert>
        </div>
      )}
      {o.status === "Refunded" && (
        <div className="mt-6">
          <Alert tone="info" title="Refunded">
            <span className="num">{near(o.refunded)} NEAR</span> was returned to {o.payer}. {o.note}
          </Alert>
        </div>
      )}
      {o.status === "FailedPreExecution" && (
        <div className="mt-6 space-y-3">
          <Alert tone="error" title="Failed before any swap executed">
            {o.note} You are owed a full refund of base, storage fee and unused reserve.
          </Alert>
          <button type="button" className="btn btn-secondary" disabled={!!busy || !accountId} onClick={() => act("refund_order", "refund", 120)}>
            {busy === "refund" ? "Waiting for wallet…" : "Retry refund"}
          </button>
        </div>
      )}
      {o.status === "PartialExecutionRecovery" && (
        <div className="mt-6 space-y-3">
          <Alert tone="error" title="Partial execution — recovery needed">
            {o.note} Some tokens were bought, another leg failed. Nothing tradable was minted. You can retry the failed legs, or unwind the bought tokens back to NEAR at current
            prices (market losses are realized and shown, not hidden).
          </Alert>
          {isPayer && (
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => act("retry_order", "retry", 30)}>
                {busy === "retry" ? "Waiting for wallet…" : "Retry failed legs"}
              </button>
              <button type="button" className="btn btn-danger" disabled={!!busy} onClick={() => act("unwind_order", "unwind")}>
                {busy === "unwind" ? "Waiting for wallet…" : "Unwind & refund"}
              </button>
            </div>
          )}
        </div>
      )}
      {stalled && accountId && (
        <div className="mt-6 space-y-2">
          <Alert tone="warn" title="Waiting on the next step">
            The keeper normally continues your order within seconds. You can push the next step yourself — it costs you only network gas, never a keeper fee, and you cannot change the
            outcome.
          </Alert>
          <button type="button" className="btn btn-yellow" disabled={!!busy} onClick={() => act("advance_order", "advance")}>
            {busy === "advance" ? "Waiting for wallet…" : "Continue my order"}
          </button>
        </div>
      )}
      {err && <p className="mt-3 text-sm text-red">{err}</p>}
      <p className="mt-4 text-xs text-muted">
        Updated {utc(nsToDate(o.updated_ns))} · refreshes every 3s · this status is read from the contract, not from this browser.
      </p>
    </section>
  );
}

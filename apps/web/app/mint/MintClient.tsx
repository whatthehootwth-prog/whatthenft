"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { parseNear } from "@wtn/domain";
import { Reveal } from "@/components/mint/Reveal";
import { ArtMutant } from "@/components/ArtMutant";
import { OrderTracker } from "@/components/OrderTracker";
import { Alert } from "@/components/ui";
import { CORE_CONTRACT, NETWORK } from "@/lib/config";
import { bpsPct, near, tokenAmount, utc } from "@/lib/format";
import { getNearBalance, type OrderJ } from "@/lib/near";
import { PRESETS } from "@/lib/presets";
import { useQuote } from "@/lib/useQuote";
import { useSeasonLive } from "@/lib/useSeason";
import { useWallet } from "@/lib/wallet";

/** Every mint is exactly 1 NEAR (Season 01 fixed price). */
const MINT_PRICE = "1";
const QUOTE_MAX_AGE_MS = 60_000;

export function MintClient() {
  const { accountId, connect, call } = useWallet();
  const live = useSeasonLive();
  const season = live.state === "ok" ? live.season : null;
  const [amount] = useState(MINT_PRICE);
  const [debounced, setDebounced] = useState(MINT_PRICE);
  const [ack, setAck] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [order, setOrder] = useState<{ id: string; tx: string | null } | null>(null);
  const [settled, setSettled] = useState<OrderJ | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [teaser, setTeaser] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(amount), 450);
    return () => clearTimeout(t);
  }, [amount]);

  // silhouette teaser cycles through possible parts (purely decorative, clearly a mystery)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setTeaser((x) => (x + 1) % PRESETS.length), 1600);
    return () => clearInterval(t);
  }, []);

  const parsed = useMemo(() => {
    try {
      const v = parseNear(debounced || "0");
      return v > 0n ? v : null;
    } catch {
      return null;
    }
  }, [debounced]);
  const q = useQuote(parsed ? debounced : null);

  useEffect(() => {
    if (!accountId) return setBalance(null);
    getNearBalance(accountId).then(setBalance).catch(() => setBalance(null));
  }, [accountId, order]);

  const storageFee = season ? BigInt(season.config.reserve.storage_per_mint) : q.state === "ok" ? BigInt(q.data.execution.storageFee) : null;
  const retryReserve = season ? BigInt(season.config.reserve.retry_reserve) : q.state === "ok" ? BigInt(q.data.execution.retryReserve) : null;
  const gasEst = q.state === "ok" ? BigInt(q.data.execution.estMintTxGas) : null;
  const attach = parsed !== null && storageFee !== null && retryReserve !== null ? parsed + storageFee + retryReserve : null;
  const onchainMin = season ? BigInt(season.current_min_base) : null;
  const quoteFresh = q.state === "ok" && q.ageMs < QUOTE_MAX_AGE_MS;

  const blockers: string[] = [];
  if (!CORE_CONTRACT) blockers.push(`Minting isn't open: the contracts aren't deployed on ${NETWORK} yet.`);
  else if (live.state === "error") blockers.push(`Can't read the contract right now (${live.message}).`);
  else if (live.state === "none") blockers.push("No season exists yet.");
  else if (live.state === "ok" && live.phase !== "live") blockers.push(`Season ${live.season.id} is ${{ draft: "not open yet", upcoming: "not open yet", ended: "over", closed: "closed", "sold-out": "sold out", live: "" }[live.phase]}.`);
  if (live.state === "ok" && live.paused) blockers.push("Minting is paused right now. Existing cards and redemptions are unaffected.");
  if (parsed === null) blockers.push("Pick an amount.");
  if (q.state === "error") blockers.push(`Live prices are unavailable (${q.message}).`);
  if (q.state === "ok" && !quoteFresh) blockers.push("Refreshing prices…");
  if (q.state === "ok" && !q.data.check.ok) blockers.push(q.data.check.reason ?? "This amount can't be executed right now.");
  if (onchainMin !== null && parsed !== null && parsed < onchainMin) blockers.push(`Minimum right now is ${near(onchainMin, 4)} NEAR.`);
  if (q.state === "ok" && q.data.memes.some((m) => !m.approvedForMint)) blockers.push("Season art and partner rights aren't approved yet.");
  if (accountId && balance !== null && attach !== null && gasEst !== null && balance < attach + gasEst) blockers.push(`Not enough NEAR: need ${near(attach + gasEst, 4)}, wallet has ${near(balance, 4)}.`);
  if (!ack) blockers.push("Tick the box to confirm you get the risks.");
  const canMint = blockers.length === 0 && !!accountId && attach !== null;

  const mint = async () => {
    if (!CORE_CONTRACT || !season || attach === null || parsed === null) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const r = await call({ receiverId: CORE_CONTRACT, method: "mint", args: { season_id: season.id, base: parsed.toString() }, deposit: attach, tgas: 300 });
      const id = typeof r.value === "string" ? r.value : null;
      if (!id) throw new Error(`Sent${r.txHash ? ` (tx ${r.txHash})` : ""}, but no order id came back. Check My Collection for the open order.`);
      setOrder({ id, tx: r.txHash });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSubmitErr(/reject|cancel|denied/i.test(msg) ? "You cancelled in your wallet. Nothing was sent." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onOrderUpdate = (o: OrderJ) => {
    if (o.status === "FullyBackedLocked" && o.token_id && !settled) {
      setSettled(o);
      setRevealOpen(true);
    }
  };

  const minted = season?.minted;
  const supply = season?.config.max_supply ?? 111;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14">
      {/* Mystery pack */}
      <div className="min-w-0 lg:sticky lg:top-28">
        <div className="relative mx-auto w-full max-w-[440px]">
          <div className={`relative aspect-[3/4] overflow-hidden rounded-[28px] border-[5px] border-ink bg-violet shadow-[12px_12px_0_#16110f] ${order && !settled ? "shake-card [animation-iteration-count:infinite] [animation-duration:1.4s]" : "wiggle"}`}>
            <div className="sunburst absolute left-1/2 top-1/2 aspect-square w-[220%] -translate-x-1/2 -translate-y-1/2 opacity-30" aria-hidden="true" />
            <div className="absolute inset-x-6 top-10 bottom-24" aria-hidden="true">
              <div className="h-full w-full" style={{ filter: "brightness(0) drop-shadow(6px 6px 0 #ff7a1a)" }}>
                <div key={teaser} className="glitch-in h-full w-full">
                  <ArtMutant spec={PRESETS[teaser]!.spec} priority className="h-full w-full" label="Mystery silhouette" />
                </div>
              </div>
            </div>
            <span className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 font-display text-[9rem] leading-none text-yellow drop-shadow-[5px_5px_0_#16110f]" aria-hidden="true">
              ?
            </span>
            <div className="absolute inset-x-0 bottom-0 border-t-4 border-ink bg-yellow px-5 py-3 text-ink">
              <p className="num text-[0.7rem] font-bold tracking-widest">SEASON 01 · MEME GENESIS</p>
              <p className="font-display text-2xl leading-none">{order && !settled ? "BUYING YOUR MEMES…" : "WHO'S IN THE PACK?!"}</p>
            </div>
          </div>
          <span className="tag-sticker absolute -right-2 -top-4 rotate-6 !bg-pink sm:-right-6">100% RANDOM</span>
        </div>
      </div>

      {/* Mint panel */}
      <div className="min-w-0">
        <h1 className="mad-title text-[clamp(2.8rem,8vw,5rem)]">MINT THE MADNESS</h1>
        <p className="mt-2 lead">One mutant. Real memes inside. Zero idea what you&apos;ll get.</p>

        {order ? (
          <div className="mt-8 space-y-4">
            <OrderTracker orderId={order.id} txHash={order.tx} season={season} onUpdate={onOrderUpdate} />
            {settled && !revealOpen && (
              <button type="button" className="btn-mad" onClick={() => setRevealOpen(true)}>
                SHOW ME AGAIN
              </button>
            )}
          </div>
        ) : (
          <div className="sticker mt-8 p-5 sm:p-7">
            {/* counter */}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="num text-xs font-bold tracking-widest text-ink/70">MINTED</p>
                <p className="font-display text-4xl leading-none">
                  {minted !== undefined ? (
                    <>
                      {minted} <span className="text-2xl text-ink/50">/ {supply}</span>
                    </>
                  ) : (
                    <span className="text-2xl">{live.state === "loading" ? "…" : "NOT OPEN YET"}</span>
                  )}
                </p>
              </div>
              {season && (
                <span className={`chip ${live.state === "ok" && live.phase === "live" && !live.paused ? "chip-ok" : "chip-pending"}`}>{live.state === "ok" && live.paused ? "PAUSED" : live.state === "ok" ? live.phase.toUpperCase() : ""}</span>
              )}
            </div>

            {/* price (fixed) */}
            <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3">
              <span className="font-display text-xl">Price per mutant</span>
              <span className="font-display text-2xl">1 NEAR</span>
            </div>

            {/* the essentials */}
            <div className="mt-6 rounded-2xl border-4 border-ink bg-sun p-4 text-ink shadow-[5px_5px_0_#16110f]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-lg">YOU PAY</span>
                <span className="num text-2xl font-bold text-ink">{attach !== null ? `${near(attach, 4)} NEAR` : "—"}</span>
              </div>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <li className="rounded-lg border-2 border-ink bg-white px-3 py-2">
                  <span className="font-display text-base text-ink underline decoration-orange decoration-[3px] underline-offset-2">85%</span> of the base buys real memes
                </li>
                <li className="rounded-lg border-2 border-ink bg-white px-3 py-2">
                  <span className="font-display text-base text-ink underline decoration-orange decoration-[3px] underline-offset-2">30 days</span> locked after funding
                </li>
                <li className="rounded-lg border-2 border-ink bg-white px-3 py-2">
                  <span className="font-display text-base text-ink underline decoration-orange decoration-[3px] underline-offset-2">WTH + {q.state === "ok" ? q.data.tier.maxPartners : "1"}</span> meme{q.state === "ok" && q.data.tier.maxPartners > 1 ? "s" : ""} max
                </li>
              </ul>
              {q.state === "ok" && <p className="mt-2 text-xs text-ink/70">Includes a refundable reserve. Prices live from RHEA · {Math.round(q.ageMs / 1000)}s ago.</p>}
              {q.state === "loading" && <p className="mt-2 text-xs text-ink/70 dots">Checking live prices</p>}
            </div>

            <details className="drawer mt-4 rounded-2xl border-[3px] border-ink bg-cream">
              <summary className="flex min-h-12 items-center justify-between px-4 font-display text-lg">
                Full breakdown <span className="drawer-chev transition-transform">▾</span>
              </summary>
              <div className="border-t-2 border-ink/15 px-4 pb-4">
                {q.state === "ok" && parsed !== null ? (
                  <>
                    <table className="ledger mt-2">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="amt">NEAR</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>Meme basket ({bpsPct(q.data.split.basketBps, 0)} of base)</td><td className="amt">{near(q.data.split.basket, 6)}</td></tr>
                        <tr><td>WTH creator ({bpsPct(q.data.split.creatorBps, 0)}, only on success)</td><td className="amt">{near(q.data.split.creator, 6)}</td></tr>
                        <tr><td>WTH buyback treasury ({bpsPct(q.data.split.treasuryBps, 0)}, only on success)</td><td className="amt">{near(q.data.split.treasury, 6)}</td></tr>
                        <tr className="total"><td>Base price</td><td className="amt">{near(q.data.base, 6)}</td></tr>
                        <tr><td>Storage for your NFT data</td><td className="amt">{near(storageFee!, 6)}</td></tr>
                        <tr><td>Retry reserve (unused part refunded)</td><td className="amt">{near(retryReserve!, 6)}</td></tr>
                        <tr className="total"><td>You attach</td><td className="amt">{near(attach!, 6)}</td></tr>
                        <tr><td className="text-muted">+ network gas (estimate)</td><td className="amt text-muted">~{near(gasEst!, 4)}</td></tr>
                      </tbody>
                    </table>
                    <p className="mt-4 font-display text-lg">Which memes could you get?</p>
                    <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      {q.data.memes.map((m) => (
                        <li key={m.memeId} className="rounded-lg border-2 border-ink/20 px-2.5 py-1.5">
                          <span className="font-bold">{m.symbol}</span>
                          <span className="block text-xs text-muted">
                            {m.quotes[0]?.amountOut ? `${near(m.quotes[0].amountIn, 4)} NEAR → ${tokenAmount(m.quotes[0].amountOut, m.decimals, 1)}` : "price unavailable"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted">
                      Swaps run at market with a 2% max slippage; pool fees 0.1–1% apply. Your exact split is decided by your mutant&apos;s parts and shown before any swap. Quote {utc(new Date(q.data.generatedAt))}.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">{q.state === "error" ? "Breakdown unavailable without live prices." : "Calculating…"}</p>
                )}
              </div>
            </details>

            <label className="mt-5 flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#ff7a1a]" />
              <span className="text-[0.95rem] font-semibold">
                I get it: this NFT owns real, volatile meme tokens, locked for 30 days after funding. They can fall to zero. If I sell the NFT, the buyer gets the tokens. (
                <Link href="/risk" className="underline">
                  risks
                </Link>
                )
              </span>
            </label>

            <div className="mt-6">
              {!accountId ? (
                <button type="button" className="btn-mad w-full" onClick={connect}>
                  CONNECT WALLET
                </button>
              ) : (
                <button type="button" className="btn-mad w-full" disabled={!canMint || submitting} aria-disabled={!canMint || submitting} aria-describedby="mint-why" onClick={mint}>
                  {submitting ? "CHECK YOUR WALLET…" : "MINT NOW!"}
                </button>
              )}
              {blockers.length > 0 && (
                <ul id="mint-why" className="mt-4 space-y-1.5 text-sm">
                  {blockers.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden="true" className="font-bold text-red">✕</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {submitErr && (
                <div className="mt-4">
                  <Alert tone="error" title="Not sent">
                    {submitErr}
                  </Alert>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {revealOpen && settled && <Reveal order={settled} season={season} onClose={() => setRevealOpen(false)} />}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { parseNear } from "@wtn/domain";
import { OrderTracker } from "@/components/OrderTracker";
import { Alert, H1 } from "@/components/ui";
import { CORE_CONTRACT, NETWORK } from "@/lib/config";
import { bpsPct, near, tokenAmount, utc } from "@/lib/format";
import { getCoreConfig, getNearBalance, getSeasons, pickActiveSeason, type CoreConfigJ, type SeasonJ } from "@/lib/near";
import { useQuote, type QuoteMeme } from "@/lib/useQuote";
import { useWallet } from "@/lib/wallet";

const PRESETS = ["0.1", "0.5", "1", "5"];
const QUOTE_MAX_AGE_MS = 60_000;
const AMOUNT_RE = /^\d{0,6}(\.\d{0,24})?$/;

export function HatchClient() {
  const { accountId, connect, call } = useWallet();
  const [amount, setAmount] = useState("0.1");
  const [debounced, setDebounced] = useState("0.1");
  const [ack, setAck] = useState(false);
  const [season, setSeason] = useState<SeasonJ | null>(null);
  const [core, setCore] = useState<CoreConfigJ | null>(null);
  const [chainErr, setChainErr] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [order, setOrder] = useState<{ id: string; tx: string | null } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(amount), 450);
    return () => clearTimeout(t);
  }, [amount]);

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
    if (!CORE_CONTRACT) return;
    Promise.all([getSeasons(), getCoreConfig()])
      .then(([s, c]) => {
        setSeason(pickActiveSeason(s));
        setCore(c);
      })
      .catch((e) => setChainErr(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!accountId) return setBalance(null);
    getNearBalance(accountId)
      .then(setBalance)
      .catch(() => setBalance(null));
  }, [accountId, order]);

  // Exact attach amount must match the on-chain season when it exists.
  const storageFee = season ? BigInt(season.config.reserve.storage_per_mint) : q.state === "ok" ? BigInt(q.data.execution.storageFee) : null;
  const retryReserve = season ? BigInt(season.config.reserve.retry_reserve) : q.state === "ok" ? BigInt(q.data.execution.retryReserve) : null;
  const gasEst = q.state === "ok" ? BigInt(q.data.execution.estMintTxGas) : null;
  const attach = parsed !== null && storageFee !== null && retryReserve !== null ? parsed + storageFee + retryReserve : null;

  const now = Date.now();
  const seasonOpen = !!season && season.status === "Open" && now >= Number(BigInt(season.config.mint_start_ns) / 1_000_000n) && now < Number(BigInt(season.config.mint_end_ns) / 1_000_000n);
  const onchainMin = season ? BigInt(season.current_min_base) : null;
  const quoteFresh = q.state === "ok" && q.ageMs < QUOTE_MAX_AGE_MS;

  const blockers: string[] = [];
  if (!CORE_CONTRACT) blockers.push(`The contracts are not deployed on ${NETWORK} yet. Minting is disabled; the numbers on this page are live quotes for the proposed Season 01 pool.`);
  else if (chainErr) blockers.push(`Cannot read the contract right now (${chainErr}).`);
  else if (!season) blockers.push("No season exists on the contract yet.");
  else if (!seasonOpen) blockers.push(`Season ${season.id} is ${season.status === "Open" ? "outside its mint window" : season.status.toLowerCase()}.`);
  if (core?.mints_paused) blockers.push("Minting is paused by the operator circuit breaker. Existing cards and redemptions are unaffected.");
  if (parsed === null) blockers.push("Enter an amount in NEAR.");
  if (q.state === "error") blockers.push(`Live quotes are UNAVAILABLE (${q.message}).`);
  if (q.state === "ok" && !quoteFresh) blockers.push("Quotes are older than 60 seconds; refreshing.");
  if (q.state === "ok" && !q.data.check.ok) blockers.push(q.data.check.reason ?? "Amount not executable.");
  if (onchainMin !== null && parsed !== null && parsed < onchainMin) blockers.push(`Below the contract's live minimum of ${near(onchainMin, 4)} NEAR.`);
  if (q.state === "ok" && q.data.memes.some((m) => !m.approvedForMint)) blockers.push("Season pool art and partner rights are not approved yet (no meme is marked approved for mint).");
  if (accountId && balance !== null && attach !== null && gasEst !== null && balance < attach + gasEst) blockers.push(`Insufficient NEAR: this mint needs ${near(attach + gasEst, 4)} NEAR incl. gas; wallet has ${near(balance, 4)} NEAR.`);
  if (!ack) blockers.push("Tick the disclosure to confirm you understand the risks.");

  const canMint = blockers.length === 0 && !!accountId && attach !== null;

  const mint = async () => {
    if (!CORE_CONTRACT || !season || attach === null || parsed === null) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const r = await call({ receiverId: CORE_CONTRACT, method: "mint", args: { season_id: season.id, base: parsed.toString() }, deposit: attach, tgas: 300 });
      const id = typeof r.value === "string" ? r.value : null;
      if (!id) throw new Error(`Transaction sent${r.txHash ? ` (${r.txHash})` : ""} but no order id was returned. Check "My NFTs" for the open order.`);
      setOrder({ id, tx: r.txHash });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSubmitErr(/reject|cancel|denied/i.test(msg) ? "You rejected the signature in your wallet. Nothing was sent." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (order) {
    return (
      <>
        <H1 kicker="it's happening">Hatching order #{order.id}</H1>
        <OrderTracker orderId={order.id} txHash={order.tx} season={season} />
      </>
    );
  }

  return (
    <>
      <H1 kicker="pick a bag size">Hatch an NFT?!</H1>
      {q.state === "ok" && q.data.season.status === "DRAFT" && (
        <div className="mb-6">
          <Alert tone="warn" title="Season 01 is a draft — preview only">
            Quotes below are real (mainnet Rhea pools, read-only). Minting stays disabled until the contracts are deployed, partner art rights are confirmed and the season is opened.
          </Alert>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[7fr_5fr] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="amt-h">
            <h2 id="amt-h" className="font-display text-2xl">
              1 · Base mint price
            </h2>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Presets">
              {PRESETS.map((p) => (
                <button key={p} type="button" aria-pressed={amount === p} onClick={() => setAmount(p)} className={`btn btn-sm ${amount === p ? "btn-yellow" : "btn-secondary"}`}>
                  {p} NEAR
                </button>
              ))}
            </div>
            <label htmlFor="amount" className="mt-5 block text-sm font-semibold">
              Or type an amount
            </label>
            <div className="mt-1 flex items-stretch overflow-hidden rounded-xl border-[3px] border-ink bg-paper focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-cyan">
              <input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => AMOUNT_RE.test(e.target.value) && setAmount(e.target.value)}
                aria-describedby="amount-help"
                className="num min-w-0 flex-1 bg-transparent px-4 py-3 text-2xl outline-none"
              />
              <span className="grid place-items-center border-l-[3px] border-ink bg-cream px-4 font-display text-lg">NEAR</span>
            </div>
            <p id="amount-help" className="mt-2 text-sm text-muted">
              Target floor 0.1 NEAR. Higher amounts unlock more partner memes per card (≥1 NEAR: up to 2, ≥5 NEAR: up to 3). The executable minimum below is computed from live quotes.
            </p>
            <div className="mt-4 rounded-xl border-2 border-dashed border-ink/50 p-3" aria-live="polite">
              {q.state === "loading" && <p className="dots">Checking executability</p>}
              {q.state === "ok" && (
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className="text-sm font-semibold">Current executable minimum </span>
                    <span className="num text-xl font-bold">{q.data.minimum.executable ? `${near(q.data.minimum.executable, 6)} NEAR` : "UNAVAILABLE"}</span>
                  </p>
                  {q.data.check.ok ? <span className="chip chip-ok">this amount is executable</span> : <span className="chip chip-failed">not executable</span>}
                </div>
              )}
              {q.state === "error" && <p className="font-semibold text-red">Quotes UNAVAILABLE: {q.message}</p>}
            </div>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="comp-h">
            <h2 id="comp-h" className="font-display text-2xl">
              2 · What your bag can contain
            </h2>
            {q.state === "ok" ? (
              <>
                <p className="mt-2 text-[0.95rem]">
                  At this size: <strong>WTH + up to {q.data.tier.maxPartners} partner meme{q.data.tier.maxPartners === 1 ? "" : "s"}</strong>. WTH always gets at least 20%. Your exact
                  split is decided by the revealed parts and shown before any swap.
                </p>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {q.data.memes.map((m) => (
                    <MemeQuote key={m.memeId} m={m} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-muted">{q.state === "loading" ? "Loading live quotes…" : "Unavailable without live quotes."}</p>
            )}
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="risk-h">
            <h2 id="risk-h" className="font-display text-2xl">
              3 · Read this
            </h2>
            <p className="mt-2 rounded-lg bg-ink p-4 text-cream">
              This NFT owns real, volatile meme assets. They are locked for 30 days after successful funding. NFT ownership and redemption rights transfer to a buyer. Prices can fall to zero.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.95rem]">
              <li>Rarity is artwork only. It never means a bigger or better basket.</li>
              <li>Swaps execute at market. You receive whatever the pool returns within the slippage limit (2%), recorded exactly on your card.</li>
              <li>If a route fails before any swap, you are refunded. If it fails after a partial swap, recovery unwinds at market — losses are possible.</li>
              <li>Royalties apply only to sales through our marketplace or compatible ones, not to direct transfers.</li>
            </ul>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg p-1">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[#ff7a1a]" />
              <span className="text-[0.95rem]">
                I understand this buys volatile tokens that can go to zero, that the art and the basket are separate things, and I have read the{" "}
                <Link href="/risk" className="underline">
                  risk disclosure
                </Link>
                .
              </span>
            </label>
          </section>
        </div>

        {/* Sticky receipt */}
        <aside className="min-w-0 lg:sticky lg:top-24" aria-labelledby="receipt-h">
          <div className="panel p-5 sm:p-6">
            <h2 id="receipt-h" className="font-display text-2xl">
              Receipt
            </h2>
            {q.state === "ok" && parsed !== null ? (
              <table className="ledger mt-3">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="amt">NEAR</th>
                  </tr>
                </thead>
                <tbody>
                  <Row label="Basket principal" sub={`${bpsPct(q.data.split.basketBps, 0)} of base · buys your tokens`} v={q.data.split.basket} />
                  <Row label="WTH creator" sub={`${bpsPct(q.data.split.creatorBps, 0)} of base · paid only on success`} v={q.data.split.creator} />
                  <Row label="WTH buyback treasury" sub={`${bpsPct(q.data.split.treasuryBps, 0)} of base · paid only on success`} v={q.data.split.treasury} />
                  <tr className="total">
                    <td>Base mint price</td>
                    <td className="amt">{near(q.data.base, 6)}</td>
                  </tr>
                  <Row label="Storage fee" sub={`stakes ~650 bytes for your NFT + basket ledger · ${season ? "from contract" : "draft config"}`} v={storageFee!.toString()} />
                  <Row label="Retry reserve (refundable)" sub={`pays keepers if extra steps are needed · unused part returned`} v={retryReserve!.toString()} />
                  <tr className="total">
                    <td>You attach</td>
                    <td className="amt">{attach !== null ? near(attach, 6) : "—"}</td>
                  </tr>
                  <tr>
                    <td className="text-sm text-muted">+ network gas (estimate, paid by your wallet)</td>
                    <td className="amt text-sm text-muted">~{near(gasEst!, 4)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-muted">{parsed === null ? "Enter an amount." : q.state === "error" ? "Receipt unavailable without live quotes." : "Calculating…"}</p>
            )}
            {q.state === "ok" && (
              <p className="mt-3 text-xs text-muted">
                Quote {utc(new Date(q.data.generatedAt))} · age {Math.round(q.ageMs / 1000)}s · source: {q.data.source}.{" "}
                <button type="button" className="underline" onClick={q.refresh}>
                  Refresh
                </button>
              </p>
            )}

            <div className="mt-5">
              {!accountId ? (
                <button type="button" className="btn btn-yellow w-full" onClick={connect}>
                  Connect wallet to hatch
                </button>
              ) : (
                <button type="button" className="btn btn-primary w-full text-lg" aria-disabled={!canMint || submitting} disabled={!canMint || submitting} onClick={mint} aria-describedby="mint-blockers">
                  {submitting ? "Waiting for wallet…" : attach !== null ? `HATCH · sign ${near(attach, 4)} NEAR` : "HATCH"}
                </button>
              )}
              {blockers.length > 0 && (
                <ul id="mint-blockers" className="mt-3 space-y-1.5 text-sm">
                  {blockers.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden="true" className="font-bold text-red">
                        ✕
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {submitErr && (
                <div className="mt-3">
                  <Alert tone="error" title="Not sent">
                    {submitErr}
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Row({ label, sub, v }: { label: string; sub: string; v: string }) {
  return (
    <tr>
      <td>
        <span className="font-semibold">{label}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </td>
      <td className="amt">{near(v, 6)}</td>
    </tr>
  );
}

function MemeQuote({ m }: { m: QuoteMeme }) {
  const [lo, hi] = m.quotes;
  return (
    <li className="min-w-0 rounded-xl border-2 border-ink bg-cream p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-lg">{m.symbol}</span>
        <span className={`chip ${m.verified.metadataOk && m.verified.poolOk ? "chip-ok" : "chip-failed"}`}>{m.verified.metadataOk && m.verified.poolOk ? "route verified" : "route failed"}</span>
      </div>
      <p className="num mt-1 break-anywhere text-[0.7rem] text-muted" title={m.contractId}>
        {m.contractId}
      </p>
      <dl className="mt-2 space-y-1 text-sm">
        {lo && (
          <div className="flex flex-wrap justify-between gap-x-2">
            <dt>at {bpsPct(m.minShareBps, 0)}</dt>
            <dd className="num min-w-0 break-anywhere text-right">
              {near(lo.amountIn, 4)} → {lo.amountOut ? tokenAmount(lo.amountOut, m.decimals, 2) : "UNAVAILABLE"}
            </dd>
          </div>
        )}
        {hi && (
          <div className="flex flex-wrap justify-between gap-x-2">
            <dt>at {bpsPct(m.maxShareBps, 0)}</dt>
            <dd className="num min-w-0 break-anywhere text-right">
              {near(hi.amountIn, 4)} → {hi.amountOut ? tokenAmount(hi.amountOut, m.decimals, 2) : "UNAVAILABLE"}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-2 text-xs text-muted">
          <dt>pool fee · impact</dt>
          <dd className="num">
            {m.poolFeeBps ?? "?"} bps · {hi?.priceImpactBps ?? lo?.priceImpactBps ?? "n/a"} bps
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs">
        {m.approvedForMint ? <span className="chip chip-ok">approved</span> : <span className="chip chip-draft">art/rights pending</span>}
      </p>
    </li>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArtSlot, NotDeployed, StateChip } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { near, nsToDate, utc } from "@/lib/format";
import { getSeasons, getTokens, pickActiveSeason, RARITY, type SeasonJ, type TokenViewJ } from "@/lib/near";
import { useQuote } from "@/lib/useQuote";

type Load<T> = { state: "loading" } | { state: "ok"; data: T } | { state: "error"; message: string } | { state: "none" };

export function SeasonBanner() {
  const [s, setS] = useState<Load<SeasonJ | null>>(CORE_CONTRACT ? { state: "loading" } : { state: "none" });
  useEffect(() => {
    if (!CORE_CONTRACT) return;
    getSeasons()
      .then((all) => setS({ state: "ok", data: pickActiveSeason(all) }))
      .catch((e) => setS({ state: "error", message: e instanceof Error ? e.message : String(e) }));
  }, []);

  const live = s.state === "ok" ? s.data : null;
  return (
    <section className="panel relative overflow-hidden p-6" aria-labelledby="season-h">
      <div className="flex flex-wrap items-center gap-2">
        <span className="num text-sm font-bold">SEASON 01</span>
        {live ? (
          <span className={`chip ${live.status === "Open" ? "chip-ok" : "chip-ink"}`}>{live.status}</span>
        ) : (
          <span className="chip chip-draft">Draft · not open</span>
        )}
      </div>
      <h2 id="season-h" className="mt-2 font-display text-4xl leading-none sm:text-5xl">
        MEME GENESIS
      </h2>
      {s.state === "loading" && <p className="mt-3 text-muted dots">Reading season from chain</p>}
      {s.state === "error" && <p className="mt-3 text-red">Could not read the season from the contract: {s.message}</p>}
      {live ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Stat label="Minted" value={`${live.minted} / ${live.config.max_supply}`} />
          <Stat label="In progress" value={String(live.in_flight)} />
          <Stat label="Live minimum" value={`${near(live.current_min_base, 4)} NEAR`} />
          <Stat label="Mint closes" value={utc(nsToDate(live.config.mint_end_ns)).slice(0, 16)} />
        </dl>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat label="Planned supply" value="111" />
            <Stat label="Mint window" value="7 days" />
            <Stat label="Lock" value="30 days" />
            <Stat label="Target floor" value="0.1 NEAR" />
          </dl>
          <p className="mt-4 text-[0.95rem] text-ink/80">
            Proposed pool: WTH + one of SHITZU, BLACKDRAGON, JAMBO or KAT at the 0.1 NEAR tier. Partner artwork rights are not confirmed yet, so nothing is mintable.
          </p>
          {!CORE_CONTRACT && (
            <div className="mt-4">
              <NotDeployed />
            </div>
          )}
        </>
      )}
      <div className="mt-5">
        <Link href="/hatch" className="btn btn-primary">
          HATCH AN NFT?!
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="num text-lg font-bold">{value}</dd>
    </div>
  );
}

export function LiveExecutability() {
  const q = useQuote("0.1");
  return (
    <section className="panel p-6" aria-labelledby="exec-h" aria-live="polite">
      <h2 id="exec-h" className="font-display text-2xl">
        Can 0.1 NEAR actually buy a bag?
      </h2>
      <p className="mt-1 text-sm text-muted">Live, read-only quotes from Rhea mainnet pools. Nothing is cached for more than 15 seconds.</p>
      {q.state === "loading" && <p className="mt-4 dots">Asking the pools</p>}
      {q.state === "error" && (
        <p className="mt-4 rounded-lg border-2 border-red p-3">
          Quotes UNAVAILABLE right now ({q.message}). Minting would be disabled until fresh quotes return.
        </p>
      )}
      {q.state === "ok" && (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="num whitespace-nowrap text-3xl font-bold">{q.data.minimum.executable ? `${near(q.data.minimum.executable, 4)} NEAR` : "—"}</span>
            <span className="text-sm font-semibold">current executable minimum</span>
          </div>
          <p className="mt-2 text-[0.95rem]">
            {q.data.minimum.targetFeasible ? (
              <>
                <span className="chip chip-ok mr-1">0.1 executable</span> every proposed meme can be bought at its smallest possible share.
              </>
            ) : (
              <>
                <span className="chip chip-failed mr-1">0.1 not executable</span> {q.data.minimum.reasons[0]}
              </>
            )}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {q.data.memes.map((m) => (
              <li key={m.memeId} className="flex justify-between gap-2 border-b border-ink/15 pb-1">
                <span className="font-semibold">{m.symbol}</span>
                <span className="num">
                  pool fee {m.poolFeeBps ?? "?"} bps · impact {m.quotes[0]?.priceImpactBps ?? "n/a"} bps
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Quoted {utc(new Date(q.data.generatedAt))}. Execution costs (storage + refundable reserve) are extra and shown on{" "}
            <Link className="underline" href="/hatch">
              /hatch
            </Link>
            .
          </p>
        </>
      )}
    </section>
  );
}

export function RecentMints() {
  const [t, setT] = useState<Load<TokenViewJ[]>>(CORE_CONTRACT ? { state: "loading" } : { state: "none" });
  useEffect(() => {
    if (!CORE_CONTRACT) return;
    getTokens(1, 50)
      .then((all) => setT({ state: "ok", data: all.slice(-6).reverse() }))
      .catch((e) => setT({ state: "error", message: e instanceof Error ? e.message : String(e) }));
  }, []);
  return (
    <section className="mt-14" aria-labelledby="recent-h">
      <h2 id="recent-h" className="font-display text-3xl">
        Fresh from the vault
      </h2>
      <div className="mt-4">
        {t.state === "none" && <p className="text-ink/80">No cards exist yet: the contracts are not deployed on this network. This list will only ever show real, funded mints.</p>}
        {t.state === "loading" && <p className="dots">Reading recent mints</p>}
        {t.state === "error" && <p className="text-red">Could not read recent mints: {t.message}</p>}
        {t.state === "ok" && t.data.length === 0 && <p className="text-ink/80">No cards have been hatched yet. The first one will appear here after its basket is verified on-chain.</p>}
        {t.state === "ok" && t.data.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {t.data.map((tok) => (
              <li key={tok.token_id}>
                <Link href={`/nft/${tok.token_id}`} className="block rounded-xl focus-visible:outline-offset-4">
                  <ArtSlot rarity={RARITY[tok.info.traits.rarity]} label={`#${tok.info.serial}`} />
                  <div className="mt-2">
                    <StateChip state={tok.effective_state} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

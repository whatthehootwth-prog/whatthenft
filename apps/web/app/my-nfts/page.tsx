"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { N } from "@/components/MarketBits";
import { mixFor } from "@/lib/art";
import { DEMO_ITEMS, DEMO_MINE, DEMO_WALLET, type DemoMine, type MineState } from "@/lib/demoMarket";
import { MARKET_LIVE, delistCall, listCall, loadMyCollection, parseNearToYocto } from "@/lib/market";
import { TIERS, tierOf } from "@/lib/rarity";
import { useWallet } from "@/lib/wallet";

type ActKind = "withdraw" | "reload" | "sell" | "cancel";

const TOTAL = DEMO_ITEMS.length;
const PER_PAGE = 9;

type Tab = "album" | "mine" | MineState;
const TABS: { v: Tab; l: string; c: string }[] = [
  { v: "album", l: "Full album", c: "#ff7a1a" },
  { v: "mine", l: "My cards", c: "#ffe14d" },
  { v: "locked", l: "Locked", c: "#2ee6ff" },
  { v: "unlocked", l: "Unlocked", c: "#b8ff3d" },
  { v: "listed", l: "Listed", c: "#ff8cc6" },
  { v: "empty", l: "Empty", c: "#ffffff" },
];

const STATE_UI: Record<MineState, { label: string; bg: string }> = {
  locked: { label: "Locked", bg: "#ffe14d" },
  unlocked: { label: "Ready!", bg: "#b8ff3d" },
  listed: { label: "Listed", bg: "#ff8cc6" },
  empty: { label: "Empty", bg: "#ffffff" },
};


/** A trading card as it sits in a sleeve. */
function MiniCard({ m }: { m: DemoMine }) {
  const t = tierOf(m.item.rarity);
  return (
    <div className={`game-card ${t.frame} h-full w-full rounded-[12px] border-[2.5px] border-ink p-[4px]`}>
      <div className="flex h-full flex-col overflow-hidden rounded-[8px] border-2 border-ink bg-[#fff8e7]">
        <p className="truncate px-1.5 pt-1 font-display text-[clamp(0.55rem,1.1vw,0.78rem)] leading-tight">{m.item.name}</p>
        <div className="relative mx-1 mt-0.5 aspect-square overflow-hidden rounded-[6px] border-[1.5px] border-ink bg-white/70">
          <ArtMutant spec={m.item.spec} className={`h-full w-full ${m.state === "empty" ? "opacity-60 grayscale-[60%]" : ""}`} label={m.item.name} />
        </div>
        <div className="mt-auto flex items-center justify-between px-1.5 pb-1 text-[clamp(0.45rem,0.9vw,0.6rem)] font-extrabold">
          <span>{"★".repeat(t.stars)}</span>
          <span>#{String(m.item.id).padStart(3, "0")}</span>
        </div>
      </div>
    </div>
  );
}

function Pocket({ id, m, onOpen, i }: { id: number; m?: DemoMine; onOpen: (m: DemoMine) => void; i: number }) {
  if (!m) {
    return (
      <div className="pocket grid aspect-[63/88] place-items-center rounded-[14px] border-2 border-dashed border-ink/25 bg-white/35" aria-label={`Slot ${id}, not collected`}>
        <div className="text-center">
          <span className="block font-display text-[clamp(1.3rem,3vw,2.2rem)] leading-none text-ink/15">?</span>
          <span className="mt-1 block text-[clamp(0.5rem,1vw,0.65rem)] font-extrabold text-ink/30">#{String(id).padStart(3, "0")}</span>
        </div>
      </div>
    );
  }
  const ui = STATE_UI[m.state];
  return (
    <button
      type="button"
      onClick={() => onOpen(m)}
      className="pocket group relative aspect-[63/88] rounded-[14px] bg-white/50 p-[5px] text-left shadow-[inset_0_0_0_2px_rgba(22,17,15,0.12)] transition-transform duration-200 hover:-translate-y-1.5 hover:rotate-[-2deg]"
      style={{ animationDelay: `${i * 50}ms` }}
      aria-label={`${m.item.name}, ${m.item.rarity}, ${ui.label}`}
    >
      <MiniCard m={m} />
      <span className="sleeve-sheen pointer-events-none absolute inset-0 rounded-[14px]" aria-hidden="true" />
      <span className="absolute -right-1.5 -top-2 z-10 rotate-6 rounded-md border-2 border-ink px-1 text-[clamp(0.45rem,0.9vw,0.6rem)] font-extrabold uppercase shadow-[2px_2px_0_#16110f]" style={{ background: ui.bg }}>
        {ui.label}
      </span>
    </button>
  );
}

function Page({ ids, side, pageNo, onOpen, owned }: { ids: (number | null)[]; side: "left" | "right"; pageNo: number; onOpen: (m: DemoMine) => void; owned: Map<number, DemoMine> }) {
  return (
    <div className={`binder-page relative flex-1 p-3 sm:p-5 ${side === "left" ? "page-left" : "page-right"}`}>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {ids.map((id, i) =>
          id === null ? <div key={`blank-${i}`} className="aspect-[63/88]" /> : <Pocket key={id} id={id} m={owned.get(id)} onOpen={onOpen} i={i} />,
        )}
      </div>
      <p className={`mt-3 text-[0.7rem] font-extrabold text-ink/40 ${side === "left" ? "text-left" : "text-right"}`}>— {pageNo} —</p>
    </div>
  );
}

function Detail({ m, onClose, onAct }: { m: DemoMine; onClose: () => void; onAct: (kind: ActKind, m: DemoMine) => void }) {
  const t = tierOf(m.item.rarity);
  const mix = mixFor(m.item.spec);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={m.item.name} onClick={onClose}>
      <div className="card-pull grid w-full max-w-3xl items-center gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto w-[min(78vw,320px)] -rotate-3">
          <div className={`game-card ${t.frame} rounded-[24px] border-[4px] border-ink p-[9px] shadow-[10px_12px_0_#16110f]`}>
            <div className="overflow-hidden rounded-[16px] border-[3px] border-ink bg-[#fff8e7]">
              <div className="px-3 pt-2">
                <p className="font-display text-[1.35rem] leading-tight">{m.item.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-sm">{"★".repeat(t.stars)}<span className="opacity-25">{"★".repeat(5 - t.stars)}</span></span>
                  <span className={`rounded-md border-2 border-ink px-1.5 text-[0.6rem] font-extrabold ${t.badge}`}>{t.name}</span>
                </div>
              </div>
              <div className="relative mx-2.5 mt-2 aspect-square overflow-hidden rounded-[12px] border-[3px] border-ink bg-white/70">
                <ArtMutant spec={m.item.spec} className={`h-full w-full ${m.state === "empty" ? "opacity-60 grayscale-[60%]" : ""}`} label={m.item.name} />
                {m.item.rarity === "MYTHIC" && <div className="holo-sweep absolute inset-0" aria-hidden="true" />}
              </div>
              <p className="px-3 pb-2.5 pt-2 text-right text-xs font-extrabold text-ink/50">#{String(m.item.id).padStart(3, "0")} / {TOTAL}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border-[3px] border-ink bg-white p-5 shadow-[8px_8px_0_#16110f]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-ink/55">Bag inside</p>
              <p className="flex items-center gap-1 font-display text-4xl leading-none">
                <N /> {m.bag.toFixed(2)}
              </p>
            </div>
            <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border-[2.5px] border-ink bg-page font-display text-xl hover:bg-sun" aria-label="Close">
              ✕
            </button>
          </div>
          {m.state !== "empty" ? (
            <>
              <div className="mt-4 flex h-4 overflow-hidden rounded-full border-[2.5px] border-ink">
                {mix.map((x) => (
                  <span key={x.memeId} className="border-r-2 border-ink last:border-r-0" style={{ width: `${x.bps / 100}%`, background: x.color }} />
                ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold">
                {mix.map((x) => (
                  <li key={x.memeId} className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full border-2 border-ink" style={{ background: x.color }} />
                    {x.label} {(x.bps / 100).toFixed(0)}%
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 font-semibold text-ink/70">This card&apos;s bag was withdrawn. It&apos;s a collectible now — reload it to fill it up again.</p>
          )}

          <div className="mt-5 rounded-2xl border-[2.5px] border-ink p-3" style={{ background: STATE_UI[m.state].bg }}>
            {m.state === "locked" && (
              <>
                <p className="font-display text-lg">🔒 Locked · unlocks in {m.unlockInDays} days</p>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-white">
                  <div className="h-full bg-orange" style={{ width: `${((30 - m.unlockInDays) / 30) * 100}%` }} />
                </div>
                <p className="mt-2 text-sm font-semibold">You can still sell it now — the bag goes with the card.</p>
              </>
            )}
            {m.state === "unlocked" && <p className="font-display text-lg">🎉 Unlocked! You can withdraw the tokens to your wallet.</p>}
            {m.state === "listed" && (
              <p className="flex items-center gap-1 font-display text-lg">
                Listed for <N /> {m.listPrice?.toFixed(2)}
              </p>
            )}
            {m.state === "empty" && <p className="font-display text-lg">Empty card · collectible only</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {m.state === "unlocked" && (
              <button type="button" className="btn-mad" onClick={() => onAct("withdraw", m)}>
                WITHDRAW BAG
              </button>
            )}
            {m.state === "empty" && (
              <button type="button" className="btn-mad" onClick={() => onAct("reload", m)}>
                RELOAD BAG
              </button>
            )}
            {(m.state === "locked" || m.state === "unlocked") && (
              <button type="button" className="btn-pop" onClick={() => onAct("sell", m)}>
                SELL
              </button>
            )}
            {m.state === "listed" && (
              <button type="button" className="btn-pop" onClick={() => onAct("cancel", m)}>
                CANCEL LISTING
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyNftsPage() {
  const { accountId, connect, call } = useWallet();
  const [mine, setMine] = useState<DemoMine[]>(DEMO_MINE);
  const [live, setLive] = useState(false);
  const load = (acc: string) =>
    loadMyCollection(acc)
      .then((m) => {
        setMine(m);
        setLive(true);
      })
      .catch((e) => console.error("collection: live data unavailable, showing demo", e));
  useEffect(() => {
    if (MARKET_LIVE && accountId) load(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);
  const owned = useMemo(() => new Map(mine.map((m) => [m.item.id, m])), [mine]);
  const [tab, setTab] = useState<Tab>("album");
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [open, setOpen] = useState<DemoMine | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [perSpread, setPerSpread] = useState(PER_PAGE * 2);

  // Two pages side by side on wide screens, one page on phones.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const on = () => setPerSpread(mq.matches ? PER_PAGE * 2 : PER_PAGE);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const ids = useMemo<number[]>(() => {
    if (tab === "album") return DEMO_ITEMS.map((d) => d.id);
    const ids = mine.filter((m) => tab === "mine" || m.state === tab).map((m) => m.item.id);
    return ids.sort((a, b) => a - b);
  }, [tab, mine]);

  const spreads = Math.max(1, Math.ceil(ids.length / perSpread));
  useEffect(() => setSpread(0), [tab, perSpread]);

  const slice = ids.slice(spread * perSpread, spread * perSpread + perSpread);
  const pad = (arr: number[]) => [...arr, ...Array(Math.max(0, PER_PAGE - arr.length)).fill(null)] as (number | null)[];
  const left = pad(slice.slice(0, PER_PAGE));
  const right = pad(slice.slice(PER_PAGE, PER_PAGE * 2));

  const go = (d: 1 | -1) => {
    setDir(d);
    setSpread((s) => Math.min(spreads - 1, Math.max(0, s + d)));
  };

  const onAction = (msg: string) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 4200);
  };

  const DEMO_MSG: Record<ActKind, string> = {
    withdraw: "Demo only — withdrawing needs the live contract.",
    reload: "Demo only — reloading needs an open season.",
    sell: "Demo only — listing needs the marketplace contract.",
    cancel: "Demo only — cancelling needs the marketplace contract.",
  };
  const onAct = (kind: ActKind, m: DemoMine) => {
    if (!live) return onAction(DEMO_MSG[kind]);
    // Withdraw / reload have their own guided flow on the NFT page.
    if (kind === "withdraw" || kind === "reload") return void (window.location.href = `/nft/${m.item.id}`);
    const run = (p: Parameters<typeof call>[0], ok: string) =>
      call(p)
        .then(() => {
          onAction(ok);
          setOpen(null);
          if (accountId) load(accountId);
        })
        .catch((e) => onAction(`Failed: ${e instanceof Error ? e.message : String(e)}`));
    if (kind === "cancel") return run(delistCall(m.item.id), `${m.item.name} is no longer listed.`);
    const input = window.prompt(`List ${m.item.name} for how many NEAR? (3% royalty applies on sale)`, "2");
    if (!input) return;
    try {
      run(listCall(m.item.id, parseNearToYocto(input)), `${m.item.name} is listed for ${input} NEAR!`);
    } catch (e) {
      onAction(e instanceof Error ? e.message : String(e));
    }
  };

  const collected = mine.length;
  const bagTotal = mine.reduce((a, m) => a + m.bag, 0);
  const rarest = [...TIERS].reverse().find((t) => mine.some((m) => m.item.rarity === t.name));

  return (
    <div className="band album-desk relative -mb-24 -mt-[108px] overflow-clip !border-t-0 pb-24 pt-[124px]">
      {/* Title */}
      <header className="pop-in relative mx-auto flex max-w-[1000px] flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-ink/60">
            {live ? accountId : DEMO_WALLET}
            {live ? (
              <span className="rounded-md border-2 border-ink bg-lime px-1.5 py-px text-[0.6rem] tracking-wider">Live</span>
            ) : (
              <span className="rounded-md border-2 border-ink bg-hot px-1.5 py-px text-[0.6rem] tracking-wider text-white">Demo data</span>
            )}
            {MARKET_LIVE && !accountId && (
              <button type="button" onClick={connect} className="rounded-md border-2 border-ink bg-white px-1.5 py-px text-[0.6rem] tracking-wider hover:bg-sun">
                Connect wallet to see yours
              </button>
            )}
          </p>
          <h1 className="mad-title mt-1 text-[clamp(2.4rem,6vw,4.4rem)] [--ts:#fff]">MY COLLECTION BOOK</h1>
        </div>
      </header>

      {/* Completion + sticky notes */}
      <div className="relative mx-auto mt-5 flex max-w-[1000px] flex-wrap items-stretch gap-3">
        <div className="pop-in min-w-[240px] flex-1 rounded-2xl border-[3px] border-ink bg-white p-3.5 shadow-[4px_4px_0_#16110f]" style={{ animationDelay: "80ms" }}>
          <div className="flex items-baseline justify-between">
            <p className="font-display text-lg">Collected</p>
            <p className="font-display text-2xl">
              {collected}
              <span className="text-base text-ink/45"> / {TOTAL}</span>
            </p>
          </div>
          <div className="mt-2 h-4 overflow-hidden rounded-full border-[2.5px] border-ink bg-page">
            <div className="mk-bar h-full rounded-full bg-[repeating-linear-gradient(45deg,#ff7a1a_0_10px,#ffb23f_10px_20px)]" style={{ width: `${(collected / TOTAL) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-bold text-ink/55">Gotta hatch &apos;em all.</p>
        </div>
        <div className="sticky-note pop-in -rotate-2 bg-sun" style={{ animationDelay: "160ms" }}>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-wider">Bags worth</p>
          <p className="flex items-center gap-1 font-display text-2xl leading-none">
            <N /> {bagTotal.toFixed(2)}
          </p>
        </div>
        <div className="sticky-note pop-in rotate-2 bg-lime" style={{ animationDelay: "240ms" }}>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-wider">Ready to withdraw</p>
          <p className="font-display text-2xl leading-none">{mine.filter((m) => m.state === "unlocked").length}</p>
        </div>
        <div className="sticky-note pop-in -rotate-1 bg-[#ff8cc6]" style={{ animationDelay: "320ms" }}>
          <p className="text-[0.65rem] font-extrabold uppercase tracking-wider">Rarest</p>
          <p className="font-display text-xl leading-none">{rarest ? `${rarest.name} ${"★".repeat(rarest.stars)}` : "—"}</p>
        </div>
      </div>

      {/* Binder */}
      <div className="relative mx-auto mt-10 max-w-[1000px]">
        {/* Divider tabs sticking out of the top of the binder */}
        <div className="relative z-10 -mb-[3px] flex gap-1.5 overflow-x-auto overflow-y-hidden px-4 pt-2 [scrollbar-width:none] sm:px-8" role="tablist" aria-label="Binder sections">
          {TABS.map((t) => {
            const on = tab === t.v;
            return (
              <button
                key={t.v}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.v)}
                className={`shrink-0 whitespace-nowrap rounded-t-xl border-[3px] border-b-0 border-ink px-3.5 pb-2 font-display text-[0.95rem] uppercase tracking-wide transition-all ${on ? "pt-3" : "translate-y-1.5 pt-2 opacity-80 hover:translate-y-0.5 hover:opacity-100"}`}
                style={{ background: t.c }}
              >
                {t.l}
              </button>
            );
          })}
        </div>

        <div className="binder-cover relative rounded-[30px] border-[3px] border-ink p-3 shadow-[10px_12px_0_#16110f] sm:p-5">
          <div className="relative flex overflow-hidden rounded-[20px] border-[3px] border-ink bg-[#fffaf0]" style={{ perspective: "1600px" }}>
            <div key={`${tab}-${spread}`} className={`flex w-full ${dir === 1 ? "page-turn-next" : "page-turn-prev"}`}>
              {ids.length === 0 ? (
                <div className="grid min-h-[320px] w-full place-items-center p-10 text-center">
                  <div>
                    <p className="font-display text-3xl">No cards in this section.</p>
                    <p className="mt-2 font-semibold text-ink/60">Try another tab — or hatch a new one.</p>
                  </div>
                </div>
              ) : (
                <>
                  <Page ids={left} side="left" pageNo={spread * (perSpread / PER_PAGE) + 1} onOpen={setOpen} owned={owned} />
                  {perSpread > PER_PAGE && (
                    <>
                      <div className="binder-spine relative w-10 shrink-0" aria-hidden="true">
                        {[18, 50, 82].map((top) => (
                          <span key={top} className="binder-ring absolute left-1/2 -translate-x-1/2" style={{ top: `${top}%` }} />
                        ))}
                      </div>
                      <Page ids={right} side="right" pageNo={spread * 2 + 2} onOpen={setOpen} owned={owned} />
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Page controls */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => go(-1)} disabled={spread === 0} className="btn-pop !min-h-[46px] !px-4 disabled:opacity-40 sm:!px-5">
              ← Prev
            </button>
            <span className="whitespace-nowrap font-display text-base text-white sm:hidden">{spread + 1} / {spreads}</span>
            <div className="hidden flex-wrap justify-center gap-1.5 sm:flex" aria-label="Pages">
              {Array.from({ length: spreads }, (_, i) => (
                <button key={i} type="button" onClick={() => { setDir(i > spread ? 1 : -1); setSpread(i); }} aria-label={`Page ${i + 1}`} aria-current={i === spread} className={`size-3.5 rounded-full border-2 border-ink transition ${i === spread ? "scale-125 bg-orange" : "bg-white hover:bg-sun"}`} />
              ))}
            </div>
            <button type="button" onClick={() => go(1)} disabled={spread >= spreads - 1} className="btn-pop !min-h-[46px] !px-4 disabled:opacity-40 sm:!px-5">
              Next →
            </button>
          </div>
        </div>
      </div>

      {open && <Detail m={open} onClose={() => setOpen(null)} onAct={onAct} />}

      {toast && (
        <div role="status" className="pop-in fixed bottom-6 left-1/2 z-[70] w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border-[3px] border-ink bg-ink px-5 py-3 text-center font-bold text-cream shadow-[5px_5px_0_#ff7a1a]">
          {toast}
        </div>
      )}
    </div>
  );
}

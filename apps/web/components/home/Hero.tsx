"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtMutant, pct } from "@/components/ArtMutant";
import { CANVAS, SLOT_LABEL, layerFor, memeColor, memeLabel, type Slot } from "@/lib/art";
import { near } from "@/lib/format";
import { PRESETS, mixFor } from "@/lib/presets";
import { useSeasonLive } from "@/lib/useSeason";

const AUTO_MS = 5200;
const r1 = (v: number) => Math.round(v * 10) / 10;

function HandArrow({ from, to, flip }: { from: [number, number]; to: [number, number]; flip: boolean }) {
  const [x1, y1] = from;
  const dx = to[0] - x1;
  const dy = to[1] - y1;
  const len = Math.hypot(dx, dy) || 1;
  const x2 = to[0] - (dx / len) * 60;
  const y2 = to[1] - (dy / len) * 60;
  const mx = (x1 + x2) / 2 + (flip ? -1 : 1) * (dy / len) * 110;
  const my = (y1 + y2) / 2 - (flip ? -1 : 1) * (dx / len) * 110;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = (a: number) => `${r1(x2 - 55 * Math.cos(ang + a))} ${r1(y2 - 55 * Math.sin(ang + a))}`;
  const d = `M${x1} ${y1} Q ${r1(mx)} ${r1(my)} ${r1(x2)} ${r1(y2)}`;
  const h = `M${head(0.5)} L ${r1(x2)} ${r1(y2)} L ${head(-0.5)}`;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#16110F" strokeWidth={28} strokeDasharray="2 32" />
      <path d={d} stroke="#FFFFFF" strokeWidth={14} strokeDasharray="2 32" />
      <path d={h} stroke="#16110F" strokeWidth={28} />
      <path d={h} stroke="#FFFFFF" strokeWidth={14} />
    </g>
  );
}

const GLITCH = [
  { l: "4%", t: "12%", w: 120, c: "#2ee6ff" },
  { l: "10%", t: "15%", w: 60, c: "#ffe14d" },
  { l: "72%", t: "8%", w: 140, c: "#b8ff3d" },
  { l: "80%", t: "11%", w: 70, c: "#2ee6ff" },
  { l: "88%", t: "62%", w: 110, c: "#ffe14d" },
  { l: "2%", t: "78%", w: 150, c: "#8b5cff" },
  { l: "12%", t: "81%", w: 50, c: "#2ee6ff" },
  { l: "55%", t: "92%", w: 130, c: "#ff3ea5" },
];

export function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const live = useSeasonLive();
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const p = PRESETS[i]!;
  const mix = mixFor(p.spec);

  const go = useCallback((d: number) => {
    setSlot(null);
    setI((x) => (x + d + PRESETS.length) % PRESETS.length);
  }, []);

  useEffect(() => {
    if (paused || slot) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(1), AUTO_MS);
    return () => clearTimeout(t);
  }, [i, paused, slot, go]);

  const touchPause = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), 10_000);
  };

  const active = slot ? layerFor(slot, p.spec[slot]) : null;

  return (
    <section aria-label="Meet the mutants" className="relative -mx-4 -mt-6 overflow-hidden border-b-4 border-ink transition-colors duration-700 sm:-mx-6 lg:mx-0 lg:mt-2 lg:rounded-[40px] lg:border-4 lg:shadow-[12px_12px_0_#16110f]" style={{ background: p.bg }}>
      <div className="halftone-white absolute inset-0" aria-hidden="true" />
      <div className="spin-slow absolute left-[64%] top-[46%] aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-90 sm:w-[110%]" aria-hidden="true" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.55) 0deg 8deg, transparent 8deg 20deg)" }} />
      {GLITCH.map((g, k) => (
        <span key={k} className="glitch-bar hidden border-2 border-ink sm:block" style={{ left: g.l, top: g.t, width: g.w, background: g.c }} aria-hidden="true" />
      ))}

      <div className="hero-grid relative grid items-center gap-x-6 gap-y-4 px-4 pb-12 pt-8 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)] lg:grid-rows-[auto_1fr] lg:px-12 lg:pb-14 lg:pt-12">
        <div className="ga-copy relative z-10 lg:self-end">
          <h1 className="mad-title text-center text-[clamp(3.2rem,13vw,7rem)] lg:text-left">
            WHAT THE
            <br />
            NFT?!
          </h1>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <p className="w-fit -rotate-2 rounded-xl border-4 border-ink bg-white px-4 py-1.5 font-display text-xl shadow-[4px_4px_0_#16110f] sm:text-2xl">ONE OWL. TOO MANY MEMES.</p>
            <span className="stamp">S01 · MEME GENESIS</span>
          </div>
          <p className="mx-auto mt-4 max-w-sm text-center font-hand text-2xl leading-snug lg:mx-0 lg:text-left">Different memes. Different traits. Different bags. Same confused owl.</p>
        </div>

        <div className="ga-mint relative z-10 lg:self-start">
          <div className="slab mx-auto mt-1 max-w-md rotate-[-1.5deg] p-5 lg:mx-0">
            <span className="tape -left-4 -top-3" aria-hidden="true" />
            <MintInfo live={live} />
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href="/mint" className="btn-mad flex-1 sm:flex-none">
                MINT NOW!
              </Link>
              <Link href="/wth" className="btn-pop">
                WTH IS THIS?!
              </Link>
            </div>
          </div>
        </div>

        <div className="ga-stage relative">
          <div className="relative mx-auto w-full max-w-[600px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onPointerDown={touchPause}>
            <div className="relative aspect-square" onClick={() => setSlot(null)}>
              <div key={p.key} className="glitch-in absolute inset-0">
                <div className="bounce-in h-full w-full">
                  <ArtMutant spec={p.spec} priority interactive activeSlot={slot} onSlot={setSlot} className="h-full w-full drop-shadow-[10px_14px_0_rgba(22,17,15,0.85)]" label={`${p.nickname}: preview mutant`} />
                </div>
              </div>
              <svg key={`a-${p.key}`} viewBox={`0 0 ${CANVAS} ${CANVAS}`} className="pop-in pointer-events-none absolute inset-0 z-50 hidden h-full w-full overflow-visible md:block" aria-hidden="true">
                {p.notes.map((n) => {
                  const l = layerFor(n.slot, p.spec[n.slot]);
                  return l ? <HandArrow key={n.slot} from={n.at} to={l.anchor} flip={n.at[0] > 627} /> : null;
                })}
              </svg>
              {p.notes.map((n, k) => (
                <button
                  key={`${p.key}-${n.slot}`}
                  type="button"
                  className={`tag-sticker pop-in absolute z-[60] hidden -translate-x-1/2 -translate-y-1/2 md:block ${k % 2 ? "rotate-3 !bg-white" : "-rotate-3"} ${slot === n.slot ? "!bg-lime" : ""}`}
                  style={{ left: pct(n.at[0]), top: pct(n.at[1]), animationDelay: `${150 + k * 90}ms` }}
                  onMouseEnter={() => setSlot(n.slot)}
                  onFocus={() => setSlot(n.slot)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlot(slot === n.slot ? null : n.slot);
                  }}
                >
                  {n.text}
                </button>
              ))}
              <span className="stamp absolute right-0 top-0 z-[60] sm:right-2">PREVIEW · NOT MINTED</span>
            </div>

            <div className="relative z-10 mt-3 flex items-center justify-between gap-3">
              <button type="button" onClick={() => go(-1)} className="btn btn-sm !min-h-12 !rounded-full !bg-white !px-4" aria-label="Previous mutant">
                <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M24 9 C 16 7, 9 10, 3 9 M9 2 L 2 9 L 9 16" fill="none" stroke="#16110f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="min-w-0 text-center" aria-live="polite">
                <p className="mad-title text-[1.7rem] sm:text-4xl">{p.nickname}</p>
                <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Choose a mutant">
                  {PRESETS.map((x, k) => (
                    <button key={x.key} type="button" role="tab" aria-selected={k === i} aria-label={x.nickname} onClick={() => { setSlot(null); setI(k); }} className={`h-3.5 rounded-full border-2 border-ink transition-all ${k === i ? "w-9 bg-ink" : "w-3.5 bg-white"}`} />
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => go(1)} className="btn btn-sm !min-h-12 !rounded-full !bg-white !px-4" aria-label="Next mutant">
                <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M2 9 C 10 11, 17 8, 23 9 M17 2 L 24 9 L 17 16" fill="none" stroke="#16110f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="relative z-10 mx-auto mt-4 max-w-[540px] rounded-2xl border-4 border-ink bg-white p-3 shadow-[5px_5px_0_#16110f]">
              <p className="min-h-[1.5rem] text-center text-sm font-semibold" aria-live="polite">
                {active ? (
                  <>
                    <span className="font-display text-base">{SLOT_LABEL[slot!]}</span> · {active.name} · from{" "}
                    <span className="rounded-md border-2 border-ink px-1.5 font-display" style={{ background: memeColor(p.spec[slot!].memeId) }}>{memeLabel(p.spec[slot!].memeId)}</span>
                  </>
                ) : (
                  <span className="text-ink/70">
                    <span className="hidden md:inline">Hover</span>
                    <span className="md:hidden">Tap</span> a part to see which meme it came from
                  </span>
                )}
              </p>
              <div className="mt-2 flex h-5 overflow-hidden rounded-full border-[3px] border-ink" aria-hidden="true">
                {mix.map((m) => (
                  <span key={m.memeId} className="border-r-2 border-ink last:border-r-0" style={{ width: `${m.bps / 100}%`, background: m.color }} />
                ))}
              </div>
              <p className="num mt-1.5 text-center text-[0.72rem]">this mix would hold {mix.map((m) => `${m.label} ${(m.bps / 100).toFixed(0)}%`).join(" · ")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MintInfo({ live }: { live: ReturnType<typeof useSeasonLive> }) {
  if (live.state === "ok") {
    const s = live.season;
    const left = s.config.max_supply - s.minted;
    const phaseLabel = live.paused ? "PAUSED" : { live: "LIVE NOW", upcoming: "OPENS SOON", ended: "ENDED", closed: "CLOSED", draft: "NOT OPEN YET", "sold-out": "SOLD OUT" }[live.phase];
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="pixel text-xs font-bold">SEASON {String(s.id).padStart(2, "0")}</p>
          <span className={`chip ${live.phase === "live" && !live.paused ? "chip-ok" : "chip-pending"}`}>{phaseLabel}</span>
        </div>
        <p className="mt-2 font-display text-5xl leading-none">
          {left} <span className="text-2xl">/ {s.config.max_supply} LEFT</span>
        </p>
        <div className="mt-3 h-4 overflow-hidden rounded-full border-[3px] border-ink bg-white">
          <div className="h-full bg-hot" style={{ width: `${(s.minted / s.config.max_supply) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold">
          {s.minted} minted · from <span className="num">{near(s.current_min_base, 3)} NEAR</span>
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="pixel text-xs font-bold">SEASON 01 · MEME GENESIS</p>
        <span className="chip chip-draft">{live.state === "loading" ? "CHECKING…" : "NOT OPEN YET"}</span>
      </div>
      <p className="mt-2 font-display text-4xl leading-none">111 MUTANTS. 13 MEMES.</p>
      <p className="mt-2 text-sm font-semibold">
        {live.state === "error" ? "Live mint data is unavailable right now." : live.state === "loading" ? "Reading the season from chain…" : "Minting opens when the contracts go live. Target 0.1 NEAR. The left-counter appears here, live from chain."}
      </p>
    </div>
  );
}

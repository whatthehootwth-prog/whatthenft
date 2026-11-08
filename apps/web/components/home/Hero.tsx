"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MUTANT_VIEWBOX, Mutant, anchorPct } from "@/components/Mutant";
import { near } from "@/lib/format";
import { MEME_STYLE, PART_BY_ID, SLOT_LABEL, type Part, type Slot } from "@/lib/mutant-parts";
import { PRESETS, mixFor } from "@/lib/presets";
import { useSeasonLive } from "@/lib/useSeason";

const AUTO_MS = 5200;

/** Symmetric parts (wings, feet, ears, horns) point at the copy on the same side as the label. */
function sideAnchor(part: Part, label: [number, number]): [number, number] {
  const [ax, ay] = part.anchor;
  const symmetric = part.slot === "arms" || part.slot === "legs" || ["shitzu-ears", "dragon-horns", "kat-ears"].includes(part.id);
  if (!symmetric) return part.anchor;
  const labelRight = label[0] > 627;
  const anchorRight = ax > 627;
  return labelRight === anchorRight ? part.anchor : [1254 - ax, ay];
}

function HandArrow({ from, to, flip }: { from: [number, number]; to: [number, number]; flip: boolean }) {
  // Curved dotted arrow in owl coordinates, stopping short of the target.
  const [x1, y1] = from;
  const [x2r, y2r] = to;
  const dx = x2r - x1;
  const dy = y2r - y1;
  const len = Math.hypot(dx, dy) || 1;
  const x2 = x2r - (dx / len) * 70;
  const y2 = y2r - (dy / len) * 70;
  const mx = (x1 + x2) / 2 + (flip ? -1 : 1) * (dy / len) * 120;
  const my = (y1 + y2) / 2 - (flip ? -1 : 1) * (dx / len) * 120;
  const ang = Math.atan2(y2 - my, x2 - mx);
  const head = (a: number) => `${x2 - 60 * Math.cos(ang + a)} ${y2 - 60 * Math.sin(ang + a)}`;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke="#16110F" strokeWidth={30} strokeDasharray="2 34" />
      <path d={`M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} stroke="#FFF4DC" strokeWidth={16} strokeDasharray="2 34" />
      <path d={`M${head(0.5)} L ${x2} ${y2} L ${head(-0.5)}`} stroke="#16110F" strokeWidth={30} />
      <path d={`M${head(0.5)} L ${x2} ${y2} L ${head(-0.5)}`} stroke="#FFF4DC" strokeWidth={16} />
    </g>
  );
}

export function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const boxRef = useRef<HTMLDivElement>(null);
  const live = useSeasonLive();
  const p = PRESETS[i]!;
  const mix = mixFor(p.spec);

  const go = useCallback((d: number) => {
    setSlot(null);
    setI((x) => (x + d + PRESETS.length) % PRESETS.length);
  }, []);

  useEffect(() => {
    if (paused || slot) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setTimeout(() => go(1), AUTO_MS);
    return () => clearTimeout(t);
  }, [i, paused, slot, go]);

  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPause = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    setPaused(true);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setPaused(false), 10_000);
  };

  const onMove = (e: React.PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height * 0.4)) / (r.height / 2);
    setLook({ x: Math.max(-1, Math.min(1, nx)) * 42, y: Math.max(-1, Math.min(1, ny)) * 42 });
  };

  const active = slot ? PART_BY_ID.get(p.spec[slot]) : null;
  const vb = MUTANT_VIEWBOX;

  return (
    <section
      aria-label="Meet the mutants"
      className="relative -mx-4 -mt-6 overflow-hidden sm:-mx-6 lg:mx-0 lg:mt-2 lg:rounded-[32px] lg:border-4 lg:border-ink"
      onPointerMove={onMove}
      onPointerLeave={() => setLook({ x: 0, y: 0 })}
    >
      {/* backdrop: sunburst + halftone */}
      <div className="absolute inset-0 bg-[#1b1310]" aria-hidden="true" />
      <div className="sunburst rays-spin absolute left-[62%] top-[48%] aspect-square w-[260%] -translate-x-1/2 -translate-y-1/2 opacity-90 sm:w-[170%]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_48%,transparent_0,transparent_28%,rgba(11,10,12,0.55)_70%)]" aria-hidden="true" />

      <div className="relative grid items-center gap-x-4 gap-y-3 px-4 pb-10 pt-6 hero-grid sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] lg:grid-rows-[auto_1fr] lg:px-12 lg:pb-12 lg:pt-10">
        {/* Copy + mint sticker */}
        <div className="relative z-10 ga-copy lg:self-end">
          <h1 className="lettering text-center text-[clamp(2.9rem,12vw,6.6rem)] lg:text-left">
            WHAT THE
            <br />
            NFT?!
          </h1>
          <p className="mx-auto mt-4 w-fit -rotate-2 rounded-xl border-[3px] border-ink bg-ink px-4 py-1.5 font-display text-xl text-yellow sm:text-2xl lg:mx-0">ONE OWL. TOO MANY MEMES.</p>
          <p className="mx-auto mt-3 max-w-sm text-center font-hand text-xl leading-snug sm:text-2xl text-cream drop-shadow-[2px_2px_0_#16110f] lg:mx-0 lg:text-left">
            Different memes. Different traits. Different bags. Same confused owl.
          </p>
        </div>

        <div className="relative z-10 ga-mint lg:self-start">
          <div className="sticker mx-auto mt-2 max-w-md rotate-[-1deg] p-4 sm:p-5 lg:mx-0">
            <MintInfo live={live} />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link href="/mint" className="btn-mega flex-1 sm:flex-none">
                MINT NOW!
              </Link>
              <Link href="/wtf" className="btn btn-secondary">
                WTF IS THIS?!
              </Link>
            </div>
          </div>
        </div>

        {/* Mutant stage */}
        <div className="relative ga-stage">
          <div className="relative mx-auto w-full max-w-[640px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onPointerDown={touchPause}>
            <div ref={boxRef} className="relative" style={{ aspectRatio: `${vb.w} / ${vb.h}` }} onClick={() => setSlot(null)}>
              <div key={p.key} className="glitch-in absolute inset-0">
                <div className="bounce-in h-full w-full">
                  <Mutant spec={p.spec} interactive activeSlot={slot} onSlot={setSlot} look={look} className="h-full w-full drop-shadow-[0_18px_0_rgba(22,17,15,0.35)]" />
                </div>
              </div>
              {/* annotations (tablet/desktop) */}
              <svg key={`arrows-${p.key}`} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="pop-in pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block" aria-hidden="true">
                {p.notes.map((n) => (
                  <HandArrow key={n.slot} from={n.at} to={sideAnchor(PART_BY_ID.get(p.spec[n.slot])!, n.at)} flip={n.at[0] > 600} />
                ))}
              </svg>
              {p.notes.map((n, k) => (
                <button
                  key={`${p.key}-${n.slot}`}
                  type="button"
                  className={`tag-sticker pop-in absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block ${k % 2 ? "rotate-3 !bg-cream" : "-rotate-3"} ${slot === n.slot ? "!bg-orange" : ""}`}
                  style={{ ...anchorPct(n.at), animationDelay: `${120 + k * 90}ms` }}
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
              <span className="stamp absolute right-1 top-1 !bg-ink/80 !text-yellow sm:right-4 sm:top-3">PREVIEW · NOT A MINTED NFT</span>
            </div>

            {/* controls */}
            <div className="relative z-10 mt-2 flex items-center justify-between gap-3">
              <button type="button" onClick={() => go(-1)} className="btn btn-yellow !min-h-12 !rounded-full !px-4" aria-label="Previous mutant">
                <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M24 9 C 16 7, 9 10, 3 9 M9 2 L 2 9 L 9 16" fill="none" stroke="#16110f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className="min-w-0 text-center" aria-live="polite">
                <p className="font-display text-2xl leading-none text-cream drop-shadow-[2px_2px_0_#16110f] sm:text-3xl">{p.nickname}</p>
                <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Choose a mutant">
                  {PRESETS.map((x, k) => (
                    <button key={x.key} type="button" role="tab" aria-selected={k === i} aria-label={x.nickname} onClick={() => { setSlot(null); setI(k); }} className={`h-3 rounded-full border-2 border-ink transition-all ${k === i ? "w-8 bg-orange" : "w-3 bg-cream"}`} />
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => go(1)} className="btn btn-yellow !min-h-12 !rounded-full !px-4" aria-label="Next mutant">
                <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true"><path d="M2 9 C 10 11, 17 8, 23 9 M17 2 L 24 9 L 17 16" fill="none" stroke="#16110f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {/* trait readout + real formula mix */}
            <div className="relative z-10 mx-auto mt-4 max-w-[560px] rounded-2xl border-[3px] border-ink bg-ink/85 p-3 text-cream">
              <p className="min-h-[1.5rem] text-center text-sm" aria-live="polite">
                {active ? (
                  <>
                    <span className="font-display text-yellow">{SLOT_LABEL[slot!]}</span> · {active.name} · from{" "}
                    <span className="font-bold" style={{ color: MEME_STYLE[active.memeId]?.color }}>{MEME_STYLE[active.memeId]?.label}</span>
                  </>
                ) : (
                  <span className="text-cream/75">
                    <span className="hidden md:inline">Hover</span>
                    <span className="md:hidden">Tap</span> a body part to see which meme it comes from
                  </span>
                )}
              </p>
              <div className="mt-2 flex h-4 overflow-hidden rounded-full border-2 border-cream/40" aria-hidden="true">
                {mix.map((m) => (
                  <span key={m.memeId} style={{ width: `${m.bps / 100}%`, background: m.color }} />
                ))}
              </div>
              <p className="num mt-1.5 text-center text-[0.72rem] text-cream/80">
                this mix would hold {mix.map((m) => `${m.label} ${(m.bps / 100).toFixed(0)}%`).join(" · ")}
              </p>
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
    const phaseLabel = live.paused
      ? "MINTING PAUSED"
      : { live: "LIVE NOW", upcoming: "OPENS SOON", ended: "MINT ENDED", closed: "SEASON CLOSED", draft: "NOT OPEN YET", "sold-out": "SOLD OUT" }[live.phase];
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="num text-xs font-bold tracking-widest">SEASON {String(s.id).padStart(2, "0")} — {s.config.name.toUpperCase()}</p>
          <span className={`chip ${live.phase === "live" && !live.paused ? "chip-ok" : "chip-pending"}`}>{phaseLabel}</span>
        </div>
        <p className="mt-2 font-display text-4xl leading-none">
          {s.minted} <span className="text-2xl text-ink/60">/ {s.config.max_supply} MINTED</span>
        </p>
        <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-cream">
          <div className="h-full bg-orange" style={{ width: `${(s.minted / s.config.max_supply) * 100}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold">
          {left} left · from <span className="num">{near(s.current_min_base, 3)} NEAR</span>
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="num text-xs font-bold tracking-widest">SEASON 01 — MEME GENESIS</p>
        <span className="chip chip-draft">{live.state === "loading" ? "CHECKING…" : "NOT OPEN YET"}</span>
      </div>
      <p className="mt-2 font-display text-3xl leading-none">111 MUTANTS. ONE SEASON.</p>
      <p className="mt-2 text-sm font-semibold text-ink/80">
        {live.state === "error"
          ? "Live mint data is unavailable right now."
          : live.state === "loading"
            ? "Reading the season from chain…"
            : "Contracts aren't live yet, so there's no counter to show. Target price 0.1 NEAR."}
      </p>
    </div>
  );
}

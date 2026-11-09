"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { SLOT_LABEL, SLOT_ORDER, layerFor, memeColor, memeLabel, mixFor, previewSpec, type MutantSpec, type Slot } from "@/lib/art";
import { near } from "@/lib/format";
import { PRESETS } from "@/lib/presets";
import { useSeasonLive } from "@/lib/useSeason";

const STAGE_COLORS = ["#ffd23f", "#4dd8ff", "#ff8cc6", "#c6f432", "#c9b6ff", "#ff9d4d"];
const AUTO_MS = 4200;

/** Mutant built only from real parts; keep re-rolling until at least 3 partner parts show up. */
function rollSpec(seed: number): MutantSpec {
  for (let k = 0; k < 20; k++) {
    const s = previewSpec(seed * 31 + k);
    const partners = SLOT_ORDER.filter((slot) => layerFor(slot, s[slot]) && s[slot].memeId !== "wth").length;
    if (partners >= 3) return s;
  }
  return previewSpec(seed);
}

export function Hero() {
  const [spec, setSpec] = useState<MutantSpec>(PRESETS[0]!.spec);
  const [roll, setRoll] = useState(0);
  const [auto, setAuto] = useState(true);
  const [slot, setSlot] = useState<Slot | null>(null);
  const seedRef = useRef(Math.floor(Math.random() * 1e6));
  const live = useSeasonLive();
  const mix = mixFor(spec);
  const bg = STAGE_COLORS[roll % STAGE_COLORS.length]!;

  const shuffle = useCallback(() => {
    seedRef.current += 1;
    setSlot(null);
    setSpec(rollSpec(seedRef.current));
    setRoll((r) => r + 1);
  }, []);

  useEffect(() => {
    if (!auto || slot) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(shuffle, AUTO_MS);
    return () => clearTimeout(t);
  }, [auto, slot, roll, shuffle]);

  const active = slot ? layerFor(slot, spec[slot]) : null;

  return (
    <section aria-label="Mutant generator" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
      {/* Copy */}
      <div className="order-2 lg:order-1">
        <span className="eyebrow">
          <span className="size-2.5 rounded-full bg-orange" aria-hidden="true" /> Season 01 · Meme Genesis
        </span>
        <h1 className="mad-title mt-5 text-[clamp(3.3rem,8.5vw,6.6rem)]">
          ONE OWL.
          <br />
          TOO MANY
          <br />
          <span className="text-orange [--ts:#16110f]">MEMES.</span>
        </h1>
        <p className="lead mt-6 max-w-xl">
          Every WHAT THE NFT?! is a one-of-a-kind mutant owl stitched together from 13 meme communities — and each body part buys a slice of that meme&apos;s
          <strong className="font-bold text-ink"> real token</strong>, locked inside your NFT.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/mint" className="btn-mad">
            MINT NOW
          </Link>
          <Link href="/wth" className="btn-pop">
            HOW IT WORKS
          </Link>
        </div>
        <MintStats live={live} />
      </div>

      {/* Generator */}
      <div className="order-1 lg:order-2">
        <div className="slab overflow-hidden p-3 sm:p-4" onMouseEnter={() => setAuto(false)}>
          <div className="relative overflow-hidden rounded-[18px] border-[3px] border-ink transition-colors duration-500" style={{ background: bg }}>
            <div className="halftone-white absolute inset-0" aria-hidden="true" />
            <div className="spin-slow absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.35) 0deg 9deg, transparent 9deg 22deg)" }} />
            <div className="relative mx-auto aspect-square w-full max-w-[460px]" onClick={() => setSlot(null)}>
              <div key={roll} className="glitch-in absolute inset-0">
                <div className="bounce-in h-full w-full">
                  <ArtMutant spec={spec} priority interactive activeSlot={slot} onSlot={setSlot} className="h-full w-full drop-shadow-[6px_8px_0_rgba(22,17,15,0.9)]" label="Preview mutant" />
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAuto(false);
                shuffle();
              }}
              className="btn-mad !min-h-[54px] flex-1 sm:flex-none"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="#16110f" strokeWidth="2.5" />
                {[[8, 8], [16, 16], [16, 8], [8, 16], [12, 12]].map(([x, y]) => (
                  <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill="#16110f" />
                ))}
              </svg>
              SHUFFLE
            </button>
            <button type="button" onClick={() => setAuto((a) => !a)} className="min-h-[54px] rounded-full border-[3px] border-ink bg-white px-4 text-sm font-bold" aria-pressed={auto}>
              {auto ? "Pause auto-shuffle" : "Auto-shuffle"}
            </button>
          </div>

          {/* Parts */}
          <ul className="mt-4 grid grid-cols-3 gap-2" aria-label="Parts and their meme">
            {SLOT_ORDER.map((s) => {
              const l = layerFor(s, spec[s]);
              const id = l ? spec[s].memeId : "wth";
              return (
                <li key={s}>
                  <button
                    type="button"
                    onMouseEnter={() => setSlot(s)}
                    onMouseLeave={() => setSlot(null)}
                    onFocus={() => setSlot(s)}
                    onBlur={() => setSlot(null)}
                    onClick={() => setSlot(slot === s ? null : s)}
                    aria-pressed={slot === s}
                    className={`w-full rounded-xl border-[2.5px] border-ink px-2.5 py-1.5 text-left transition ${slot === s ? "-translate-y-0.5 shadow-[0_3px_0_#16110f]" : ""}`}
                    style={{ background: slot === s ? memeColor(id) : "#fff" }}
                  >
                    <span className="block text-[0.66rem] font-extrabold tracking-wider text-ink/60">{SLOT_LABEL[s]}</span>
                    <span className="block truncate text-[0.92rem] font-extrabold leading-tight">{memeLabel(id)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 min-h-[1.4rem] text-sm text-ink/70" aria-live="polite">
            {active ? `${SLOT_LABEL[slot!]}: ${active.name}` : "Tap a part to highlight it on the owl."}
          </p>

          {/* Bag */}
          <div className="mt-2 rounded-2xl border-[2.5px] border-ink bg-page p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-extrabold">This owl&apos;s bag would hold</span>
              <span className="text-xs text-ink/60">formula preview</span>
            </div>
            <div className="mt-2 flex h-4 overflow-hidden rounded-full border-[2.5px] border-ink" aria-hidden="true">
              {mix.map((m) => (
                <span key={m.memeId} className="border-r-2 border-ink last:border-r-0" style={{ width: `${m.bps / 100}%`, background: m.color }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
              {mix.map((m) => (
                <li key={m.memeId} className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full border-2 border-ink" style={{ background: m.color }} aria-hidden="true" />
                  {m.label} <span className="num font-normal">{(m.bps / 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function MintStats({ live }: { live: ReturnType<typeof useSeasonLive> }) {
  const s = live.state === "ok" ? live.season : null;
  const stats = s
    ? [
        { k: "Left", v: `${s.config.max_supply - s.minted} / ${s.config.max_supply}` },
        { k: "From", v: `${near(s.current_min_base, 3)} NEAR` },
        { k: "Status", v: live.state === "ok" && live.paused ? "Paused" : live.state === "ok" ? ({ live: "Live", upcoming: "Soon", ended: "Ended", closed: "Closed", draft: "Not open", "sold-out": "Sold out" }[live.phase]) : "" },
      ]
    : [
        { k: "Supply", v: "111" },
        { k: "Target price", v: "0.1 NEAR" },
        { k: "Status", v: live.state === "loading" ? "Checking…" : "Not open yet" },
      ];
  return (
    <dl className="mt-10 grid max-w-xl grid-cols-3 overflow-hidden rounded-2xl border-[3px] border-ink bg-white shadow-[5px_5px_0_#16110f]">
      {stats.map((x, i) => (
        <div key={x.k} className={`px-4 py-3 ${i > 0 ? "border-l-[3px] border-ink" : ""}`}>
          <dt className="text-[0.7rem] font-extrabold uppercase tracking-wider text-ink/60">{x.k}</dt>
          <dd className="mt-0.5 font-display text-xl leading-tight sm:text-2xl">{x.v}</dd>
        </div>
      ))}
      {s && (
        <div className="col-span-3 border-t-[3px] border-ink">
          <div className="h-3 bg-page">
            <div className="h-full bg-orange" style={{ width: `${(s.minted / s.config.max_supply) * 100}%` }} />
          </div>
        </div>
      )}
    </dl>
  );
}

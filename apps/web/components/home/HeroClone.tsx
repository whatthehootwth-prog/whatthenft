"use client";

import Link from "next/link";
import { SEASON_01_PRICE_NEAR } from "@wtn/chain";
import { MintNowLink } from "@/components/HackathonNotice";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { Decor } from "@/components/Decor";
import { BARE, MINTABLE, SLOT_LABEL, SLOT_ORDER, layerFor, memeColor, memeLabel, mixFor, providers, type MutantSpec, type Pick, type Slot } from "@/lib/art";
import { PRESETS } from "@/lib/presets";
import { PartCallouts } from "@/components/home/PartCallouts";
import { TIERS, rollShowcaseTier } from "@/lib/rarity";
import { funnyName } from "@/lib/names";
import { near } from "@/lib/format";
import { useSeasonLive, type SeasonLive } from "@/lib/useSeason";

/** Card tilt in degrees — tweak freely. */
const TILT = 15;
/** One part swaps every SWAP_MS. */
const SWAP_MS = 500;

/** Every real option per slot (non-body slots can also go bare = WTH owl). */
const OPTIONS: Record<Slot, Pick[]> = Object.fromEntries(
  SLOT_ORDER.map((s) => [
    s,
    [
      ...(s === "body" ? [] : [BARE]),
      ...MINTABLE.flatMap((m) => m.layers.filter((l) => l.slot === s).map((l) => ({ memeId: m.memeId, variant: l.variant }))),
    ],
  ]),
) as Record<Slot, Pick[]>;


/** Floating hero stickers: [top %, left %, kind, colour, size, idle animation, intro delay ms]. */
const HERO_DECOR: [number, number, string, string, number, string, number][] = [
  [14, 4, "star", "#ffe14d", 42, "spin-slow", 1100],
  [74, 3, "squiggle", "#ff3ea5", 84, "float-y", 1200],
  [10, 46, "ring", "#2ee6ff", 40, "float-y", 1300],
  [86, 44, "plus", "#b8ff3d", 36, "spin-slow", 1400],
  [16, 93, "zigzag", "#b48cff", 74, "wiggle", 1500],
  [78, 92, "bang", "#ff7a1a", 56, "wiggle", 1600],
];

/** Static cards stacked behind the live one. */
function BackCard({ spec, frame, name, rot, x, y }: { spec: MutantSpec; frame: string; name: string; rot: number; x: number; y: number }) {
  return (
    <div className="absolute inset-0" style={{ transform: `translate(${x}px, ${y}px) rotate(${rot}deg)` }} aria-hidden="true">
      <div className={`game-card ${frame} h-full w-full rounded-[26px] border-[4px] border-ink p-[9px] shadow-[8px_10px_0_#16110f]`}>
        <div className="flex h-full flex-col overflow-hidden rounded-[18px] border-[3px] border-ink bg-[#fff8e7]">
          <p className="truncate px-3 pt-2 font-display text-[1.3rem] leading-none">{name}</p>
          <div className="relative mx-2.5 mt-2 aspect-square overflow-hidden rounded-[14px] border-[3px] border-ink bg-white/70">
            <ArtMutant spec={spec} className="h-full w-full" label="" />
          </div>
          <div className="mx-3 mt-3 space-y-1.5">
            <div className="h-2.5 w-3/4 rounded-full bg-ink/15" />
            <div className="h-2.5 w-1/2 rounded-full bg-ink/15" />
          </div>
        </div>
      </div>
    </div>
  );
}

const tint = (c: string, pct: number, base = "#ffffff") => `color-mix(in srgb, ${c} ${pct}%, ${base})`;

/** Clone of Hero — the version being redesigned: a single always-shuffling game card. */
export function HeroClone() {
  const [spec, setSpec] = useState<MutantSpec>(PRESETS[0]!.spec);
  const [changed, setChanged] = useState<{ slot: Slot | null; tick: number }>({ slot: null, tick: 0 });
  const lastSlot = useRef<Slot | null>(null);
  const live = useSeasonLive();
  const wrapRef = useRef<HTMLDivElement>(null);
  const glitchRef = useRef<HTMLDivElement>(null);
  // Glitch the art on every part swap (restart the CSS animation without remounting the images).
  useEffect(() => {
    const el = glitchRef.current;
    if (!el || changed.tick === 0) return;
    el.classList.remove("part-glitch");
    void el.offsetWidth;
    el.classList.add("part-glitch");
  }, [changed.tick]);
  const artRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; s: number } | null>(null);
  // Art-window position inside the (rotated) card wrapper, in untransformed layout px.
  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      let el = artRef.current as HTMLElement | null;
      if (!wrap || !el) return;
      const s = el.offsetWidth;
      let x = 0;
      let y = 0;
      while (el && el !== wrap) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      setBox({ x, y, s });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);
  const [rarity, setRarity] = useState<(typeof TIERS)[number]>(TIERS[3]);
  const [name, setName] = useState(() => funnyName(PRESETS[0]!.spec));
  // Every 4th swap (~2s) jump to a different tier (showcase weights: top tiers appear more often).
  useEffect(() => {
    if (changed.tick > 0 && changed.tick % 4 === 0) {
      setRarity((cur) => rollShowcaseTier(cur.name));
      setName(funnyName(spec, changed.tick));
    }
  }, [changed]);

  // Preload every layer so swaps never flash an empty part.
  useEffect(() => {
    for (const m of MINTABLE) for (const l of m.layers) new Image().src = l.src;
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      const slots = SLOT_ORDER.filter((s) => s !== lastSlot.current);
      const slot = slots[Math.floor(Math.random() * slots.length)]!;
      lastSlot.current = slot;
      setSpec((cur) => {
        const opts = OPTIONS[slot].filter((o) => o.memeId !== cur[slot].memeId || o.variant !== cur[slot].variant);
        if (!opts.length) return cur;
        return { ...cur, [slot]: opts[Math.floor(Math.random() * opts.length)]! };
      });
      setChanged((c) => ({ slot, tick: c.tick + 1 }));
    }, SWAP_MS);
    return () => clearInterval(t);
  }, []);

  const prov = providers(spec);
  const mix = mixFor(spec);
  const base = memeColor(prov.body);

  return (
    <section
      aria-label="Mutant card preview"
      className="band relative -mb-24 -mt-[108px] flex min-h-[100svh] items-center overflow-hidden !border-t-0 pb-20 pt-[140px] transition-colors duration-700"
      style={{ background: tint(base, 50) }}
    >
      {/* Background: rays + dots in the card's colour */}
      <div
        className="intro-rays pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[max(180vw,1800px)] -translate-x-1/2 -translate-y-1/2 lg:left-[70%]"
        aria-hidden="true"
      >
        <div className="spin-slow h-full w-full" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.4) 0deg 8deg, transparent 8deg 20deg)" }} />
      </div>
      <div className="halftone-white pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      {/* Abstract layer: soft blobs + floating stickers */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="mk-blob absolute -bottom-40 left-[35%] size-[480px] rounded-full bg-[#ff9ed1]/40 blur-3xl" style={{ animationDelay: "-6s" }} />
        {HERO_DECOR.map(([top, left, kind, color, size, anim, d], i) => (
          <div key={i} className={`absolute ${i % 2 ? "hidden md:block" : ""}`} style={{ top: `${top}%`, left: `${left}%` }}>
            <div className="intro-pop" style={{ "--d": `${d}ms` } as CSSProperties}>
              <div className={anim} style={{ animationDelay: `${i * -0.7}s` }}>
                <Decor kind={kind} color={color} size={size} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative grid w-full items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10">
      {/* Copy */}
      <div className="text-center lg:text-left">
        <div className="intro-down" style={{ "--d": "150ms" } as CSSProperties}>
          <SeasonStats live={live} />
        </div>
        <h1 className="mad-title mt-7 text-[clamp(2.8rem,6.8vw,5.4rem)] [--ts:#fff]">
          <span className="intro-drop block" style={{ "--d": "300ms" } as CSSProperties}>ONE OWL.</span>
          <span className="intro-drop block" style={{ "--d": "450ms" } as CSSProperties}>TOO MANY</span>
          <span className="intro-drop block text-orange [--ts:#16110f]" style={{ "--d": "600ms" } as CSSProperties}>
            <span className="intro-wobble inline-block" style={{ "--d": "1300ms" } as CSSProperties}>MEMES.</span>
          </span>
        </h1>
        <p style={{ "--d": "800ms" } as CSSProperties} className="intro-up mx-auto mt-6 max-w-xl text-[clamp(1.1rem,1.6vw,1.3rem)] font-semibold leading-relaxed text-ink lg:mx-0">
          A ridiculous mix of meme characters, backed by real tokens. Collect, trade, or redeem.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
          <span className="intro-pop" style={{ "--d": "950ms" } as CSSProperties}>
            <MintNowLink className="btn-mad !min-h-[66px] !px-10 !text-[1.6rem]">
              MINT NOW
            </MintNowLink>
          </span>
          <span className="intro-pop" style={{ "--d": "1050ms" } as CSSProperties}>
            <Link href="/wth" className="btn-pop !min-h-[66px] !px-9 !text-[1.2rem]">
              HOW IT WORKS
            </Link>
          </span>
        </div>
      </div>

      {/* The card */}
      <div className="intro-card relative mx-auto" style={{ "--d": "350ms" } as CSSProperties}>
      <div className="relative" style={{ transform: `rotate(${TILT}deg)` }}>
        <div className="intro-fan absolute inset-0" style={{ "--d": "900ms" } as CSSProperties}>
          <BackCard spec={PRESETS[3]!.spec} frame="frame-EPIC" name="HODLER.EXE" rot={-16} x={-58} y={18} />
          <BackCard spec={PRESETS[1]!.spec} frame="frame-RARE" name="SIR PIXEL THE COOL" rot={-7} x={-26} y={6} />
        </div>
        <div className="float-y">
          <div ref={wrapRef} className="jelly relative">
          <article className={`game-card ${rarity.frame} relative w-[min(80vw,360px)] rounded-[26px] border-[4px] border-ink p-[9px] shadow-[12px_14px_0_#16110f]`}>
            <div className="relative overflow-hidden rounded-[18px] border-[3px] border-ink transition-colors duration-700" style={{ background: tint(base, 22, "#fff8e7") }}>
              {/* Header */}
              <header className="flex items-center gap-2 px-3 pb-1.5 pt-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-ink/60">Season 01 · Meme Genesis</p>
                  <h2 className="truncate font-display text-[1.45rem] leading-none">{name}</h2>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="flex" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <svg key={i} width="15" height="15" viewBox="0 0 24 24" className="-mr-0.5">
                          <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.8z" fill={i < rarity.stars ? "#ffd23f" : "#ffffff"} stroke="#16110f" strokeWidth="2.2" strokeLinejoin="round" opacity={i < rarity.stars ? 1 : 0.45} />
                        </svg>
                      ))}
                    </span>
                    <span className={`rounded-md border-2 border-ink px-1.5 py-px text-[0.6rem] font-extrabold tracking-[0.12em] ${rarity.badge}`}>{rarity.name}</span>
                    <span className="sr-only">{`${rarity.stars} of 5 stars`}</span>
                  </div>
                </div>
                <span className="grid size-8 shrink-0 place-items-center rounded-full border-[3px] border-ink transition-colors duration-700" style={{ background: base }} aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-white" />
                </span>
              </header>

              {/* Art window */}
              <div ref={artRef} className="relative mx-2.5 aspect-square overflow-hidden rounded-[14px] border-[3px] border-ink transition-colors duration-700" style={{ background: tint(base, 70) }}>
                <div className="spin-slow absolute left-1/2 top-1/2 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.45) 0deg 9deg, transparent 9deg 22deg)" }} />
                <div ref={glitchRef} className="relative h-full w-full">
                  <ArtMutant spec={spec} priority className="relative h-full w-full drop-shadow-[4px_6px_0_rgba(22,17,15,0.85)]" label="Shuffling preview mutant" />
                </div>
                <div className="holo-sweep pointer-events-none absolute inset-0" aria-hidden="true" />
              </div>

              {/* Parts */}
              <ul className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 pt-2.5" aria-label="Parts">
                {SLOT_ORDER.map((s) => {
                  const id = prov[s];
                  const hit = changed.slot === s;
                  return (
                    <li key={hit ? `${s}-${changed.tick}` : s} className={`flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 ${hit ? "part-flash" : ""}`}>
                      <span className="size-3 shrink-0 rounded-full border-2 border-ink" style={{ background: memeColor(id) }} aria-hidden="true" />
                      <span className="min-w-0 leading-none"><span className="block text-[0.55rem] font-extrabold tracking-wider text-ink/55">{SLOT_LABEL[s]}</span>
                      <span className="block truncate text-[0.8rem] font-extrabold leading-tight">{memeLabel(id)}</span></span>
                    </li>
                  );
                })}
              </ul>

              {/* Bag bar */}
              <div className="px-3 pb-3 pt-2">
                <div className="flex h-3.5 overflow-hidden rounded-full border-[2.5px] border-ink bg-white" aria-label="Bag mix">
                  {mix.map((m) => (
                    <span key={m.memeId} className="border-r-2 border-ink transition-[width] duration-300 last:border-r-0" style={{ width: `${m.bps / 100}%`, background: m.color }} title={`${m.label} ${(m.bps / 100).toFixed(0)}%`} />
                  ))}
                </div>
              </div>

            </div>
          </article>
          {box && (
            <div className="absolute hidden md:block" style={{ left: box.x, top: box.y, width: box.s, height: box.s }}>
              <PartCallouts spec={spec} tilt={TILT} changed={changed} />
            </div>
          )}
          </div>
        </div>
      </div>
      </div>
      </div>
    </section>
  );
}

const PHASE: Record<string, string> = { live: "Live", upcoming: "Soon", ended: "Ended", closed: "Closed", draft: "Not open yet", "sold-out": "Sold out" };

/** Supply · price · status pills — live from the contract when a season exists, otherwise the Season 01 plan. */
function SeasonStats({ live }: { live: SeasonLive }) {
  const s = live.state === "ok" ? live.season : null;
  const status = live.state === "ok" ? (live.paused ? "Paused" : PHASE[live.phase] ?? "") : live.state === "loading" ? "Checking…" : "Not open yet";
  const items = s
    ? [
        { k: "Left", v: `${s.config.max_supply - s.minted} / ${s.config.max_supply}` },
        { k: "From", v: `${near(s.current_min_base, 3)} NEAR` },
      ]
    : [
        { k: "Supply", v: "111" },
        { k: "Price", v: `${SEASON_01_PRICE_NEAR} NEAR` },
      ];
  const isLive = live.state === "ok" && !live.paused && live.phase === "live";
  return (
    <dl
      className="mx-auto grid w-full max-w-sm grid-cols-3 items-center rounded-lg border-2 border-ink/70 bg-white/60 px-1 py-1.5 backdrop-blur-[2px] sm:inline-flex sm:w-auto sm:max-w-none sm:flex-wrap sm:py-1 lg:mx-0"
      aria-label="Season 01"
    >
      {[...items, { k: "Status", v: status }].map((x, i) => (
        <div key={x.k} className={`flex flex-col items-center gap-0.5 px-2 sm:flex-row sm:gap-1.5 sm:px-3 ${i > 0 ? "border-l-2 border-ink/25" : ""}`}>
          <dt className={`text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-ink/55 sm:text-[0.66rem] `}>{x.k}</dt>
          <dd className="flex items-center gap-1.5 whitespace-nowrap text-[0.82rem] font-extrabold uppercase tracking-wide sm:text-[0.95rem]">
            {x.k === "Status" && <span className={`inline-block size-2.5 shrink-0 rounded-full ${isLive ? "animate-pulse bg-green" : "bg-orange"}`} aria-hidden="true" />}
            {x.v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

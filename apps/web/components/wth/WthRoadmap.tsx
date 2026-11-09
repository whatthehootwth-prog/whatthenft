"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { Decor } from "@/components/Decor";
import { PRESETS, mixFor } from "@/lib/presets";

const EX = PRESETS[0]!;
const EX_MIX = mixFor(EX.spec);
const DROP = "drop-shadow-[5px_6px_0_rgba(22,17,15,0.9)]";

type Stop = { title: string; kicker: string; color: string; bubble: string; body: ReactNode; art: ReactNode };

const STOPS: Stop[] = [
  {
    kicker: "Start here",
    title: "MINT",
    color: "#ff7a1a",
    bubble: "who made me?!",
    body: (
      <>
        <p>
          Pay NEAR and hatch a mutant WTH owl. Its <strong>six parts</strong> — head, face, body, arms, legs and outfit — each come from a different meme crew.
        </p>
        <p>
          NEAR&apos;s on-chain randomness picks the mix in a block <strong>after</strong> you pay, so nobody (not you, not us) can choose or re-roll it. Rarity runs from Common to Mythic and is pure art.
        </p>
      </>
    ),
    art: <ArtMutant spec={PRESETS[2]!.spec} className={`w-52 ${DROP}`} label="A freshly minted mutant owl" />,
  },
  {
    kicker: "Real stuff inside",
    title: "REAL TOKEN BAG",
    color: "#2ee6ff",
    bubble: "I'm loaded!",
    body: (
      <>
        <p>
          The parts decide the bag. WTH always gets a <strong>20% core</strong>, and the other 80% follows whichever memes your parts came from.
        </p>
        <p>
          The contract <strong>buys those real tokens on Rhea</strong>, checks they actually arrived, and only then mints your NFT. No bag, no NFT.
        </p>
      </>
    ),
    art: (
      <div className="w-60">
        <ArtMutant spec={EX.spec} className={`mx-auto w-40 ${DROP}`} label={`Example mutant ${EX.nickname}`} />
        <div className="mt-2 flex h-6 overflow-hidden rounded-full border-[3px] border-ink bg-white">
          {EX_MIX.map((m) => (
            <span key={m.memeId} className="border-r-2 border-ink last:border-r-0" style={{ width: `${m.bps / 100}%`, background: m.color }} />
          ))}
        </div>
        <p className="mt-1.5 text-center text-[0.7rem] font-extrabold uppercase tracking-wide">{EX_MIX.map((m) => `${m.label} ${m.bps / 100}%`).join(" · ")}</p>
      </div>
    ),
  },
  {
    kicker: "Any time",
    title: "TRADE",
    color: "#ff3ea5",
    bubble: "bag included?!",
    body: (
      <>
        <p>
          Sell your freak whenever you like — even while it&apos;s locked. The buyer gets the card <strong>and the whole token bag</strong>, and the lock timer doesn&apos;t restart.
        </p>
        <p>
          Marketplace sales pay a <strong>2.5% royalty</strong>: 10% of it to the WTH creator, 90% to the WTH buyback treasury.
        </p>
      </>
    ),
    art: (
      <div className="flex items-end">
        <ArtMutant spec={PRESETS[1]!.spec} className={`w-32 -scale-x-100 ${DROP}`} label="Seller mutant" />
        <svg width="34" height="34" viewBox="0 0 24 24" className="mb-10 shrink-0" aria-hidden="true">
          <path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="#16110f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <ArtMutant spec={PRESETS[3]!.spec} className={`w-32 ${DROP}`} label="Buyer mutant" />
      </div>
    ),
  },
  {
    kicker: "After 30 days",
    title: "WITHDRAW",
    color: "#b8ff3d",
    bubble: "tick… tock…",
    body: (
      <>
        <p>
          The bag is locked for <strong>30 days from funding</strong>. After that, whoever owns the card can pull the exact tokens out to their wallet.
        </p>
        <p>
          The card stays as an <strong>EMPTY</strong> collectible — the art is yours forever. An empty card can be <strong>reloaded</strong> in an eligible season: same token mix, a new payment and a new 30-day lock.
        </p>
      </>
    ),
    art: (
      <div className="flex items-center gap-1.5 font-display">
        {[
          ["DAY 0", "LOCKED", "#ffe14d", "-rotate-6"],
          ["DAY 30", "UNLOCKED", "#7ee3ff", "rotate-3"],
          ["THEN", "EMPTY", "#ffffff", "-rotate-2"],
        ].map(([d, s, c, r], k) => (
          <div key={d} className="flex items-center gap-1.5">
            <div className={`grid h-24 w-[4.8rem] place-items-center rounded-2xl border-[3px] border-ink text-center leading-tight shadow-[4px_4px_0_#16110f] ${r}`} style={{ background: c }}>
              <span className="text-xs">{d}</span>
              <span className="text-[0.82rem]">{s}</span>
            </div>
            {k < 2 && <span className="text-2xl">→</span>}
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: "No funny business",
    title: "WHERE THE MONEY GOES",
    color: "#ffe14d",
    bubble: "90% is yours!",
    body: (
      <>
        <p>
          <strong>90% of the base price buys your tokens.</strong> 5% goes to the WTH creator and 5% to the WTH buyback treasury — both paid only after your card is fully funded.
        </p>
        <p>
          A small storage fee, a refundable retry reserve and normal network gas are shown separately and <strong>never come out of your 90%</strong>. More on the{" "}
          <Link href="/treasury" className="underline decoration-2 underline-offset-2">
            treasury page
          </Link>
          .
        </p>
      </>
    ),
    art: (
      <div className="relative">
        <svg width="190" height="190" viewBox="-1 -1 2 2" className="-rotate-90 drop-shadow-[5px_6px_0_rgba(22,17,15,0.9)]" aria-label="90% bag, 5% creator, 5% treasury">
          <circle r="0.95" fill="#b8ff3d" stroke="#16110f" strokeWidth="0.06" />
          <path d="M0 0 L1 0 A1 1 0 0 1 0.951 0.309 Z" transform="scale(0.95)" fill="#ffe14d" stroke="#16110f" strokeWidth="0.06" />
          <path d="M0 0 L0.951 0.309 A1 1 0 0 1 0.809 0.588 Z" transform="scale(0.95)" fill="#2ee6ff" stroke="#16110f" strokeWidth="0.06" />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-display text-4xl">90%</span>
        <span className="absolute -right-10 top-2 rounded-lg border-2 border-ink bg-sun px-1.5 text-xs font-extrabold">5% creator</span>
        <span className="absolute -right-12 top-10 rounded-lg border-2 border-ink bg-aqua px-1.5 text-xs font-extrabold">5% treasury</span>
      </div>
    ),
  },
  {
    kicker: "Keep it coming",
    title: "SEASONS",
    color: "#b48cff",
    bubble: "more freaks!",
    body: (
      <>
        <p>
          Each season is a capped drop — <strong>Season 01 &ldquo;Meme Genesis&rdquo; has 111 mutants</strong> — with its own meme lineup and art. Rules, fees and odds are frozen on-chain when it opens.
        </p>
        <p>Old seasons stay tradable forever. New memes arrive in new seasons, never by inflating old ones.</p>
      </>
    ),
    art: (
      <div className="flex -space-x-10">
        {[PRESETS[0], PRESETS[2], PRESETS[3]].map((p, k) => (
          <div key={k} className={`w-28 rounded-2xl border-[3px] border-ink bg-white p-1 shadow-[4px_4px_0_#16110f] ${["-rotate-12", "rotate-2", "rotate-12"][k]}`}>
            <ArtMutant spec={p!.spec} className="w-full" label="Season card" />
          </div>
        ))}
      </div>
    ),
  },
];

/** Floating background stickers: [top %, left %, kind, colour, size px, animation]. */
const DECOR: [number, number, "star" | "squiggle" | "ring" | "plus" | "zigzag" | "bang", string, number, string][] = [
  [3, 6, "star", "#ffe14d", 46, "spin-slow"],
  [6, 88, "squiggle", "#ff3ea5", 80, "float-y"],
  [14, 3, "ring", "#2ee6ff", 40, "float-y"],
  [19, 93, "plus", "#b8ff3d", 34, "spin-slow"],
  [27, 8, "zigzag", "#b48cff", 76, "wiggle"],
  [33, 90, "star", "#ff7a1a", 38, "spin-slow"],
  [40, 4, "bang", "#ffe14d", 58, "wiggle"],
  [46, 92, "ring", "#ff3ea5", 48, "float-y"],
  [54, 6, "squiggle", "#2ee6ff", 84, "float-y"],
  [60, 89, "zigzag", "#ff7a1a", 70, "wiggle"],
  [67, 3, "plus", "#ff3ea5", 36, "spin-slow"],
  [73, 94, "bang", "#b8ff3d", 54, "wiggle"],
  [80, 7, "star", "#b48cff", 44, "spin-slow"],
  [86, 90, "squiggle", "#ffe14d", 76, "float-y"],
  [93, 5, "ring", "#ff7a1a", 42, "float-y"],
];

export function WthRoadmap() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const travRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ d: string; w: number; h: number } | null>(null);
  const [len, setLen] = useState(0);
  const [done, setDone] = useState(0);

  // Build a wiggly road through every stop node (measured, so it fits any screen width).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const build = () => {
      const cr = wrap.getBoundingClientRect();
      const pts = [...wrap.querySelectorAll<HTMLElement>("[data-node]")].map((n) => {
        const r = n.getBoundingClientRect();
        return [r.left - cr.left + r.width / 2, r.top - cr.top + r.height / 2] as const;
      });
      if (pts.length < 2) return;
      const amp = wrap.clientWidth < 768 ? 12 : Math.min(130, wrap.clientWidth * 0.1);
      let d = `M ${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]!;
        const [x1, y1] = pts[i]!;
        const dy = y1 - y0;
        const bow = (i % 2 ? 1 : -1) * amp;
        d += ` C ${(x0 + bow).toFixed(1)} ${(y0 + dy * 0.5).toFixed(1)}, ${(x1 + bow).toFixed(1)} ${(y1 - dy * 0.5).toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
      }
      setGeo({ d, w: wrap.clientWidth, h: wrap.clientHeight });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(wrap);
    window.addEventListener("load", build);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", build);
    };
  }, []);

  // The little owl rides the road as you scroll; the road behind it lights up.
  useEffect(() => {
    const path = pathRef.current;
    const wrap = wrapRef.current;
    if (!geo || !path || !wrap) return;
    const L = path.getTotalLength();
    setLen(L);
    const onScroll = () => {
      const r = wrap.getBoundingClientRect();
      const targetY = window.innerHeight * 0.5 - r.top;
      let lo = 0;
      let hi = L;
      for (let k = 0; k < 22; k++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).y < targetY) lo = mid;
        else hi = mid;
      }
      const at = Math.max(0, Math.min(L, lo));
      const p = path.getPointAtLength(at);
      if (travRef.current) travRef.current.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -60%)`;
      setDone(at);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [geo]);

  // Pop cards in as they scroll into view (with a fallback so nothing stays hidden).
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>(".pop-reveal")];
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
      { rootMargin: "0px 0px -12% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const t = setTimeout(() => els.forEach((el) => el.classList.add("is-in")), 4000);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="band wth-sky relative -mb-24 -mt-[108px] overflow-hidden !border-t-0 pb-28 pt-[150px]">
      {/* Background stickers */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {DECOR.map(([top, left, kind, color, size, anim], i) => (
          <div key={i} className={`absolute ${i % 3 === 2 ? "hidden md:block" : ""}`} style={{ top: `${top}%`, left: `${left}%` }}>
            <div className={anim} style={{ animationDelay: `${(i % 5) * -0.7}s` }}>
              <Decor kind={kind} color={color} size={size} />
            </div>
          </div>
        ))}
        {/* Owls peeking in from the edges */}
        <div className="peek-left absolute left-0 top-[22%] hidden w-40 -translate-x-[45%] rotate-[18deg] lg:block">
          <ArtMutant spec={PRESETS[4]!.spec} className={`w-full ${DROP}`} label="" />
        </div>
        <div className="peek-right absolute right-0 top-[52%] hidden w-40 translate-x-[45%] -rotate-[18deg] lg:block">
          <ArtMutant spec={PRESETS[1]!.spec} className={`w-full -scale-x-100 ${DROP}`} label="" />
        </div>
        <div className="peek-left absolute left-0 top-[80%] hidden w-36 -translate-x-[45%] rotate-[14deg] lg:block">
          <ArtMutant spec={PRESETS[3]!.spec} className={`w-full ${DROP}`} label="" />
        </div>
      </div>

      {/* Header */}
      <header className="relative text-center">
        <h1 className="mad-title text-[clamp(3rem,10vw,6.6rem)] [--ts:#fff]" aria-label="WTH is this?!">
          {"WTH IS THIS?!".split("").map((ch, i) => (
            <span key={i} className="hop inline-block" style={{ animationDelay: `${i * 0.07}s` }} aria-hidden="true">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </h1>
        <p className="lead mx-auto mt-4 max-w-xl">The whole trip, from your first mint to the next season. Follow the road — try not to get lost.</p>
      </header>

      {/* Road */}
      <div ref={wrapRef} className="relative mx-auto mt-14 max-w-6xl">
        {geo && (
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={geo.w} height={geo.h} aria-hidden="true">
            <path d={geo.d} fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" opacity="0.7" />
            <path d={geo.d} fill="none" stroke="#ff7a1a" strokeWidth="22" strokeLinecap="round" opacity="0.55" strokeDasharray={`${len} ${len}`} strokeDashoffset={len - done} />
            <path ref={pathRef} d={geo.d} fill="none" stroke="#16110f" strokeWidth="7" strokeLinecap="round" strokeDasharray="0 18" className="road-march" />
          </svg>
        )}

        {/* Rider */}
        <div ref={travRef} className="pointer-events-none absolute left-0 top-0 z-20" aria-hidden="true">
          <div className="hop-slow">
            <Image src="/logo.webp" alt="" width={64} height={64} className="size-14 drop-shadow-[3px_4px_0_rgba(22,17,15,0.85)] md:size-16" />
          </div>
        </div>

        {/* Start flag */}
        <div className="relative flex justify-start pl-[10px] md:justify-center md:pl-0">
          <div data-node className="relative z-10 grid size-11 place-items-center">
            <span className="wiggle absolute -top-9 whitespace-nowrap rounded-lg border-[3px] border-ink bg-white px-2.5 py-0.5 font-display text-lg shadow-[3px_3px_0_#16110f]">START</span>
            <span className="size-6 rounded-full border-[3px] border-ink bg-orange" />
          </div>
        </div>

        <ol className="relative">
          {STOPS.map((s, i) => {
            const right = i % 2 === 1;
            return (
              <li key={s.title} className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 pt-24 md:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)] md:gap-x-4 md:pt-32">
                {/* Stop marker */}
                <div className={`relative z-10 row-span-2 flex justify-center md:row-span-1 md:col-start-2 md:row-start-1 md:items-center ${right ? "md:justify-end md:pr-4" : "md:justify-start md:pl-4"}`}>
                  <div data-node className="grid size-16 place-items-center md:size-24">
                    <span className="stop-bob grid size-16 place-items-center rounded-full border-[4px] border-ink font-display text-3xl shadow-[4px_5px_0_#16110f] md:size-24 md:text-5xl" style={{ background: s.color, animationDelay: `${i * -0.4}s` }}>
                      {i + 1}
                    </span>
                  </div>
                </div>

                {/* Text card */}
                <div className={`md:row-start-1 ${right ? "md:col-start-3" : "md:col-start-1"}`}>
                  <article className={`pop-reveal relative rounded-[26px] border-[3px] border-ink bg-white p-6 pt-8 shadow-[8px_8px_0_#16110f] sm:p-7 sm:pt-9`} style={{ "--r": right ? "1deg" : "-1deg" } as CSSProperties}>
                    <span className="absolute -top-4 left-5 -rotate-3 rounded-lg border-[3px] border-ink px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-[0.14em] shadow-[3px_3px_0_#16110f]" style={{ background: s.color }}>
                      {s.kicker}
                    </span>
                    <h2 className="mad-title text-[clamp(2rem,4vw,2.9rem)] leading-[0.95]" style={{ "--ts": s.color } as CSSProperties}>
                      {s.title}
                    </h2>
                    <div className="mt-3 space-y-3 text-[1.02rem] leading-relaxed [&_strong]:font-extrabold">{s.body}</div>
                  </article>
                </div>

                {/* Illustration */}
                <div className={`col-start-2 mt-8 flex md:row-start-1 md:mt-0 md:items-center ${right ? "md:col-start-1 md:justify-end" : "md:col-start-3 md:justify-start"}`}>
                  <div className="pop-reveal relative w-full max-w-sm" style={{ "--r": right ? "-2deg" : "2deg", transitionDelay: "120ms" } as CSSProperties}>
                    <div className="blob relative grid aspect-[5/4] place-items-center overflow-hidden border-[3px] border-ink shadow-[7px_7px_0_#16110f]" style={{ background: `color-mix(in srgb, ${s.color} 45%, #ffffff)` }}>
                      <div className="spin-slow absolute left-1/2 top-1/2 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.5) 0deg 9deg, transparent 9deg 22deg)" }} />
                      <div className="float-y relative" style={{ animationDelay: `${i * -0.6}s` }}>
                        {s.art}
                      </div>
                    </div>
                    <span className={`speech wiggle absolute -top-5 text-sm ${right ? "-left-2" : "-right-2"}`}>{s.bubble}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Finish */}
        <div className="relative pt-24 md:pt-32">
          <div className="flex justify-start pl-[10px] md:justify-center md:pl-0">
            <div data-node className="relative z-10 grid size-11 place-items-center">
              <span className="size-6 rounded-full border-[3px] border-ink bg-hot" />
            </div>
          </div>
          <div className="pop-reveal relative mx-auto mt-6 max-w-2xl rounded-[28px] border-[3px] border-ink bg-sun p-8 text-center shadow-[10px_10px_0_#16110f]" style={{ "--r": "-1deg" } as CSSProperties}>
            <p className="mx-auto w-fit -rotate-2 rounded-lg border-[3px] border-ink bg-white px-3 py-0.5 font-display text-lg shadow-[3px_3px_0_#16110f]">FINISH!</p>
            <h2 className="mad-title mt-4 text-[clamp(2.2rem,5vw,3.6rem)] [--ts:#fff]">THAT&apos;S IT. REALLY.</h2>
            <p className="lead mx-auto mt-3 max-w-md">Now go hatch something ridiculous.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link href="/mint" className="btn-mad">
                MINT NOW
              </Link>
              <Link href="/marketplace" className="btn-pop">
                Browse freaks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

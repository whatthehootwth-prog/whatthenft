"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { Decor } from "@/components/Decor";
import { N, Stars, Stat } from "@/components/MarketBits";
import { PARTNERS, memeColor, providers } from "@/lib/art";
import { DEMO_ACTIVITY, DEMO_HOLDERS, DEMO_ITEMS, DEMO_STATS, ago, randomActivity, type DemoActivity, type DemoItem } from "@/lib/demoMarket";
import { MARKET_LIVE, buyCall, loadLiveMarket, type LiveItem, type LiveMarket } from "@/lib/market";
import { TIERS, tierOf, type RarityName } from "@/lib/rarity";
import { useWallet } from "@/lib/wallet";

const DEMO_DATA: LiveMarket = { items: DEMO_ITEMS.map((d) => ({ ...d, priceYocto: null })), activity: DEMO_ACTIVITY, holders: DEMO_HOLDERS, stats: DEMO_STATS };

type Sort = "price-asc" | "price-desc" | "rarity" | "recent" | "id";
const SORTS: { v: Sort; l: string }[] = [
  { v: "price-asc", l: "Price: low to high" },
  { v: "price-desc", l: "Price: high to low" },
  { v: "rarity", l: "Rarity: rarest first" },
  { v: "recent", l: "Recently listed" },
  { v: "id", l: "Token ID" },
];
const RANK: Record<RarityName, number> = { COMMON: 0, RARE: 1, EPIC: 2, LEGENDARY: 3, MYTHIC: 4 };
const CREWS = ["WTH", ...PARTNERS.map((p) => p.displayName)];
const crewColor = (label: string) => memeColor(PARTNERS.find((p) => p.displayName === label)?.memeId ?? "wth");
const PAGE = 24;





function Card({ d, i, onBuy }: { d: DemoItem; i: number; onBuy: (d: DemoItem) => void }) {
  const t = tierOf(d.rarity);
  return (
    <div className="pop-in" style={{ animationDelay: `${(i % PAGE) * 35}ms` }}>
    <article className="mk-card group relative rounded-[22px] border-[3px] border-ink bg-white p-2 shadow-[5px_5px_0_#16110f]">
      <div className="relative aspect-square overflow-hidden rounded-[15px] border-[2.5px] border-ink" style={{ background: `color-mix(in srgb, ${memeColor(providers(d.spec).body)} 50%, #ffffff)` }}>
        <div className="mk-dots absolute inset-0" aria-hidden="true" />
        {d.rarity === "MYTHIC" && <div className="holo-sweep absolute inset-0 z-10" aria-hidden="true" />}
        <ArtMutant spec={d.spec} className="relative h-full w-full transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" label={`${d.name}, ${d.rarity}`} />
        <span className={`absolute left-2 top-2 z-10 flex items-center gap-1 rounded-lg border-2 border-ink px-1.5 py-0.5 text-[0.6rem] font-extrabold tracking-wider ${t.badge}`}>
          {d.rarity}
        </span>
        <span className="absolute right-2 top-2 z-10 rounded-lg bg-ink/80 px-1.5 py-0.5 text-[0.62rem] font-bold text-white">#{d.id}</span>
      </div>
      <div className="px-1 pb-1 pt-2">
        <h3 className="line-clamp-2 min-h-[2.1em] font-display text-[1.05rem] leading-[1.05]">{d.name}</h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="flex flex-wrap gap-1" aria-label="Meme crews">
          {d.memes.slice(0, 4).map((m) => (
            <span key={m} className="size-3 rounded-full border-[1.5px] border-ink" style={{ background: crewColor(m) }} title={m} />
          ))}
          {d.memes.length > 4 && <span className="text-[0.62rem] font-bold text-ink/50">+{d.memes.length - 4}</span>}
        </p>
          <Stars n={t.stars} />
        </div>
        {d.price !== null ? (
          <button type="button" onClick={() => onBuy(d)} className="mt-2.5 flex w-full items-center justify-between rounded-xl border-[2.5px] border-ink bg-orange px-3 py-1.5 font-display text-[1.05rem] shadow-[0_3px_0_#16110f] transition hover:-translate-y-0.5 hover:bg-sun active:translate-y-0.5 active:shadow-none">
            <span className="flex items-center gap-1">
              <N /> {d.price.toFixed(2)}
            </span>
            <span className="text-sm">BUY</span>
          </button>
        ) : (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border-[2.5px] border-dashed border-ink/30 px-3 py-1.5 text-[0.8rem] font-bold text-ink/50">
            <span>Not listed</span>
            {d.lastSale !== null && (
              <span className="flex items-center gap-0.5">
                last <N className="size-3" /> {d.lastSale.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
    </div>
  );
}

const KIND: Record<DemoActivity["kind"], { l: string; c: string }> = {
  sale: { l: "Sold", c: "#b8ff3d" },
  list: { l: "Listed", c: "#ffe14d" },
  mint: { l: "Minted", c: "#2ee6ff" },
  transfer: { l: "Transferred", c: "#c9b6ff" },
  delist: { l: "Delisted", c: "#ffd0e6" },
};

function ActivityRow({ a, fresh }: { a: DemoActivity; fresh: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-page ${fresh ? "mk-slide" : ""}`}>
      <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border-2 border-ink" style={{ background: `color-mix(in srgb, ${tierOf(a.item.rarity).color} 55%, #fff)` }}>
        <ArtMutant spec={a.item.spec} className="h-full w-full" label="" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-extrabold uppercase tracking-wider">
          <span className="rounded-md border-[1.5px] border-ink px-1 py-px" style={{ background: KIND[a.kind].c }}>
            {KIND[a.kind].l}
          </span>
          <span className="text-ink/45">{ago(a.minsAgo)}</span>
        </p>
        <p className="mt-0.5 truncate font-display text-[1.02rem] leading-tight">{a.item.name}</p>
        <p className="truncate text-[0.72rem] font-semibold text-ink/55">
          {a.from}
          {a.to ? ` → ${a.to}` : ""}
        </p>
      </div>
      {a.price !== null && (
        <span className="flex shrink-0 items-center gap-0.5 font-display text-[1.05rem]">
          <N /> {a.price.toFixed(2)}
        </span>
      )}
    </li>
  );
}

const HOLDER_COLORS = ["#ff7a1a", "#2ee6ff", "#ff3ea5", "#b8ff3d", "#ffe14d", "#b48cff"];

/** Abstract floating background shapes. */
const SHAPES: [number, number, string, string, number, string][] = [
  [6, 4, "star", "#ffe14d", 40, "spin-slow"],
  [12, 94, "squiggle", "#ff3ea5", 80, "float-y"],
  [34, 2, "ring", "#2ee6ff", 44, "float-y"],
  [48, 96, "plus", "#b8ff3d", 34, "spin-slow"],
  [66, 3, "zigzag", "#b48cff", 72, "wiggle"],
  [82, 95, "bang", "#ff7a1a", 52, "wiggle"],
];

export default function MarketplacePage() {
  const { accountId, connect, call } = useWallet();
  const [data, setData] = useState<LiveMarket>(DEMO_DATA);
  const [live, setLive] = useState(false);
  const liveRef = useRef(false);
  const reload = () =>
    loadLiveMarket()
      .then((d) => {
        setData(d);
        setLive(true);
        liveRef.current = true;
        setFeed(d.activity.map((a) => ({ a, fresh: false })));
      })
      .catch((e) => console.error("marketplace: live data unavailable, showing demo", e));
  useEffect(() => {
    if (MARKET_LIVE) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("price-asc");
  const [showFilters, setShowFilters] = useState(false);
  const [rar, setRar] = useState<Set<RarityName>>(new Set());
  const [crews, setCrews] = useState<Set<string>>(new Set());
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [tab, setTab] = useState<"activity" | "holders">("activity");
  const [feed, setFeed] = useState<{ a: DemoActivity; fresh: boolean }[]>(DEMO_ACTIVITY.map((a) => ({ a, fresh: false })));
  const [toast, setToast] = useState<string | null>(null);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Demo "live" feed: a new event slides in every few seconds; older ones age.
  useEffect(() => {
    let n = 1;
    const t = setInterval(() => {
      if (document.hidden || liveRef.current) return;
      setFeed((f) => [{ a: randomActivity(9000 + n++), fresh: true }, ...f.map((x) => ({ a: { ...x.a, minsAgo: x.a.minsAgo + 1 }, fresh: false }))].slice(0, 40));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const rarityCount = useMemo(() => Object.fromEntries(TIERS.map((t) => [t.name, data.items.filter((d) => d.rarity === t.name).length])), [data]);

  const items = useMemo(() => {
    const lo = parseFloat(min);
    const hi = parseFloat(max);
    const needle = q.trim().toLowerCase();
    const out = data.items.filter(
      (d) =>
        (rar.size === 0 || rar.has(d.rarity)) &&
        (crews.size === 0 || d.memes.some((m) => crews.has(m))) &&
        (isNaN(lo) || (d.price !== null && d.price >= lo)) &&
        (isNaN(hi) || (d.price !== null && d.price <= hi)) &&
        (!needle || d.name.toLowerCase().includes(needle) || String(d.id) === needle.replace("#", "") || d.memes.some((m) => m.toLowerCase().includes(needle))),
    );
    const priceKey = (d: DemoItem, dir: 1 | -1) => (d.price === null ? Infinity : d.price * dir);
    out.sort((a, b) => {
      if (sort === "price-asc") return priceKey(a, 1) - priceKey(b, 1);
      if (sort === "price-desc") return priceKey(a, -1) - priceKey(b, -1);
      if (sort === "rarity") return RANK[b.rarity] - RANK[a.rarity] || a.id - b.id;
      if (sort === "recent") return (a.price === null ? 1 : 0) - (b.price === null ? 1 : 0) || a.listedAgo - b.listedAgo;
      return a.id - b.id;
    });
    return out;
  }, [q, sort, rar, crews, min, max, data]);

  useEffect(() => setLimit(PAGE), [q, sort, rar, crews, min, max]);

  const activeFilters = rar.size + crews.size + (min ? 1 : 0) + (max ? 1 : 0);
  const toggle = <T,>(s: Set<T>, v: T) => {
    const n = new Set(s);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };
  const clearAll = () => {
    setRar(new Set());
    setCrews(new Set());
    setMin("");
    setMax("");
    setQ("");
  };
  const say = (msg: string) => {
    setToast(msg);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 4200);
  };
  const onBuy = (d: DemoItem) => {
    const li = d as LiveItem;
    if (live && li.priceYocto) {
      if (!accountId) return connect();
      say(`Confirm the purchase of ${d.name} in your wallet…`);
      call(buyCall(d.id, li.priceYocto))
        .then(() => {
          say(`🎉 ${d.name} is yours — bag included!`);
          reload();
        })
        .catch((e) => say(`Purchase failed: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }
    setToast(`Demo only — ${d.name} isn't really for sale yet. The marketplace contract isn't live.`);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToast(null), 3200);
  };

  return (
    <div className="band market-sky relative -mb-24 -mt-[108px] overflow-clip !border-t-0 pb-24 pt-[124px]">
      {/* Abstract background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="mk-blob absolute -left-24 top-10 size-[420px] rounded-full bg-[#ff9ed1] opacity-50 blur-3xl" />
        <div className="mk-blob absolute right-[-120px] top-[30%] size-[460px] rounded-full bg-[#8ae9ff] opacity-50 blur-3xl" style={{ animationDelay: "-4s" }} />
        <div className="mk-blob absolute bottom-[-80px] left-[30%] size-[420px] rounded-full bg-[#d6ff8a] opacity-50 blur-3xl" style={{ animationDelay: "-8s" }} />
        {SHAPES.map(([top, left, kind, color, size, anim], i) => (
          <div key={i} className="absolute hidden md:block" style={{ top: `${top}%`, left: `${left}%` }}>
            <div className={anim} style={{ animationDelay: `${i * -0.8}s` }}>
              <Decor kind={kind} color={color} size={size} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        {/* Collection header */}
        <section className="pop-in rounded-[28px] border-[3px] border-ink bg-white/85 p-4 shadow-[8px_8px_0_#16110f] backdrop-blur-sm sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="wiggle grid size-[72px] shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-orange shadow-[3px_3px_0_#16110f]">
                <Image src="/logo.webp" alt="" width={64} height={64} className="size-14" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-[clamp(1.7rem,3.4vw,2.4rem)] leading-none">WHAT THE NFT?!</h1>
                  {live ? (
                    <span className="rounded-md border-2 border-ink bg-lime px-1.5 py-px text-[0.62rem] font-extrabold uppercase tracking-wider">Live</span>
                  ) : (
                    <span className="rounded-md border-2 border-ink bg-hot px-1.5 py-px text-[0.62rem] font-extrabold uppercase tracking-wider text-white">Demo data</span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[0.78rem] font-bold">
                  <span className="rounded-full border-2 border-ink/20 bg-page px-2.5 py-0.5">{data.stats.supply} items</span>
                  <span className="rounded-full border-2 border-ink/20 bg-page px-2.5 py-0.5">3% royalty</span>
                  <span className="rounded-full border-2 border-ink/20 bg-page px-2.5 py-0.5">NEAR</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Floor" value={data.stats.floor} near color="#ff7a1a" />
              <Stat label="24h volume" value={data.stats.volume24h} near decimals={1} color="#ff3ea5" />
              <Stat label="Total volume" value={data.stats.totalVolume} near decimals={1} color="#2ee6ff" />
              <Stat label="Top sale" value={data.stats.topSale} near decimals={1} color="#ffe14d" />
              <Stat label="Listed" value={data.stats.listed} decimals={0} color="#b8ff3d" />
              <Stat label="Owners" value={data.stats.owners} decimals={0} color="#b48cff" />
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Items */}
          <section aria-label="Items">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="relative min-w-[200px] flex-1">
                <span className="sr-only">Search</span>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" fill="none" stroke="#16110f" strokeWidth="2.6" />
                  <path d="M16 16l4.5 4.5" stroke="#16110f" strokeWidth="2.6" strokeLinecap="round" />
                </svg>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search names, #id or meme…"
                  className="h-12 w-full rounded-2xl border-[2.5px] border-ink bg-white pl-11 pr-4 font-semibold shadow-[3px_3px_0_#16110f] outline-none placeholder:text-ink/40 focus:shadow-[3px_3px_0_#ff7a1a]"
                />
              </label>
              <label className="relative">
                <span className="sr-only">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-12 appearance-none rounded-2xl border-[2.5px] border-ink bg-white pl-4 pr-10 font-bold shadow-[3px_3px_0_#16110f] outline-none focus:shadow-[3px_3px_0_#ff7a1a]"
                >
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.l}
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="#16110f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </label>
              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                aria-expanded={showFilters}
                className={`relative flex h-12 items-center gap-2 rounded-2xl border-[2.5px] border-ink px-4 font-bold shadow-[3px_3px_0_#16110f] transition ${showFilters ? "bg-sun" : "bg-white hover:bg-page"}`}
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path d="M4 6h16M7 12h10M10 18h4" stroke="#16110f" strokeWidth="2.8" strokeLinecap="round" />
                </svg>
                Filters
                {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-hot text-[0.7rem] text-white">{activeFilters}</span>}
              </button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="pop-in mt-3 grid gap-5 rounded-[22px] border-[2.5px] border-ink bg-white/90 p-4 shadow-[4px_4px_0_#16110f] backdrop-blur-sm md:grid-cols-[1.1fr_1.4fr_0.8fr]">
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">Rarity</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {TIERS.map((t) => {
                      const on = rar.has(t.name);
                      return (
                        <button key={t.name} type="button" aria-pressed={on} onClick={() => setRar((s) => toggle(s, t.name))} className={`flex items-center gap-1.5 rounded-xl border-2 border-ink px-2 py-1 text-[0.72rem] font-extrabold tracking-wide transition ${on ? `${t.badge} -translate-y-0.5 shadow-[0_3px_0_#16110f]` : "bg-white hover:bg-page"}`}>
                          {t.name}
                          <span className="opacity-60">{rarityCount[t.name]}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">Meme crew</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {CREWS.map((c) => {
                      const on = crews.has(c);
                      return (
                        <button key={c} type="button" aria-pressed={on} onClick={() => setCrews((s) => toggle(s, c))} className={`flex items-center gap-1.5 rounded-xl border-2 border-ink px-2 py-1 text-[0.72rem] font-extrabold transition ${on ? "-translate-y-0.5 bg-sun shadow-[0_3px_0_#16110f]" : "bg-white hover:bg-page"}`}>
                          <span className="size-2.5 rounded-full border-[1.5px] border-ink" style={{ background: crewColor(c) }} />
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ink/55">Price (NEAR)</legend>
                  <div className="flex items-center gap-2">
                    <input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="Min" aria-label="Minimum price" className="h-10 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-3 font-semibold outline-none focus:shadow-[2px_2px_0_#ff7a1a]" />
                    <span className="font-bold">–</span>
                    <input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="Max" aria-label="Maximum price" className="h-10 w-full min-w-0 rounded-xl border-2 border-ink bg-white px-3 font-semibold outline-none focus:shadow-[2px_2px_0_#ff7a1a]" />
                  </div>
                  <button type="button" onClick={clearAll} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-2 hover:text-orange">
                    Clear all
                  </button>
                </fieldset>
              </div>
            )}

            <p className="mt-4 text-sm font-bold text-ink/60" aria-live="polite">
              {items.length} freak{items.length === 1 ? "" : "s"}
            </p>

            {items.length === 0 ? (
              <div className="mt-4 rounded-[22px] border-[3px] border-dashed border-ink/40 bg-white/70 p-10 text-center">
                <p className="font-display text-2xl">No freaks match that.</p>
                <button type="button" onClick={clearAll} className="btn-pop mt-4">
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
                  {items.slice(0, limit).map((d, i) => (
                    <Card key={d.id} d={d} i={i} onBuy={onBuy} />
                  ))}
                </div>
                {limit < items.length && (
                  <div className="mt-8 text-center">
                    <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn-pop">
                      Load more freaks
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Activity / Holders */}
          <aside className="lg:sticky lg:top-[96px] lg:self-start">
            <div className="overflow-hidden rounded-[24px] border-[3px] border-ink bg-white shadow-[6px_6px_0_#16110f]">
              <div className="grid grid-cols-2 border-b-[3px] border-ink" role="tablist">
                {(["activity", "holders"] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`relative py-3 font-display text-lg uppercase tracking-wide transition-colors ${tab === t ? "bg-sun" : "bg-white text-ink/50 hover:text-ink"} ${t === "holders" ? "border-l-[3px] border-ink" : ""}`}>
                    {t}
                    {t === "activity" && <span className="absolute right-4 top-1/2 size-2 -translate-y-1/2 animate-pulse rounded-full bg-green" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-2">
                {tab === "activity" ? (
                  <ul>
                    {feed.map(({ a, fresh }) => (
                      <ActivityRow key={a.id} a={a} fresh={fresh} />
                    ))}
                  </ul>
                ) : (
                  <ol>
                    {data.holders.map((h, i) => (
                      <li key={h.account} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-page">
                        <span className="w-6 text-center font-display text-lg text-ink/45">{i + 1}</span>
                        <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink font-display text-lg" style={{ background: HOLDER_COLORS[i % HOLDER_COLORS.length] }}>
                          {h.account[0]!.toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{h.account}</p>
                          <div className="mt-1 h-2 overflow-hidden rounded-full border-[1.5px] border-ink bg-page">
                            <div className="mk-bar h-full rounded-full" style={{ width: `${(h.count / data.holders[0]!.count) * 100}%`, background: HOLDER_COLORS[i % HOLDER_COLORS.length], "--d": `${i * 60}ms` } as CSSProperties} />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg leading-none">{h.count}</p>
                          <p className="text-[0.68rem] font-bold text-ink/50">{h.pct.toFixed(1)}%</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div role="status" className="pop-in fixed bottom-6 left-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border-[3px] border-ink bg-ink px-5 py-3 text-center font-bold text-cream shadow-[5px_5px_0_#ff7a1a]">
          {toast}
        </div>
      )}
    </div>
  );
}

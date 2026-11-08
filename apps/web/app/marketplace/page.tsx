"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CollectibleCard } from "@/components/CollectibleCard";
import { CORE_CONTRACT, MARKET_CONTRACT } from "@/lib/config";
import { memeLabels, PREVIEW_GALLERY, tokenCard } from "@/lib/cards";
import { MEME_STYLE } from "@/lib/mutant-parts";
import { getSeasons, getTokens, RARITY, type SeasonJ, type TokenViewJ } from "@/lib/near";

type Tab = "all" | "sale";
const STATES = [
  { v: "all", l: "Any state" },
  { v: "FullyBackedLocked", l: "Locked · funded" },
  { v: "Unlocked", l: "Unlocked · funded" },
  { v: "RedeemedEmpty", l: "Empty (redeemed)" },
];

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("all");
  const [tokens, setTokens] = useState<TokenViewJ[] | null>(null);
  const [seasons, setSeasons] = useState<SeasonJ[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [season, setSeason] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [meme, setMeme] = useState("all");
  const [state, setState] = useState("all");

  useEffect(() => {
    if (!CORE_CONTRACT) return;
    (async () => {
      const out: TokenViewJ[] = [];
      for (let from = 1; from < 100_000; from += 50) {
        const page = await getTokens(from, 50);
        out.push(...page);
        if (page.length < 50) break;
      }
      const ss = await getSeasons();
      setSeasons(ss);
      setTokens(out.reverse());
    })().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const memeOptions = useMemo(() => Array.from(new Set((tokens ?? []).flatMap((t) => t.info.holdings.map((h) => h.meme_id)))), [tokens]);
  const shown = (tokens ?? []).filter(
    (t) =>
      (q === "" || t.token_id === q.replace(/^#/, "")) &&
      (season === "all" || String(t.info.season_id) === season) &&
      (rarity === "all" || RARITY[t.info.traits.rarity] === rarity) &&
      (meme === "all" || t.info.holdings.some((h) => h.meme_id === meme)) &&
      (state === "all" || t.effective_state === state),
  );

  return (
    <>
      <header className="relative overflow-hidden rounded-[28px] border-4 border-ink bg-pink px-5 py-8 text-ink shadow-[0_8px_0_#16110f] sm:px-10 sm:py-10">
        <div className="halftone absolute inset-0 opacity-[0.08]" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-hand text-2xl">buy · sell · stare</p>
            <h1 className="lettering text-[clamp(2.8rem,9vw,5.6rem)]">THE FREAK MARKET</h1>
            <p className="mt-2 max-w-lg font-semibold">Every mutant ever hatched. Some are for sale. All of them are weird.</p>
          </div>
          <div className="flex rounded-2xl border-[3px] border-ink bg-cream p-1" role="tablist" aria-label="View">
            {(["all", "sale"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`min-h-11 rounded-xl px-4 font-display text-lg ${tab === t ? "bg-ink text-cream" : ""}`}
              >
                {t === "all" ? "ALL FREAKS" : "FOR SALE"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* filters */}
      <form className="mt-6 grid gap-3 rounded-2xl border-[3px] border-ink bg-cream p-3 text-ink sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]" onSubmit={(e) => e.preventDefault()} aria-label="Filters">
        <label className="text-xs font-bold tracking-wide">
          SEARCH
          <input value={q} onChange={(e) => setQ(e.target.value.trim())} placeholder="#123" inputMode="numeric" className="num mt-1 block min-h-11 w-full rounded-lg border-[3px] border-ink bg-paper px-3 text-base" />
        </label>
        <Select label="SEASON" value={season} onChange={setSeason} options={[{ v: "all", l: "All seasons" }, ...seasons.map((s) => ({ v: String(s.id), l: `S${String(s.id).padStart(2, "0")} ${s.config.name}` }))]} />
        <Select label="RARITY" value={rarity} onChange={setRarity} options={[{ v: "all", l: "Any rarity" }, ...RARITY.map((r) => ({ v: r, l: r }))]} />
        <Select label="MEME" value={meme} onChange={setMeme} options={[{ v: "all", l: "Any meme" }, ...memeOptions.map((m) => ({ v: m, l: MEME_STYLE[m]?.label ?? m.toUpperCase() }))]} />
        <Select label="BACKING" value={state} onChange={setState} options={STATES} />
      </form>

      <div className="mt-8">
        {tab === "sale" && !MARKET_CONTRACT ? (
          <Empty title="NOTHING FOR SALE (YET)" aside="the shop's still being built">
            The trading contract isn&apos;t live yet, so there are no listings — and we won&apos;t fake any. When it launches, every sale pays a 2.5% royalty (10% creator, 90% WTH buyback treasury). You can still transfer cards directly.
          </Empty>
        ) : !CORE_CONTRACT ? (
          <>
            <Empty title="NO FREAKS HATCHED YET" aside="the vault is empty" action={<Link href="/mint" className="btn-mega">MINT THE FIRST ONE</Link>}>
              The collection contract isn&apos;t deployed on this network yet. Real cards will appear here the moment they are minted and funded.
            </Empty>
            <p className="mt-12 font-display text-2xl text-cream">WHAT THEY MIGHT LOOK LIKE <span className="stamp ml-2 align-middle">preview only</span></p>
            <div className="scroll-x" role="list">
              {PREVIEW_GALLERY.map((p) => (
                <div role="listitem" key={p.title}>
                  <CollectibleCard spec={p.spec} title={p.title} rarity={p.rarity} memes={memeLabels(p.spec)} preview />
                </div>
              ))}
            </div>
          </>
        ) : err ? (
          <Empty title="THE MARKET IS NAPPING" aside="couldn't reach the chain">
            {err}
          </Empty>
        ) : tokens === null ? (
          <p className="dots font-display text-2xl text-cream">Rounding up the freaks</p>
        ) : tokens.length === 0 ? (
          <Empty title="NO FREAKS HATCHED YET" aside="be first" action={<Link href="/mint" className="btn-mega">MINT NOW!</Link>}>
            Cards show up here only after their meme basket is bought and verified on-chain.
          </Empty>
        ) : (
          <>
            <p className="mb-4 text-sm text-cream/70" aria-live="polite">
              {shown.length} of {tokens.length} freaks
            </p>
            {shown.length === 0 ? (
              <p className="font-display text-xl text-cream">No freak matches that. Try fewer filters.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-6 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {shown.map((t) => (
                  <li key={t.token_id}>
                    <CollectibleCard {...tokenCard(t, seasons.find((s) => s.id === t.info.season_id))} href={`/nft/${t.token_id}`} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="text-xs font-bold tracking-wide">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border-[3px] border-ink bg-paper px-3 font-sans text-base">
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Empty({ title, aside, children, action }: { title: string; aside: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="sticker mx-auto max-w-2xl -rotate-1 p-6 text-center sm:p-10">
      <p className="font-hand text-2xl text-orange">{aside}</p>
      <p className="font-display text-4xl leading-none">{title}</p>
      <p className="mx-auto mt-3 max-w-lg">{children}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

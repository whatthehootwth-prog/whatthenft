"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TokenGrid } from "@/components/TokenGrid";
import { Alert, EmptyState, H1, NotDeployed } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { assetByContract } from "@/lib/format";
import { getTokens, RARITY, type TokenViewJ } from "@/lib/near";

const STATES = [
  { v: "all", l: "All states" },
  { v: "FullyBackedLocked", l: "Locked · funded" },
  { v: "Unlocked", l: "Unlocked · funded" },
  { v: "RedeemedEmpty", l: "Empty" },
];

export default function CollectionPage() {
  const [all, setAll] = useState<TokenViewJ[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rarity, setRarity] = useState("all");
  const [state, setState] = useState("all");
  const [meme, setMeme] = useState("all");

  useEffect(() => {
    if (!CORE_CONTRACT) return;
    (async () => {
      const out: TokenViewJ[] = [];
      for (let from = 1; from < 100_000; from += 50) {
        const page = await getTokens(from, 50);
        out.push(...page);
        if (page.length < 50) break;
      }
      return out;
    })()
      .then(setAll)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const memes = useMemo(() => Array.from(new Set((all ?? []).flatMap((t) => t.info.holdings.map((h) => h.token)))), [all]);
  const shown = (all ?? []).filter(
    (t) => (rarity === "all" || RARITY[t.info.traits.rarity] === rarity) && (state === "all" || t.effective_state === state) && (meme === "all" || t.info.holdings.some((h) => h.token === meme)),
  );

  return (
    <>
      <H1 kicker="every card ever hatched">The collection</H1>
      {!CORE_CONTRACT ? (
        <NotDeployed />
      ) : err ? (
        <Alert tone="error" title="Could not read the collection">{err}</Alert>
      ) : all === null ? (
        <p className="dots">Reading every card from chain</p>
      ) : all.length === 0 ? (
        <EmptyState aside="so empty" title="No cards hatched yet" action={<Link href="/hatch" className="btn btn-primary">Hatch the first one</Link>}>
          Cards appear here only after their token basket has been bought and verified on-chain.
        </EmptyState>
      ) : (
        <>
          <form className="panel mb-6 grid gap-3 p-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()} aria-label="Filters">
            <Select label="Rarity" value={rarity} onChange={setRarity} options={[{ v: "all", l: "All rarities" }, ...RARITY.map((r) => ({ v: r, l: r }))]} />
            <Select label="Backing state" value={state} onChange={setState} options={STATES} />
            <Select label="Contains token" value={meme} onChange={setMeme} options={[{ v: "all", l: "Any token" }, ...memes.map((m) => ({ v: m, l: assetByContract(m)?.symbol ?? m }))]} />
          </form>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {shown.length} of {all.length} cards
          </p>
          {shown.length ? <TokenGrid tokens={shown} /> : <p>No cards match these filters.</p>}
        </>
      )}
    </>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block text-sm font-semibold">
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

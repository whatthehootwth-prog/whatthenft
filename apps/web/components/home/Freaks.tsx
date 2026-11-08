"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CollectibleCard } from "@/components/CollectibleCard";
import { memesIn } from "@/lib/art";
import { CORE_CONTRACT } from "@/lib/config";
import { PREVIEW_GALLERY, tokenCard } from "@/lib/cards";
import { getSeasons, getTokens, type SeasonJ, type TokenViewJ } from "@/lib/near";

export function Freaks() {
  const [real, setReal] = useState<{ tokens: TokenViewJ[]; seasons: SeasonJ[] } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!CORE_CONTRACT) return;
    Promise.all([getTokens(1, 50), getSeasons()])
      .then(([tokens, seasons]) => setReal({ tokens: tokens.slice(-12).reverse(), seasons }))
      .catch(() => setErr(true));
  }, []);

  const hasReal = !!real && real.tokens.length > 0;

  return (
    <section aria-labelledby="freaks-h" className="relative -mx-4 mt-24 overflow-hidden border-y-4 border-ink bg-hot px-4 py-16 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[40px] lg:border-4 lg:px-12 lg:shadow-[12px_12px_0_#16110f]">
      <div className="halftone-white absolute inset-0" aria-hidden="true" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-2xl">{hasReal ? "fresh out of the vault" : "a taste of the chaos"}</p>
          <h2 id="freaks-h" className="mad-title text-[clamp(2.6rem,8vw,5rem)]">
            MEET THE FREAKS
          </h2>
        </div>
        <Link href="/marketplace" className="btn-pop">
          SEE ALL →
        </Link>
      </div>

      {!hasReal && (
        <p className="relative mt-4 max-w-2xl rounded-xl border-[3px] border-ink bg-white px-4 py-2 text-sm font-semibold shadow-[4px_4px_0_#16110f]">
          {err ? "Couldn't reach the contract, so here are previews. " : ""}
          <strong>Previews</strong> mixed from the real Season 01 parts — not minted, not owned, no tokens inside. Real cards show up here once minted and funded.
        </p>
      )}

      <div className="scroll-x relative mt-4" role="list">
        {hasReal
          ? real!.tokens.map((t) => (
              <div role="listitem" key={t.token_id}>
                <CollectibleCard {...tokenCard(t, real!.seasons.find((s) => s.id === t.info.season_id))} href={`/nft/${t.token_id}`} />
              </div>
            ))
          : PREVIEW_GALLERY.map((p, k) => (
              <div role="listitem" key={p.title} className={k % 2 ? "rotate-2" : "-rotate-2"}>
                <CollectibleCard spec={p.spec} title={p.title} rarity={p.rarity} memes={memesIn(p.spec)} preview />
              </div>
            ))}
      </div>
    </section>
  );
}

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
    <section aria-labelledby="freaks-h" className="band mt-24 bg-hot py-20">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="eyebrow">{hasReal ? "Fresh out of the vault" : "Preview gallery"}</span>
          <h2 id="freaks-h" className="mad-title mt-4 text-[clamp(2.6rem,6vw,4.6rem)] [--ts:#fff]">
            MEET THE FREAKS
          </h2>
          {!hasReal && (
            <p className="lead mt-3 max-w-2xl">
              {err ? "Couldn't reach the contract, so here are previews. " : ""}Random mixes of the real Season 01 parts. Not minted, not owned, nothing inside — real cards appear here once minted.
            </p>
          )}
        </div>
        <Link href="/marketplace" className="btn-pop">
          See all →
        </Link>
      </div>
      <div className="scroll-x mt-8" role="list">
        {hasReal
          ? real!.tokens.map((t) => (
              <div role="listitem" key={t.token_id}>
                <CollectibleCard {...tokenCard(t, real!.seasons.find((s) => s.id === t.info.season_id))} href={`/nft/${t.token_id}`} />
              </div>
            ))
          : PREVIEW_GALLERY.map((p) => (
              <div role="listitem" key={p.title}>
                <CollectibleCard spec={p.spec} title={p.title} rarity={p.rarity} memes={memesIn(p.spec)} preview />
              </div>
            ))}
      </div>
    </section>
  );
}

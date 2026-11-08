"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CollectibleCard } from "@/components/CollectibleCard";
import { CORE_CONTRACT } from "@/lib/config";
import { memeLabels, PREVIEW_GALLERY, tokenCard } from "@/lib/cards";
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
    <section aria-labelledby="freaks-h" className="mt-24 sm:mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-2xl text-yellow">{hasReal ? "fresh out of the vault" : "a taste of the chaos"}</p>
          <h2 id="freaks-h" className="lettering text-[clamp(2.6rem,8vw,5rem)]">
            MEET THE FREAKS
          </h2>
        </div>
        <Link href="/marketplace" className="btn-ghost-cream">
          SEE ALL →
        </Link>
      </div>

      {!hasReal && (
        <p className="mt-3 max-w-2xl text-sm text-cream/70">
          {err ? "Couldn't reach the contract, so here are preview mutants instead. " : ""}
          These are <strong className="text-yellow">previews built from stand-in parts</strong>, not minted NFTs. No one owns them and they hold no tokens. Real cards show up here
          once they are minted and funded.
        </p>
      )}

      <div className="scroll-x mt-4" role="list">
        {hasReal
          ? real!.tokens.map((t) => {
              const c = tokenCard(t, real!.seasons.find((s) => s.id === t.info.season_id));
              return (
                <div role="listitem" key={t.token_id}>
                  <CollectibleCard {...c} href={`/nft/${t.token_id}`} />
                </div>
              );
            })
          : PREVIEW_GALLERY.map((p, k) => (
              <div role="listitem" key={p.title} className={k % 2 ? "rotate-1" : "-rotate-1"}>
                <CollectibleCard spec={p.spec} title={p.title} rarity={p.rarity} memes={memeLabels(p.spec)} preview />
              </div>
            ))}
      </div>
    </section>
  );
}

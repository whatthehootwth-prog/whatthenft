"use client";

import Link from "next/link";
import { ArtSlot, StateChip } from "@/components/ui";
import { assetByContract, bpsPct } from "@/lib/format";
import { RARITY, type TokenViewJ } from "@/lib/near";

export function TokenGrid({ tokens }: { tokens: TokenViewJ[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {tokens.map((t) => (
        <li key={t.token_id}>
          <Link href={`/nft/${t.token_id}`} className="panel block p-3 transition-transform hover:-translate-y-0.5">
            <ArtSlot rarity={RARITY[t.info.traits.rarity]} label={`S${String(t.info.season_id).padStart(2, "0")} #${t.info.serial}`} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-display text-lg">#{t.token_id}</span>
              <StateChip state={t.effective_state} />
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">
              {t.info.holdings.map((h) => (
                <li key={h.token} className="flex justify-between">
                  <span>{assetByContract(h.token)?.symbol ?? h.meme_id}</span>
                  <span className="num">{bpsPct(h.bps, 0)}</span>
                </li>
              ))}
            </ul>
          </Link>
        </li>
      ))}
    </ul>
  );
}

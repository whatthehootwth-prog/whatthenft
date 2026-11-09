import Image from "next/image";
import { PARTNERS, SLOT_LABEL } from "@/lib/art";

/** The 13 Season 01 meme collections — trait sources, not minted NFTs. */
export function Cast() {
  return (
    <section aria-labelledby="cast-h" className="band mt-24 bg-aqua py-20">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="eyebrow">The cast</span>
          <h2 id="cast-h" className="mad-title mt-4 text-[clamp(2.6rem,6vw,4.6rem)] [--ts:#fff]">
            13 MEME CREWS. ONE OWL.
          </h2>
          <p className="lead mt-4 max-w-2xl">Each crew lends the owl a few body parts. Your mutant gets a random mix — and a matching bag of those memes.</p>
        </div>
        <p className="max-w-xs text-sm font-semibold text-ink/70 lg:text-right">Season 01 trait collections. Partner art and token routes still need sign-off before minting opens.</p>
      </div>
      <ul className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
        {PARTNERS.map((m) => (
          <li key={m.memeId} className="jelly">
            <div className="h-full rounded-[20px] border-[3px] border-ink bg-white p-2 shadow-[5px_5px_0_#16110f]">
              <div className="relative aspect-square overflow-hidden rounded-[14px] border-[2.5px] border-ink" style={{ background: m.color }}>
                {m.preview && <Image src={m.preview} alt={`${m.displayName} owl`} width={320} height={320} className="h-full w-full object-contain p-1" />}
              </div>
              <div className="px-1.5 pb-1 pt-2.5">
                <p className="font-display text-xl leading-none">{m.displayName}</p>
                <p className="mt-1.5 flex flex-wrap gap-1">
                  {m.slots.map((s) => (
                    <span key={s} className="rounded-md bg-page px-1.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-wide text-ink/70">
                      {SLOT_LABEL[s]}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

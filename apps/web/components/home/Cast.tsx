import Image from "next/image";
import { PARTNERS, SLOT_LABEL } from "@/lib/art";

const TILT = ["-rotate-3", "rotate-2", "-rotate-1", "rotate-3", "-rotate-2", "rotate-1"];

/** The 13 Season 01 meme collections — trait sources, not minted NFTs. */
export function Cast() {
  return (
    <section aria-labelledby="cast-h" className="relative -mx-4 mt-20 overflow-hidden border-y-4 border-ink bg-aqua px-4 py-16 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[40px] lg:border-4 lg:px-12 lg:shadow-[12px_12px_0_#16110f]">
      <div className="halftone-white absolute inset-0" aria-hidden="true" />
      <div className="relative text-center">
        <p className="font-hand text-2xl">13 meme gangs. 1 owl. zero chill.</p>
        <h2 id="cast-h" className="mad-title mt-1 text-[clamp(2.8rem,9vw,5.6rem)]">
          MEET THE CAST
        </h2>
        <p className="mx-auto mt-3 max-w-xl font-semibold">Every mutant borrows body parts from these crews. Mix them up and you get… whatever this is.</p>
      </div>
      <ul className="relative mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
        {PARTNERS.map((m, k) => (
          <li key={m.memeId} className={`jelly ${TILT[k % TILT.length]}`}>
            <div className="rounded-[22px] border-4 border-ink bg-white p-2 shadow-[6px_6px_0_#16110f]">
              <div className="relative aspect-square overflow-hidden rounded-2xl border-[3px] border-ink" style={{ background: m.color }}>
                <div className="halftone-white absolute inset-0" aria-hidden="true" />
                {m.preview && <Image src={m.preview} alt={`${m.displayName} owl`} width={300} height={300} className="relative h-full w-full object-contain" />}
              </div>
              <p className="mt-2 text-center font-display text-lg leading-none">{m.displayName}</p>
              <p className="pixel mt-1 text-center text-[0.6rem] leading-tight text-ink/70">{m.slots.map((s) => SLOT_LABEL[s]).join(" · ")}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="relative mt-10 text-center text-sm font-semibold">Trait collections for Season 01. Partner art and token routes still need sign-off before minting opens.</p>
    </section>
  );
}

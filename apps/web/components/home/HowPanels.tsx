import Link from "next/link";
import { ArtMutant } from "@/components/ArtMutant";
import { PRESETS } from "@/lib/presets";

const P = PRESETS;

export function HowPanels() {
  return (
    <section aria-labelledby="how-h" className="mt-24">
      <div className="text-center">
        <p className="font-hand text-2xl">ok but…</p>
        <h2 id="how-h" className="mad-title mt-1 text-[clamp(2.6rem,8vw,5rem)]">
          HOW THE HELL
          <br className="sm:hidden" /> DOES IT WORK?
        </h2>
      </div>

      <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-7">
        <li className="comic-panel -rotate-2 rounded-[28px_18px_30px_16px]">
          <div className="relative grid h-64 place-items-center overflow-hidden border-b-4 border-ink bg-sun">
            <div className="halftone-white absolute inset-0" aria-hidden="true" />
            <div className="wiggle relative grid h-44 w-32 place-items-center rounded-2xl border-4 border-ink bg-hot shadow-[6px_6px_0_#16110f]">
              <span className="mad-title text-8xl">?</span>
              <span className="pixel absolute -bottom-3 rounded-md border-2 border-ink bg-white px-2 text-[0.6rem]">MYSTERY</span>
            </div>
            <div className="absolute -right-4 bottom-0 w-36 rotate-12">
              <ArtMutant spec={P[0]!.spec} className="w-full" label="A mutant peeking out" />
            </div>
            <span className="speech absolute left-4 top-4 text-sm">*shake shake*</span>
          </div>
          <div className="p-6">
            <p className="pixel text-xs font-bold text-hot">PANEL 01</p>
            <h3 className="font-display text-3xl leading-none">MINT THE MADNESS</h3>
            <p className="mt-2 text-lg font-semibold">Pay NEAR. Get a ridiculous meme mutant.</p>
          </div>
        </li>

        <li className="comic-panel rotate-1 rounded-[18px_30px_16px_28px] md:mt-10">
          <div className="relative h-64 overflow-hidden border-b-4 border-ink bg-lime">
            <div className="halftone-white absolute inset-0" aria-hidden="true" />
            <div className="absolute left-1/2 top-1/2 w-48 -translate-x-1/2 -translate-y-1/2">
              <ArtMutant spec={P[2]!.spec} className="w-full" label="A mutant with token coins" />
            </div>
            {[
              { t: "WTH", c: "#FF7A1A", cls: "left-3 top-5" },
              { t: "OYSTR", c: "#F4B08A", cls: "right-3 top-8" },
              { t: "KAT", c: "#C6FF3D", cls: "left-5 bottom-5" },
              { t: "MALL", c: "#E040FB", cls: "right-6 bottom-6" },
            ].map((coin, k) => (
              <span key={k} className={`float-y pixel absolute grid size-16 place-items-center rounded-full border-4 border-ink text-xs font-bold shadow-[3px_3px_0_#16110f] ${coin.cls}`} style={{ background: coin.c, animationDelay: `${k * -1.1}s` }}>
                {coin.t}
              </span>
            ))}
          </div>
          <div className="p-6">
            <p className="pixel text-xs font-bold text-hot">PANEL 02</p>
            <h3 className="font-display text-3xl leading-none">REAL MEMES INSIDE</h3>
            <p className="mt-2 text-lg font-semibold">Different body parts. Different real meme tokens.</p>
            <p className="mt-2 text-sm">Underlying assets are locked for 30 days.</p>
          </div>
        </li>

        <li className="comic-panel -rotate-1 rounded-[30px_16px_22px_20px]">
          <div className="relative h-64 overflow-hidden border-b-4 border-ink bg-lilac">
            <div className="halftone-white absolute inset-0" aria-hidden="true" />
            <div className="absolute bottom-1 left-0 w-36 -scale-x-100">
              <ArtMutant spec={P[1]!.spec} className="w-full" label="Mutant trading" />
            </div>
            <div className="absolute bottom-1 right-0 w-36">
              <ArtMutant spec={P[3]!.spec} className="w-full" label="Another mutant trading" />
            </div>
            <div className="wiggle absolute left-1/2 top-8 grid h-20 w-14 -translate-x-1/2 place-items-center rounded-lg border-4 border-ink bg-sun font-display text-2xl">⇄</div>
            <span className="speech absolute right-3 top-3 text-sm">deal?!</span>
          </div>
          <div className="p-6">
            <p className="pixel text-xs font-bold text-hot">PANEL 03</p>
            <h3 className="font-display text-3xl leading-none">COLLECT OR TRADE</h3>
            <p className="mt-2 text-lg font-semibold">Keep your freak. Or sell it to another freak.</p>
          </div>
        </li>
      </ol>

      <p className="mt-12 text-center">
        <Link href="/wth" className="btn-pop">
          Still confused? WTH IS THIS?! →
        </Link>
      </p>
    </section>
  );
}

import Link from "next/link";
import { Mutant } from "@/components/Mutant";
import { PRESETS } from "@/lib/presets";

const P = PRESETS;

export function HowPanels() {
  return (
    <section aria-labelledby="how-h" className="mt-24 sm:mt-28">
      <div className="text-center">
        <p className="font-hand text-2xl text-yellow">ok but…</p>
        <h2 id="how-h" className="lettering mt-1 text-[clamp(2.6rem,8vw,5rem)]">
          HOW THE HELL
          <br className="sm:hidden" /> DOES IT WORK?
        </h2>
      </div>

      <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {/* Panel 1 */}
        <li className="comic-panel -rotate-1 rounded-[20px_14px_24px_12px]">
          <div className="relative grid h-60 place-items-center overflow-hidden border-b-4 border-ink bg-[#ffd23f] sm:h-64">
            <div className="halftone absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="wiggle relative grid h-44 w-32 place-items-center rounded-2xl border-4 border-ink bg-ink shadow-[6px_6px_0_#ff5fa2]">
              <span className="font-display text-7xl text-yellow">?</span>
              <span className="absolute -bottom-3 rounded-md border-2 border-ink bg-cream px-2 font-mono text-[0.65rem] font-bold">MYSTERY</span>
            </div>
            <div className="absolute -right-6 bottom-0 w-36 rotate-12">
              <Mutant spec={P[0]!.spec} className="w-full" label="A mutant peeking out" />
            </div>
            <span className="speech absolute left-4 top-4 text-sm">*shake shake*</span>
          </div>
          <div className="p-5">
            <p className="num text-xs font-bold text-orange">PANEL 01</p>
            <h3 className="font-display text-3xl leading-none">MINT THE MADNESS</h3>
            <p className="mt-2 text-lg font-semibold">Pay NEAR. Get a ridiculous meme mutant.</p>
          </div>
        </li>

        {/* Panel 2 */}
        <li className="comic-panel rotate-1 rounded-[14px_22px_12px_24px]">
          <div className="relative h-60 overflow-hidden border-b-4 border-ink bg-[#3ec6e0] sm:h-64">
            <div className="halftone absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="absolute left-1/2 top-1/2 w-44 -translate-x-1/2 -translate-y-1/2">
              <Mutant spec={P[2]!.spec} className="w-full" label="A mutant with token coins" />
            </div>
            {[
              { t: "WTH", c: "#FF7A1A", cls: "left-4 top-5" },
              { t: "KAT", c: "#FFB13B", cls: "right-4 top-10" },
              { t: "WTH", c: "#FF7A1A", cls: "left-6 bottom-6" },
            ].map((coin, k) => (
              <span key={k} className={`float-y absolute grid size-16 place-items-center rounded-full border-4 border-ink font-display text-lg shadow-[3px_3px_0_#16110f] ${coin.cls}`} style={{ background: coin.c, animationDelay: `${k * -1.3}s` }}>
                {coin.t}
              </span>
            ))}
          </div>
          <div className="p-5">
            <p className="num text-xs font-bold text-orange">PANEL 02</p>
            <h3 className="font-display text-3xl leading-none">REAL MEMES INSIDE</h3>
            <p className="mt-2 text-lg font-semibold">Different body parts. Different real meme tokens.</p>
            <p className="mt-2 text-sm text-ink/70">Underlying assets are locked for 30 days.</p>
          </div>
        </li>

        {/* Panel 3 */}
        <li className="comic-panel -rotate-[0.5deg] rounded-[24px_12px_18px_16px]">
          <div className="relative h-60 overflow-hidden border-b-4 border-ink bg-[#ff5fa2] sm:h-64">
            <div className="halftone absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="absolute bottom-2 left-0 w-36 -scale-x-100">
              <Mutant spec={P[1]!.spec} className="w-full" label="Mutant trading" />
            </div>
            <div className="absolute bottom-2 right-0 w-36">
              <Mutant spec={P[3]!.spec} className="w-full" label="Another mutant trading" />
            </div>
            <div className="wiggle absolute left-1/2 top-8 grid h-20 w-14 -translate-x-1/2 place-items-center rounded-lg border-4 border-ink bg-cream font-display text-2xl">⇄</div>
            <span className="speech absolute right-3 top-3 text-sm">deal?!</span>
          </div>
          <div className="p-5">
            <p className="num text-xs font-bold text-orange">PANEL 03</p>
            <h3 className="font-display text-3xl leading-none">COLLECT OR TRADE</h3>
            <p className="mt-2 text-lg font-semibold">Keep your freak. Or sell it to another freak.</p>
          </div>
        </li>
      </ol>

      <p className="mt-10 text-center">
        <Link href="/wtf" className="font-hand text-2xl text-cream underline decoration-orange decoration-4 underline-offset-8 hover:text-yellow">
          Still confused? WTF IS THIS?! →
        </Link>
      </p>
    </section>
  );
}

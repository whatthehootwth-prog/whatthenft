import Link from "next/link";
import { ArtMutant } from "@/components/ArtMutant";
import { PRESETS } from "@/lib/presets";

const STEPS = [
  {
    n: "1",
    title: "Mint the madness",
    body: "Pay NEAR. In the next block, on-chain randomness picks your owl's six body parts. Nobody — not even us — can choose the result.",
    bg: "#ffd23f",
    art: PRESETS[0]!.spec,
  },
  {
    n: "2",
    title: "Real memes go inside",
    body: "Each part buys that meme's real token on Rhea. The contract checks the tokens arrived, then mints your NFT. They're locked for 30 days.",
    bg: "#c6f432",
    art: PRESETS[2]!.spec,
  },
  {
    n: "3",
    title: "Keep it, trade it, cash it",
    body: "Sell your freak any time — the bag goes with it. After 30 days the owner can pull the tokens out. The art stays forever.",
    bg: "#ff8cc6",
    art: PRESETS[3]!.spec,
  },
];

export function HowPanels() {
  return (
    <section aria-labelledby="how-h" className="mt-24">
      <div className="text-center">
        <span className="eyebrow">How it works</span>
        <h2 id="how-h" className="mad-title mt-4 text-[clamp(2.6rem,6vw,4.6rem)]">
          HOW THE HELL DOES IT WORK?
        </h2>
      </div>
      <ol className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="comic-panel flex flex-col">
            <div className="relative h-56 overflow-hidden border-b-[3px] border-ink" style={{ background: s.bg }}>
              <div className="halftone-white absolute inset-0" aria-hidden="true" />
              <span className="absolute left-4 top-4 grid size-14 place-items-center rounded-full border-[3px] border-ink bg-white font-display text-3xl shadow-[3px_3px_0_#16110f]">{s.n}</span>
              <div className="float-y absolute bottom-[-6%] right-[6%] w-[58%]">
                <ArtMutant spec={s.art} className="w-full" label="Mutant owl" />
              </div>
            </div>
            <div className="flex-1 p-6">
              <h3 className="font-display text-[1.8rem] leading-tight">{s.title}</h3>
              <p className="mt-2 text-[1.02rem] leading-relaxed text-ink/80">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-10 text-center">
        <Link href="/wth" className="btn-pop">
          Read the full guide →
        </Link>
      </p>
    </section>
  );
}

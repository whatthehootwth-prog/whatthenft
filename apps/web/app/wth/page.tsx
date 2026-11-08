import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { SLOT_LABEL, SLOT_ORDER, layerFor, memeLabel } from "@/lib/art";
import { PRESETS, mixFor } from "@/lib/presets";

export const metadata: Metadata = { title: "WTH is this?!" };

const EX = PRESETS[0]!; // DOGGO.EXE
const EX_MIX = mixFor(EX.spec);
const SLOT_SHARE: Record<string, number> = { head: 16, face: 8, body: 20, arms: 8, legs: 8, accessory: 20 };

function Chapter({ n, title, color, art, children, flip = false }: { n: string; title: string; color: string; art: ReactNode; children: ReactNode; flip?: boolean }) {
  return (
    <section className={`comic-panel grid gap-0 rounded-[26px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${flip ? "md:[&>*:first-child]:order-2 rotate-[0.4deg]" : "-rotate-[0.4deg]"}`}>
      <div className="relative min-h-64 overflow-hidden border-b-4 border-ink md:border-b-0 md:border-r-4" style={{ background: color }}>
        <div className="halftone absolute inset-0 opacity-10" aria-hidden="true" />
        <div className="relative flex h-full items-center justify-center p-5">{art}</div>
      </div>
      <div className="p-6 sm:p-8">
        <p className="num text-xs font-bold text-orange">CHAPTER {n}</p>
        <h2 className="font-display text-3xl leading-none sm:text-4xl">{title}</h2>
        <div className="mt-4 space-y-3 text-[1.02rem] [&_strong]:font-bold">{children}</div>
      </div>
    </section>
  );
}

export default function WtfPage() {
  return (
    <>
      <header className="text-center">
        <p className="font-hand text-2xl text-hot">the official confused guide</p>
        <h1 className="mad-title mt-1 text-[clamp(3.2rem,11vw,7rem)]">WTH IS THIS?!</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink/70">Everything about WHAT THE NFT?! in eight short chapters. Funny where it can be, serious where it matters.</p>
      </header>

      <div className="mt-14 space-y-12">
        <Chapter
          n="01"
          title="WHAT THE HELL IS THIS?!"
          color="#ffd23f"
          art={
            <div className="relative w-64">
              <ArtMutant spec={PRESETS[2]!.spec} className="w-full" label="A mutant owl" />
              <span className="speech absolute -top-2 left-0 text-base">I&apos;m art AND a bag?!</span>
            </div>
          }
        >
          <p>
            Every WHAT THE NFT?! card is <strong>two things at once</strong>: a one-of-a-kind mutant WTH owl you can collect and trade, and a vault of <strong>real meme tokens</strong> on NEAR that belongs to whoever owns the card.
          </p>
          <p>Seasonal drops, 111 mutants per season. Part of the WHAT THE HOOT?! ($WTH) universe.</p>
        </Chapter>

        <Chapter
          n="02"
          title="WHY DOES MY OWL HAVE A DOG FACE?!"
          color="#3ec6e0"
          flip
          art={
            <div className="w-full max-w-xs space-y-2">
              {[
                ["COMMON", 70, "#ffe7b8"],
                ["RARE", 22, "#7fd8ea"],
                ["EPIC", 7, "#ff8fbf"],
                ["LEGENDARY", 1, "#b39ce6"],
              ].map(([r, p, c]) => (
                <div key={r as string} className="flex items-center gap-2">
                  <span className="w-28 font-display text-ink">{r}</span>
                  <span className="h-7 flex-1 overflow-hidden rounded-lg border-[3px] border-ink bg-cream">
                    <span className="block h-full border-r-[3px] border-ink" style={{ width: `${Math.max(4, p as number)}%`, background: c as string }} />
                  </span>
                  <span className="num w-10 text-right font-bold text-ink">{p}%</span>
                </div>
              ))}
            </div>
          }
        >
          <p>
            Each mutant has <strong>six parts</strong>: head, face, body, arms, legs and cape/accessory. Each part comes from a meme community&apos;s art — WTH plus approved partner memes.
          </p>
          <p>
            The mix is decided by NEAR&apos;s on-chain randomness in a block <strong>after</strong> you pay, so nobody — not you, not us — can pick or re-roll the result. Anyone can re-check it from the seed shown on the card.
          </p>
          <p>
            <strong>Rarity is pure art</strong> (frames, effects). A Legendary doesn&apos;t get a bigger or better bag.
          </p>
        </Chapter>

        <Chapter
          n="03"
          title="WAIT… THERE'S REAL MONEY INSIDE?!"
          color="#ff5fa2"
          art={
            <div className="w-full max-w-sm">
              <div className="mx-auto w-48">
                <ArtMutant spec={EX.spec} className="w-full" label={`Example mutant ${EX.nickname}`} />
              </div>
              <div className="mt-3 flex h-6 overflow-hidden rounded-full border-[3px] border-ink">
                {EX_MIX.map((m) => (
                  <span key={m.memeId} style={{ width: `${m.bps / 100}%`, background: m.color }} />
                ))}
              </div>
              <p className="num mt-1 text-center text-xs font-bold text-ink">{EX_MIX.map((m) => `${m.label} ${m.bps / 100}%`).join(" · ")}</p>
            </div>
          }
        >
          <p>Yes. The parts decide the tokens. WTH always gets a <strong>20% core</strong>; the other 80% follows the parts:</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {SLOT_ORDER.map((s) => (
              <div key={s} className="rounded-lg border-[3px] border-ink bg-white px-1 py-1.5">
                <p className="font-display text-sm leading-none">{SLOT_LABEL[s]}</p>
                <p className="num text-sm font-bold">{SLOT_SHARE[s]}%</p>
              </div>
            ))}
          </div>
          <p className="text-sm">
            Example ({EX.nickname}):{" "}
            {SLOT_ORDER.map((s) => `${SLOT_LABEL[s].toLowerCase()} ${layerFor(s, EX.spec[s]) ? memeLabel(EX.spec[s].memeId) : "WTH"}`).join(", ")} → {EX_MIX.map((m) => `${m.label} ${m.bps / 100}%`).join(", ")}.
          </p>
          <p>
            After the reveal, the contract itself <strong>buys the tokens on Rhea</strong> (NEAR&apos;s main DEX), checks its own balance to record exactly what arrived, and <strong>only then</strong> mints your card. No bag, no NFT. If a swap route fails before anything is bought, you&apos;re refunded.
          </p>
        </Chapter>

        <Chapter
          n="04"
          title="WHY CAN'T I WITHDRAW YET?!"
          color="#ff7a1a"
          flip
          art={
            <div className="flex items-center gap-1.5 font-display text-ink sm:gap-3">
              {[
                ["DAY 0", "FUNDED", "#ffd23f"],
                ["DAY 30", "UNLOCKED", "#3ec6e0"],
                ["LATER", "EMPTY", "#fff4dc"],
              ].map(([d, s, c], k) => (
                <div key={d} className="flex items-center gap-1.5 sm:gap-3">
                  <div className="grid h-20 w-[4.4rem] place-items-center rounded-xl border-4 border-ink text-center leading-tight shadow-[3px_3px_0_#16110f] sm:h-24 sm:w-24" style={{ background: c }}>
                    <span className="text-xs sm:text-sm">{d}</span>
                    <span className="text-[0.8rem] sm:text-base">{s}</span>
                  </div>
                  {k < 2 && <span className="text-xl text-ink sm:text-3xl">→</span>}
                </div>
              ))}
            </div>
          }
        >
          <p>
            Tokens are <strong>locked for 30 days from the moment your card is funded</strong>. That keeps the mint from being an instant flip and gives every card a real lifecycle.
          </p>
          <p>
            After unlock, <strong>whoever owns the card</strong> can redeem the exact tokens to their wallet. The card stays as an <strong>EMPTY</strong> collectible — it no longer holds anything.
          </p>
          <p>
            An empty card can be <strong>reloaded</strong> in an eligible season: same original token mix, current prices, a new payment and a new 30-day lock. Reloading never changes the art or rarity.
          </p>
        </Chapter>

        <Chapter
          n="05"
          title="CAN I SELL THIS WEIRD THING?!"
          color="#7fd8ea"
          art={
            <div className="relative flex items-end gap-2">
              <div className="w-36 -scale-x-100">
                <ArtMutant spec={PRESETS[1]!.spec} className="w-full" label="Seller mutant" />
              </div>
              <div className="w-36">
                <ArtMutant spec={PRESETS[3]!.spec} className="w-full" label="Buyer mutant" />
              </div>
              <span className="speech absolute -top-4 left-1/2 -translate-x-1/2 text-sm">is the bag included?!</span>
            </div>
          }
        >
          <p>
            Yes — even while locked. The buyer gets the card <strong>and the entire token bag</strong>. The 30-day timer doesn&apos;t restart on resale.
          </p>
          <p>
            Sales on our marketplace pay a <strong>2.5% royalty</strong>: 10% of it to the WTH creator, 90% to the WTH buyback treasury. Selling for 10 NEAR → seller gets 9.75, creator 0.025, treasury 0.225. Direct wallet transfers pay no royalty.
          </p>
          <p className="text-sm text-ink/70">The trading contract launches after the core contract; until then there are no listings.</p>
        </Chapter>

        <Chapter
          n="06"
          title="WHERE DOES THE MONEY GO?!"
          color="#ffd23f"
          flip
          art={
            <div className="w-full max-w-xs rounded-2xl border-4 border-ink bg-cream p-4 text-ink shadow-[4px_4px_0_#16110f]">
              <p className="font-display text-xl">0.1 NEAR MINT</p>
              <table className="ledger mt-2">
                <tbody>
                  <tr><td>Your meme bag (90%)</td><td className="amt">0.09</td></tr>
                  <tr><td>WTH creator (5%)</td><td className="amt">0.005</td></tr>
                  <tr><td>Buyback treasury (5%)</td><td className="amt">0.005</td></tr>
                  <tr className="total"><td>Base price</td><td className="amt">0.1</td></tr>
                </tbody>
              </table>
            </div>
          }
        >
          <p>
            <strong>90% of the base price buys your tokens.</strong> 5% goes to the WTH creator, 5% to the WTH buyback treasury — and both are only paid after your card is fully funded.
          </p>
          <p>
            On top of the base you pay a small <strong>storage fee</strong> (your NFT&apos;s on-chain data), a <strong>refundable retry reserve</strong> (unused part comes back), and normal network gas. These never come out of your 90%.
          </p>
          <p>
            Treasury income is used for WTH buybacks with strict limits. Buybacks are not promised to move any price. Details on the <Link href="/treasury" className="underline">treasury page</Link>.
          </p>
        </Chapter>

        <Chapter
          n="07"
          title="SEASONS?!"
          color="#b39ce6"
          art={
            <div className="flex -space-x-12 sm:-space-x-10">
              {[PRESETS[0], PRESETS[2], PRESETS[3]].map((p, k) => (
                <div key={k} className={`w-24 sm:w-32 rounded-2xl border-4 border-ink bg-cream p-1 shadow-[4px_4px_0_#16110f] ${["-rotate-6", "rotate-2", "rotate-12"][k]}`}>
                  <ArtMutant spec={p!.spec} className="w-full" label="Season card" />
                </div>
              ))}
            </div>
          }
        >
          <p>
            Each season is a capped drop (Season 01 &quot;Meme Genesis&quot; = 111 mutants) with its own meme lineup and art. Rules, fees and probabilities are <strong>frozen on-chain</strong> when a season opens.
          </p>
          <p>Old seasons stay tradable forever. New memes come in new seasons — not by inflating old ones.</p>
        </Chapter>

        <section className="rounded-[26px] border-4 border-ink bg-sun p-6 text-ink shadow-[10px_10px_0_#16110f] sm:p-8">
          <p className="pixel text-xs font-bold text-hot">CHAPTER 08</p>
          <h2 className="mad-title-ink text-3xl sm:text-4xl">THE SCARY PART (READ IT)</h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            <li className="rounded-xl border-[3px] border-ink bg-white p-3"><strong>Meme tokens can go to zero.</strong> All of them, including WTH.</li>
            <li className="rounded-xl border-[3px] border-ink bg-white p-3"><strong>Market prices.</strong> Swaps use live pool prices with up to 2% slippage plus pool fees.</li>
            <li className="rounded-xl border-[3px] border-ink bg-white p-3"><strong>Locked means locked.</strong> You can&apos;t pull tokens out for 30 days, even in a crash. You can still sell the card.</li>
            <li className="rounded-xl border-[3px] border-ink bg-white p-3"><strong>Thin liquidity.</strong> Selling a whole bag may return less than the estimate shown.</li>
            <li className="rounded-xl border-[3px] border-ink bg-white p-3"><strong>Smart-contract risk.</strong> The contracts are not yet independently audited.</li>
            <li className="rounded-xl border-[3px] border-ink bg-white p-3"><strong>Not an investment product.</strong> No yield, no promised returns, not financial advice. Check your local rules and taxes.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/risk" className="btn btn-secondary">FULL RISK DISCLOSURE</Link>
            <Link href="/mint" className="btn-mad">OK, MINT NOW!</Link>
          </div>
        </section>
      </div>
    </>
  );
}

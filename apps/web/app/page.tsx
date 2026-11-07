import Link from "next/link";
import { SlotDiagram } from "@/components/SlotDiagram";
import { LiveExecutability, RecentMints, SeasonBanner } from "./home-client";

export default function Home() {
  return (
    <>
      {/* LOUD: hero */}
      <section className="relative -mx-4 -mt-6 overflow-hidden border-b-[3px] border-ink sm:-mx-6 lg:mx-0 lg:mt-0 lg:rounded-3xl lg:border-[3px]">
        <div className="sunburst rays-spin absolute left-1/2 top-1/2 aspect-square w-[260%] -translate-x-1/2 -translate-y-1/2 sm:w-[180%]" aria-hidden="true" />
        <div className="relative grid items-center gap-8 px-5 pb-12 pt-10 sm:px-8 md:grid-cols-[1.25fr_1fr] md:py-16 lg:px-12">
          <div>
            <h1 className="lettering text-[clamp(3.4rem,13vw,7.6rem)]">
              WHAT
              <br />
              THE NFT?!
            </h1>
            <p className="mt-4 inline-block -rotate-1 rounded-lg border-[3px] border-ink bg-ink px-3 py-1 font-display text-xl text-yellow sm:text-2xl">ONE OWL. TOO MANY MEMES.</p>
            <p className="sticker mt-6 max-w-md p-4 text-[1.05rem] font-semibold">
              Different memes. Different traits. Different bags. Same confused owl.
              <span className="mt-2 block text-sm font-normal text-ink/80">
                Every card is collectible art <em>and</em> owns a separate, real basket of NEAR meme tokens. Locked 30 days after funding, then the current owner can redeem the
                exact tokens.
              </span>
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/hatch" className="btn btn-primary text-lg">
                HATCH THE MADNESS
              </Link>
              <Link href="/collection" className="btn btn-secondary text-lg">
                EXPLORE THE COLLECTION
              </Link>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <SlotDiagram />
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SeasonBanner />
        <LiveExecutability />
      </div>

      {/* CLEAR: how it works */}
      <section className="mt-14" aria-labelledby="how">
        <h2 id="how" className="font-display text-3xl sm:text-4xl">
          How a card owns a bag
        </h2>
        <p className="mt-2 max-w-2xl text-ink/80">
          Your artwork decides your portfolio. Nothing is rolled twice: the parts you get <em>are</em> the token split.
        </p>
        <ol className="mt-6 grid gap-5 md:grid-cols-3">
          <li className="panel p-5">
            <p className="num text-sm font-bold text-orange">STEP 1 · PAY</p>
            <p className="mt-1 font-display text-xl">90 / 5 / 5, exactly</p>
            <p className="mt-2 text-[0.95rem]">
              90% of the base price buys your basket. 5% goes to the WTH creator, 5% to the WTH buyback treasury. Storage and network costs are shown separately and never come out of the
              90%.
            </p>
          </li>
          <li className="panel p-5">
            <p className="num text-sm font-bold text-orange">STEP 2 · REVEAL</p>
            <p className="mt-1 font-display text-xl">Parts decide tokens</p>
            <p className="mt-2 text-[0.95rem]">
              In a later block the contract uses NEAR&apos;s on-chain randomness to pick parts. WTH always gets a 20% core; the other 80% follows the parts. Rarity is art-only.
            </p>
          </li>
          <li className="panel p-5">
            <p className="num text-sm font-bold text-orange">STEP 3 · FUND, THEN MINT</p>
            <p className="mt-1 font-display text-xl">No bag, no NFT</p>
            <p className="mt-2 text-[0.95rem]">
              The contract swaps on Rhea, checks its own token balances, and only then mints your card. If a route fails before any swap, you are refunded.
            </p>
          </li>
        </ol>

        <div className="panel mt-6 overflow-x-auto p-5">
          <p className="font-display text-xl">Worked example — the formula, not a real card</p>
          <p className="mt-1 text-sm text-muted">Head=WTH · Face=BONK · Body=BATMAN · Arms=BONK · Legs=WTH · Cape=BATMAN, on a 0.1 NEAR mint (0.09 NEAR basket)</p>
          <table className="ledger mt-3 min-w-[30rem]">
            <thead>
              <tr>
                <th>Token</th>
                <th className="amt">Core</th>
                <th className="amt">From parts (×0.8)</th>
                <th className="amt">Final</th>
                <th className="amt">Basket input</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>WTH</td><td className="amt">20%</td><td className="amt">(20+10)×0.8 = 24%</td><td className="amt">44%</td><td className="amt">0.0396 NEAR</td></tr>
              <tr><td>BONK</td><td className="amt">—</td><td className="amt">(10+10)×0.8 = 16%</td><td className="amt">16%</td><td className="amt">0.0144 NEAR</td></tr>
              <tr><td>BATMAN</td><td className="amt">—</td><td className="amt">(25+25)×0.8 = 40%</td><td className="amt">40%</td><td className="amt">0.0360 NEAR</td></tr>
              <tr className="total"><td>Total</td><td className="amt" /><td className="amt" /><td className="amt">100.00%</td><td className="amt">0.0900 NEAR</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            BONK and BATMAN are the brief&apos;s illustrative names only; they are not in the Season 01 pool and no BATMAN artwork is used. Basket input is before Rhea pool fees; the tokens
            actually received are recorded per card.
          </p>
        </div>
      </section>

      <RecentMints />

      <section className="mt-14 rounded-2xl border-[3px] border-ink bg-ink p-6 text-cream sm:p-8" aria-labelledby="disclosure">
        <h2 id="disclosure" className="font-display text-2xl text-yellow">
          Before you hatch anything
        </h2>
        <p className="mt-2 max-w-3xl">
          This NFT owns real, volatile meme assets. They are locked for 30 days after successful funding. NFT ownership and redemption rights transfer to a buyer. Prices can fall to zero.
        </p>
        <p className="mt-3 text-sm text-cream/70">
          Not yield. No promised returns. Buybacks are not guaranteed to move any price. Read the{" "}
          <Link href="/risk" className="underline">
            full risk disclosure
          </Link>
          .
        </p>
      </section>
    </>
  );
}

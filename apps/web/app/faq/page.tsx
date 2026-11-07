import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "@/components/Prose";
import { H1 } from "@/components/ui";

export const metadata: Metadata = { title: "FAQ" };

const QA: [string, React.ReactNode][] = [
  ["What exactly do I get?", <>Two things that are always shown separately: a collectible NFT (artwork, traits, rarity, season) and an on-chain claim on a specific basket of real NEAR meme tokens held by the vault for that NFT.</>],
  ["Where does my money go?", <>Of the base price: 90% buys your basket, 5% to the WTH creator, 5% to the WTH buyback treasury (both paid only after your card is funded). On top of the base you pay a storage fee for your NFT data (~0.009 NEAR) and a refundable retry reserve; your wallet pays its own network gas.</>],
  ["How is the basket decided?", <>Your card has six parts. WTH always gets a 20% core; the other 80% follows the parts: head 20%, face 10%, body 25%, arms 10%, legs 10%, cape/accessory 25%. If a partner meme supplies a part, that slice buys that meme. The exact percentages always add up to 100.00%.</>],
  ["Why only WTH + one partner at 0.1 NEAR?", <>Small orders split across many tokens become dust that costs more to redeem than it is worth. At 0.1 NEAR a card holds WTH and at most one partner. ≥1 NEAR allows two partners, ≥5 NEAR three. Each leg must also clear a minimum size.</>],
  ["How do swaps happen?", <>The contract itself wraps NEAR and swaps on Rhea pools that are fixed in the season manifest. Right before each swap it reads an on-chain quote and sets a 2% minimum output, then checks its own token balance to record exactly what arrived. NEAR Intents 1Click does not list WTH, so it is not used for NEAR baskets.</>],
  ["When can I get the tokens out?", <>30 days after your card was funded. Then whoever owns the NFT can redeem the exact token amounts to any NEAR account registered on those tokens. The card stays yours as an EMPTY collectible.</>],
  ["Can I sell before the lock ends?", <>Yes. Transfers and sales are allowed while locked. The full basket claim moves to the new owner.</>],
  ["What is reload?", <>An EMPTY card can be refilled with its original composition in an eligible season, at current prices, with a new payment and a new 30-day lock. It never changes the art or rarity.</>],
  ["Can the team take my tokens?", <>No contract function lets the operator withdraw baskets, seize NFTs or edit a minted card. Operators can pause new mints and routes. The contracts are not yet audited.</>],
  ["Is the randomness fair?", <>Traits are derived from NEAR&apos;s random seed in a later block, using a published algorithm (WTN-TRAITS-v1). Anyone can recompute any card&apos;s traits from the seed shown on its page.</>],
  ["What about Solana memes?", <>Coming later, and only after real Chain Signatures custody, purchase and redemption pass end-to-end tests. No Solana basket is offered until then.</>],
];

export default function FaqPage() {
  return (
    <>
      <H1 kicker="wait, what?">FAQ</H1>
      <Prose>
        {QA.map(([q, a]) => (
          <section key={q}>
            <h2>{q}</h2>
            <p>{a}</p>
          </section>
        ))}
        <p className="mt-8 text-sm text-muted">
          Still confused? Same. Read the <Link href="/risk">risk disclosure</Link>.
        </p>
      </Prose>
    </>
  );
}

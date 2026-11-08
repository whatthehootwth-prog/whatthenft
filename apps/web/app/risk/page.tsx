import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { H1 } from "@/components/ui";

export const metadata: Metadata = { title: "Risk disclosure" };

export default function RiskPage() {
  return (
    <>
      <H1 kicker="the boring, important part">Risk disclosure</H1>
      <Prose>
        <p className="rounded-lg border-[3px] border-ink bg-sun p-4 font-semibold text-ink">
          This NFT owns real, volatile meme assets. They are locked for 30 days after successful funding. NFT ownership and redemption rights transfer to a buyer. Prices can fall to zero.
        </p>
        <h2>Market risk</h2>
        <ul>
          <li>Meme tokens are extremely volatile and illiquid. Every token in a basket can lose all of its value, including WTH.</li>
          <li>Your basket is bought at market prices at execution time. You receive whatever the pool returns within the 2% slippage limit. Pool fees (0.1%–1%) apply.</li>
          <li>The estimated NAV shown on a card is a live sell quote, not a guarantee. Selling all tokens at once may return less, especially for thin pools.</li>
          <li>Nothing here is yield, interest, a fund, a savings product or a promise of returns. WTH buybacks are not guaranteed to happen at any size or to affect any price.</li>
        </ul>
        <h2>Lock and liquidity risk</h2>
        <ul>
          <li>Basket tokens cannot be withdrawn for 30 days after funding, even if prices crash during that time. You can still sell or transfer the NFT itself.</li>
          <li>A buyer of your NFT receives the entire basket claim. Once transferred, you have no claim at all.</li>
        </ul>
        <h2>Execution risk</h2>
        <ul>
          <li>If a swap route fails before any swap executes, you are refunded the base price, storage fee and unused reserve. Keeper fees already paid are not refundable.</li>
          <li>If one swap succeeds and another fails, the order enters recovery. You may retry, or unwind the bought tokens back to NEAR at the then-current price. Unwinding can realise a loss.</li>
          <li>A token contract or DEX could fail, be paused, or behave maliciously. Tokens are only added after contract verification and route checks, but this cannot eliminate the risk.</li>
        </ul>
        <h2>Smart-contract and custody risk</h2>
        <ul>
          <li>Baskets are held by the WHAT THE NFT?! vault contract and attributed to each card on-chain. Bugs in this contract, NEAR, Rhea or a token contract could cause loss.</li>
          <li>The contracts are <strong>not yet independently audited</strong>. Do not deposit more than you can afford to lose.</li>
          <li>Administrators cannot withdraw baskets, seize cards or change minted compositions, but they can pause new mints and swap routes, and configure future seasons.</li>
        </ul>
        <h2>Collectible risk</h2>
        <ul>
          <li>Rarity is purely visual. A rare card holds no larger or better basket.</li>
          <li>Marketplace prices are set by buyers and sellers and may be far above or below the basket value.</li>
          <li>Royalties apply only to sales through the native marketplace or compatible ones. Direct transfers pay none.</li>
        </ul>
        <h2>Randomness</h2>
        <p>
          Traits come from NEAR&apos;s per-block random seed in a block after your payment. Neither you, the operator nor the keeper can choose the outcome after seeing it. In theory a block
          producer could withhold a block to bias it; the incentive is tiny compared to the block reward, but perfect fairness is not claimed.
        </p>
        <h2>Legal and tax</h2>
        <p>
          A transferable NFT that holds a claim on crypto assets may be regulated differently in your country, and may carry tax consequences on mint, swap, sale or redemption. Calling
          it an NFT does not make it exempt from anything. You are responsible for your own compliance.
        </p>
      </Prose>
    </>
  );
}

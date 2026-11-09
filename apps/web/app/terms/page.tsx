import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { Alert, H1 } from "@/components/ui";

export const metadata: Metadata = { title: "Terms (draft)" };

export default function TermsPage() {
  return (
    <>
      <H1 kicker="draft">Terms of use</H1>
      <div className="mb-6 max-w-3xl">
        <Alert tone="warn" title="Draft — not reviewed by a lawyer">
          These terms are a placeholder structure, not legal advice and not final. They must be reviewed by qualified counsel in each operating jurisdiction (including Malaysia) before any
          public launch. Public minting stays disabled until that review is complete.
        </Alert>
      </div>
      <Prose>
        <h2>1. What the service is</h2>
        <p>Software that lets you interact with public NEAR smart contracts to mint collectible NFTs whose contract-held token baskets are attributed to each NFT.</p>
        <h2>2. No advice, no promises</h2>
        <p>Nothing on this site is financial, investment, legal or tax advice. No returns, yield, liquidity, buyback, distribution or price effect is promised.</p>
        <h2>3. Your responsibilities</h2>
        <ul>
          <li>You are legally allowed to use this service where you live, and you are not a sanctioned person.</li>
          <li>You control your wallet and keys. Transactions you sign cannot be reversed by us.</li>
          <li>You understand the risks in the risk disclosure.</li>
        </ul>
        <h2>4. Fees</h2>
        <p>As shown before every signature: 10% creator and 5% buyback treasury of the base mint price, 3% royalty on native marketplace sales, storage and network costs.</p>
        <h2>5. Artwork</h2>
        <p>Partner meme artwork is used only with confirmed permission. Owning an NFT grants personal display rights to its artwork, not commercial or trademark rights. [To be finalised by counsel.]</p>
        <h2>6. Availability</h2>
        <p>The website may be unavailable. The contracts remain on-chain and redemption does not depend on this website.</p>
        <h2>7. Changes, law, disputes</h2>
        <p>[To be drafted by counsel.]</p>
      </Prose>
    </>
  );
}

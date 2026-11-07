import type { Metadata } from "next";
import Link from "next/link";
import { Alert, H1, Panel } from "@/components/ui";
import { MARKET_CONTRACT } from "@/lib/config";

export const metadata: Metadata = { title: "Market" };

export default function MarketPage() {
  return (
    <>
      <H1 kicker="buy · sell · hoot">Market</H1>
      {!MARKET_CONTRACT ? (
        <div className="space-y-6">
          <Alert tone="warn" title="The native marketplace is not live yet">
            The on-chain marketplace contract ships in Milestone B. There are no listings to show, and none are faked. Cards can still be transferred directly from their page.
          </Alert>
          <Panel>
            <h2 className="font-display text-2xl">How sales will settle</h2>
            <table className="ledger mt-3">
              <thead>
                <tr>
                  <th>Example: 10 NEAR sale</th>
                  <th className="amt">NEAR</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Seller receives (97.5%)</td><td className="amt">9.750</td></tr>
                <tr><td>Royalty to WTH creator (10% of 2.5%)</td><td className="amt">0.025</td></tr>
                <tr><td>Royalty to WTH buyback treasury (90% of 2.5%)</td><td className="amt">0.225</td></tr>
                <tr className="total"><td>Buyer pays</td><td className="amt">10.000</td></tr>
              </tbody>
            </table>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-[0.95rem]">
              <li>No other marketplace commission. Chain/storage fees are shown separately.</li>
              <li>The royalty split is already enforced by the card contract&apos;s NEP-199 payout (tested). Compatible external marketplaces can honour it; direct transfers pay nothing.</li>
              <li>Redeeming or reloading a card revokes all approvals, so a stale listing can never sell an emptied card.</li>
              <li>Listings will always show the sale price next to the separately estimated basket value and the LOCKED / UNLOCKED / EMPTY state.</li>
            </ul>
            <p className="mt-4">
              <Link className="btn btn-secondary" href="/collection">
                Browse the collection
              </Link>
            </p>
          </Panel>
        </div>
      ) : (
        <Alert tone="info" title="Marketplace contract configured">
          Listing browser is wired in Milestone B against {MARKET_CONTRACT}.
        </Alert>
      )}
    </>
  );
}

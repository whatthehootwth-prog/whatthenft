"use client";

import { useEffect, useState } from "react";
import { AccountLink, Alert, Field, H1, NotDeployed, Panel } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { near } from "@/lib/format";
import { getCoreConfig, getNearBalance, getSeasons, type CoreConfigJ, type SeasonJ } from "@/lib/near";

export default function TreasuryPage() {
  const [cfg, setCfg] = useState<CoreConfigJ | null>(null);
  const [seasons, setSeasons] = useState<SeasonJ[]>([]);
  const [bal, setBal] = useState<{ creator: bigint | null; treasury: bigint | null }>({ creator: null, treasury: null });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!CORE_CONTRACT) return;
    Promise.all([getCoreConfig(), getSeasons()])
      .then(async ([c, s]) => {
        setCfg(c);
        setSeasons(s);
        const [cb, tb] = await Promise.all([getNearBalance(c.creator_account).catch(() => null), getNearBalance(c.treasury_account).catch(() => null)]);
        setBal({ creator: cb, treasury: tb });
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <H1 kicker="where the money goes">Treasury & revenue</H1>
      <div className="space-y-6">
        <Panel>
          <h2 className="font-display text-2xl">The rules</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.95rem]">
            <li>Each mint: 10% of the base price to the WTH creator account, 5% to the WTH buyback treasury — paid only after the card is fully funded. The 85% basket belongs to the card, never to the project.</li>
            <li>Each native marketplace sale: 3% royalty, split 50% creator / 50% treasury.</li>
            <li>Treasury funds are kept separate from creator revenue and from customer baskets. The vault contract has no function that can move basket tokens to either account.</li>
            <li>Automatic buyback: once the treasury holds at least $20 of NEAR (price from Rhea on-chain and CoinGecko, which must agree), the buyback contract swaps it for $WTH on Rhea — fixed pool, max slippage, per-buy cap, minimum interval, pause switch. The keeper that triggers it can never move NEAR.</li>
            <li>Distribution: the bought $WTH is shared with $WTH holders in proportion to their balance (holders of at least 1,000 WTH; liquidity pools, custody and launchpad contracts excluded; payouts under 1 WTH roll over). Each round's holder snapshot is published and its sha256 is recorded on-chain.</li>
            <li>No buyback or distribution is promised at any size or time, and none is promised to move any price.</li>
          </ul>
        </Panel>
        {!CORE_CONTRACT ? (
          <NotDeployed what="The core and treasury contracts" />
        ) : err ? (
          <Alert tone="error" title="Could not read treasury data">{err}</Alert>
        ) : !cfg ? (
          <p className="dots">Reading accounts</p>
        ) : (
          <Panel>
            <h2 className="font-display text-2xl">Accounts (live)</h2>
            <dl className="mt-3">
              <Field label="Creator account" hint={bal.creator !== null ? `current balance ${near(bal.creator, 4)} NEAR` : "balance UNAVAILABLE"}>
                <AccountLink id={cfg.creator_account} full />
              </Field>
              <Field label="Buyback treasury" hint={bal.treasury !== null ? `current balance ${near(bal.treasury, 4)} NEAR` : "balance UNAVAILABLE"}>
                <AccountLink id={cfg.treasury_account} full />
              </Field>
              <Field label="Seasons">{seasons.length}</Field>
            </dl>
            <p className="mt-3 text-sm text-muted">
              Account balances are shown as-is; they can include funds unrelated to mints. Per-season revenue totals are computed from on-chain <code>mint_settled</code> events by the
              indexer, which ships with the treasury contract in Milestone B. Until then no revenue history is displayed.
            </p>
          </Panel>
        )}
        <Panel>
          <h2 className="font-display text-2xl">WTH buybacks</h2>
          <p className="mt-2">No buyback has been executed yet. The buyback contract is built and tested but not deployed; until it is, treasury revenue accrues as plain NEAR and every buyback status is <strong>pending buyback</strong>.</p>
        </Panel>
      </div>
    </>
  );
}

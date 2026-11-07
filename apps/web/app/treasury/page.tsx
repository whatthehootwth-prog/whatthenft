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
      <H1 kicker="where the 5% goes">Treasury & revenue</H1>
      <div className="space-y-6">
        <Panel>
          <h2 className="font-display text-2xl">The rules</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[0.95rem]">
            <li>Each mint: 5% of the base price to the WTH creator account, 5% to the WTH buyback treasury — paid only after the card is fully funded. The 90% basket belongs to the card, never to the project.</li>
            <li>Each native marketplace sale: 2.5% royalty, split 10% creator / 90% treasury.</li>
            <li>Treasury funds are kept separate from creator revenue and from customer baskets. The vault contract has no function that can move basket tokens to either account.</li>
            <li>Buybacks: whitelisted route, max slippage, size limits, pause switch, keeper without withdrawal rights. Bought WTH is held, not burned, unless separately authorised.</li>
            <li>No buyback is promised to move any price.</li>
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
          <p className="mt-2">No buyback has been executed. The buyback treasury contract is part of Milestone B; until it is deployed, revenue accrues as plain NEAR and any buyback status is <strong>pending buyback</strong>.</p>
        </Panel>
      </div>
    </>
  );
}

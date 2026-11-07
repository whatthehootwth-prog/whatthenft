"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderTracker } from "@/components/OrderTracker";
import { TokenGrid } from "@/components/TokenGrid";
import { Alert, EmptyState, H1, NotDeployed } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { getCoreConfig, getOrders, getSeasons, getTokensForOwner, type OrderJ, type SeasonJ, type TokenViewJ } from "@/lib/near";
import { useWallet } from "@/lib/wallet";

const OPEN = new Set(["Escrowed", "TraitsAssigned", "SwapsPending", "FailedPreExecution", "RefundPending", "PartialExecutionRecovery"]);

export default function MyNftsPage() {
  const { accountId, connect } = useWallet();
  const [tokens, setTokens] = useState<TokenViewJ[] | null>(null);
  const [orders, setOrders] = useState<OrderJ[] | null>(null);
  const [seasons, setSeasons] = useState<SeasonJ[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!CORE_CONTRACT || !accountId) return;
    setTokens(null);
    setOrders(null);
    (async () => {
      const [t, cfg, ss] = await Promise.all([getTokensForOwner(accountId), getCoreConfig(), getSeasons()]);
      setTokens(t);
      setSeasons(ss);
      // Scan the most recent 300 orders for this payer (no per-payer index on-chain yet).
      const next = Number(cfg.next_order_id);
      const mine: OrderJ[] = [];
      for (let from = Math.max(1, next - 300); from < next; from += 50) {
        const page = await getOrders(String(from), 50);
        mine.push(...page.filter((o) => o.payer === accountId && OPEN.has(o.status)));
      }
      setOrders(mine.reverse());
    })().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [accountId]);

  return (
    <>
      <H1 kicker="your flock">My NFTs</H1>
      {!CORE_CONTRACT ? (
        <NotDeployed />
      ) : !accountId ? (
        <EmptyState aside="who goes there?" title="Connect your wallet" action={<button type="button" className="btn btn-yellow" onClick={connect}>Connect wallet</button>}>
          We read your cards and open orders straight from the contract.
        </EmptyState>
      ) : err ? (
        <Alert tone="error" title="Could not read your cards">{err}</Alert>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="open-h">
            <h2 id="open-h" className="font-display text-2xl">
              Open orders
            </h2>
            {orders === null ? (
              <p className="mt-2 dots">Checking orders</p>
            ) : orders.length === 0 ? (
              <p className="mt-2 text-ink/80">No orders in progress or needing action.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {orders.map((o) => (
                  <OrderTracker key={o.id} orderId={o.id} season={seasons.find((s) => s.id === o.season_id) ?? null} />
                ))}
              </div>
            )}
          </section>
          <section aria-labelledby="cards-h">
            <h2 id="cards-h" className="font-display text-2xl">
              Cards you own
            </h2>
            <div className="mt-4">
              {tokens === null ? (
                <p className="dots">Reading your cards</p>
              ) : tokens.length === 0 ? (
                <EmptyState aside="zero owls" title="You don't own any cards" action={<Link href="/hatch" className="btn btn-primary">Hatch one</Link>}>
                  Cards you buy or receive appear here as soon as the transfer is final.
                </EmptyState>
              ) : (
                <TokenGrid tokens={tokens} />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CollectibleCard } from "@/components/CollectibleCard";
import { OrderTracker } from "@/components/OrderTracker";
import { Alert } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { tokenCard } from "@/lib/cards";
import { nsToDate } from "@/lib/format";
import { getCoreConfig, getOrders, getSeasons, getTokensForOwner, type OrderJ, type SeasonJ, type TokenViewJ } from "@/lib/near";
import { useWallet } from "@/lib/wallet";

const OPEN = new Set(["Escrowed", "TraitsAssigned", "SwapsPending", "FailedPreExecution", "RefundPending", "PartialExecutionRecovery"]);

function cardNote(t: TokenViewJ): { text: string; tone: string; action?: string } {
  switch (t.effective_state) {
    case "FullyBackedLocked":
      return { text: `Locked until ${nsToDate(t.info.lock_until_ns).toISOString().slice(0, 10)}`, tone: "bg-yellow" };
    case "Unlocked":
      return { text: "Unlocked — ready to redeem", tone: "bg-cyan", action: "REDEEM" };
    case "RedeemedEmpty":
      return { text: "Tokens withdrawn — collectible only", tone: "bg-cream" };
    case "Redeeming":
      return { text: "Redeeming…", tone: "bg-paper" };
    case "Reloading":
      return { text: "Reloading…", tone: "bg-paper" };
  }
}

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-hand text-2xl text-hot">your weird little family</p>
          <h1 className="mad-title text-[clamp(2.8rem,9vw,5.6rem)]">MY FREAK BINDER</h1>
        </div>
        <Link href="/mint" className="btn-mad">
          MINT ANOTHER
        </Link>
      </div>

      <div className="relative mt-8 rounded-[28px] border-4 border-ink bg-[#f4e6c6] py-8 pl-12 pr-4 text-ink shadow-[0_10px_0_#16110f] sm:pl-20 sm:pr-8">
        {/* binder rings */}
        <div className="absolute bottom-6 left-3 top-6 flex flex-col justify-around sm:left-6" aria-hidden="true">
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="block size-6 rounded-full border-4 border-ink bg-violet shadow-[inset_2px_2px_0_rgba(255,255,255,0.2)] sm:size-8" />
          ))}
        </div>

        {!CORE_CONTRACT ? (
          <BinderEmpty title="THE BINDER IS EMPTY" aside="no contracts, no freaks">
            The collection isn&apos;t deployed on this network yet. Once it is, every mutant you own appears here.
          </BinderEmpty>
        ) : !accountId ? (
          <BinderEmpty title="WHOSE BINDER IS THIS?" aside="connect to open it" action={<button type="button" className="btn-mad" onClick={connect}>CONNECT WALLET</button>}>
            We read your cards and open orders straight from the contract.
          </BinderEmpty>
        ) : err ? (
          <Alert tone="error" title="Couldn't open your binder">{err}</Alert>
        ) : (
          <div className="space-y-10">
            {orders && orders.length > 0 && (
              <section aria-labelledby="open-h">
                <h2 id="open-h" className="font-display text-3xl">
                  STILL HATCHING
                </h2>
                <div className="mt-4 space-y-4">
                  {orders.map((o) => (
                    <OrderTracker key={o.id} orderId={o.id} season={seasons.find((s) => s.id === o.season_id) ?? null} />
                  ))}
                </div>
              </section>
            )}
            <section aria-labelledby="cards-h">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="cards-h" className="font-display text-3xl">
                  THE COLLECTION
                </h2>
                {tokens && <span className="num text-sm font-bold">{tokens.length} card{tokens.length === 1 ? "" : "s"}</span>}
              </div>
              {tokens === null ? (
                <p className="dots mt-4 font-display text-xl">Flipping pages</p>
              ) : tokens.length === 0 ? (
                <BinderEmpty title="ZERO FREAKS" aside="tragic" action={<Link href="/mint" className="btn-mad">MINT YOUR FIRST</Link>}>
                  Cards you mint, buy or receive show up here as soon as the transfer is final.
                </BinderEmpty>
              ) : (
                <ul className="mt-5 grid grid-cols-1 gap-6 min-[460px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {tokens.map((t) => {
                    const note = cardNote(t);
                    return (
                      <li key={t.token_id} className="rounded-[24px] border-2 border-dashed border-ink/40 bg-white/40 p-2">
                        <CollectibleCard {...tokenCard(t, seasons.find((s) => s.id === t.info.season_id))} state={undefined} href={`/nft/${t.token_id}`} />
                        <div className={`mt-2 flex items-center justify-between gap-2 rounded-xl border-[3px] border-ink px-3 py-2 ${note.tone}`}>
                          <span className="text-sm font-bold">{note.text}</span>
                          {note.action && (
                            <Link href={`/nft/${t.token_id}`} className="btn btn-sm btn-ink">
                              {note.action}
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}

function BinderEmpty({ title, aside, children, action }: { title: string; aside: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="py-10 text-center">
      <p className="font-hand text-2xl text-orange">{aside}</p>
      <p className="font-display text-4xl leading-none">{title}</p>
      <p className="mx-auto mt-3 max-w-md">{children}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

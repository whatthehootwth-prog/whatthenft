"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArtMutant } from "@/components/ArtMutant";
import { Actions } from "@/components/nft/Actions";
import { AccountLink, Alert, Field, StateChip } from "@/components/ui";
import { CORE_CONTRACT } from "@/lib/config";
import { tokenSpec } from "@/lib/cards";
import { assetByContract, bpsPct, duration, near, nsToDate, tokenAmount, utc } from "@/lib/format";
import { SLOT_LABEL, SLOT_ORDER, layerFor, memeColor, memeLabel } from "@/lib/art";
import { getSeasons, getToken, RARITY, type SeasonJ, type TokenViewJ } from "@/lib/near";

interface NavRow {
  contract: string;
  amount: string;
  wnearOut: string | null;
  method: string;
  reason?: string;
  quotedAt: number;
}

export function NftDetail({ id }: { id: string }) {
  const [tok, setTok] = useState<TokenViewJ | null | undefined>(undefined);
  const [season, setSeason] = useState<SeasonJ | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [nav, setNav] = useState<{ rows: NavRow[]; at: string } | null>(null);
  const [navErr, setNavErr] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);

  const load = useCallback(() => {
    if (!CORE_CONTRACT) return;
    Promise.all([getToken(id), getSeasons()])
      .then(([t, ss]) => {
        setTok(t);
        setSeason(t ? ss.find((s) => s.id === t.info.season_id) ?? null : null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!tok) return;
    const h = tok.info.holdings.map((x) => `${x.token}:${x.amount}`).join(",");
    fetch(`/api/nav?h=${encodeURIComponent(h)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setNav({ rows: j.holdings, at: j.generatedAt }))
      .catch((e) => setNavErr(String(e)));
  }, [tok]);

  const back = (
    <Link href="/marketplace" className="font-display text-lg text-ink hover:text-orange">
      ← BACK TO THE FREAK MARKET
    </Link>
  );

  if (!CORE_CONTRACT || tok === null || err) {
    return (
      <>
        {back}
        <div className="sticker mx-auto mt-10 max-w-xl p-8 text-center">
          <p className="eyebrow mb-1">{err ? "the chain said no" : "hoot?"}</p>
          <h1 className="font-display text-4xl">{err ? "COULDN'T LOAD THIS FREAK" : `FREAK #${id} DOESN'T EXIST`}</h1>
          <p className="mt-3">
            {err
              ? err
              : !CORE_CONTRACT
                ? "The collection contract isn't deployed on this network yet, so no cards exist."
                : "No funded NFT has this number. Orders still buying their memes aren't NFTs yet."}
          </p>
          <Link href="/marketplace" className="btn-mad mt-6">
            BROWSE FREAKS
          </Link>
        </div>
      </>
    );
  }
  if (tok === undefined) return <p className="dots font-display text-2xl text-ink">Summoning freak #{id}</p>;

  const i = tok.info;
  const rarity = RARITY[i.traits.rarity] ?? "COMMON";
  const { spec, missing } = tokenSpec(tok, season);
  const memes = season?.config.memes ?? [];
  const lockUntil = nsToDate(i.lock_until_ns);
  const lockedMs = lockUntil.getTime() - Date.now();
  const empty = tok.effective_state === "RedeemedEmpty";
  const navTotal = nav && nav.rows.every((r) => r.wnearOut !== null) ? nav.rows.reduce((a, r) => a + BigInt(r.wnearOut!), 0n) : null;

  return (
    <>
      {back}
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        {/* Card */}
        <div className="lg:sticky lg:top-28">
          <div className="mx-auto w-full max-w-[520px]">
            <div key={flipped ? "back" : "front"} className={`card-frame rar-${rarity} flip-in`}>
              {!flipped ? (
                <div className="card-art aspect-square">
                  <ArtMutant spec={spec} priority className="relative h-full w-full" label={`Freak #${tok.token_id}, ${rarity}`} />
                  <span className="absolute left-3 top-3 rounded-lg border-2 border-ink bg-paper px-2.5 py-0.5 font-display text-lg">{rarity}</span>
                  {empty && <span className="absolute inset-x-0 bottom-5 mx-auto w-fit -rotate-6 rounded-lg border-4 border-ink bg-cream px-4 py-1 font-display text-2xl">EMPTY · REDEEMED</span>}
                </div>
              ) : (
                <div className="card-art aspect-square bg-sun p-5 text-ink">
                  <p className="font-display text-2xl text-yellow">THE BACK OF THE CARD</p>
                  <ul className="mt-3 space-y-1.5">
                    {SLOT_ORDER.map((s, k) => {
                      const memeId = memes[i.traits.slots[k]?.meme_idx ?? 0]?.meme_id ?? "wth";
                      return (
                        <li key={s} className="flex justify-between gap-3 border-b border-cream/15 pb-1">
                          <span className="pixel text-xs font-bold">{SLOT_LABEL[s]}</span>
                          <span className="rounded border-2 border-ink px-1 font-display" style={{ background: memeColor(memeId) }}>
                            {memeLabel(memeId)} #{(i.traits.slots[k]?.variant ?? 0) + 1}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="num mt-4 text-xs text-ink/70">season {i.season_id} · serial {i.serial} · reloads {i.reload_count}</p>
                </div>
              )}
              <div className="flex items-center justify-between px-4 pb-4 pt-1">
                <p className="font-display text-2xl">#{tok.token_id}</p>
                <button type="button" onClick={() => setFlipped((f) => !f)} className="btn btn-sm btn-secondary">
                  {flipped ? "FRONT" : "FLIP CARD"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-ink/70">
              {i.media_cid ? "Final render pinned." : "Rendered from stand-in parts until the season art is pinned."}
              {missing.length > 0 && ` (${missing.length} trait${missing.length > 1 ? "s" : ""} shown as WTH fallback)`}
            </p>
          </div>
        </div>

        {/* Identity + actions */}
        <div className="min-w-0">
          <p className="eyebrow">SEASON {String(i.season_id).padStart(2, "0")} · {season?.config.name.toUpperCase() ?? ""}</p>
          <h1 className="mad-title mt-1 text-[clamp(3rem,9vw,5.5rem)]">FREAK #{tok.token_id}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StateChip state={tok.effective_state} />
            <span className="chip chip-ink">{rarity}</span>
            {!empty && tok.effective_state === "FullyBackedLocked" && <span className="chip chip-pending">unlocks in {duration(lockedMs)}</span>}
          </div>

          <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SLOT_ORDER.map((s) => {
              const part = layerFor(s, spec[s]);
              const memeId = memes[i.traits.slots[SLOT_ORDER.indexOf(s)]?.meme_idx ?? 0]?.meme_id ?? "wth";
              return (
                <li key={s} className="rounded-xl border-[3px] border-ink bg-cream px-3 py-2 text-ink">
                  <p className="text-[0.68rem] font-bold tracking-widest text-ink/60">{SLOT_LABEL[s]}</p>
                  <p className="font-display text-lg leading-tight">{memeLabel(memeId)}</p>
                  <p className="truncate text-xs text-ink/70">{part?.name ?? "bare owl"}</p>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border-4 border-ink bg-white px-4 py-3 shadow-[5px_5px_0_#16110f]">
            <div>
              <p className="text-xs font-bold tracking-widest text-ink/70">SALE PRICE</p>
              <p className="font-display text-2xl text-ink">Not listed</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold tracking-widest text-ink/70">TOKENS INSIDE (EST.)</p>
              <p className="num text-xl font-bold text-ink">{empty ? "0 — empty" : navTotal !== null ? `${near(navTotal, 4)} NEAR` : nav || navErr ? "UNAVAILABLE" : "…"}</p>
            </div>
          </div>

          <div className="mt-6">
            <Actions tok={tok} season={season} reload={load} />
          </div>
        </div>
      </div>

      {/* Vault */}
      <details open className="drawer mt-12 rounded-[24px] border-4 border-ink bg-paper text-ink shadow-[0_8px_0_#16110f]">
        <summary className="flex min-h-16 items-center justify-between px-5 sm:px-7">
          <span className="font-display text-2xl sm:text-3xl">WHAT&apos;S INSIDE THE VAULT</span>
          <span className="drawer-chev text-2xl transition-transform">▾</span>
        </summary>
        <div className="grid gap-8 border-t-[3px] border-ink px-5 pb-7 pt-5 sm:px-7 lg:grid-cols-[1.3fr_1fr]">
          <div className="min-w-0">
            <h2 className="font-display text-xl">Underlying meme tokens</h2>
            {empty ? (
              <p className="mt-2 rounded-lg border-2 border-dashed border-ink p-3 font-semibold">
                This card is EMPTY: its tokens were redeemed and it holds 0 redeemable assets. It&apos;s still a collectible{season?.config.reload_enabled ? ", and can be reloaded with its original mix in an eligible season" : ""}.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="ledger min-w-[32rem]">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th className="amt">Share</th>
                      <th className="amt">Balance held</th>
                      <th className="amt">Sell value (wNEAR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {i.holdings.map((h) => {
                      const a = assetByContract(h.token);
                      const row = nav?.rows.find((r) => r.contract === h.token);
                      return (
                        <tr key={h.token}>
                          <td>
                            <span className="font-semibold">{a?.symbol ?? h.meme_id}</span>
                            <span className="num block break-anywhere text-xs text-muted">{h.token}</span>
                            {BigInt(h.pending_out) > 0n && <span className="chip chip-pending mt-1">{tokenAmount(h.pending_out, a?.decimals)} in flight</span>}
                          </td>
                          <td className="amt">{bpsPct(h.bps)}</td>
                          <td className="amt">{tokenAmount(h.amount, a?.decimals)}</td>
                          <td className="amt">{!nav ? (navErr ? "UNAVAILABLE" : "…") : row?.wnearOut ? near(row.wnearOut, 6) : <span title={row?.reason}>UNAVAILABLE</span>}</td>
                        </tr>
                      );
                    })}
                    <tr className="total">
                      <td colSpan={3}>Estimated value (live sell quotes)</td>
                      <td className="amt">{navTotal !== null ? near(navTotal, 6) : "UNAVAILABLE"}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted">
                  What Rhea pools would pay right now for each full balance{nav ? ` (${utc(new Date(nav.at))})` : ""}. Not a guarantee — prices and liquidity move, and any missing quote makes the total UNAVAILABLE. This is separate from any sale price, which can include a speculative art premium.
                </p>
              </div>
            )}
          </div>
          <dl className="min-w-0">
            <Field label="Owner">{tok.owner_id ? <AccountLink id={tok.owner_id} full /> : "—"}</Field>
            <Field label="Funded">{utc(nsToDate(i.funded_at_ns))}</Field>
            <Field label="Unlocks" hint={lockedMs > 0 ? `in ${duration(lockedMs)}` : "unlocked"}>
              {utc(lockUntil)}
            </Field>
            <Field label="Redemption">{empty ? "Redeemed" : tok.effective_state === "Unlocked" ? "Available to the owner" : tok.effective_state === "FullyBackedLocked" ? "Locked" : "In progress"}</Field>
            <Field label="Vault check" hint="Live balance vs. all claims, per token">
              <Link href="/status" className="underline">
                Conservation status ↗
              </Link>
            </Field>
            <Field label="Origin order">#{i.origin_order_id}</Field>
            <Field label="Randomness" hint={`${i.reveal.version}; anyone can recompute the traits`}>
              <span className="num text-xs break-anywhere">block {i.reveal.block_height} · seed {i.reveal.random_seed_hex}</span>
            </Field>
            <Field label="Season manifest">
              <span className="num text-xs break-anywhere">{i.season_manifest_hash}</span>
            </Field>
          </dl>
        </div>
      </details>
      {!empty && tok.effective_state === "FullyBackedLocked" && (
        <div className="mt-6">
          <Alert tone="info" title="Locked tokens move with the NFT">
            If this card is sold or transferred before {utc(lockUntil).slice(0, 10)}, the new owner gets the full redemption right. The lock does not restart.
          </Alert>
        </div>
      )}
    </>
  );
}

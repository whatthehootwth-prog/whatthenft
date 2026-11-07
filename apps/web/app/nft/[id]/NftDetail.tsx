"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Alert, AccountLink, ArtSlot, EmptyState, Field, H1, NotDeployed, Panel, RarityChip, StateChip } from "@/components/ui";
import { CORE_CONTRACT, MARKET_CONTRACT } from "@/lib/config";
import { assetByContract, bpsPct, duration, near, nsToDate, tokenAmount, utc } from "@/lib/format";
import { ftStorageRegistered, getSeasons, getToken, RARITY, type SeasonJ, type TokenViewJ } from "@/lib/near";
import { useWallet } from "@/lib/wallet";

const SLOT_NAMES = ["head", "face", "body", "arms", "legs", "accessory"];

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

  const load = useCallback(() => {
    if (!CORE_CONTRACT) return;
    Promise.all([getToken(id), getSeasons()])
      .then(([t, ss]) => {
        setTok(t);
        setSeason(t ? ss.find((s) => s.id === t.info.season_id) ?? null : null);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tok) return;
    const h = tok.info.holdings.map((x) => `${x.token}:${x.amount}`).join(",");
    fetch(`/api/nav?h=${encodeURIComponent(h)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setNav({ rows: j.holdings, at: j.generatedAt }))
      .catch((e) => setNavErr(String(e)));
  }, [tok]);

  if (!CORE_CONTRACT) {
    return (
      <>
        <H1>Card #{id}</H1>
        <NotDeployed />
      </>
    );
  }
  if (err) return <Alert tone="error" title="Could not read this card">{err}</Alert>;
  if (tok === undefined) return <p className="dots">Reading card #{id} from chain</p>;
  if (tok === null) return <EmptyState aside="hoot?" title={`Card #${id} does not exist`} action={<Link href="/collection" className="btn btn-secondary">Browse the collection</Link>}>No funded NFT has this id. Pending orders are not NFTs until their basket is verified.</EmptyState>;

  const i = tok.info;
  const rarity = RARITY[i.traits.rarity];
  const memes = season?.config.memes;
  const lockUntil = nsToDate(i.lock_until_ns);
  const lockedMs = lockUntil.getTime() - Date.now();
  const empty = tok.effective_state === "RedeemedEmpty";
  const navTotal = nav && nav.rows.every((r) => r.wnearOut !== null) ? nav.rows.reduce((a, r) => a + BigInt(r.wnearOut!), 0n) : null;

  return (
    <>
      <H1 kicker={`Season ${String(i.season_id).padStart(2, "0")} · serial #${i.serial}`}>
        Card #{tok.token_id}
      </H1>
      <div className="grid gap-6 lg:grid-cols-[5fr_7fr] lg:items-start">
        <div className="min-w-0 space-y-4">
          <ArtSlot rarity={rarity} label={i.media_cid ? "render pinned — viewer pending" : "render not pinned yet"} traits={i.traits.slots.map((s, k) => ({ slot: SLOT_NAMES[k]!, meme: memes?.[s.meme_idx]?.meme_id.toUpperCase() ?? `#${s.meme_idx}`, variant: s.variant }))} />
          <div className="flex flex-wrap items-center gap-2">
            <StateChip state={tok.effective_state} />
            <RarityChip rarity={rarity} />
          </div>
          <p className="text-sm text-muted">Rarity changes the artwork only. It does not change the basket.</p>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel>
            <h2 className="font-display text-2xl">Underlying basket</h2>
            {empty ? (
              <p className="mt-2 rounded-lg border-2 border-dashed border-ink p-3 font-semibold">This card is EMPTY: it holds 0 redeemable tokens. It remains a collectible{season?.config.reload_enabled ? " and may be reloaded with its original composition in an eligible season" : ""}.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="ledger min-w-[34rem]">
                  <thead>
                    <tr>
                      <th>Token (verified contract)</th>
                      <th className="amt">Share</th>
                      <th className="amt">Balance held</th>
                      <th className="amt">Sell quote (wNEAR)</th>
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
                      <td colSpan={3}>Estimated NAV (executable sell quotes)</td>
                      <td className="amt">{navTotal !== null ? `${near(navTotal, 6)}` : "UNAVAILABLE"}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-muted">
                  NAV = what Rhea pools would pay right now for each full balance{nav ? ` (${utc(new Date(nav.at))})` : ""}. Not a guarantee: liquidity and prices move. Any missing
                  quote makes the total UNAVAILABLE rather than understated. This is separate from any marketplace price, which can include a speculative art premium.
                </p>
              </div>
            )}
          </Panel>

          <Actions tok={tok} season={season} reload={load} />

          <Panel>
            <h2 className="font-display text-2xl">Provenance</h2>
            <dl className="mt-3">
              <Field label="Owner">{tok.owner_id ? <AccountLink id={tok.owner_id} full /> : "—"}</Field>
              <Field label="Funded">{utc(nsToDate(i.funded_at_ns))}</Field>
              <Field label="Unlocks" hint={lockedMs > 0 ? `in ${duration(lockedMs)}` : "unlocked"}>
                {utc(lockUntil)}
              </Field>
              <Field label="Origin order">#{i.origin_order_id}</Field>
              <Field label="Reloads">{i.reload_count}</Field>
              <Field label="Randomness" hint={`${i.reveal.version}; anyone can recompute the traits from this seed and the order id`}>
                <span className="num text-xs">
                  block {i.reveal.block_height} · seed {i.reveal.random_seed_hex}
                </span>
              </Field>
              <Field label="Season manifest">
                <span className="num text-xs">{i.season_manifest_hash}</span>
              </Field>
              <Field label="Media">{i.media_cid ?? "not pinned yet"}</Field>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Actions({ tok, season, reload }: { tok: TokenViewJ; season: SeasonJ | null; reload: () => void }) {
  const { accountId, call, connect } = useWallet();
  const [receiver, setReceiver] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "error" | "warn"; text: string } | null>(null);
  const [unregistered, setUnregistered] = useState<string[] | null>(null);
  const isOwner = !!accountId && accountId === tok.owner_id;
  const st = tok.effective_state;
  const target = (receiver.trim() || accountId) ?? "";

  useEffect(() => {
    if (!isOwner || st !== "Unlocked" || !target) return setUnregistered(null);
    Promise.all(tok.info.holdings.filter((h) => BigInt(h.amount) > 0n).map(async (h) => ((await ftStorageRegistered(h.token, target).catch(() => false)) ? null : h.token)))
      .then((r) => setUnregistered(r.filter((x): x is string => !!x)))
      .catch(() => setUnregistered(null));
  }, [isOwner, st, target, tok]);

  const run = async (label: string, p: Parameters<typeof call>[0], ok: string) => {
    setBusy(label);
    setMsg(null);
    try {
      const r = await call(p);
      setMsg({ tone: "ok", text: `${ok}${r.txHash ? ` (tx ${r.txHash.slice(0, 10)}…)` : ""}` });
      setTimeout(reload, 2500);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg({ tone: "error", text: /reject|cancel|denied/i.test(m) ? "Signature rejected. Nothing was sent." : m });
    } finally {
      setBusy(null);
    }
  };

  if (!accountId)
    return (
      <Panel>
        <h2 className="font-display text-2xl">Actions</h2>
        <p className="mt-2">Connect the owner wallet to redeem, transfer or reload.</p>
        <button type="button" className="btn btn-yellow mt-3" onClick={connect}>
          Connect wallet
        </button>
      </Panel>
    );
  if (!isOwner)
    return (
      <Panel>
        <h2 className="font-display text-2xl">Actions</h2>
        <p className="mt-2">Only the current owner can act on this card. Redemption rights belong to whoever holds the NFT.</p>
        <p className="mt-2 text-sm text-muted">Buying: {MARKET_CONTRACT ? "see the market." : "the native marketplace is not deployed yet (Milestone B)."}</p>
      </Panel>
    );

  return (
    <Panel>
      <h2 className="font-display text-2xl">Actions</h2>
      {st === "FullyBackedLocked" && (
        <p className="mt-2">
          Locked until {utc(nsToDate(tok.info.lock_until_ns))}. You can transfer or sell it now — the whole basket claim moves with the NFT. Redemption opens after the lock.
        </p>
      )}
      {st === "Unlocked" && (
        <div className="mt-3 rounded-xl border-2 border-ink bg-cream p-4">
          <h3 className="font-display text-xl">Redeem the exact tokens</h3>
          <p className="mt-1 text-sm">Sends every held token to the receiver and marks the card EMPTY. Any marketplace approvals are revoked first.</p>
          <label htmlFor="rcv" className="mt-3 block text-sm font-semibold">
            Receiver (defaults to you)
          </label>
          <input id="rcv" value={receiver} onChange={(e) => setReceiver(e.target.value.trim().toLowerCase())} placeholder={accountId} className="num mt-1 w-full rounded-lg border-[3px] border-ink bg-paper px-3 py-2" />
          {unregistered && unregistered.length > 0 && (
            <div className="mt-3">
              <Alert tone="warn" title="Receiver not registered on some tokens">
                {target} must register storage (≈0.00125 NEAR each) on: {unregistered.map((t) => assetByContract(t)?.symbol ?? t).join(", ")}. Otherwise that transfer fails and the tokens stay safely on the card.
                <div className="mt-2 flex flex-wrap gap-2">
                  {unregistered.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="btn btn-sm btn-secondary"
                      disabled={!!busy}
                      onClick={() => run(`reg-${t}`, { receiverId: t, method: "storage_deposit", args: { account_id: target, registration_only: true }, deposit: 1_250_000_000_000_000_000_000n, tgas: 30 }, `Registered ${target} on ${t}`)}
                    >
                      Register on {assetByContract(t)?.symbol ?? t}
                    </button>
                  ))}
                </div>
              </Alert>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={!!busy || !CORE_CONTRACT}
            onClick={() => run("redeem", { receiverId: CORE_CONTRACT!, method: "redeem", args: { token_id: tok.token_id, receiver_id: receiver || null, tokens: null }, deposit: 1n, tgas: 150 }, "Redemption submitted")}
          >
            {busy === "redeem" ? "Waiting for wallet…" : "Redeem all tokens"}
          </button>
        </div>
      )}
      {st === "RedeemedEmpty" && (
        <div className="mt-3 rounded-xl border-2 border-dashed border-ink p-4">
          <h3 className="font-display text-xl">Reload</h3>
          {season?.status === "Open" && season.config.reload_enabled ? (
            <p className="mt-1 text-sm">Reloading rebuys the original composition at current prices with a new payment and a new 30-day lock. Start it from the hatch flow once reload checkout ships.</p>
          ) : (
            <p className="mt-1 text-sm">Reload is unavailable: there is no open season that accepts reloads right now.</p>
          )}
        </div>
      )}
      {(st === "Redeeming" || st === "Reloading") && <p className="mt-2 dots">Settlement in progress. Transfers are blocked until it finishes</p>}
      {st !== "Redeeming" && st !== "Reloading" && (
        <div className="mt-4 border-t-2 border-ink/15 pt-4">
          <h3 className="font-display text-xl">Transfer</h3>
          <p className="mt-1 text-sm">Direct transfers move the NFT and its full basket claim. They pay no royalty.</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="to" className="sr-only">
              Recipient account
            </label>
            <input id="to" value={transferTo} onChange={(e) => setTransferTo(e.target.value.trim().toLowerCase())} placeholder="recipient.near" className="num min-w-0 flex-1 rounded-lg border-[3px] border-ink bg-paper px-3 py-2" />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!!busy || !/^[a-z0-9._-]{2,64}$/.test(transferTo) || transferTo === accountId}
              onClick={() => run("transfer", { receiverId: CORE_CONTRACT!, method: "nft_transfer", args: { receiver_id: transferTo, token_id: tok.token_id }, deposit: 1n, tgas: 50 }, `Transferred to ${transferTo}`)}
            >
              {busy === "transfer" ? "Waiting for wallet…" : "Transfer"}
            </button>
          </div>
        </div>
      )}
      <div className="mt-4 border-t-2 border-ink/15 pt-4">
        <h3 className="font-display text-xl">List for sale</h3>
        <p className="mt-1 text-sm text-muted">{MARKET_CONTRACT ? "Listing UI ships with the marketplace contract." : "Disabled: the native marketplace contract is not deployed yet (Milestone B)."}</p>
      </div>
      {msg && (
        <div className="mt-4">
          <Alert tone={msg.tone} title={msg.tone === "ok" ? "Submitted" : "Not done"}>
            {msg.text}
          </Alert>
        </div>
      )}
    </Panel>
  );
}

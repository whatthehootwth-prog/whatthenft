"use client";

import { useEffect, useState } from "react";
import { Alert, Panel } from "@/components/ui";
import { CORE_CONTRACT, MARKET_CONTRACT } from "@/lib/config";
import { assetByContract, nsToDate, utc } from "@/lib/format";
import { ftStorageRegistered, type SeasonJ, type TokenViewJ } from "@/lib/near";
import { useWallet } from "@/lib/wallet";

/** Owner actions: redeem, register receiver storage, transfer. Real transactions only. */
export function Actions({ tok, season, reload }: { tok: TokenViewJ; season: SeasonJ | null; reload: () => void }) {
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

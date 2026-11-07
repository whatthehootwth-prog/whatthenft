"use client";

import "@near-wallet-selector/modal-ui/styles.css";
import { actionCreators, setupWalletSelector, type WalletSelector } from "@near-wallet-selector/core";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupIntearWallet } from "@near-wallet-selector/intear-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupModal, type WalletSelectorModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { NETWORK } from "./config";
import { rpc } from "./near";

export interface CallParams {
  receiverId: string;
  method: string;
  args: object;
  /** yoctoNEAR */
  deposit: bigint;
  /** Tgas */
  tgas: number;
}

export interface CallResult {
  txHash: string | null;
  /** Decoded JSON return value of the called method, when the wallet returns an outcome. */
  value: unknown;
}

interface WalletCtx {
  ready: boolean;
  accountId: string | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  call: (p: CallParams) => Promise<CallResult>;
  error: string | null;
}

const Ctx = createContext<WalletCtx | null>(null);

type Outcome = { transaction?: { hash?: string }; transaction_outcome?: { id?: string }; status?: unknown };

export function decodeOutcome(o: Outcome | void | undefined): CallResult {
  if (!o) return { txHash: null, value: undefined };
  const txHash = o.transaction?.hash ?? o.transaction_outcome?.id ?? null;
  let value: unknown = undefined;
  const st = o.status as { SuccessValue?: string; Failure?: unknown } | undefined;
  if (st && typeof st === "object" && "Failure" in st && st.Failure) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(st.Failure).slice(0, 300)}`);
  }
  if (st && typeof st === "object" && typeof st.SuccessValue === "string" && st.SuccessValue.length > 0) {
    try {
      value = JSON.parse(atob(st.SuccessValue));
    } catch {
      value = undefined;
    }
  }
  return { txHash, value };
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<WalletSelectorModal | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const s = await setupWalletSelector({
          network: NETWORK,
          modules: [setupMeteorWallet(), setupHereWallet(), setupIntearWallet(), setupMyNearWallet()],
        });
        const m = setupModal(s, { description: "Connect a NEAR wallet to hatch, hold and redeem WHAT THE NFT?! cards." } as never);
        const st = s.store.getState();
        setAccountId(st.accounts.find((a) => a.active)?.accountId ?? null);
        const sub = s.store.observable.subscribe((state) => setAccountId(state.accounts.find((a) => a.active)?.accountId ?? null));
        unsub = () => sub.unsubscribe();
        setSelector(s);
        setModal(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => unsub?.();
  }, []);

  const connect = useCallback(() => modal?.show(), [modal]);
  const disconnect = useCallback(async () => {
    if (!selector) return;
    const w = await selector.wallet();
    await w.signOut();
  }, [selector]);

  const call = useCallback(
    async (p: CallParams): Promise<CallResult> => {
      if (!selector || !accountId) throw new Error("Connect a wallet first");
      const w = await selector.wallet();
      const out = await w.signAndSendTransaction({
        signerId: accountId,
        receiverId: p.receiverId,
        actions: [actionCreators.functionCall(p.method, p.args, BigInt(p.tgas) * 10n ** 12n, p.deposit)],
      });
      const r = decodeOutcome(out as Outcome | void);
      if (r.txHash && r.value === undefined) {
        // Some wallets return no decoded value; read the final outcome from RPC.
        try {
          const full = await rpc.call<Outcome>("tx", { tx_hash: r.txHash, sender_account_id: accountId, wait_until: "EXECUTED_OPTIMISTIC" });
          return decodeOutcome(full);
        } catch {
          return r;
        }
      }
      return r;
    },
    [selector, accountId],
  );

  const v = useMemo<WalletCtx>(() => ({ ready: !!selector, accountId, connect, disconnect, call, error }), [selector, accountId, connect, disconnect, call, error]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet outside WalletProvider");
  return c;
}

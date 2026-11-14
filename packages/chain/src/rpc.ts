/**
 * Minimal NEAR JSON-RPC client with explicit failover. Never returns fabricated data:
 * if every endpoint fails, the call throws and callers must surface UNAVAILABLE.
 */
export type Network = "mainnet" | "testnet";

/** Browser + Node safe base64 of a UTF-8 string. */
export function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export const DEFAULT_RPCS: Record<Network, string[]> = {
  // near.lava.build was discontinued (2026); these three answered view calls on 2026-11-15.
  mainnet: ["https://rpc.mainnet.fastnear.com", "https://free.rpc.fastnear.com", "https://rpc.mainnet.near.org"],
  testnet: ["https://test.rpc.fastnear.com", "https://neart.lava.build", "https://rpc.testnet.near.org"],
};

export class RpcError extends Error {
  constructor(message: string, readonly attempts: { url: string; error: string }[]) {
    super(message);
  }
}

export interface RpcOptions {
  network: Network;
  urls?: string[];
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** Extra passes over all endpoints after a short pause (public RPCs rate-limit bursts). Default 2. */
  retries?: number;
}

export class NearRpc {
  readonly urls: string[];
  private readonly timeoutMs: number;
  private readonly f: typeof fetch;
  constructor(readonly opts: RpcOptions) {
    this.urls = opts.urls?.length ? opts.urls : DEFAULT_RPCS[opts.network];
    this.timeoutMs = opts.timeoutMs ?? 12_000;
    // Wrap instead of storing `fetch` directly: browsers throw "Illegal invocation" when the native
    // fetch is called as a method of another object (`this.f(...)`). Node doesn't care.
    this.f = opts.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async call<T>(method: string, params: unknown): Promise<T> {
    const attempts: { url: string; error: string }[] = [];
    const passes = 1 + (this.opts.retries ?? 2);
    for (let pass = 0; pass < passes; pass++) {
      if (pass > 0) await new Promise((r) => setTimeout(r, 400 * pass + Math.random() * 300));
    for (const url of this.urls) {
      try {
        const res = await this.f(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: "wtn", method, params }),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { result?: T & { error?: string }; error?: { message?: string; data?: unknown; cause?: { name?: string } } };
        if (j.error) {
          // Deterministic errors (e.g. contract panics) should not be retried on other nodes.
          const msg = JSON.stringify(j.error).slice(0, 500);
          if (/UNKNOWN_ACCOUNT|MethodNotFound|FunctionCallError|CodeDoesNotExist|UNKNOWN_TRANSACTION/i.test(msg)) throw new RpcError(msg, [...attempts, { url, error: msg }]);
          throw new Error(msg);
        }
        if (j.result && typeof j.result === "object" && "error" in j.result && j.result.error) {
          throw new RpcError(String(j.result.error).slice(0, 500), [...attempts, { url, error: String(j.result.error) }]);
        }
        return j.result as T;
      } catch (e) {
        if (e instanceof RpcError) throw e;
        attempts.push({ url, error: e instanceof Error ? e.message : String(e) });
      }
    }
    }
    throw new RpcError(`All ${this.urls.length} RPC endpoints failed for ${method}`, attempts);
  }

  async view<T>(accountId: string, methodName: string, args: unknown = {}): Promise<T> {
    const r = await this.call<{ result: number[] }>("query", {
      request_type: "call_function",
      finality: "final",
      account_id: accountId,
      method_name: methodName,
      args_base64: toBase64(JSON.stringify(args)),
    });
    return JSON.parse(new TextDecoder().decode(new Uint8Array(r.result))) as T;
  }

  async accountExists(accountId: string): Promise<boolean> {
    try {
      await this.call("query", { request_type: "view_account", finality: "final", account_id: accountId });
      return true;
    } catch (e) {
      if (e instanceof RpcError && /UNKNOWN_ACCOUNT|does not exist/i.test(e.message)) return false;
      throw e;
    }
  }

  async viewAccount(accountId: string): Promise<{ amount: string; locked: string; storage_usage: number; code_hash: string }> {
    return this.call("query", { request_type: "view_account", finality: "final", account_id: accountId });
  }

  async txStatus(txHash: string, senderId: string): Promise<{ final: boolean; success: boolean; raw: unknown }> {
    const r = await this.call<{ status: Record<string, unknown>; final_execution_status?: string }>("tx", { tx_hash: txHash, sender_account_id: senderId, wait_until: "FINAL" });
    const success = "SuccessValue" in r.status || "SuccessReceiptId" in r.status;
    return { final: r.final_execution_status === "FINAL" || r.final_execution_status === undefined, success, raw: r };
  }
}

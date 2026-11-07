"use client";

import { useEffect, useState } from "react";
import { Alert, H1, Panel } from "@/components/ui";
import { assetByContract, tokenAmount, utc } from "@/lib/format";

interface StatusResp {
  generatedAt: string;
  network: string;
  coreContract: string | null;
  checks: { id: string; label: string; ok: boolean | null; detail: string; ms: number }[];
  conservation: { token: string; balance: string | null; accounted: string | null; ok: boolean | null; detail: string }[];
}

export default function StatusPage() {
  const [s, setS] = useState<StatusResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    setErr(null);
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then(setS)
      .catch((e) => setErr(String(e)));
  }, [n]);

  const down = s?.checks.filter((c) => c.ok === false) ?? [];
  return (
    <>
      <H1 kicker="is it hooting?">System status</H1>
      {err && <Alert tone="error" title="Status endpoint unreachable">{err}</Alert>}
      {!s && !err && <p className="dots">Running live checks</p>}
      {s && (
        <div className="space-y-6">
          {down.length === 0 ? (
            <Alert tone="ok" title="All live checks passing">Checked {utc(new Date(s.generatedAt))} on {s.network}.</Alert>
          ) : (
            <Alert tone="error" title={`${down.length} check${down.length > 1 ? "s" : ""} failing`}>Affected new trades are disabled automatically. Existing custody is unaffected.</Alert>
          )}
          {!s.coreContract && (
            <Alert tone="warn" title="Contracts not deployed on this network">
              Minting, redemption and the conservation check go live after testnet deployment. Quote routes below are real mainnet liquidity checks.
            </Alert>
          )}
          <Panel>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl">Live checks</h2>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setN((x) => x + 1)}>
                Re-run
              </button>
            </div>
            <ul className="mt-3 divide-y-2 divide-ink/10">
              {s.checks.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.label}</p>
                    <p className="num break-anywhere text-xs text-muted">{c.detail}</p>
                  </div>
                  <span className={`chip shrink-0 self-start ${c.ok ? "chip-ok" : "chip-failed"}`}>
                    {c.ok ? "OK" : "DOWN"} · {c.ms}ms
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          {s.coreContract && (
            <Panel>
              <h2 className="font-display text-2xl">Custody conservation</h2>
              <p className="mt-1 text-sm text-muted">For each token: the vault&apos;s real balance must be at least the sum of every card&apos;s claim plus in-flight orders.</p>
              <div className="mt-3 overflow-x-auto">
                <table className="ledger min-w-[32rem]">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th className="amt">Vault balance</th>
                      <th className="amt">Accounted claims</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.conservation.map((c) => {
                      const a = assetByContract(c.token);
                      const dec = c.token.startsWith("wrap.") ? 24 : a?.decimals;
                      return (
                        <tr key={c.token}>
                          <td>
                            {a?.symbol ?? c.token}
                            <span className="num block text-xs text-muted break-anywhere">{c.token}</span>
                          </td>
                          <td className="amt">{c.balance ? tokenAmount(c.balance, dec) : "UNAVAILABLE"}</td>
                          <td className="amt">{c.accounted ? tokenAmount(c.accounted, dec) : "UNAVAILABLE"}</td>
                          <td>
                            <span className={`chip ${c.ok === true ? "chip-ok" : c.ok === false ? "chip-failed" : "chip-pending"}`}>{c.detail}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

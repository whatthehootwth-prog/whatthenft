"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MAINNET, SEASON_01_DRAFT } from "@wtn/chain";
import { parseNear } from "@wtn/domain";
import { Alert, H1, NotDeployed, Panel } from "@/components/ui";
import { CORE_CONTRACT, NET } from "@/lib/config";
import { near } from "@/lib/format";
import { getCoreConfig, getSeasons, isOperator, type CoreConfigJ, type SeasonJ } from "@/lib/near";
import { useWallet, type CallParams } from "@/lib/wallet";

const NS_DAY = 86_400_000_000_000n;

/** Contract-shaped SeasonConfig built from the draft. manifest_hash stays empty until art is imported. */
function draftTemplate(): string {
  const d = SEASON_01_DRAFT;
  const start = BigInt(Date.now() + 86_400_000) * 1_000_000n;
  const cfg = {
    name: d.name,
    mint_start_ns: start.toString(),
    mint_end_ns: (start + BigInt(d.mintWindowDays) * NS_DAY).toString(),
    max_supply: d.maxSupply,
    target_base: d.targetBase.toString(),
    min_base_floor: d.targetBase.toString(),
    max_base: d.maxBase.toString(),
    min_leg: d.minLeg.toString(),
    tiers: d.tiers.map((t) => ({ min_base: t.minBase.toString(), max_partners: t.maxPartners })),
    lock_ns: (BigInt(d.lockDays) * NS_DAY).toString(),
    fees: { basket_bps: d.fees.basketBps, creator_bps: d.fees.creatorBps, treasury_bps: d.fees.treasuryBps },
    royalty: { royalty_bps: d.royalty.royaltyBps, creator_share_bps: d.royalty.creatorShareOfRoyaltyBps },
    allocation: { core_wth_bps: d.allocation.coreWthBps, slot_weights_bps: ["head", "face", "body", "arms", "legs", "accessory"].map((s) => d.allocation.slotWeightsBps[s as keyof typeof d.allocation.slotWeightsBps]) },
    rarity_bps: d.rarityBps,
    wth_slot_bps: d.wthSlotBps,
    memes: d.memes.map((m) => {
      const a = MAINNET.assets.find((x) => x.memeId === m.memeId)!;
      return {
        meme_id: m.memeId,
        token: NET.network === "mainnet" ? a.contractId : `REPLACE_WITH_TESTNET_${m.memeId.toUpperCase()}_TOKEN`,
        weight: m.weight,
        slot_variants: [0, 0, 0, 0, 0, 0],
        route: { kind: a.route.kind === "rhea-dcl" ? "RheaDcl" : "RheaV2", pool_id: NET.network === "mainnet" ? a.route.poolId : "REPLACE_WITH_TESTNET_POOL" },
        max_slippage_bps: 200,
      };
    }),
    reserve: { storage_per_mint: d.reserve.storagePerMint.toString(), retry_reserve: d.reserve.retryReserve.toString(), advance_fee: d.reserve.advanceFee.toString() },
    manifest_hash: "",
    media_base_uri: "",
    reload_enabled: true,
  };
  return JSON.stringify(cfg, null, 2);
}

export default function AdminPage() {
  const { accountId, connect, call } = useWallet();
  const [op, setOp] = useState<boolean | null>(null);
  const [cfg, setCfg] = useState<CoreConfigJ | null>(null);
  const [seasons, setSeasons] = useState<SeasonJ[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<{ tone: "ok" | "error"; text: string }[]>([]);
  const [json, setJson] = useState("");
  const [route, setRoute] = useState("");
  const [minBase, setMinBase] = useState("");

  const load = useCallback(() => {
    if (!CORE_CONTRACT) return;
    Promise.all([getCoreConfig(), getSeasons()]).then(([c, s]) => {
      setCfg(c);
      setSeasons(s);
    });
    if (accountId) isOperator(accountId).then(setOp).catch(() => setOp(false));
  }, [accountId]);
  useEffect(load, [load]);

  const jsonCheck = useMemo(() => {
    if (!json.trim()) return null;
    try {
      const c = JSON.parse(json);
      const problems: string[] = [];
      if (!/^[0-9a-f]{64}$/.test(c.manifest_hash ?? "")) problems.push("manifest_hash must be the 64-hex sha256 of the published season manifest (run the asset importer first)");
      if (!c.media_base_uri) problems.push("media_base_uri is empty");
      if ((c.memes ?? []).some((m: { token: string; pool_id?: string; route?: { pool_id: string } }) => /REPLACE/.test(m.token) || /REPLACE/.test(m.route?.pool_id ?? ""))) problems.push("token/pool placeholders remain");
      if ((c.memes?.[0]?.slot_variants ?? []).some((v: number) => v < 1)) problems.push("memes[0] (WTH) needs approved art for all 6 slots (slot_variants ≥ 1)");
      const f = c.fees ?? {};
      if (f.basket_bps + f.creator_bps + f.treasury_bps !== 10000) problems.push("fees must sum to 10000");
      return { ok: problems.length === 0, problems, cfg: c };
    } catch (e) {
      return { ok: false, problems: [`invalid JSON: ${(e as Error).message}`], cfg: null };
    }
  }, [json]);

  const tx = async (label: string, p: Omit<CallParams, "receiverId">) => {
    if (!CORE_CONTRACT) return;
    setBusy(label);
    try {
      const r = await call({ ...p, receiverId: CORE_CONTRACT });
      setLog((l) => [{ tone: "ok" as const, text: `${label}: done${r.txHash ? ` · ${r.txHash}` : ""}` }, ...l].slice(0, 20));
      setTimeout(load, 2000);
    } catch (e) {
      setLog((l) => [{ tone: "error" as const, text: `${label}: ${e instanceof Error ? e.message : String(e)}` }, ...l].slice(0, 20));
    } finally {
      setBusy(null);
    }
  };

  if (!CORE_CONTRACT)
    return (
      <>
        <H1 kicker="operators only">Admin</H1>
        <NotDeployed />
      </>
    );
  if (!accountId)
    return (
      <>
        <H1 kicker="operators only">Admin</H1>
        <button type="button" className="btn btn-yellow" onClick={connect}>
          Connect operator wallet
        </button>
      </>
    );

  return (
    <>
      <H1 kicker="operators only">Admin</H1>
      {op === false && (
        <div className="mb-6">
          <Alert tone="error" title="This account is not an operator">
            {accountId} has no operator role on {CORE_CONTRACT}. The contract rejects every privileged call from it; the controls below are shown read-only.
          </Alert>
        </div>
      )}
      <div className="mb-6">
        <Alert tone="info" title="What this console cannot do">
          By design there is no control to withdraw baskets, seize NFTs, edit minted traits or block redemption. Use a multisig owner account; every action here is an on-chain event.
        </Alert>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-2xl">Circuit breakers</h2>
          <p className="mt-2 text-sm">
            New mints: <strong>{cfg?.mints_paused ? "PAUSED" : "running"}</strong>
          </p>
          <button type="button" className={`btn mt-3 ${cfg?.mints_paused ? "btn-secondary" : "btn-danger"}`} disabled={!op || !!busy} onClick={() => tx("set_mints_paused", { method: "set_mints_paused", args: { paused: !cfg?.mints_paused }, deposit: 0n, tgas: 30 })}>
            {cfg?.mints_paused ? "Resume new mints" : "Pause new mints"}
          </button>
          <label className="mt-5 block text-sm font-semibold" htmlFor="route">
            Token route breaker (full contract id)
          </label>
          <input id="route" value={route} onChange={(e) => setRoute(e.target.value.trim())} className="num mt-1 w-full rounded-lg border-[3px] border-ink bg-paper px-3 py-2" placeholder="token.0xshitzu.near" />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-danger" disabled={!op || !!busy || !route} onClick={() => tx("pause route", { method: "set_route_paused", args: { token: route, paused: true }, deposit: 0n, tgas: 30 })}>
              Pause route
            </button>
            <button type="button" className="btn btn-sm btn-secondary" disabled={!op || !!busy || !route} onClick={() => tx("resume route", { method: "set_route_paused", args: { token: route, paused: false }, deposit: 0n, tgas: 30 })}>
              Resume route
            </button>
          </div>
        </Panel>

        <Panel>
          <h2 className="font-display text-2xl">Seasons</h2>
          {seasons.length === 0 && <p className="mt-2 text-sm">No seasons on-chain.</p>}
          <ul className="mt-3 space-y-3">
            {seasons.map((s) => (
              <li key={s.id} className="rounded-xl border-2 border-ink p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg">
                    #{s.id} {s.config.name}
                  </span>
                  <span className="chip chip-ink">{s.status}</span>
                </div>
                <p className="num mt-1 text-xs">
                  minted {s.minted}/{s.config.max_supply} · in flight {s.in_flight} · live min {near(s.current_min_base, 4)} NEAR
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.status === "Draft" && (
                    <>
                      <button type="button" className="btn btn-sm btn-secondary" disabled={!op || !!busy} onClick={() => tx("register tokens", { method: "register_tokens", args: { tokens: [cfg?.wrap_near, ...s.config.memes.map((m) => m.token)].slice(0, 10), deposit_each: "1250000000000000000000" }, deposit: 0n, tgas: 200 })}>
                        Register vault on tokens
                      </button>
                      <button type="button" className="btn btn-sm btn-primary" disabled={!op || !!busy} onClick={() => confirm(`Open season ${s.id}? Its config becomes immutable forever.`) && tx("open season", { method: "open_season", args: { season_id: s.id }, deposit: 0n, tgas: 30 })}>
                        Open (freeze config)
                      </button>
                    </>
                  )}
                  {s.status === "Open" && (
                    <>
                      <button type="button" className="btn btn-sm btn-danger" disabled={!op || !!busy} onClick={() => confirm(`Close season ${s.id}? New mints stop permanently.`) && tx("close season", { method: "close_season", args: { season_id: s.id }, deposit: 0n, tgas: 30 })}>
                        Close
                      </button>
                      <label className="sr-only" htmlFor={`min-${s.id}`}>
                        Live minimum NEAR
                      </label>
                      <input id={`min-${s.id}`} value={minBase} onChange={(e) => setMinBase(e.target.value)} placeholder="min NEAR" className="num w-28 rounded-lg border-[3px] border-ink bg-paper px-2" />
                      <button type="button" className="btn btn-sm btn-secondary" disabled={!op || !!busy || !minBase} onClick={() => tx("set min", { method: "set_current_min_base", args: { season_id: s.id, min_base: parseNear(minBase).toString() }, deposit: 0n, tgas: 30 })}>
                        Set live minimum
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="lg:col-span-2">
          <h2 className="font-display text-2xl">Create draft season</h2>
          <p className="mt-1 text-sm text-muted">Paste a contract SeasonConfig. The contract re-validates everything; this form only catches obvious gaps first.</p>
          <button type="button" className="btn btn-sm btn-secondary mt-3" onClick={() => setJson(draftTemplate())}>
            Load Season 01 draft template
          </button>
          <label htmlFor="season-json" className="sr-only">
            Season config JSON
          </label>
          <textarea id="season-json" value={json} onChange={(e) => setJson(e.target.value)} rows={14} spellCheck={false} className="num mt-3 w-full rounded-xl border-[3px] border-ink bg-paper p-3 text-xs" />
          {jsonCheck && !jsonCheck.ok && (
            <ul className="mt-2 space-y-1 text-sm text-red">
              {jsonCheck.problems.map((p) => (
                <li key={p}>✕ {p}</li>
              ))}
            </ul>
          )}
          <button type="button" className="btn btn-primary mt-3" disabled={!op || !!busy || !jsonCheck?.ok} onClick={() => tx("create season", { method: "create_season", args: { config: jsonCheck!.cfg }, deposit: 0n, tgas: 50 })}>
            Create draft season
          </button>
        </Panel>
      </div>
      {log.length > 0 && (
        <Panel className="mt-6">
          <h2 className="font-display text-xl">Session log</h2>
          <ul className="num mt-2 space-y-1 text-xs">
            {log.map((l, i) => (
              <li key={i} className={l.tone === "error" ? "text-red" : ""}>
                {l.text}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

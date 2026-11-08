"use client";
import { useEffect, useState } from "react";
import { CORE_CONTRACT } from "./config";
import { getCoreConfig, getSeasons, pickActiveSeason, type SeasonJ } from "./near";

export type SeasonLive =
  | { state: "loading" }
  | { state: "not-deployed" }
  | { state: "error"; message: string }
  | { state: "none" }
  | { state: "ok"; season: SeasonJ; paused: boolean; phase: "draft" | "upcoming" | "live" | "ended" | "closed" | "sold-out" };

export function phaseOf(s: SeasonJ, now = Date.now()): "draft" | "upcoming" | "live" | "ended" | "closed" | "sold-out" {
  if (s.status === "Draft") return "draft";
  if (s.status === "Closed") return "closed";
  if (s.minted >= s.config.max_supply) return "sold-out";
  const start = Number(BigInt(s.config.mint_start_ns) / 1_000_000n);
  const end = Number(BigInt(s.config.mint_end_ns) / 1_000_000n);
  if (now < start) return "upcoming";
  if (now >= end) return "ended";
  return "live";
}

/** Live season state read straight from the core contract. Never fabricates counters. */
export function useSeasonLive(refreshMs = 20_000): SeasonLive {
  const [st, setSt] = useState<SeasonLive>(CORE_CONTRACT ? { state: "loading" } : { state: "not-deployed" });
  useEffect(() => {
    if (!CORE_CONTRACT) return;
    let alive = true;
    const load = () =>
      Promise.all([getSeasons(), getCoreConfig()])
        .then(([all, cfg]) => {
          if (!alive) return;
          const s = pickActiveSeason(all);
          setSt(s ? { state: "ok", season: s, paused: cfg.mints_paused, phase: phaseOf(s) } : { state: "none" });
        })
        .catch((e) => alive && setSt({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    load();
    const t = setInterval(load, refreshMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [refreshMs]);
  return st;
}

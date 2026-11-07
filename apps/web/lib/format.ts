import { MAINNET, type AssetEntry } from "@wtn/chain";
import { formatUnits } from "@wtn/domain";

export const yocto = (v: string | bigint) => (typeof v === "bigint" ? v : BigInt(v));

/** NEAR with enough precision for small baskets; truncates, never rounds up. */
export function near(v: string | bigint, frac = 5): string {
  return formatUnits(yocto(v), 24, frac);
}

export function bpsPct(bps: number, frac = 2): string {
  return `${(bps / 100).toFixed(frac)}%`;
}

export function assetByContract(contract: string): AssetEntry | undefined {
  return MAINNET.assets.find((a) => a.contractId === contract);
}

export function assetByMeme(memeId: string): AssetEntry | undefined {
  return MAINNET.assets.find((a) => a.memeId === memeId);
}

export function tokenAmount(raw: string | bigint, decimals: number | undefined, frac = 4): string {
  if (decimals === undefined) return `${yocto(raw).toString()} base units`;
  return formatUnits(yocto(raw), decimals, frac);
}

export function nsToDate(ns: string | bigint): Date {
  return new Date(Number(yocto(ns) / 1_000_000n));
}

export function utc(d: Date): string {
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

export function duration(ms: number): string {
  if (ms <= 0) return "0m";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function shortId(s: string, head = 10, tail = 8): string {
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

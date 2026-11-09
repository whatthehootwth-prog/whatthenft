/**
 * DEMO marketplace data — clearly labelled "Demo data" in the UI.
 * Generated deterministically from the real Season 01 part library so the page looks real
 * before the marketplace contract exists. Replace with on-chain data once it's deployed.
 */
import { memesIn, previewSpec, type MutantSpec } from "./art";
import { TIERS, type RarityName } from "./rarity";

export interface DemoItem {
  id: number;
  name: string;
  spec: MutantSpec;
  rarity: RarityName;
  memes: string[];
  owner: string;
  /** NEAR, null = not listed. */
  price: number | null;
  lastSale: number | null;
  listedAgo: number;
}

export interface DemoActivity {
  id: string;
  kind: "sale" | "list" | "mint" | "transfer" | "delist";
  item: DemoItem;
  price: number | null;
  from: string;
  to: string | null;
  minsAgo: number;
}

const OWNERS = [
  "hootlord.near", "memeweaver.near", "owlbeback.near", "degenmoth.near", "featherfi.near", "nightshift.near",
  "pixelbeak.near", "gigaowl.near", "wenmoon.near", "talonz.near", "sleepyhoot.near", "bagholder.near",
  "chirpchirp.near", "noctua.near", "flappy.near", "hootenanny.near", "glitchbird.near", "nestegg.near",
];

function rng(seed: number) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

const RARITY_MULT: Record<RarityName, number> = { COMMON: 1, RARE: 1.6, EPIC: 2.8, LEGENDARY: 6, MYTHIC: 14 };

/** Demo spread (%) so every tier shows up on the page: COMMON → MYTHIC. */
const DEMO_PCT = [45, 27, 15, 8, 5];

function rollRarity(r: number): RarityName {
  let acc = 0;
  for (let i = 0; i < TIERS.length; i++) {
    acc += DEMO_PCT[i]! / 100;
    if (r < acc) return TIERS[i]!.name;
  }
  return "COMMON";
}

const round = (n: number) => Math.round(n * 100) / 100;

export const DEMO_ITEMS: DemoItem[] = Array.from({ length: 111 }, (_, i) => {
  const r = rng(i + 7);
  const spec = previewSpec(1000 + i * 13);
  const rarity = rollRarity(r());
  const base = 0.12 + r() * 0.5;
  const listed = r() < 0.5;
  return {
    id: i + 1,
    name: `Freak #${String(i + 1).padStart(3, "0")}`,
    spec,
    rarity,
    memes: memesIn(spec),
    owner: OWNERS[Math.floor(r() * OWNERS.length)]!,
    price: listed ? round(base * RARITY_MULT[rarity] * (0.9 + r() * 0.5)) : null,
    lastSale: r() < 0.7 ? round(base * RARITY_MULT[rarity] * (0.7 + r() * 0.4)) : null,
    listedAgo: Math.floor(r() * 4000),
  };
});

const listed = DEMO_ITEMS.filter((d) => d.price !== null);

export const DEMO_STATS = {
  floor: Math.min(...listed.map((d) => d.price!)),
  topSale: 18.4,
  volume24h: 42.7,
  totalVolume: 1284.3,
  listed: listed.length,
  owners: new Set(DEMO_ITEMS.map((d) => d.owner)).size,
  supply: DEMO_ITEMS.length,
};

const KINDS: DemoActivity["kind"][] = ["sale", "list", "sale", "transfer", "list", "mint", "delist", "sale"];

export const DEMO_ACTIVITY: DemoActivity[] = Array.from({ length: 30 }, (_, i) => {
  const r = rng(500 + i);
  const item = DEMO_ITEMS[Math.floor(r() * DEMO_ITEMS.length)]!;
  const kind = KINDS[i % KINDS.length]!;
  const from = OWNERS[Math.floor(r() * OWNERS.length)]!;
  const to = kind === "sale" || kind === "transfer" ? OWNERS[Math.floor(r() * OWNERS.length)]! : null;
  const price = kind === "sale" || kind === "list" ? round((item.lastSale ?? item.price ?? 0.3) * (0.85 + r() * 0.4)) : kind === "mint" ? 0.1 : null;
  return { id: `a${i}`, kind, item, price, from, to, minsAgo: Math.floor(i * 37 + r() * 30) };
});

export const DEMO_HOLDERS = Object.entries(
  DEMO_ITEMS.reduce<Record<string, number>>((acc, d) => ((acc[d.owner] = (acc[d.owner] ?? 0) + 1), acc), {}),
)
  .map(([account, count]) => ({ account, count, pct: (count / DEMO_ITEMS.length) * 100 }))
  .sort((a, b) => b.count - a.count);

/** A fresh random activity row for the "live" ticker. */
export function randomActivity(seed: number): DemoActivity {
  const r = rng(seed);
  const item = DEMO_ITEMS[Math.floor(r() * DEMO_ITEMS.length)]!;
  const kind = (["sale", "list", "transfer"] as const)[Math.floor(r() * 3)]!;
  return {
    id: `live-${seed}`,
    kind,
    item,
    price: kind === "transfer" ? null : round((item.lastSale ?? item.price ?? 0.3) * (0.85 + r() * 0.4)),
    from: OWNERS[Math.floor(r() * OWNERS.length)]!,
    to: kind === "list" ? null : OWNERS[Math.floor(r() * OWNERS.length)]!,
    minsAgo: 0,
  };
}

export function ago(mins: number) {
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

/**
 * Live marketplace data + wallet actions. Used when both NEXT_PUBLIC_CORE_CONTRACT and
 * NEXT_PUBLIC_MARKET_CONTRACT are set; otherwise pages fall back to clearly labelled demo data.
 *
 * List:  core.nft_approve(token_id, market, msg {"price"}) → market.nft_on_approve stores the listing
 * Buy:   market.buy(token_id) with deposit = price → core.nft_transfer_payout → royalty split paid out
 */
import { memesIn } from "./art";
import { tokenSpec } from "./cards";
import { CORE_CONTRACT, MARKET_CONTRACT } from "./config";
import type { DemoActivity, DemoItem, DemoMine } from "./demoMarket";
import { funnyName } from "./names";
import { RARITY, getOrder, getSeasons, getTokens, getTokensForOwner, rpc, type SeasonJ, type TokenViewJ } from "./near";
import type { RarityName } from "./rarity";
import type { CallParams } from "./wallet";

export const MARKET_LIVE = !!(CORE_CONTRACT && MARKET_CONTRACT);
const YOCTO = 10n ** 24n;
const DAY_MS = 86_400_000;

export interface ListingJ {
  token_id: string;
  owner_id: string;
  approval_id: number;
  price: string;
  listed_ns: string;
}
export interface SaleJ {
  token_id: string;
  seller: string;
  buyer: string;
  price: string;
  sold_ns: string;
}
interface StatsJ {
  listed: number;
  sale_count: number;
  total_volume: string;
  floor: string | null;
  top_recent_sale: string | null;
}

/** yocto → NEAR number, for display only (exact yocto is kept for transactions). */
export const toNear = (y: string | bigint) => Number((BigInt(y) * 10_000n) / YOCTO) / 10_000;
export const parseNearToYocto = (s: string): bigint => {
  const m = s.trim().match(/^(\d+)(?:\.(\d{0,24}))?$/);
  if (!m) throw new Error("Enter a price like 1.5");
  return BigInt(m[1]!) * YOCTO + BigInt((m[2] ?? "").padEnd(24, "0") || "0");
};
const minsSince = (ns: string) => Math.max(0, Math.floor((Date.now() - Number(BigInt(ns) / 1_000_000n)) / 60_000));

const mv = <T,>(method: string, args: Record<string, unknown> = {}) => rpc.view<T>(MARKET_CONTRACT!, method, args);

export interface LiveItem extends DemoItem {
  priceYocto: string | null;
}

function toItem(t: TokenViewJ, season: SeasonJ | undefined, listing: ListingJ | undefined, lastSale: SaleJ | undefined): LiveItem {
  const { spec } = tokenSpec(t, season);
  const id = Number.parseInt(t.token_id, 10) || t.info.serial;
  return {
    id,
    name: funnyName(spec),
    spec,
    rarity: (RARITY[t.info.traits.rarity] ?? "COMMON") as RarityName,
    memes: memesIn(spec),
    owner: t.owner_id ?? "",
    price: listing ? toNear(listing.price) : null,
    priceYocto: listing?.price ?? null,
    lastSale: lastSale ? toNear(lastSale.price) : null,
    listedAgo: listing ? minsSince(listing.listed_ns) : Number.MAX_SAFE_INTEGER,
  };
}

export interface LiveMarket {
  items: LiveItem[];
  activity: DemoActivity[];
  holders: { account: string; count: number; pct: number }[];
  stats: { floor: number; volume24h: number; totalVolume: number; topSale: number; listed: number; owners: number; supply: number };
}

export async function loadLiveMarket(): Promise<LiveMarket> {
  const [tokens, seasons, listings, sales, stats] = await Promise.all([
    getTokens(0, 200),
    getSeasons(),
    mv<ListingJ[]>("get_listings", { from_index: 0, limit: 200 }),
    mv<SaleJ[]>("get_recent_sales", { limit: 100 }),
    mv<StatsJ>("get_stats"),
  ]);
  const byToken = new Map(listings.map((l) => [l.token_id, l]));
  const lastSale = new Map<string, SaleJ>();
  for (const s of sales) if (!lastSale.has(s.token_id)) lastSale.set(s.token_id, s);
  const items = tokens.map((t) => {
    const l = byToken.get(t.token_id);
    // Hide listings left behind after the NFT changed hands (buy would fail and refund anyway).
    const valid = l && l.owner_id === t.owner_id && t.effective_state !== "Redeeming" && t.effective_state !== "Reloading" ? l : undefined;
    return toItem(t, seasons.find((s) => s.id === t.info.season_id), valid, lastSale.get(t.token_id));
  });
  const byId = new Map(items.map((i) => [String(i.id), i]));
  const activity: DemoActivity[] = sales
    .map((s, k): DemoActivity | null => {
      const item = byId.get(s.token_id);
      return item ? { id: `sale-${k}-${s.sold_ns}`, kind: "sale", item, price: toNear(s.price), from: s.seller, to: s.buyer, minsAgo: minsSince(s.sold_ns) } : null;
    })
    .filter((a): a is DemoActivity => a !== null);
  const counts = new Map<string, number>();
  for (const t of tokens) if (t.owner_id) counts.set(t.owner_id, (counts.get(t.owner_id) ?? 0) + 1);
  const holders = [...counts.entries()].map(([account, count]) => ({ account, count, pct: (count / Math.max(1, tokens.length)) * 100 })).sort((a, b) => b.count - a.count);
  const dayAgo = BigInt(Date.now() - DAY_MS) * 1_000_000n;
  const listedPrices = items.filter((i) => i.price !== null).map((i) => i.price!);
  return {
    items,
    activity,
    holders,
    stats: {
      floor: listedPrices.length ? Math.min(...listedPrices) : 0,
      volume24h: sales.filter((s) => BigInt(s.sold_ns) >= dayAgo).reduce((a, s) => a + toNear(s.price), 0),
      totalVolume: toNear(stats.total_volume),
      topSale: stats.top_recent_sale ? toNear(stats.top_recent_sale) : 0,
      listed: listedPrices.length,
      owners: counts.size,
      supply: tokens.length,
    },
  };
}

/** The connected wallet's NFTs, shaped for the collection binder. */
export async function loadMyCollection(account: string): Promise<DemoMine[]> {
  const [tokens, seasons, listings] = await Promise.all([getTokensForOwner(account), getSeasons(), mv<ListingJ[]>("get_listings_by_owner", { owner_id: account }).catch(() => [] as ListingJ[])]);
  const byToken = new Map(listings.map((l) => [l.token_id, l]));
  return Promise.all(
    tokens.map(async (t) => {
      const item = toItem(t, seasons.find((s) => s.id === t.info.season_id), byToken.get(t.token_id), undefined);
      const order = await getOrder(t.info.origin_order_id).catch(() => null);
      const lockMs = Number(BigInt(t.info.lock_until_ns) / 1_000_000n);
      const listed = byToken.get(t.token_id);
      const state: DemoMine["state"] = listed ? "listed" : t.effective_state === "RedeemedEmpty" ? "empty" : t.effective_state === "Unlocked" ? "unlocked" : "locked";
      return {
        item,
        state,
        bag: state === "empty" ? 0 : order ? toNear(order.basket) : 0,
        unlockInDays: Math.max(0, Math.ceil((lockMs - Date.now()) / DAY_MS)),
        listPrice: listed ? toNear(listed.price) : null,
        mintedDaysAgo: Math.max(0, Math.floor((Date.now() - Number(BigInt(t.info.funded_at_ns) / 1_000_000n)) / DAY_MS)),
      };
    }),
  );
}

// ───────── wallet actions ─────────

export const buyCall = (tokenId: string | number, priceYocto: string): CallParams => ({
  receiverId: MARKET_CONTRACT!,
  method: "buy",
  args: { token_id: String(tokenId) },
  deposit: BigInt(priceYocto),
  tgas: 150,
});

/** Approving the market with a price = listing. 0.01 NEAR covers approval storage; the rest is refunded. */
export const listCall = (tokenId: string | number, priceYocto: bigint): CallParams => ({
  receiverId: CORE_CONTRACT!,
  method: "nft_approve",
  args: { token_id: String(tokenId), account_id: MARKET_CONTRACT!, msg: JSON.stringify({ price: priceYocto.toString() }) },
  deposit: 10n ** 22n,
  tgas: 60,
});

export const delistCall = (tokenId: string | number): CallParams => ({
  receiverId: MARKET_CONTRACT!,
  method: "delist",
  args: { token_id: String(tokenId) },
  deposit: 1n,
  tgas: 30,
});

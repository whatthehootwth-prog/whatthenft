"use client";
import { NearRpc } from "@wtn/chain";
import { CORE_CONTRACT, NETWORK, RPC_URLS } from "./config";

export const rpc = new NearRpc({ network: NETWORK, urls: RPC_URLS });

// ── JSON shapes returned by contracts/core (mirrors src/types.rs) ──
export type U128 = string;
export type U64 = string;

export interface SeasonMemeJ {
  meme_id: string;
  token: string;
  weight: number;
  slot_variants: number[];
  route: { kind: "RheaDcl" | "RheaV2"; pool_id: string };
  max_slippage_bps: number;
}

export interface SeasonJ {
  id: number;
  status: "Draft" | "Open" | "Closed";
  minted: number;
  in_flight: number;
  current_min_base: U128;
  opened_at_ns: U64 | null;
  config_hash: string | null;
  config: {
    name: string;
    mint_start_ns: U64;
    mint_end_ns: U64;
    max_supply: number;
    target_base: U128;
    min_base_floor: U128;
    max_base: U128;
    min_leg: U128;
    tiers: { min_base: U128; max_partners: number }[];
    lock_ns: U64;
    fees: { basket_bps: number; creator_bps: number; treasury_bps: number };
    royalty: { royalty_bps: number; creator_share_bps: number };
    allocation: { core_wth_bps: number; slot_weights_bps: number[] };
    rarity_bps: number[];
    wth_slot_bps: number;
    memes: SeasonMemeJ[];
    reserve: { storage_per_mint: U128; retry_reserve: U128; advance_fee: U128 };
    manifest_hash: string;
    media_base_uri: string;
    reload_enabled: boolean;
  };
}

export type LegStatusJ = "Pending" | "InFlight" | "Done" | "Failed" | "Unwinding" | "Unwound";
export type OrderStatusJ =
  | "Escrowed"
  | "TraitsAssigned"
  | "SwapsPending"
  | "FullyBackedLocked"
  | "FailedPreExecution"
  | "RefundPending"
  | "Refunded"
  | "PartialExecutionRecovery";

export interface LegJ {
  meme_idx: number;
  token: string;
  bps: number;
  amount_in: U128;
  acquired: U128;
  min_out: U128;
  attempts: number;
  status: LegStatusJ;
  last_error: string | null;
  unwind_out: U128;
  spent: boolean;
}

export interface SlotPickJ {
  meme_idx: number;
  variant: number;
}

export interface RevealJ {
  block_height: U64;
  random_seed_hex: string;
  seed_hex: string;
  version: string;
}

export interface OrderJ {
  id: U64;
  kind: "Mint" | { Reload: { token_id: string } };
  payer: string;
  season_id: number;
  base: U128;
  basket: U128;
  creator_fee: U128;
  treasury_fee: U128;
  storage_fee: U128;
  retry_reserve: U128;
  keeper_fees_paid: U128;
  status: OrderStatusJ;
  created_ns: U64;
  updated_ns: U64;
  request_block: U64;
  reveal: RevealJ | null;
  traits: { rarity: number; attempt: number; slots: SlotPickJ[] } | null;
  legs: LegJ[];
  wrapped: boolean;
  token_id: string | null;
  refunded: U128;
  note: string | null;
}

export type BackingStateJ = "FullyBackedLocked" | "Unlocked" | "Redeeming" | "RedeemedEmpty" | "Reloading";

export interface HoldingJ {
  meme_id: string;
  token: string;
  bps: number;
  amount: U128;
  pending_out: U128;
}

export interface TokenViewJ {
  token_id: string;
  owner_id: string | null;
  effective_state: BackingStateJ;
  info: {
    season_id: number;
    serial: number;
    traits: { rarity: number; attempt: number; slots: SlotPickJ[] };
    meme_ids: string[];
    holdings: HoldingJ[];
    state: BackingStateJ;
    funded_at_ns: U64;
    lock_until_ns: U64;
    origin_order_id: U64;
    reload_count: number;
    season_manifest_hash: string;
    reveal: RevealJ;
    media_cid: string | null;
  };
}

export interface CoreConfigJ {
  owner: string;
  creator_account: string;
  treasury_account: string;
  wrap_near: string;
  rhea_v2: string;
  rhea_dcl: string;
  mints_paused: boolean;
  season_count: number;
  next_order_id: U64;
  next_token_id: U64;
  storage_byte_cost: U128;
}

export const RARITY = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;

export class NotDeployedError extends Error {
  constructor() {
    super("Core contract is not configured for this deployment");
  }
}

function core(): string {
  if (!CORE_CONTRACT) throw new NotDeployedError();
  return CORE_CONTRACT;
}

export const coreView = <T,>(method: string, args: unknown = {}) => rpc.view<T>(core(), method, args);

export const getCoreConfig = () => coreView<CoreConfigJ>("get_config");
export const getSeasons = () => coreView<SeasonJ[]>("get_seasons");
export const getOrder = (id: string) => coreView<OrderJ | null>("get_order", { order_id: id });
export const getOrders = (fromId: string, limit: number) => coreView<OrderJ[]>("get_orders", { from_id: fromId, limit });
export const getToken = (id: string) => coreView<TokenViewJ | null>("nft_basket", { token_id: id });
export const getTokens = (from: number, limit: number) => coreView<TokenViewJ[]>("get_tokens", { from_index: from, limit });
export const getTokensForOwner = (account: string) => coreView<TokenViewJ[]>("get_tokens_for_owner", { account_id: account });
export const isOperator = (account: string) => coreView<boolean>("is_operator", { account_id: account });

export async function getNearBalance(account: string): Promise<bigint> {
  const a = await rpc.viewAccount(account);
  return BigInt(a.amount);
}

export async function ftStorageRegistered(token: string, account: string): Promise<boolean> {
  const r = await rpc.view<{ total: string } | null>(token, "storage_balance_of", { account_id: account });
  return r !== null;
}

/** Current season that is open (or latest), or null. */
export function pickActiveSeason(seasons: SeasonJ[]): SeasonJ | null {
  return seasons.find((s) => s.status === "Open") ?? seasons[seasons.length - 1] ?? null;
}

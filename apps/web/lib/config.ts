import { networkConfig, type Network } from "@wtn/chain";

const rawNetwork = process.env.NEXT_PUBLIC_NETWORK;
export const NETWORK: Network = rawNetwork === "mainnet" ? "mainnet" : "testnet";
export const CORE_CONTRACT = (process.env.NEXT_PUBLIC_CORE_CONTRACT ?? "").trim() || null;
export const MARKET_CONTRACT = (process.env.NEXT_PUBLIC_MARKET_CONTRACT ?? "").trim() || null;
export const RPC_URLS = (process.env.NEXT_PUBLIC_RPC_URLS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
export const NET = networkConfig(NETWORK);
/** Liquidity for quotes always comes from mainnet pools (testnet has no real meme markets). */
export const QUOTE_NET = networkConfig("mainnet");

export const explorerTx = (h: string) => NET.explorerTx(h);
export const explorerAccount = (a: string) => NET.explorerAccount(a);

/** Keeper configuration from environment variables. Secrets are read from env only and never logged. */
import type { Network } from "@wtn/chain";

export const WTH_DECIMALS = 18n;
export const ONE_WTH = 10n ** WTH_DECIMALS;
export const YOCTO = 10n ** 24n;

export interface KeeperConfig {
  network: Network;
  rpcUrl?: string;
  buybackContract: string;
  wthToken: string;
  keeperAccount?: string;
  /** e.g. "ed25519:…" — only needed with --send. */
  keeperPrivateKey?: string;
  thresholdUsd: number;
  minHolding: bigint;
  minPayout: bigint;
  exclude: string[];
  maxPriceDivergence: number;
  /** Testnet only: fixed NEAR/USD for rehearsals (mainnet prices do not exist on testnet). */
  testNearUsd?: number;
}

const MAINNET_WTH = "wth-0b2227.launchpad.justhoot.near";

/** Contracts that hold WTH on behalf of others or as liquidity — never paid out. */
export const DEFAULT_EXCLUDE = ["dclv2.ref-labs.near", "v2.ref-finance.near", "intents.near", "launchpad.justhoot.near", MAINNET_WTH];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): KeeperConfig {
  const network = (env.NETWORK ?? "testnet") as Network;
  if (network !== "mainnet" && network !== "testnet") throw new Error("NETWORK must be mainnet or testnet");
  const buybackContract = env.BUYBACK_CONTRACT;
  if (!buybackContract) throw new Error("Set BUYBACK_CONTRACT (the buyback treasury account)");
  const wthToken = env.WTH_TOKEN ?? (network === "mainnet" ? MAINNET_WTH : "");
  if (!wthToken) throw new Error("Set WTH_TOKEN for testnet");
  const extra = (env.EXCLUDE ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const keeperAccount = env.KEEPER_ACCOUNT;
  return {
    network,
    rpcUrl: env.RPC_URL,
    buybackContract,
    wthToken,
    keeperAccount,
    keeperPrivateKey: env.KEEPER_PRIVATE_KEY,
    thresholdUsd: Number(env.THRESHOLD_USD ?? 20),
    minHolding: BigInt(env.MIN_HOLDING_WTH ?? 1000) * ONE_WTH,
    minPayout: BigInt(env.MIN_PAYOUT_WTH ?? 1) * ONE_WTH,
    exclude: Array.from(new Set([...DEFAULT_EXCLUDE, wthToken, buybackContract, ...(keeperAccount ? [keeperAccount] : []), ...extra])),
    maxPriceDivergence: Number(env.MAX_PRICE_DIVERGENCE ?? 0.1),
    testNearUsd: testPrice(network, env.TEST_NEAR_USD),
  };
}

export const fmt = (raw: bigint, decimals: bigint, dp = 4): string => {
  const base = 10n ** decimals;
  const whole = raw / base;
  const frac = (raw % base).toString().padStart(Number(decimals), "0").slice(0, dp);
  return `${whole.toLocaleString("en-US")}.${frac}`;
};

function testPrice(network: Network, raw?: string): number | undefined {
  if (!raw) return undefined;
  if (network === "mainnet") throw new Error("TEST_NEAR_USD is only allowed on testnet");
  const n = Number(raw);
  if (!(n > 0)) throw new Error("TEST_NEAR_USD must be a positive number");
  return n;
}

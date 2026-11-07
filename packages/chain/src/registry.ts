import type { Network } from "./rpc";

/**
 * Verified NEAR asset + route registry. Entries are matched by FULL contract id, never by
 * ticker. Presence here only means "route verified to exist"; public minting additionally
 * requires a signed season manifest with confirmed artwork rights (see packages/domain manifest).
 *
 * Mainnet entries were verified on 2026-11-07 via ft_metadata + Rhea pool reads
 * (docs/FEASIBILITY.md). Re-verify with `pnpm feasibility` before any season opens.
 */
export interface RouteRef {
  kind: "rhea-dcl" | "rhea-v2";
  /** DCL: "tokenX|tokenY|fee"; v2: numeric pool id as string. */
  poolId: string;
}

export interface AssetEntry {
  memeId: string;
  symbol: string;
  name: string;
  contractId: string;
  decimals: number;
  route: RouteRef;
  isWth: boolean;
  notes?: string;
}

export interface NetworkConfig {
  network: Network;
  wrapNear: string;
  rheaV2: string;
  rheaDcl: string;
  explorerTx: (hash: string) => string;
  explorerAccount: (id: string) => string;
  assets: AssetEntry[];
}

export const MAINNET: NetworkConfig = {
  network: "mainnet",
  wrapNear: "wrap.near",
  rheaV2: "v2.ref-finance.near",
  rheaDcl: "dclv2.ref-labs.near",
  explorerTx: (h) => `https://nearblocks.io/txns/${h}`,
  explorerAccount: (a) => `https://nearblocks.io/address/${a}`,
  assets: [
    {
      memeId: "wth",
      symbol: "WTH",
      name: "WHAT THE HOOT",
      contractId: "wth-0b2227.launchpad.justhoot.near",
      decimals: 18,
      route: { kind: "rhea-dcl", poolId: "wrap.near|wth-0b2227.launchpad.justhoot.near|10000" },
      isWth: true,
      notes: "Not supported by NEAR Intents 1Click (tokenOut is not valid). Rhea DCL 1% fee pool is the only material liquidity.",
    },
    { memeId: "shitzu", symbol: "SHITZU", name: "Shitzu", contractId: "token.0xshitzu.near", decimals: 18, route: { kind: "rhea-v2", poolId: "4369" }, isWth: false },
    { memeId: "blackdragon", symbol: "BLACKDRAGON", name: "Black Dragon", contractId: "blackdragon.tkn.near", decimals: 24, route: { kind: "rhea-v2", poolId: "4276" }, isWth: false },
    { memeId: "jambo", symbol: "JAMBO", name: "Jambo", contractId: "jambo-1679.meme-cooking.near", decimals: 18, route: { kind: "rhea-v2", poolId: "6518" }, isWth: false },
    { memeId: "kat", symbol: "KAT", name: "NearKat", contractId: "kat.token0.near", decimals: 18, route: { kind: "rhea-v2", poolId: "5391" }, isWth: false },
    { memeId: "purge", symbol: "PURGE", name: "Purge", contractId: "purge-558.meme-cooking.near", decimals: 18, route: { kind: "rhea-v2", poolId: "5650" }, isWth: false },
  ],
};

/**
 * Testnet has no real WTH or partner memes. Milestone A testnet runs use project-deployed
 * test FTs and pools on Rhea testnet; those ids are filled in after deployment and are
 * clearly named `*-test`. Until then testnet minting is disabled (empty asset list).
 */
export const TESTNET: NetworkConfig = {
  network: "testnet",
  wrapNear: "wrap.testnet",
  rheaV2: "ref-finance-101.testnet",
  rheaDcl: "dclv2.ref-dev.testnet",
  explorerTx: (h) => `https://testnet.nearblocks.io/txns/${h}`,
  explorerAccount: (a) => `https://testnet.nearblocks.io/address/${a}`,
  assets: [],
};

export const networkConfig = (n: Network): NetworkConfig => (n === "mainnet" ? MAINNET : TESTNET);
export const findAsset = (n: NetworkConfig, memeId: string): AssetEntry | undefined => n.assets.find((a) => a.memeId === memeId);

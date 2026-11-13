import type { Network } from "./rpc";

/**
 * Verified NEAR asset + route registry. Entries are matched by FULL contract id, never by
 * ticker. Presence here only means "route verified to exist"; public minting additionally
 * requires a signed season manifest with confirmed artwork rights (see packages/domain manifest).
 *
 * Mainnet entries verified on 2026-11-13: ft_metadata + ft_total_supply + RHEA DCL 1% pool quotes
 * (price impact < 0.05% at 0.68 NEAR legs). Re-verify with `pnpm feasibility` before any season opens.
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
    { memeId: "wth", symbol: "WTH", name: "WHAT THE HOOT", contractId: "wth-0b2227.launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "wrap.near|wth-0b2227.launchpad.justhoot.near|10000" }, isWth: true },
    { memeId: "nearkat", symbol: "NEARKAT", name: "NearKat", contractId: "nearkat-630f25.nearlytrade.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "nearkat-630f25.nearlytrade.near|wrap.near|10000" }, isWth: false },
    { memeId: "hoodl", symbol: "HOODL", name: "HOODL", contractId: "hoodl-95275b.launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "hoodl-95275b.launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "hooters", symbol: "HOOTERS", name: "HOOTERS: The Best Pair on NEAR", contractId: "hooters-f5dd7a.launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "hooters-f5dd7a.launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "three", symbol: "THREE", name: "Three", contractId: "three-de86d6.launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "three-de86d6.launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "moonshot", symbol: "MOONSHOT", name: "Moonshot", contractId: "moonshot.v2-launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "moonshot.v2-launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "raen", symbol: "RAEN", name: "RAEN", contractId: "raen-e1328c.launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "raen-e1328c.launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "mallace", symbol: "MALLACE", name: "Mallace", contractId: "mallace.v2-launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "mallace.v2-launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "idp", symbol: "IKP", name: "INDERNED KEPUTER", contractId: "ikp.v2-launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "ikp.v2-launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "robinhoot", symbol: "ROBINHOOT", name: "Robinhoot", contractId: "robinhoot-2.v2-launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "robinhoot-2.v2-launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "cybernetic", symbol: "IMEME", name: "iMeme", contractId: "imeme-2.v2-launchpad.justhoot.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "imeme-2.v2-launchpad.justhoot.near|wrap.near|10000" }, isWth: false },
    { memeId: "batman", symbol: "BATMAN", name: "Batman", contractId: "batman-4.nearlytrade.near", decimals: 18, route: { kind: "rhea-dcl", poolId: "batman-4.nearlytrade.near|wrap.near|10000" }, isWth: false },
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

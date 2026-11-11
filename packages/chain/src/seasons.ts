import { DEFAULT_ALLOCATION_RULE, DEFAULT_MINT_FEES, DEFAULT_RARITY_BPS, DEFAULT_ROYALTY, parseNear, type Slot } from "@wtn/domain";

/**
 * Season 01 "MEME GENESIS" — DRAFT proposal, NOT an open season.
 * Used before contracts are deployed to show live executability of the proposed pool.
 * Partner art rights are unconfirmed, so no partner is approved for minting yet.
 * The on-chain season (once created + opened) always supersedes this file.
 */
export interface DraftMeme {
  memeId: string;
  weight: number;
  slots: Slot[];
  approvedForMint: boolean;
  artSupplied: boolean;
}

export const SEASON_01_DRAFT = {
  seasonId: 1,
  name: "MEME GENESIS",
  status: "DRAFT" as const,
  maxSupply: 111,
  /** Open until sold out: the window just has to be far in the future (contract requires an end). */
  mintWindowDays: 3650,
  lockDays: 30,
  /** Fixed price: every mint is exactly 1 NEAR. */
  targetBase: parseNear("1"),
  maxBase: parseNear("1"),
  minLeg: parseNear("0.005"),
  maxPriceImpactBps: 300,
  tiers: [
    { minBase: 0n, maxPartners: 1 },
    { minBase: parseNear("1"), maxPartners: 2 },
    { minBase: parseNear("5"), maxPartners: 3 },
  ],
  fees: DEFAULT_MINT_FEES,
  royalty: DEFAULT_ROYALTY,
  allocation: DEFAULT_ALLOCATION_RULE,
  rarityBps: DEFAULT_RARITY_BPS,
  wthSlotBps: 3000,
  reserve: {
    storagePerMint: parseNear("0.009"), // measured 650 bytes (0.0065 NEAR) for a 2-leg mint in contracts/core tests; margin for 4 legs
    retryReserve: parseNear("0.03"),
    advanceFee: parseNear("0.01"),
  },
  /** Rough network gas the minter's own wallet pays for the mint tx (300 Tgas attached, ~25 Tgas burnt). */
  estMintTxGas: parseNear("0.003"),
  memes: [
    { memeId: "wth", weight: 0, slots: ["head", "face", "body", "arms", "legs", "accessory"], approvedForMint: false, artSupplied: false },
    { memeId: "shitzu", weight: 30, slots: ["head", "face", "body", "arms", "legs", "accessory"], approvedForMint: false, artSupplied: false },
    { memeId: "blackdragon", weight: 25, slots: ["head", "face", "body", "arms", "legs", "accessory"], approvedForMint: false, artSupplied: false },
    { memeId: "jambo", weight: 25, slots: ["head", "face", "body", "arms", "legs", "accessory"], approvedForMint: false, artSupplied: false },
    { memeId: "kat", weight: 20, slots: ["head", "face", "body", "arms", "legs", "accessory"], approvedForMint: false, artSupplied: false },
  ] satisfies DraftMeme[],
};

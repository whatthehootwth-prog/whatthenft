import { DEFAULT_ALLOCATION_RULE, DEFAULT_MINT_FEES, DEFAULT_RARITY_BPS, DEFAULT_ROYALTY, parseNear, type Slot } from "@wtn/domain";

/**
 * Season 01 "MEME GENESIS" — DRAFT proposal, NOT an open season.
 * Used before contracts are deployed to show live executability of the proposed pool.
 * 12 memes with verified tokens + deep RHEA DCL pools. approvedForMint: the founder confirmed partner
 * art/name permission on 2026-11-15. OYSTER, QCAT and NINU are excluded (no usable wNEAR route).
 * The on-chain season (once created + opened) always supersedes this file.
 */
export interface DraftMeme {
  memeId: string;
  weight: number;
  slots: Slot[];
  approvedForMint: boolean;
  artSupplied: boolean;
}

/** Season 01 fixed mint price (base, in NEAR). Chosen 2026-11-15: cheap enough to go viral, big enough for a real bag. */
export const SEASON_01_PRICE_NEAR = "0.3";

export const SEASON_01_DRAFT = {
  seasonId: 1,
  name: "MEME GENESIS",
  status: "DRAFT" as const,
  maxSupply: 111,
  /** Open until sold out: the window just has to be far in the future (contract requires an end). */
  mintWindowDays: 3650,
  lockDays: 30,
  /** Fixed price: every mint is exactly SEASON_01_PRICE_NEAR. */
  targetBase: parseNear(SEASON_01_PRICE_NEAR),
  maxBase: parseNear(SEASON_01_PRICE_NEAR),
  minLeg: parseNear("0.005"),
  maxPriceImpactBps: 300,
  tiers: [
    // 0.3 NEAR already gets WTH + up to 2 partners (smallest leg ≈ 0.02 NEAR, well above minLeg)
    { minBase: 0n, maxPartners: 2 },
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
    { memeId: "wth", weight: 0, slots: ["head","face","body","arms","legs","accessory"], approvedForMint: true, artSupplied: true },
    { memeId: "nearkat", weight: 10, slots: ["body","accessory"], approvedForMint: true, artSupplied: true },
    { memeId: "hoodl", weight: 10, slots: ["head","body","arms"], approvedForMint: true, artSupplied: true },
    { memeId: "hooters", weight: 10, slots: ["legs","accessory"], approvedForMint: true, artSupplied: true },
    { memeId: "three", weight: 10, slots: ["face","body"], approvedForMint: true, artSupplied: true },
    { memeId: "moonshot", weight: 10, slots: ["head","arms","accessory"], approvedForMint: true, artSupplied: true },
    { memeId: "raen", weight: 10, slots: ["body"], approvedForMint: true, artSupplied: true },
    { memeId: "mallace", weight: 10, slots: ["body"], approvedForMint: true, artSupplied: true },
    { memeId: "idp", weight: 10, slots: ["arms","accessory"], approvedForMint: true, artSupplied: true },
    { memeId: "robinhoot", weight: 10, slots: ["head","arms","accessory"], approvedForMint: true, artSupplied: true },
    { memeId: "cybernetic", weight: 10, slots: ["head","face","body","legs"], approvedForMint: true, artSupplied: true },
    { memeId: "batman", weight: 10, slots: ["head","legs","accessory"], approvedForMint: true, artSupplied: true },
  ] satisfies DraftMeme[],
};

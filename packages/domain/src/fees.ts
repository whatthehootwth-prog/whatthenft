import { BPS, assertBps } from "./units";

export interface MintFeeSchedule {
  basketBps: number; // default 9000
  creatorBps: number; // default 500
  treasuryBps: number; // default 500
}

export interface RoyaltySchedule {
  royaltyBps: number; // default 250 (2.5% of sale price)
  creatorShareOfRoyaltyBps: number; // default 1000 (10% of royalty)
}

export const DEFAULT_MINT_FEES: MintFeeSchedule = { basketBps: 9000, creatorBps: 500, treasuryBps: 500 };
export const DEFAULT_ROYALTY: RoyaltySchedule = { royaltyBps: 250, creatorShareOfRoyaltyBps: 1000 };

export function validateMintFees(s: MintFeeSchedule): void {
  assertBps("basketBps", s.basketBps);
  assertBps("creatorBps", s.creatorBps);
  assertBps("treasuryBps", s.treasuryBps);
  if (s.basketBps + s.creatorBps + s.treasuryBps !== 10_000) {
    throw new Error(`Mint fee schedule must sum to 10000 bps, got ${s.basketBps + s.creatorBps + s.treasuryBps}`);
  }
}

export interface MintSplit {
  basket: bigint;
  creator: bigint;
  treasury: bigint;
}

/**
 * Split the base mint payment. Rounding policy (mirrored in contracts/core):
 * creator and treasury are floored; any remainder dust stays in the user's basket.
 * basket + creator + treasury === base, always.
 */
export function splitMint(base: bigint, s: MintFeeSchedule = DEFAULT_MINT_FEES): MintSplit {
  validateMintFees(s);
  if (base < 0n) throw new Error("negative base");
  const creator = (base * BigInt(s.creatorBps)) / BPS;
  const treasury = (base * BigInt(s.treasuryBps)) / BPS;
  return { basket: base - creator - treasury, creator, treasury };
}

export interface RoyaltySplit {
  sellerProceeds: bigint;
  royalty: bigint;
  creator: bigint;
  treasury: bigint;
}

/**
 * Split a completed native-marketplace sale. royalty = floor(price * royaltyBps);
 * creator = floor(royalty * creatorShare); treasury = royalty - creator.
 * No other marketplace commission exists.
 */
export function splitRoyalty(price: bigint, s: RoyaltySchedule = DEFAULT_ROYALTY): RoyaltySplit {
  assertBps("royaltyBps", s.royaltyBps);
  assertBps("creatorShareOfRoyaltyBps", s.creatorShareOfRoyaltyBps);
  if (s.royaltyBps > 5000) throw new Error("royaltyBps above 50% is not allowed");
  if (price < 0n) throw new Error("negative price");
  const royalty = (price * BigInt(s.royaltyBps)) / BPS;
  const creator = (royalty * BigInt(s.creatorShareOfRoyaltyBps)) / BPS;
  return { sellerProceeds: price - royalty, royalty, creator, treasury: royalty - creator };
}

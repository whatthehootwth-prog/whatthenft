import { describe, expect, it } from "vitest";
import {
  ONE_NEAR,
  assertTransition,
  canTransition,
  getExecutableMintMinimum,
  manifestHash,
  memeManifestSchema,
  nftActionAllowed,
  parseNear,
  valueBasket,
  type MinimumInputs,
} from "../src";

const now = 1_800_000_000_000;
const baseInputs = (over: Partial<MinimumInputs> = {}): MinimumInputs => ({
  seasonId: 1,
  targetBase: parseNear("0.1"),
  maxBase: parseNear("50"),
  minLegAmount: parseNear("0.01"),
  maxPriceImpactBps: 300,
  quoteMaxAgeMs: 60_000,
  tiers: [
    { minBase: 0n, maxPartners: 1 },
    { minBase: parseNear("1"), maxPartners: 2 },
    { minBase: parseNear("5"), maxPartners: 3 },
  ],
  memes: [
    { memeId: "wth", isWth: true, eligibleSlots: ["head", "face", "body", "arms", "legs", "accessory"], route: "rhea-dcl", routeMinInput: 0n, enabled: true },
    { memeId: "shitzu", isWth: false, eligibleSlots: ["head", "body", "accessory"], route: "rhea-v2", routeMinInput: 0n, enabled: true },
  ],
  quotes: [
    { memeId: "wth", amountIn: parseNear("0.01"), amountOut: 2_700n * 10n ** 18n, priceImpactBps: 5, quotedAt: now - 1000, provider: "rhea-dcl" },
    { memeId: "shitzu", amountIn: parseNear("0.01"), amountOut: 24n * 10n ** 18n, priceImpactBps: 20, quotedAt: now - 1000, provider: "rhea-v2" },
  ],
  costs: { storagePerMint: parseNear("0.01"), advanceFeePerStep: parseNear("0.001"), baseSteps: 3, stepsPerLeg: 2 },
  now,
  ...over,
});

describe("executable minimum engine", () => {
  it("0.1 is feasible when the smallest leg clears minimums", () => {
    // shitzu min share: head 2000*0.8 = 1600 bps. 0.01 / 0.16 = 0.0625 basket -> 0.069445 base
    const r = getExecutableMintMinimum(baseInputs());
    expect(r.executableMinimum).toBe(parseNear("0.1"));
    expect(r.targetFeasible).toBe(true);
    expect(r.check(parseNear("0.1")).ok).toBe(true);
    expect(r.check(parseNear("0.1")).maxPartners).toBe(1);
    expect(r.check(parseNear("1")).maxPartners).toBe(2);
  });

  it("0.1 infeasible -> rejects with a nonzero computed minimum, never a false success", () => {
    const r = getExecutableMintMinimum(baseInputs({ minLegAmount: parseNear("0.02") }));
    // face-capable partner would be 800 bps; shitzu (head/body/accessory) is 1600 bps
    // 0.02 / 0.16 = 0.125 basket -> ceil(0.125 / 0.9) = 0.13888...9 NEAR
    expect(r.targetFeasible).toBe(false);
    expect(r.executableMinimum).not.toBeNull();
    expect(r.executableMinimum! > parseNear("0.1")).toBe(true);
    expect(r.executableMinimum).toBe(138_888_888_888_888_888_888_889n);
    expect(r.check(parseNear("0.1")).ok).toBe(false);
    expect(r.check(parseNear("0.1")).reason).toMatch(/minimum/i);
  });

  it("missing liquidity blocks minting entirely instead of inventing a quote", () => {
    const r = getExecutableMintMinimum(
      baseInputs({ quotes: [baseInputs().quotes[0]!, { memeId: "shitzu", amountIn: parseNear("0.01"), amountOut: null, priceImpactBps: null, quotedAt: now, provider: "1click", error: "No liquidity available" }] }),
    );
    expect(r.executableMinimum).toBeNull();
    expect(r.check(parseNear("100")).ok).toBe(false);
    expect(r.reasons.join()).toMatch(/NO_LIQUIDITY/);
  });

  it("expired quotes block minting", () => {
    const r = getExecutableMintMinimum(baseInputs({ now: now + 120_000 }));
    expect(r.executableMinimum).toBeNull();
    expect(r.perMeme.every((p) => p.blocker === "QUOTE_EXPIRED")).toBe(true);
  });

  it("execution reserve is quoted separately and scales with legs", () => {
    const r = getExecutableMintMinimum(baseInputs());
    expect(r.executionReserve(2)).toBe(parseNear("0.01") + parseNear("0.001") * 7n);
  });
});

describe("meme manifest validation", () => {
  const good = {
    schemaVersion: 1,
    memeId: "shitzu",
    displayName: "Shitzu",
    chain: "near",
    tokenContractId: "token.0xshitzu.near",
    tokenSymbol: "SHITZU",
    tokenDecimals: 18,
    activeInSeasons: [1],
    approvedForMint: false,
    commercialArtworkRightsConfirmed: false,
    artLicenseReference: null,
    slots: ["head", "body"],
    minLiquidityNear: "500",
    maxSlippageBps: 200,
    canvas: { width: 1024, height: 1024 },
  };
  it("accepts a valid draft", () => expect(memeManifestSchema.safeParse(good).success).toBe(true));
  it("rejects placeholder contract ids", () => expect(memeManifestSchema.safeParse({ ...good, tokenContractId: "replace-with-verified-real-contract.near" }).success).toBe(false));
  it("rejects approval without art rights", () => expect(memeManifestSchema.safeParse({ ...good, approvedForMint: true }).success).toBe(false));
  it("rejects approval of NOT FOR PRODUCTION art", () =>
    expect(memeManifestSchema.safeParse({ ...good, approvedForMint: true, commercialArtworkRightsConfirmed: true, artLicenseReference: "partner-agreement-2026-01", notForProduction: true }).success).toBe(false));
  it("rejects unknown keys and non-NEAR chains", () => {
    expect(memeManifestSchema.safeParse({ ...good, evil: "<script>" }).success).toBe(false);
    expect(memeManifestSchema.safeParse({ ...good, chain: "solana" }).success).toBe(false);
  });
  it("hash is key-order independent", () => {
    expect(manifestHash({ a: 1, b: [1, 2] })).toBe(manifestHash({ b: [1, 2], a: 1 }));
    expect(manifestHash({ a: 1 })).not.toBe(manifestHash({ a: 2 }));
  });
});

describe("state machine", () => {
  it("cannot mint a tradable NFT straight from escrow", () => {
    expect(canTransition("ESCROWED", "FULLY_BACKED_LOCKED")).toBe(false);
    expect(() => assertTransition("SWAPS_PENDING", "REFUNDED")).toThrow();
    expect(canTransition("SWAPS_PENDING", "PARTIAL_EXECUTION_RECOVERY")).toBe(true);
  });
  it("locked NFTs can trade but not redeem; empty NFTs can reload", () => {
    expect(nftActionAllowed("FULLY_BACKED_LOCKED", "redeem")).toBe(false);
    expect(nftActionAllowed("FULLY_BACKED_LOCKED", "transfer")).toBe(true);
    expect(nftActionAllowed("UNLOCKED", "redeem")).toBe(true);
    expect(nftActionAllowed("REDEEMED_EMPTY", "redeem")).toBe(false);
    expect(nftActionAllowed("REDEEMED_EMPTY", "reload")).toBe(true);
  });
});

describe("NAV", () => {
  it("missing price is UNAVAILABLE, not zero", () => {
    const v = valueBasket([
      { memeId: "wth", balance: 10n, sellQuoteOut: ONE_NEAR, quotedAt: now },
      { memeId: "x", balance: 5n },
    ]);
    expect(v.totalYocto).toBeNull();
    expect(v.method).toBe("UNAVAILABLE");
  });
  it("spot pricing is labelled ESTIMATED", () => {
    const v = valueBasket([{ memeId: "wth", balance: 10n, spotYoctoPerUnit: { num: 3n, den: 1n }, quotedAt: now }]);
    expect(v.method).toBe("ESTIMATED_SPOT");
    expect(v.totalYocto).toBe(30n);
  });
});

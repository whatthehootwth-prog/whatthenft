import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, deriveSeed, deriveTraits, fromHex, hex, parseNear, type DerivationConfig } from "../src";

export const VECTOR_CONFIG = (maxPartners: number, minLeg: string): DerivationConfig => ({
  memes: [
    { memeId: "wth", weight: 0, slotVariants: [3, 3, 3, 3, 3, 3] },
    { memeId: "shitzu", weight: 50, slotVariants: [2, 2, 2, 2, 0, 2] },
    { memeId: "blackdragon", weight: 30, slotVariants: [1, 1, 1, 1, 1, 1] },
    { memeId: "jambo", weight: 20, slotVariants: [1, 0, 1, 0, 1, 1] },
  ],
  rarityBps: [6000, 2500, 1000, 400, 100],
  wthSlotBps: 3000,
  maxPartners,
  minLegAmount: parseNear(minLeg),
});

const VECTOR_FILE = resolve(__dirname, "../../../test-vectors/traits-v1.json");

function buildVectors() {
  const out = [];
  const cases: [number, string, string][] = [
    [1, "0.01", "0.09"],
    [1, "0.01", "0.9"],
    [2, "0.01", "0.9"],
    [2, "0.05", "0.09"],
  ];
  for (let i = 0; i < 48; i++) {
    const [maxPartners, minLeg, basket] = cases[i % cases.length]!;
    const randomSeed = sha256(new TextEncoder().encode(`wtn-vector-${i}`));
    const orderId = BigInt(i * 7919 + 1);
    const seed = deriveSeed(randomSeed, orderId);
    const t = deriveTraits(seed, VECTOR_CONFIG(maxPartners, minLeg), parseNear(basket));
    out.push({
      randomSeed: hex(randomSeed),
      orderId: orderId.toString(),
      maxPartners,
      minLegYocto: parseNear(minLeg).toString(),
      basketYocto: parseNear(basket).toString(),
      seed: hex(seed),
      rarity: t.rarity,
      attempt: t.attempt,
      slots: t.slots.map((s) => [s.memeId, s.variant]),
      weights: t.weights.map((w) => [w.memeId, w.bps]),
      legs: t.legs.map((l) => [l.memeId, l.amountIn.toString()]),
    });
  }
  return out;
}

describe("trait derivation", () => {
  it("is deterministic for (randomSeed, orderId) and depends on nothing else", () => {
    const rs = sha256(new TextEncoder().encode("x"));
    const a = deriveTraits(deriveSeed(rs, 5n), VECTOR_CONFIG(1, "0.01"), parseNear("0.09"));
    const b = deriveTraits(deriveSeed(rs, 5n), VECTOR_CONFIG(1, "0.01"), parseNear("0.09"));
    expect(a).toEqual(b);
    const c = deriveTraits(deriveSeed(rs, 6n), VECTOR_CONFIG(1, "0.01"), parseNear("0.09"));
    expect(hex(deriveSeed(rs, 5n))).not.toBe(hex(deriveSeed(rs, 6n)));
    expect(c).toBeDefined();
  });

  it("art providers match the financial allocation exactly", () => {
    for (let i = 0; i < 500; i++) {
      const seed = sha256(new TextEncoder().encode(`m${i}`));
      const t = deriveTraits(seed, VECTOR_CONFIG(2, "0.005"), parseNear("0.5"));
      const providers = new Set(t.slots.map((s) => s.memeId));
      const weighted = new Set(t.weights.map((w) => w.memeId));
      // every token with weight is either WTH (core) or provides at least one slot, and vice versa
      for (const id of weighted) expect(id === "wth" || providers.has(id)).toBe(true);
      for (const id of providers) expect(weighted.has(id)).toBe(true);
      // partner never shown on a slot it has no art for
      for (const s of t.slots) {
        const meme = VECTOR_CONFIG(2, "0").memes.find((m) => m.memeId === s.memeId)!;
        const idx = ["head", "face", "body", "arms", "legs", "accessory"].indexOf(s.slot);
        expect(s.variant).toBeLessThan(meme.slotVariants[idx]!);
      }
      expect(t.weights.reduce((a, w) => a + w.bps, 0)).toBe(10_000);
    }
  });

  it("low tier never exceeds WTH + one partner and every leg clears the minimum", () => {
    for (let i = 0; i < 2000; i++) {
      const t = deriveTraits(sha256(new TextEncoder().encode(`low${i}`)), VECTOR_CONFIG(1, "0.01"), parseNear("0.09"));
      expect(t.weights.length).toBeLessThanOrEqual(2);
      for (const l of t.legs) expect(l.amountIn >= parseNear("0.01") || t.attempt === MAX_ATTEMPTS).toBe(true);
    }
  });

  it("rarity frequencies match the disclosed 60/25/10/4/1 distribution", () => {
    const n = 100_000;
    const counts: Record<string, number> = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0, MYTHIC: 0 };
    const cfg = VECTOR_CONFIG(1, "0");
    for (let i = 0; i < n; i++) {
      const seed = sha256(new TextEncoder().encode(`r${i}`));
      counts[deriveTraits(seed, cfg, 1_000_000n).rarity]! += 1;
    }
    const expected = { COMMON: 0.6, RARE: 0.25, EPIC: 0.1, LEGENDARY: 0.04, MYTHIC: 0.01 };
    for (const [k, p] of Object.entries(expected)) {
      const sd = Math.sqrt(n * p * (1 - p));
      expect(Math.abs(counts[k]! - n * p)).toBeLessThan(5 * sd);
    }
  }, 60_000);

  it("rarity does not depend on composition/attempt (art rarity is not financial)", () => {
    const seed = sha256(new TextEncoder().encode("same"));
    const a = deriveTraits(seed, VECTOR_CONFIG(1, "0"), parseNear("0.09"));
    const b = deriveTraits(seed, VECTOR_CONFIG(2, "0.08"), parseNear("0.09"));
    expect(a.rarity).toBe(b.rarity);
  });

  it("matches the committed cross-language vectors (contracts/core reads the same file)", () => {
    const vectors = buildVectors();
    if (process.env.UPDATE_VECTORS === "1" || !existsSync(VECTOR_FILE)) {
      writeFileSync(VECTOR_FILE, JSON.stringify({ version: "WTN-TRAITS-v1", config: "see packages/domain/test/traits.test.ts VECTOR_CONFIG", vectors }, null, 1) + "\n");
    }
    const file = JSON.parse(readFileSync(VECTOR_FILE, "utf8"));
    expect(file.vectors).toEqual(vectors);
    expect(fromHex(vectors[0]!.seed)).toHaveLength(32);
  });
});

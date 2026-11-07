import { describe, expect, it } from "vitest";
import { DEFAULT_ALLOCATION_RULE, SLOTS, formatNear, legAmounts, parseNear, splitMint, splitRoyalty, tokenWeights, type SlotProviders } from "../src";

describe("mint split 90/5/5", () => {
  it("0.1 NEAR -> 0.09 / 0.005 / 0.005 exactly", () => {
    const s = splitMint(parseNear("0.1"));
    expect(s.basket).toBe(parseNear("0.09"));
    expect(s.creator).toBe(parseNear("0.005"));
    expect(s.treasury).toBe(parseNear("0.005"));
  });

  it("always conserves the base and never rounds against the basket", () => {
    const samples = [0n, 1n, 7n, 19n, 9_999n, 10_001n, parseNear("0.123456789012345678901234"), parseNear("12345.6789"), 2n ** 127n];
    for (const base of samples) {
      const s = splitMint(base);
      expect(s.basket + s.creator + s.treasury).toBe(base);
      expect(s.basket * 10_000n).toBeGreaterThanOrEqual(base * 9_000n);
      expect(s.creator).toBe((base * 500n) / 10_000n);
    }
  });

  it("rejects schedules that do not sum to 100%", () => {
    expect(() => splitMint(1000n, { basketBps: 9000, creatorBps: 500, treasuryBps: 400 })).toThrow();
  });
});

describe("royalty 2.5% with 10/90 split", () => {
  it("10 NEAR sale -> 9.75 seller, 0.025 creator, 0.225 treasury", () => {
    const r = splitRoyalty(parseNear("10"));
    expect(r.sellerProceeds).toBe(parseNear("9.75"));
    expect(r.creator).toBe(parseNear("0.025"));
    expect(r.treasury).toBe(parseNear("0.225"));
    expect(r.royalty).toBe(parseNear("0.25"));
  });

  it("conserves price for small and large inputs", () => {
    for (const p of [0n, 1n, 39n, 40n, 41n, 399n, parseNear("0.000001"), parseNear("999999.999"), 2n ** 120n]) {
      const r = splitRoyalty(p);
      expect(r.sellerProceeds + r.creator + r.treasury).toBe(p);
      expect(r.creator + r.treasury).toBe(r.royalty);
    }
  });
});

describe("part -> token allocation", () => {
  const example: SlotProviders = { head: "wth", face: "bonk", body: "batman", arms: "bonk", legs: "wth", accessory: "batman" };

  it("matches the brief: WTH 44 / BONK 16 / BATMAN 40", () => {
    const w = tokenWeights(example, "wth");
    expect(w).toEqual([
      { memeId: "wth", bps: 4400 },
      { memeId: "bonk", bps: 1600 },
      { memeId: "batman", bps: 4000 },
    ]);
  });

  it("0.09 NEAR basket -> 0.0396 / 0.0144 / 0.036", () => {
    const legs = legAmounts(parseNear("0.09"), tokenWeights(example, "wth"));
    expect(legs.map((l) => formatNear(l.amountIn, 24))).toEqual(["0.0396", "0.0144", "0.036"]);
    expect(legs.reduce((a, l) => a + l.amountIn, 0n)).toBe(parseNear("0.09"));
  });

  it("all-WTH composition is 100% WTH", () => {
    const all = Object.fromEntries(SLOTS.map((s) => [s, "wth"])) as SlotProviders;
    expect(tokenWeights(all, "wth")).toEqual([{ memeId: "wth", bps: 10_000 }]);
  });

  it("sum is exactly 10000 bps for every composition over 4 memes, even with odd weights", () => {
    const ids = ["wth", "a", "b", "c"];
    const odd = { coreWthBps: 1999, slotWeightsBps: { head: 1667, face: 1666, body: 1667, arms: 1667, legs: 1666, accessory: 1667 } };
    let n = 0;
    for (let mask = 0; mask < 4 ** 6; mask++) {
      const p = {} as SlotProviders;
      SLOTS.forEach((s, i) => (p[s] = ids[Math.floor(mask / 4 ** i) % 4]!));
      for (const rule of [DEFAULT_ALLOCATION_RULE, odd]) {
        const w = tokenWeights(p, "wth", rule);
        expect(w.reduce((a, x) => a + x.bps, 0)).toBe(10_000);
        expect(w[0]!.memeId).toBe("wth");
        n++;
      }
    }
    expect(n).toBe(2 * 4096);
  });

  it("leg dust goes to WTH and amounts conserve the basket", () => {
    const legs = legAmounts(10_001n, tokenWeights(example, "wth"));
    expect(legs.reduce((a, l) => a + l.amountIn, 0n)).toBe(10_001n);
  });
});

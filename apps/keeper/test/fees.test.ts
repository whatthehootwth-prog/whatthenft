import { describe, expect, it } from "vitest";
import { coveredByFee, pipsToBps } from "../src/fees";

describe("token transfer fees", () => {
  it("converts pips to bps, rounding up and capping at 10%", () => {
    expect(pipsToBps(30_000)).toBe(300);
    expect(pipsToBps(15_000)).toBe(150);
    expect(pipsToBps(0)).toBe(0);
    expect(pipsToBps(12_345)).toBe(124);
    expect(pipsToBps(500_000)).toBe(1000);
  });

  it("accepts only the first live mint's real shortfall shape (3% WTH)", () => {
    // mainnet order 1: min_out 28,465.05 WTH, received 28,174.59 after the 3% token fee
    const leg = { status: "Failed", spent: true, token: "wth", acquired: "28174592017135463072853", min_out: "28465051728652323516902" };
    expect(coveredByFee(leg, 300)).toBe(true);
    expect(coveredByFee(leg, 100)).toBe(false);
    expect(coveredByFee({ ...leg, spent: false }, 300)).toBe(false);
    expect(coveredByFee({ ...leg, status: "Done" }, 300)).toBe(false);
    expect(coveredByFee({ ...leg, acquired: "0" }, 300)).toBe(false);
  });
});

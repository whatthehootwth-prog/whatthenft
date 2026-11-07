/**
 * Exact integer unit handling. All money in this codebase is bigint base units.
 * Floats are never used for balances, fees or allocations.
 */
export const NEAR_DECIMALS = 24;
export const ONE_NEAR = 10n ** 24n;
export const BPS = 10_000n;

const DEC_RE = /^(\d+)(?:\.(\d+))?$/;

/** Parse a human decimal string (e.g. "0.1") into base units. Throws on excess precision. */
export function parseUnits(value: string, decimals: number): bigint {
  const v = value.trim();
  const m = DEC_RE.exec(v);
  if (!m) throw new Error(`Invalid amount "${value}"`);
  const whole = m[1]!;
  const frac = m[2] ?? "";
  if (frac.length > decimals) throw new Error(`Amount "${value}" exceeds ${decimals} decimal places`);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

export const parseNear = (value: string): bigint => parseUnits(value, NEAR_DECIMALS);

/**
 * Format base units as a decimal string. Truncates (never rounds up) to `maxFraction`
 * digits so a displayed balance is never larger than the real one.
 */
export function formatUnits(amount: bigint, decimals: number, maxFraction = decimals): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let frac = (abs % base).toString().padStart(decimals, "0").slice(0, Math.max(0, maxFraction));
  frac = frac.replace(/0+$/, "");
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${wholeStr}${frac ? "." + frac : ""}`;
}

export const formatNear = (amount: bigint, maxFraction = 5): string => formatUnits(amount, NEAR_DECIMALS, maxFraction);

/** ceil(a / b) for non-negative bigints. */
export function ceilDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new Error("ceilDiv by non-positive");
  if (a < 0n) throw new Error("ceilDiv of negative");
  return (a + b - 1n) / b;
}

export function assertBps(name: string, v: number): void {
  if (!Number.isInteger(v) || v < 0 || v > 10_000) throw new Error(`${name} must be an integer 0..10000 bps, got ${v}`);
}

import { sha256 } from "@noble/hashes/sha2.js";

/**
 * WTN-TRAITS-v1 deterministic draw function. Mirrored exactly in
 * contracts/core/src/traits.rs and cross-checked via test-vectors/traits-v1.json.
 *
 *   seed32  = sha256("WTN-TRAITS-v1" || randomSeed32 || u64le(orderId))
 *   draw(l) = u64le(sha256(seed32 || u32le(l))[0..8])
 *   pick(l, n) = draw(l) mod n        (bias <= n / 2^64, negligible for n <= 10000)
 */
export const TRAITS_DOMAIN = "WTN-TRAITS-v1";

export function u64le(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
}

export function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function deriveSeed(randomSeed: Uint8Array, orderId: bigint): Uint8Array {
  if (randomSeed.length !== 32) throw new Error("random seed must be 32 bytes");
  return sha256(concat(new TextEncoder().encode(TRAITS_DOMAIN), randomSeed, u64le(orderId)));
}

export class Drawer {
  constructor(private readonly seed: Uint8Array) {
    if (seed.length !== 32) throw new Error("seed must be 32 bytes");
  }
  draw(label: number): bigint {
    const h = sha256(concat(this.seed, u32le(label)));
    return new DataView(h.buffer, h.byteOffset, 8).getBigUint64(0, true);
  }
  pick(label: number, n: number): number {
    if (!Number.isInteger(n) || n <= 0) throw new Error(`pick over invalid n=${n}`);
    return Number(this.draw(label) % BigInt(n));
  }
}

export const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
export function fromHex(h: string): Uint8Array {
  if (!/^([0-9a-f]{2})*$/i.test(h)) throw new Error("bad hex");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

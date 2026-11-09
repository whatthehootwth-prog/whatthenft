/**
 * Rarity tiers — mirrors packages/domain RARITIES / DEFAULT_RARITY_BPS and the contract's
 * RARITY_NAMES (index = on-chain `traits.rarity`). Rarity is cosmetic: it never changes the bag.
 */
export const TIERS = [
  { name: "COMMON", stars: 1, pct: 60, color: "#ffffff", frame: "frame-COMMON", badge: "bg-white text-ink" },
  { name: "RARE", stars: 2, pct: 25, color: "#7ee3ff", frame: "frame-RARE", badge: "bg-aqua text-ink" },
  { name: "EPIC", stars: 3, pct: 10, color: "#b48cff", frame: "frame-EPIC", badge: "bg-violet text-white" },
  { name: "LEGENDARY", stars: 4, pct: 4, color: "#ffd23f", frame: "frame-LEGENDARY", badge: "badge-legendary text-ink" },
  { name: "MYTHIC", stars: 5, pct: 1, color: "#ff8cc6", frame: "frame-MYTHIC", badge: "badge-mythic text-ink" },
] as const;

export type RarityName = (typeof TIERS)[number]["name"];
export const RARITY_NAMES = TIERS.map((t) => t.name) as RarityName[];
export const tierOf = (name: string) => TIERS.find((t) => t.name === name) ?? TIERS[0];

/** Roll a tier with the published odds (preview only — real NFTs use the on-chain roll). */
export function rollTier(r = Math.random()) {
  let acc = 0;
  for (const t of TIERS) {
    acc += t.pct / 100;
    if (r < acc) return t;
  }
  return TIERS[0];
}

/**
 * Homepage showcase weights (%), COMMON → MYTHIC. Shows off the top tiers more often;
 * this is display only — real mints always use the on-chain odds in TIERS.
 */
export const SHOWCASE_PCT = [15, 20, 25, 22, 18] as const;

export function rollShowcaseTier(not?: string, r = Math.random()) {
  if (not) {
    // Re-weight without the current tier so the result is always a change.
    const pool = TIERS.map((t, i) => ({ t, w: t.name === not ? 0 : SHOWCASE_PCT[i]! }));
    const total = pool.reduce((a, p) => a + p.w, 0);
    let x = r * total;
    for (const p of pool) {
      if ((x -= p.w) < 0) return p.t;
    }
  }
  let acc = 0;
  for (let i = 0; i < TIERS.length; i++) {
    acc += SHOWCASE_PCT[i]! / 100;
    if (r < acc) return TIERS[i]!;
  }
  return TIERS[TIERS.length - 1]!;
}

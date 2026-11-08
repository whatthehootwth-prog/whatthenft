import { memeLabel, memesIn, previewSpec, specFromTraits, type MutantSpec } from "./art";
import { RARITY, type SeasonJ, type TokenViewJ } from "./near";

export { memesIn as memeLabels };

/** Rig spec for a real on-chain token from its season's meme list + traits. */
export function tokenSpec(t: TokenViewJ, season: SeasonJ | null | undefined) {
  const memes = season?.config.memes ?? [];
  const slots = t.info.traits.slots.map((s) => ({ memeId: memes[s.meme_idx]?.meme_id ?? "wth", variant: s.variant }));
  return specFromTraits(slots);
}

export function tokenCard(t: TokenViewJ, season: SeasonJ | null | undefined) {
  const { spec } = tokenSpec(t, season);
  return {
    spec,
    title: `#${t.token_id}`,
    rarity: RARITY[t.info.traits.rarity] ?? "COMMON",
    memes: t.info.holdings.map((h) => memeLabel(h.meme_id)),
    state: t.effective_state,
  };
}

const RARITIES = ["COMMON", "RARE", "COMMON", "EPIC", "COMMON", "RARE", "LEGENDARY", "COMMON"];

/** Clearly-labelled preview mutants mixed from the real part library. */
export const PREVIEW_GALLERY: { title: string; rarity: string; spec: MutantSpec }[] = Array.from({ length: 8 }, (_, i) => ({
  title: `PREVIEW ${String.fromCharCode(65 + i)}`,
  rarity: RARITIES[i]!,
  spec: previewSpec(i * 7 + 3),
}));

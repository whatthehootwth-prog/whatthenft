import { MEME_STYLE, PART_BY_ID, SLOT_ORDER, specFromTraits, type MutantSpec } from "./mutant-parts";
import { RARITY, type SeasonJ, type TokenViewJ } from "./near";

/** Meme labels present in a spec, WTH first. */
export function memeLabels(spec: MutantSpec): string[] {
  const ids = new Set<string>(["wth"]);
  for (const s of SLOT_ORDER) ids.add(PART_BY_ID.get(spec[s])?.memeId ?? "wth");
  return [...ids].map((id) => MEME_STYLE[id]?.label ?? id.toUpperCase());
}

/** Build the rig spec for a real on-chain token from its season's meme list + traits. */
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
    memes: t.info.holdings.map((h) => MEME_STYLE[h.meme_id]?.label ?? h.meme_id.toUpperCase()),
    state: t.effective_state,
  };
}

/** Deterministic, clearly-labelled preview set built only from the local part library. */
export const PREVIEW_GALLERY: { title: string; rarity: string; spec: MutantSpec }[] = [
  { title: "PREVIEW A", rarity: "COMMON", spec: { head: "wth-party", face: "wth-eyes", body: "wth-white", arms: "wth-wings", legs: "wth-feet", accessory: "wth-none" } },
  { title: "PREVIEW B", rarity: "RARE", spec: { head: "kat-ears", face: "wth-dizzy", body: "wth-cyan", arms: "wth-wings", legs: "kat-beans", accessory: "wth-cape" } },
  { title: "PREVIEW C", rarity: "COMMON", spec: { head: "dragon-horns", face: "wth-eyes", body: "dragon-scales", arms: "wth-wings", legs: "wth-feet", accessory: "dragon-tail" } },
  { title: "PREVIEW D", rarity: "EPIC", spec: { head: "wth-crown", face: "shitzu-snout", body: "shitzu-spots", arms: "shitzu-paws", legs: "shitzu-feet", accessory: "wth-sign" } },
  { title: "PREVIEW E", rarity: "COMMON", spec: { head: "wth-cone", face: "kat-whiskers", body: "wth-pink", arms: "kat-paws", legs: "wth-sneakers", accessory: "kat-tail" } },
  { title: "PREVIEW F", rarity: "LEGENDARY", spec: { head: "shitzu-ears", face: "dragon-eyes", body: "wth-yellow", arms: "dragon-wings", legs: "dragon-claws", accessory: "shitzu-bone" } },
];

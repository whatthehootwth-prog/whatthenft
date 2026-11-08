import { tokenWeights, type SlotProviders } from "@wtn/domain";
import { MEME_STYLE, PART_BY_ID, SLOT_ORDER, type MutantSpec, type Slot } from "./mutant-parts";

export interface Annotation {
  slot: Slot;
  text: string;
  /** Label position in owl coordinates (outside the character). */
  at: [number, number];
}

export interface PresetMutant {
  key: string;
  nickname: string;
  spec: MutantSpec;
  notes: Annotation[];
}

/** ILLUSTRATIVE previews only — not minted NFTs, not guaranteed mint outcomes. */
export const PRESETS: PresetMutant[] = [
  {
    key: "doggo",
    nickname: "DOGGO.EXE",
    spec: { head: "shitzu-ears", face: "wth-shades", body: "wth-yellow", arms: "wth-wings", legs: "wth-feet", accessory: "shitzu-bone" },
    notes: [
      { slot: "head", text: "WHO GAVE ME DOG EARS?!", at: [-130, 120] },
      { slot: "face", text: "TOO COOL TO HOOT", at: [1340, 250] },
      { slot: "accessory", text: "IS THAT… A BONE?!", at: [-140, 1180] },
    ],
  },
  {
    key: "dragon",
    nickname: "DRAGON TAX",
    spec: { head: "dragon-horns", face: "dragon-eyes", body: "wth-white", arms: "dragon-wings", legs: "wth-sneakers", accessory: "wth-cape" },
    notes: [
      { slot: "head", text: "HORNS?! SINCE WHEN?!", at: [-120, -60] },
      { slot: "arms", text: "BLACKDRAGON WINGS?!", at: [1360, 240] },
      { slot: "legs", text: "DRIP CHECK", at: [-110, 1200] },
    ],
  },
  {
    key: "kat",
    nickname: "CAT-ASTROPHE",
    spec: { head: "wth-crown", face: "kat-whiskers", body: "kat-stripes", arms: "wth-wings", legs: "kat-beans", accessory: "kat-tail" },
    notes: [
      { slot: "head", text: "KING OF NOTHING", at: [-120, 40] },
      { slot: "body", text: "KAT BODY?!", at: [-140, 860] },
      { slot: "legs", text: "TOE BEANS?!", at: [1350, 1200] },
    ],
  },
  {
    key: "meltdown",
    nickname: "FULL MELTDOWN",
    spec: { head: "wth-cone", face: "shitzu-snout", body: "dragon-scales", arms: "kat-paws", legs: "dragon-claws", accessory: "wth-sign" },
    notes: [
      { slot: "head", text: "WHAT IS THAT THING?!", at: [-120, -40] },
      { slot: "body", text: "SCALES?! ON AN OWL?!", at: [-140, 900] },
      { slot: "legs", text: "CLAWS. WHY.", at: [1340, 1210] },
    ],
  },
];

export function providers(spec: MutantSpec): SlotProviders {
  const out = {} as SlotProviders;
  for (const s of SLOT_ORDER) out[s] = PART_BY_ID.get(spec[s])?.memeId ?? "wth";
  return out;
}

/** Allocation computed with the production formula (packages/domain tokenWeights). */
export function mixFor(spec: MutantSpec): { memeId: string; label: string; color: string; bps: number }[] {
  return tokenWeights(providers(spec), "wth").map((w) => ({ memeId: w.memeId, bps: w.bps, label: MEME_STYLE[w.memeId]?.label ?? w.memeId.toUpperCase(), color: MEME_STYLE[w.memeId]?.color ?? "#FFF4DC" }));
}

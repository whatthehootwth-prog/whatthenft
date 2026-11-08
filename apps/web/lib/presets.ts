import { mixFor as mix, pick as P, spec, type MutantSpec, type Slot } from "./art";

export interface Annotation {
  slot: Slot;
  text: string;
  /** Label position in canvas coordinates (0–1254, may sit outside the art). */
  at: [number, number];
}

export interface PresetMutant {
  key: string;
  nickname: string;
  spec: MutantSpec;
  notes: Annotation[];
  /** Hero backdrop colour for this mutant. */
  bg: string;
}

/** ILLUSTRATIVE previews mixed from the real Season 01 parts — not minted NFTs, not guaranteed outcomes. */
export const PRESETS: PresetMutant[] = [
  {
    key: "cowboy-shiba",
    nickname: "YEEHAW INU",
    bg: "#FF3EA5",
    spec: spec({ body: P("inu"), head: P("moonshot"), face: P("three"), arms: P("moonshot"), accessory: P("hooters") }),
    notes: [
      { slot: "head", text: "YEEHAW?!", at: [1060, 60] },
      { slot: "arms", text: "IS THAT LOADED?!", at: [-40, 340] },
      { slot: "accessory", text: "WHO DRESSED ME?!", at: [1180, 980] },
    ],
  },
  {
    key: "quantum-pirate",
    nickname: "SCHRÖDINGER'S ARCHER",
    bg: "#2EE6FF",
    spec: spec({ body: P("quantum-cat"), head: P("robinhoot"), face: P("cybernetic"), arms: P("robinhoot"), accessory: P("oyster") }),
    notes: [
      { slot: "face", text: "CYBER EYE?!", at: [-60, 420] },
      { slot: "head", text: "ROBIN WHO?!", at: [1140, 60] },
      { slot: "accessory", text: "SHELLS. WHY.", at: [1180, 1000] },
    ],
  },
  {
    key: "rave",
    nickname: "RAVE MALLACE",
    bg: "#B8FF3D",
    spec: spec({ body: P("mallace"), head: P("oyster"), arms: P("idp"), legs: P("hooters"), accessory: P("nearkat") }),
    notes: [
      { slot: "head", text: "PEARL HAT?!", at: [1120, 40] },
      { slot: "arms", text: "WHAT FLAG IS THAT?!", at: [-80, 760] },
      { slot: "legs", text: "PANTS OPTIONAL", at: [1180, 1160] },
    ],
  },
  {
    key: "hodl-bot",
    nickname: "HODL.EXE",
    bg: "#FFE14D",
    spec: spec({ body: P("hoodl"), head: P("cybernetic"), face: P("cybernetic"), arms: P("hoodl"), legs: P("cybernetic"), accessory: P("robinhoot") }),
    notes: [
      { slot: "head", text: "UPGRADED?!", at: [-70, 160] },
      { slot: "arms", text: "HODLING SOMETHING", at: [1180, 840] },
      { slot: "legs", text: "ROBO TOES?!", at: [-60, 1180] },
    ],
  },
  {
    key: "orange-alert",
    nickname: "ORANGE ALERT",
    bg: "#8B5CFF",
    spec: spec({ body: P("raen"), head: P("hoodl"), face: P("three"), arms: P("moonshot"), accessory: P("idp") }),
    notes: [
      { slot: "accessory", text: "INDERNED KEPUTER?!", at: [1190, 1010] },
      { slot: "face", text: "3?!", at: [1220, 480] },
      { slot: "arms", text: "PEW?!", at: [-60, 360] },
    ],
  },
];

export const mixFor = mix;

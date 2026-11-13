/**
 * Season 01 art catalog: how each supplied file maps to a meme + economic slot.
 * Source files live in assets/memes/<memeId>/slots/<slot>/NN-<name>.png after `organize`.
 *
 * Slot meaning on the WTH owl:
 *   body      = full fur/skin recolour (replaces the base owl)
 *   head      = headwear, ears, head armour
 *   face      = eye/cheek overlays
 *   arms      = wings and anything held / carried at the side
 *   legs      = lower body and feet overlays
 *   accessory = chest / outfit / cape / emblem
 */
export type Slot = "head" | "face" | "body" | "arms" | "legs" | "accessory";
export const SLOTS: Slot[] = ["head", "face", "body", "arms", "legs", "accessory"];

/** Compositing order on top of the body/skin (bottom → top). */
export const LAYER_ORDER: Slot[] = ["legs", "accessory", "arms", "head", "face"];

export interface CatalogPart {
  slot: Slot;
  /** Original file name inside assets/memes/parts/<folder>/ */
  src: string;
  name: string;
  /** Drawn behind the owl body (e.g. a quiver on the back). */
  behind?: boolean;
}

export interface CatalogMeme {
  memeId: string;
  displayName: string;
  folder: string;
  preview?: string;
  parts: CatalogPart[];
  /** Verified NEP-141 contract (full id) or null if not verified. */
  tokenContractId: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  /** Unverified leads for the founder to confirm. Never used for minting. */
  tokenCandidates: string[];
  note?: string;
}

export const CATALOG: CatalogMeme[] = [
  {
    memeId: "wth", displayName: "WHAT THE HOOT", folder: "00-base",
    parts: [{ slot: "body", src: "wth-original.png", name: "Classic WTH" }],
    tokenContractId: "wth-0b2227.launchpad.justhoot.near", tokenSymbol: "WTH", tokenDecimals: 18, tokenCandidates: [],
    note: "Base owl. Every other slot uses the bare owl (no overlay) when WTH provides it.",
  },
  {
    memeId: "hoodl", displayName: "HOODL", folder: "01-hoodl", preview: "01-hoodl.png",
    parts: [
      { slot: "body", src: "charcoal-skin-white-face.png", name: "Charcoal Fur" },
      { slot: "head", src: "ear-tips.png", name: "Ear Tips" },
      { slot: "arms", src: "wings-holding-token.png", name: "Wings Holding Token" },
    ],
    tokenContractId: "hoodl-95275b.launchpad.justhoot.near", tokenSymbol: "HOODL", tokenDecimals: 18, tokenCandidates: [],
  },
  {
    memeId: "hooters", displayName: "HOOTERS", folder: "02-hooters", preview: "02-hooters.png",
    parts: [
      { slot: "accessory", src: "bikini-top.png", name: "Bikini Top" },
      { slot: "legs", src: "bikini-bottom.png", name: "Bikini Bottom" },
    ],
    tokenContractId: "hooters-f5dd7a.launchpad.justhoot.near", tokenSymbol: "HOOTERS", tokenDecimals: 18, tokenCandidates: [],
    note: "HOOTERS is a registered trademark — needs permission before public minting.",
  },
  {
    memeId: "oyster", displayName: "OYSTER", folder: "03-oyster", preview: "03-oyster.png",
    parts: [
      { slot: "head", src: "pearl-hat.png", name: "Pearl Hat" },
      { slot: "accessory", src: "chest-shells.png", name: "Chest Shells" },
    ],
    tokenContractId: null, tokenSymbol: null, tokenDecimals: null, tokenCandidates: ["oyster.v2-launchpad.justhoot.near"],
    note: "OYSTER: no wNEAR pool on RHEA (DCL or v2) as of 2026-11-13. Token confirmed by founder; needs a NEAR liquidity pool before it can join a season.",
  },
  {
    memeId: "three", displayName: "THREE", folder: "04-three", preview: "04-three.png",
    parts: [
      { slot: "body", src: "mint-skin-one-planted-foot.png", name: "Mint Fur (Wave)" },
      { slot: "face", src: "pixel-three-tattoo.png", name: "Pixel 3 Tattoo" },
    ],
    tokenContractId: "three-de86d6.launchpad.justhoot.near", tokenSymbol: "THREE", tokenDecimals: 18, tokenCandidates: [],
  },
  {
    memeId: "moonshot", displayName: "MOONSHOT", folder: "05-moonshot", preview: "05-moonshot.png",
    parts: [
      { slot: "head", src: "cowboy-hat.png", name: "Cowboy Hat" },
      { slot: "accessory", src: "bandana.png", name: "Bandana" },
      { slot: "arms", src: "wing-and-revolver.png", name: "Wing + Revolver" },
    ],
    tokenContractId: "moonshot.v2-launchpad.justhoot.near", tokenSymbol: "MOONSHOT", tokenDecimals: 18, tokenCandidates: [],
  },
  {
    memeId: "raen", displayName: "RAEN", folder: "06-raen", preview: "06-raen.png",
    parts: [{ slot: "body", src: "orange-skin.png", name: "Raen Orange" }],
    tokenContractId: "raen-e1328c.launchpad.justhoot.near", tokenSymbol: "RAEN", tokenDecimals: 18, tokenCandidates: [],
  },
  {
    memeId: "mallace", displayName: "MALLACE", folder: "07-mallace", preview: "07-mallace.png",
    parts: [{ slot: "body", src: "gradient-skin.png", name: "Gradient Fur" }],
    tokenContractId: "mallace.v2-launchpad.justhoot.near", tokenSymbol: "MALLACE", tokenDecimals: 18, tokenCandidates: [],
  },
  {
    memeId: "idp", displayName: "IKP", folder: "08-idp", preview: "08-idp.png",
    parts: [
      { slot: "accessory", src: "cardboard-apron.png", name: "Cardboard Apron" },
      { slot: "arms", src: "flag-and-wing.png", name: "Flag + Wing" },
    ],
    tokenContractId: "ikp.v2-launchpad.justhoot.near", tokenSymbol: "IKP", tokenDecimals: 18, tokenCandidates: [],
    note: "Artwork includes the ICP infinity logo — check brand permission.",
  },
  {
    memeId: "robinhoot", displayName: "ROBINHOOT", folder: "09-robinhoot", preview: "09-robinhoot.png",
    parts: [
      { slot: "head", src: "archer-hat.png", name: "Archer Hat" },
      { slot: "accessory", src: "mantle.png", name: "Mantle" },
      { slot: "arms", src: "quiver.png", name: "Quiver", behind: true },
    ],
    tokenContractId: "robinhoot-2.v2-launchpad.justhoot.near", tokenSymbol: "ROBINHOOT", tokenDecimals: 18, tokenCandidates: [],
  },
  {
    memeId: "quantum-cat", displayName: "QUANTUM CAT", folder: "10-quantum-cat", preview: "10-quantum-cat.png",
    parts: [{ slot: "body", src: "split-cat-skeleton-skin.png", name: "Alive/Dead Split" }],
    tokenContractId: null, tokenSymbol: null, tokenDecimals: null, tokenCandidates: ["qcat-3.nearlytrade.near"],
    note: "QCAT: only RHEA v2 pool #8930 (~6.5 NEAR, 9% fee, 8.7% impact at 0.68 NEAR) — not usable. Token confirmed by founder; needs a NEAR liquidity pool before it can join a season.",
  },
  {
    memeId: "inu", displayName: "INU", folder: "11-inu", preview: "11-inu.png",
    parts: [{ slot: "body", src: "shiba-skin.png", name: "Shiba Fur" }],
    tokenContractId: null, tokenSymbol: null, tokenDecimals: null, tokenCandidates: ["ninu-4.nearlytrade.near"],
    note: "NINU: only thin RHEA v2 pools (#8721 ~2.9 NEAR, 10% fee, 17% impact) — not usable. Token confirmed by founder; needs a NEAR liquidity pool before it can join a season.",
  },
  {
    memeId: "nearkat", displayName: "NEARKAT", folder: "12-nearkat", preview: "12-nearkat.png",
    parts: [
      { slot: "body", src: "meerkat-skin.png", name: "Meerkat Fur" },
      { slot: "accessory", src: "near-protocol-emblem.png", name: "NEAR Emblem" },
    ],
    tokenContractId: "nearkat-630f25.nearlytrade.near", tokenSymbol: "NEARKAT", tokenDecimals: 18, tokenCandidates: [],
    note: "Token verified on-chain 2026-11-07 (ft_metadata KAT/18, Rhea v2 pool 5391).",
  },
  {
    memeId: "cybernetic", displayName: "IMEME", folder: "13-cybernetic", preview: "13-cybernetic-tan.png",
    parts: [
      { slot: "body", src: "tan-skin-D9AD87.png", name: "Tan Fur" },
      { slot: "head", src: "temple-armor.png", name: "Temple Armour" },
      { slot: "face", src: "cyber-eye.png", name: "Cyber Eye" },
      { slot: "legs", src: "robotic-left-foot.png", name: "Robotic Foot" },
    ],
    tokenContractId: "imeme-2.v2-launchpad.justhoot.near", tokenSymbol: "IMEME", tokenDecimals: 18, tokenCandidates: [],
    note: "Previews also show white/graphite/lavender/copper fur, but only the tan fur file was supplied.",
  },
  {
    memeId: "batman", displayName: "BATMAN", folder: "15-batman", preview: "15-batman.png",
    parts: [
      { slot: "head", src: "cowl.png", name: "Cowl" },
      { slot: "accessory", src: "cape.png", name: "Cape" },
      { slot: "legs", src: "utility-belt.png", name: "Utility Belt" },
    ],
    tokenContractId: "batman-4.nearlytrade.near", tokenSymbol: "BATMAN", tokenDecimals: 18, tokenCandidates: [],
  },
];

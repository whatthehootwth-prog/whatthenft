/**
 * Real founder artwork (assets/memes → apps/web/public/art via `pnpm --filter @wtn/assets organize`).
 * Every layer is a transparent 1254×1254 webp drawn in place on the WTH owl, so stacking them in
 * LAYER order reproduces the founder's previews exactly.
 */
import { tokenWeights, type SlotProviders } from "@wtn/domain";
import registry from "./art-registry.json";

export type Slot = "head" | "face" | "body" | "arms" | "legs" | "accessory";
export const SLOT_ORDER: Slot[] = ["head", "face", "body", "arms", "legs", "accessory"];
export const SLOT_LABEL: Record<Slot, string> = { head: "HEAD", face: "FACE", body: "BODY", arms: "ARMS", legs: "LEGS", accessory: "OUTFIT" };
/** Bottom → top, after any `behind` parts and the body. */
const STACK: Slot[] = ["legs", "accessory", "arms", "head", "face"];

export interface ArtLayer {
  slot: Slot;
  variant: number;
  name: string;
  src: string;
  behind: boolean;
  /** Printed on the owl (logo/tattoo/implant): right above the body, under every other part. */
  skin?: boolean;
  anchor: [number, number];
}

export interface ArtMeme {
  memeId: string;
  displayName: string;
  color: string;
  verifiedToken: string | null;
  layers: ArtLayer[];
  preview: string | null;
  slots: Slot[];
}

export const CANVAS: number = registry.canvas;
export const MEMES: ArtMeme[] = registry.memes as ArtMeme[];
export const MEME = new Map(MEMES.map((m) => [m.memeId, m]));
/** Memes that can actually be minted: WTH + partners with a verified token and RHEA route. */
export const MINTABLE = MEMES.filter((m) => m.memeId === "wth" || !!m.verifiedToken);
export const PARTNERS = MINTABLE.filter((m) => m.memeId !== "wth");

export const memeLabel = (id: string) => (id === "wth" ? "WTH" : MEME.get(id)?.displayName ?? id.toUpperCase());
export const memeColor = (id: string) => MEME.get(id)?.color ?? "#FFF4DC";

/** One pick per slot. `wth` on a non-body slot means the bare owl (no overlay). */
export type Pick = { memeId: string; variant: number };
export type MutantSpec = Record<Slot, Pick>;

export const BARE: Pick = { memeId: "wth", variant: 0 };

export function layerFor(slot: Slot, pick: Pick): ArtLayer | null {
  const m = MEME.get(pick.memeId);
  if (!m) return null;
  const opts = m.layers.filter((l) => l.slot === slot);
  if (opts.length === 0) return null;
  return opts[pick.variant % opts.length]!;
}

/** Ordered image stack for a spec. Body falls back to the classic WTH owl. */
export function stackOf(spec: MutantSpec): ArtLayer[] {
  const body = layerFor("body", spec.body) ?? layerFor("body", BARE)!;
  const over = STACK.map((s) => layerFor(s, spec[s])).filter((l): l is ArtLayer => !!l);
  const top = over.filter((l) => !l.behind);
  // Skin markings (logos/tattoos) sit directly on the body, under every other part.
  return [...over.filter((l) => l.behind), body, ...top.filter(isSkin), ...top.filter((l) => !isSkin(l))];
}

/** Parts that sit on the owl itself, under every other part: NEAR emblem, pixel-3 tattoo, cybernetic temple shell + cyber eye. */
const isSkin = (l: ArtLayer) => !!l.skin;

/** Which meme actually provides each slot (a pick without art for that slot falls back to WTH). */
export function providers(spec: MutantSpec): SlotProviders {
  const out = {} as SlotProviders;
  for (const s of SLOT_ORDER) out[s] = layerFor(s, spec[s]) ? spec[s].memeId : "wth";
  return out;
}

/** Token mix with the production allocation formula (packages/domain tokenWeights). */
export function mixFor(spec: MutantSpec) {
  return tokenWeights(providers(spec), "wth").map((w) => ({ memeId: w.memeId, bps: w.bps, label: memeLabel(w.memeId), color: memeColor(w.memeId) }));
}

export function memesIn(spec: MutantSpec): string[] {
  const p = providers(spec);
  return Array.from(new Set(["wth", ...SLOT_ORDER.map((s) => p[s])])).map(memeLabel);
}

/** Map on-chain traits (season meme id + variant per slot, SLOT_ORDER) to a spec. */
export function specFromTraits(slots: { memeId: string; variant: number }[]): { spec: MutantSpec; missing: string[] } {
  const missing: string[] = [];
  const spec = {} as MutantSpec;
  SLOT_ORDER.forEach((s, i) => {
    const t = slots[i] ?? BARE;
    if (!layerFor(s, t) && !(t.memeId === "wth")) missing.push(`${s}:${t.memeId}`);
    spec[s] = t;
  });
  return { spec, missing };
}

const P = (memeId: string, variant = 0): Pick => ({ memeId, variant });
export const spec = (s: Partial<MutantSpec>): MutantSpec => ({ head: BARE, face: BARE, body: BARE, arms: BARE, legs: BARE, accessory: BARE, ...s });
export { P as pick };

/** Deterministic pseudo-random preview mutant from the real part library (labelled PREVIEW in UI). */
export function previewSpec(seed: number): MutantSpec {
  let x = seed * 2654435761 >>> 0;
  const rnd = () => ((x = (x ^ (x << 13)) >>> 0), (x = (x ^ (x >>> 17)) >>> 0), (x = (x ^ (x << 5)) >>> 0), x / 4294967296);
  const out = spec({});
  for (const s of SLOT_ORDER) {
    const opts = MINTABLE.flatMap((m) => m.layers.filter((l) => l.slot === s).map((l) => P(m.memeId, l.variant)));
    if (opts.length && (s === "body" || rnd() < 0.62)) out[s] = opts[Math.floor(rnd() * opts.length)]!;
  }
  return out;
}

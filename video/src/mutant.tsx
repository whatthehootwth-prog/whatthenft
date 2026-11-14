/**
 * Mutant owls built from the founder's real part layers (public/art, copied by scripts/prep-art.mjs).
 * Layer order mirrors apps/web/lib/art.ts stackOf(): behind parts → body → skin markings → legs, outfit, arms, head, face.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import reg from "./art-registry.json";

export type Slot = "head" | "face" | "body" | "arms" | "legs" | "accessory";
export const SLOTS: Slot[] = ["head", "face", "body", "arms", "legs", "accessory"];
export const SLOT_LABEL: Record<Slot, string> = { head: "HEAD", face: "FACE", body: "BODY", arms: "ARMS", legs: "LEGS", accessory: "OUTFIT" };
const STACK: Slot[] = ["legs", "accessory", "arms", "head", "face"];

type Layer = { slot: Slot; variant: number; name: string; src: string; behind: boolean; skin?: boolean; anchor: [number, number] };
type Meme = { memeId: string; displayName: string; color: string; verifiedToken: string | null; layers: Layer[]; preview: string | null };
export const MEMES = (reg as unknown as { memes: Meme[] }).memes;
export const CANVAS = (reg as { canvas: number }).canvas;
const BY = new Map(MEMES.map((m) => [m.memeId, m]));
export const memeColor = (id: string) => BY.get(id)?.color ?? "#FFF4DC";
export const memeName = (id: string) => (id === "wth" ? "WTH" : BY.get(id)?.displayName ?? id.toUpperCase());
export const preview = (id: string) => staticFile(BY.get(id)!.preview!.slice(1));
export const src = (p: string) => staticFile(p.slice(1));

export type Spec = Partial<Record<Slot, string>>;
export type PlacedLayer = Layer & { memeId: string };

function layer(memeId: string, slot: Slot): PlacedLayer | null {
  const l = BY.get(memeId)?.layers.find((x) => x.slot === slot);
  return l ? { ...l, memeId } : null;
}

export function stackOf(spec: Spec): PlacedLayer[] {
  const body = (spec.body && layer(spec.body, "body")) || layer("wth", "body")!;
  const over = STACK.map((s) => (spec[s] ? layer(spec[s]!, s) : null)).filter((l): l is PlacedLayer => !!l);
  const top = over.filter((l) => !l.behind);
  return [...over.filter((l) => l.behind), body, ...top.filter((l) => l.skin), ...top.filter((l) => !l.skin)];
}

/** Production token-mix formula (packages/domain tokenWeights): 20% WTH core + slot weights on the remaining 80%. */
const SLOT_BPS: Record<Slot, number> = { head: 2000, face: 1000, body: 2500, arms: 1000, legs: 1000, accessory: 2500 };
export function mixOf(spec: Spec) {
  const prov = Object.fromEntries(SLOTS.map((s) => [s, spec[s] && layer(spec[s]!, s) ? spec[s]! : "wth"])) as Record<Slot, string>;
  const order = ["wth"];
  for (const s of SLOTS) if (!order.includes(prov[s])) order.push(prov[s]);
  const num = new Map(order.map((id) => [id, 0]));
  num.set("wth", 2000 * 10000);
  for (const s of SLOTS) num.set(prov[s], num.get(prov[s])! + SLOT_BPS[s] * 8000);
  const fl = order.map((id, i) => ({ id, i, floor: Math.floor(num.get(id)! / 10000), rem: num.get(id)! % 10000 }));
  let left = 10000 - fl.reduce((a, x) => a + x.floor, 0);
  for (const x of [...fl].sort((a, b) => b.rem - a.rem || a.i - b.i)) if (left > 0 && x.rem > 0) { fl[x.i]!.floor++; left--; }
  return fl.filter((x) => x.floor > 0).map((x) => ({ id: x.id, pct: x.floor / 100, color: memeColor(x.id), name: memeName(x.id) }));
}

/** Renders the stack. `style(layer, index)` lets scenes animate individual parts. */
export const Mutant: React.FC<{ spec: Spec; size: number; style?: (l: PlacedLayer, i: number) => React.CSSProperties | null; shadow?: boolean }> = ({ spec, size, style, shadow = true }) => {
  const layers = stackOf(spec);
  return (
    <div style={{ position: "relative", width: size, height: size, filter: shadow ? `drop-shadow(${size * 0.012}px ${size * 0.018}px 0 rgba(22,17,15,0.9))` : undefined }}>
      {layers.map((l, i) => {
        const st = style ? style(l, i) : {};
        if (st === null) return null;
        return <Img key={l.src} src={src(l.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...st }} />;
      })}
    </div>
  );
};

/** Founder preview (whole meme character) as a sticker. */
export const Character: React.FC<{ id: string; size: number; style?: React.CSSProperties }> = ({ id, size, style }) => (
  <Img src={preview(id)} style={{ width: size, height: size, objectFit: "contain", filter: `drop-shadow(${size * 0.015}px ${size * 0.02}px 0 rgba(22,17,15,0.9))`, ...style }} />
);

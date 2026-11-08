"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { INK, OWL_BEAK, OWL_BEAK_FILL, OWL_BEAK_TOP, OWL_BEAK_TOP_FILL, OWL_FILL, OWL_FOOT_L, OWL_FOOT_L_FILL, OWL_FOOT_R, OWL_FOOT_R_FILL, OWL_MOUTH, OWL_MOUTH_FILL, OWL_MOUTH_SHADE, OWL_MOUTH_SHADE_FILL, OWL_OUTLINE, OWL_PATCH } from "@/lib/owl-geometry";
import { MEME_STYLE, PART_BY_ID, SLOT_LABEL, SLOT_ORDER, type Layer, type MutantSpec, type Part, type Slot } from "@/lib/mutant-parts";

export const MUTANT_VIEWBOX = { x: -170, y: -150, w: 1600, h: 1440 };

/** Shared owl geometry. Rendered once in the root layout; every Mutant references it by id. */
export function OwlSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <path id="wtn-owl-outline" d={OWL_OUTLINE} />
        <path id="wtn-owl-fill" d={OWL_FILL} />
        <path id="wtn-owl-patch" d={OWL_PATCH} />
        <clipPath id="wtn-owl-clip">
          <use href="#wtn-owl-fill" />
        </clipPath>
        <g id="wtn-owl-beak">
          <path d={OWL_BEAK} fill={OWL_BEAK_FILL} />
          <path d={OWL_MOUTH} fill={OWL_MOUTH_FILL} />
          <path d={OWL_MOUTH_SHADE} fill={OWL_MOUTH_SHADE_FILL} />
          <path d={OWL_BEAK_TOP} fill={OWL_BEAK_TOP_FILL} />
        </g>
        <g id="wtn-owl-feet">
          <path d={OWL_FOOT_R} fill={OWL_FOOT_R_FILL} />
          <path d={OWL_FOOT_L} fill={OWL_FOOT_L_FILL} />
        </g>
      </defs>
    </svg>
  );
}

export interface MutantProps {
  spec: MutantSpec;
  className?: string;
  /** Accessible description of the whole character. */
  label?: string;
  /** Enables per-slot hover / focus / tap hotspots. */
  interactive?: boolean;
  activeSlot?: Slot | null;
  onSlot?: (slot: Slot | null) => void;
  /** Pupil offset in owl units (eye tracking). */
  look?: { x: number; y: number };
  style?: CSSProperties;
}

function layerParts(spec: MutantSpec, layer: Layer): Part[] {
  return SLOT_ORDER.map((s) => PART_BY_ID.get(spec[s])).filter((p): p is Part => !!p && p.layer === layer && p.slot !== "body");
}

export function describeSpec(spec: MutantSpec): string {
  return SLOT_ORDER.map((s) => {
    const p = PART_BY_ID.get(spec[s]);
    return p ? `${SLOT_LABEL[s].toLowerCase()}: ${p.name} (${MEME_STYLE[p.memeId]?.label ?? p.memeId})` : "";
  }).join(", ");
}

export function Mutant({ spec, className = "", label, interactive = false, activeSlot = null, onSlot, look, style }: MutantProps) {
  const bodyPart = PART_BY_ID.get(spec.body);
  const body = bodyPart?.bodyColor ?? "#FEFEFE";
  const ctx = { body };
  const legsPart = PART_BY_ID.get(spec.legs);
  const showOwlFeet = !legsPart || legsPart.id === "wth-feet";

  const slotGroup = (slot: Slot, children: React.ReactNode, key?: string) => {
    if (!interactive) return <g key={key ?? slot}>{children}</g>;
    const p = PART_BY_ID.get(spec[slot]);
    const meme = p ? MEME_STYLE[p.memeId]?.label ?? p.memeId : "";
    return (
      <g
        key={key ?? slot}
        data-slot={slot}
        role="button"
        tabIndex={0}
        aria-label={`${SLOT_LABEL[slot]}: ${p?.name ?? "none"}, from ${meme}`}
        className={`wtn-slot ${activeSlot === slot ? "is-active" : ""} ${activeSlot && activeSlot !== slot ? "is-dim" : ""}`}
        onMouseEnter={() => onSlot?.(slot)}
        onMouseLeave={() => onSlot?.(null)}
        onFocus={() => onSlot?.(slot)}
        onBlur={() => onSlot?.(null)}
        onClick={(e) => {
          e.stopPropagation();
          onSlot?.(activeSlot === slot ? null : slot);
        }}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Escape") onSlot?.(null);
        }}
      >
        {children}
      </g>
    );
  };

  const vb = MUTANT_VIEWBOX;
  const lookStyle = { ...(style ?? {}), ["--px" as string]: `${look?.x ?? 0}px`, ["--py" as string]: `${look?.y ?? 0}px` } as CSSProperties;

  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className={`wtn-mutant ${className}`} role="img" aria-label={label ?? `Mutant owl — ${describeSpec(spec)}`} style={lookStyle}>
      <ellipse cx={640} cy={1232} rx={460} ry={40} fill={INK} opacity={0.22} />
      {/* back accessories (cape, tails) */}
      {layerParts(spec, "back").map((p) => slotGroup(p.slot, p.render(ctx), `back-${p.id}`))}
      {/* arms / wings */}
      {layerParts(spec, "arms").map((p) => slotGroup(p.slot, p.render(ctx), `arms-${p.id}`))}
      {/* body */}
      {slotGroup(
        "body",
        <>
          <use href="#wtn-owl-outline" fill={INK} />
          <use href="#wtn-owl-fill" fill={body} />
          <g clipPath="url(#wtn-owl-clip)">{bodyPart?.render(ctx)}</g>
          <use href="#wtn-owl-patch" fill={body} />
          <use href="#wtn-owl-beak" />
        </>,
        "body",
      )}
      {/* legs */}
      {slotGroup("legs", showOwlFeet ? <use href="#wtn-owl-feet" /> : legsPart?.render(ctx), "legs")}
      {/* face */}
      {layerParts(spec, "face").map((p) => slotGroup(p.slot, p.render(ctx), `face-${p.id}`))}
      {/* head */}
      {layerParts(spec, "head").map((p) => slotGroup(p.slot, p.render(ctx), `head-${p.id}`))}
      {/* held items */}
      {layerParts(spec, "front").map((p) => slotGroup(p.slot, p.render(ctx), `front-${p.id}`))}
    </svg>
  );
}

/** Convert an owl-space anchor to percentage coordinates inside the Mutant box. */
export function anchorPct([x, y]: [number, number]): { left: string; top: string } {
  const vb = MUTANT_VIEWBOX;
  return { left: `${((x - vb.x) / vb.w) * 100}%`, top: `${((y - vb.y) / vb.h) * 100}%` };
}

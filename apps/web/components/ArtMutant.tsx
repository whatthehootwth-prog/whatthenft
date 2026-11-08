"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CANVAS, SLOT_LABEL, layerFor, memeLabel, stackOf, type MutantSpec, type Slot } from "@/lib/art";

export interface ArtMutantProps {
  spec: MutantSpec;
  className?: string;
  label?: string;
  /** Eager-load (hero / reveal). */
  priority?: boolean;
  /** Per-slot hotspots (hover / focus / tap). */
  interactive?: boolean;
  activeSlot?: Slot | null;
  onSlot?: (s: Slot | null) => void;
  style?: CSSProperties;
}

export const pct = (v: number) => `${(v / CANVAS) * 100}%`;

/** Stacks the founder's transparent layers. Square, crisp at any size, no layout shift. */
export function ArtMutant({ spec, className = "", label, priority = false, interactive = false, activeSlot = null, onSlot, style }: ArtMutantProps) {
  const layers = stackOf(spec);
  const ref = useRef<HTMLDivElement>(null);
  // Own lazy-loading: native loading="lazy" proved unreliable inside transformed/scrolling containers.
  const [visible, setVisible] = useState(priority);
  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (setVisible(true), io.disconnect()), { rootMargin: "400px" });
    io.observe(el);
    // Fallback for environments that throttle observers (background tabs, some webviews).
    const t = setTimeout(() => setVisible(true), 4000);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [visible]);
  const hotspots = interactive ? (Object.keys(SLOT_LABEL) as Slot[]).map((s) => ({ s, l: layerFor(s, spec[s]) })).filter((h) => h.l) : [];
  return (
    <div ref={ref} className={`art-mutant relative aspect-square ${className}`} role="img" aria-label={label ?? `Mutant owl made of ${layers.map((l) => l.name).join(", ")}`} style={style}>
      {visible && layers.map((l, i) => (
        <img
          key={l.src}
          src={l.src}
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          width={CANVAS}
          height={CANVAS}
          className={`absolute inset-0 h-full w-full select-none transition-[filter,opacity] duration-200 ${activeSlot && activeSlot !== l.slot && l.slot !== "body" ? "opacity-70" : ""} ${activeSlot === l.slot ? "art-glow" : ""}`}
          style={{ zIndex: i }}
        />
      ))}
      {hotspots.map(({ s, l }) => (
        <button
          key={s}
          type="button"
          aria-label={`${SLOT_LABEL[s]}: ${l!.name} from ${memeLabel(spec[s].memeId)}`}
          className={`absolute z-40 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition focus-visible:ring-4 focus-visible:ring-yellow ${activeSlot === s ? "bg-yellow/25 ring-4 ring-yellow" : ""}`}
          style={{ left: pct(l!.anchor[0]), top: pct(l!.anchor[1]), width: s === "body" ? "34%" : "22%", height: s === "body" ? "26%" : "18%" }}
          onMouseEnter={() => onSlot?.(s)}
          onMouseLeave={() => onSlot?.(null)}
          onFocus={() => onSlot?.(s)}
          onBlur={() => onSlot?.(null)}
          onClick={(e) => {
            e.stopPropagation();
            onSlot?.(activeSlot === s ? null : s);
          }}
        />
      ))}
    </div>
  );
}

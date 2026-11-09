"use client";

import { useEffect, useState } from "react";
import { CANVAS, layerFor, memeLabel, providers, type MutantSpec, type Slot } from "@/lib/art";

const NOUN: Record<Slot, string> = { head: "Head", face: "Face", body: "Body", arms: "Arms", legs: "Legs", accessory: "Outfit" };

/** Label spot (in % of the art window, outside the card) + curve bend + rough aim (canvas px) when the part has no anchor. */
const SPOT: Record<Slot, { at: [number, number]; bend: number; aim: [number, number] }> = {
  head: { at: [-38, 6], bend: -14, aim: [600, 230] },
  face: { at: [108, -36], bend: 16, aim: [860, 560] },
  body: { at: [-44, 46], bend: 12, aim: [420, 800] },
  arms: { at: [-44, 68], bend: 12, aim: [230, 760] },
  legs: { at: [-34, 102], bend: -12, aim: [520, 1120] },
  accessory: { at: [136, 112], bend: -14, aim: [720, 930] },
};

/** The bottom-right OUTFIT label is always shown; the other two follow the two most recently swapped parts. */
const FIXED: Slot = "accessory";

/**
 * Comic-style dotted arrows from labels outside the card toward the owl.
 * Rendered in art-window coordinates (0–100); labels counter-rotate so they read level.
 */
export function PartCallouts({ spec, tilt, changed }: { spec: MutantSpec; tilt: number; changed: { slot: Slot | null; tick: number } }) {
  const prov = providers(spec);
  const [recent, setRecent] = useState<Slot[]>(["head", "face"]);
  useEffect(() => {
    const s = changed.slot;
    if (!s || s === FIXED) return;
    setRecent((r) => (r[1] === s ? r : [r.filter((x) => x !== s).at(-1) ?? "head", s]));
  }, [changed]);
  const shown: { slot: Slot; key: string; pop: boolean }[] = [
    { slot: FIXED, key: "fixed", pop: changed.slot === FIXED },
    ...recent.map((slot) => ({ slot, key: `roving-${slot}`, pop: changed.slot === slot })),
  ];

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
        {shown.map(({ slot, key }) => (
          <Arrow key={key} from={SPOT[slot].at} to={layerFor(slot, spec[slot])?.anchor ?? SPOT[slot].aim} bend={SPOT[slot].bend} />
        ))}
      </svg>
      {shown.map(({ slot, key, pop }) => (
        <div key={key} className="absolute" style={{ left: `${SPOT[slot].at[0]}%`, top: `${SPOT[slot].at[1]}%`, transform: `translate(-50%, -50%) rotate(${-tilt}deg)` }}>
          <div key={pop ? changed.tick : undefined} className={`whitespace-nowrap rounded-xl border-[2.5px] border-ink bg-white px-2.5 py-1 shadow-[3px_3px_0_#16110f] ${pop ? "bounce-in" : ""}`}>
            <span className="text-[0.82rem] font-bold text-ink/70">{NOUN[slot]} powered by </span>
            <span className="font-display text-[1.05rem] leading-tight">{memeLabel(prov[slot])}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Arrow({ from, to, bend }: { from: [number, number]; to: [number, number]; bend: number }) {
  const end: [number, number] = [(to[0] / CANVAS) * 100, (to[1] / CANVAS) * 100];
  const [sx, sy] = from;
  const dx = end[0] - sx;
  const dy = end[1] - sy;
  const len = Math.hypot(dx, dy) || 1;
  // Control point: bow the line sideways for a hand-drawn comic curve.
  const cx = (sx + end[0]) / 2 + (-dy / len) * bend;
  const cy = (sy + end[1]) / 2 + (dx / len) * bend;
  // Stop just short of the target and draw an arrowhead along the curve's final direction.
  const tl = Math.hypot(end[0] - cx, end[1] - cy) || 1;
  const ux = (end[0] - cx) / tl;
  const uy = (end[1] - cy) / tl;
  const ex = end[0] - ux * 2.2;
  const ey = end[1] - uy * 2.2;
  const h = 4.2;
  const head = `M ${ex + ux * 1.5} ${ey + uy * 1.5} L ${ex - ux * h - uy * h * 0.6} ${ey - uy * h + ux * h * 0.6} L ${ex - ux * h + uy * h * 0.6} ${ey - uy * h - ux * h * 0.6} Z`;
  const d = `M ${sx} ${sy} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  return (
    <g>
      <path d={d} fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeDasharray="0.1 9" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="#16110f" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0.1 9" vectorEffect="non-scaling-stroke" />
      <path d={head} fill="#16110f" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={end[0]} cy={end[1]} r="1.3" fill="#ffffff" stroke="#16110f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

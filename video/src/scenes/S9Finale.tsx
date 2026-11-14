/** 83.5–90 s — group portrait, the owl blinks, "WHAT THE NFT?! NOT ANOTHER BORING JPEG!", tagline + link. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, MONO } from "../brand";
import { at, Burst, Character, Halftone, Ink, pop, shakeAll, Sticker, Tag, useT } from "../exports";
import { Mutant } from "../mutant";
import { HOOK_SPEC } from "./S1Hook";
import { CREW } from "./S8Next";

const HERO = 600;
/** Eye rings on the 1254 px WTH body (measured from art/wth/body-01.webp): centre + inner radius. */
const EYES = [
  { x: 452, y: 510, r: 158 },
  { x: 932, y: 430, r: 98 },
];
const BLINKS = [86.9, 88.7];

export const S9Finale: React.FC<{ url: string | null }> = ({ url }) => {
  const t = useT();
  const sh = shakeAll(t, [[84.0, 0.45, 28], [85.75, 0.3, 16]]);
  const close = BLINKS.reduce((m, b) => Math.max(m, t >= b && t < b + 0.22 ? Math.sin(((t - b) / 0.22) * Math.PI) : 0), 0);
  const settle = at(t, [87.5, 88.0], [0, 1]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Burst a={C.yellow} b={C.sun} rays={30} spin={16} />
      <Halftone opacity={0.07} />
      {/* crew arc */}
      {CREW.map((id, i) => {
        const k = i - (CREW.length - 1) / 2;
        const x = 960 + k * 168;
        const y = 330 + Math.abs(k) * Math.abs(k) * 14;
        const p = pop(t, 83.6 + Math.abs(k) * 0.05, { damping: 9, stiffness: 200 });
        return (
          <div key={id} style={{ position: "absolute", left: x - 125, top: y - 60, transform: `scale(${p}) rotate(${k * 4 + Math.sin(t * 6 + i) * 3}deg) translateY(${Math.abs(Math.sin(t * 4 + i)) * -14}px)` }}>
            <Character id={id} size={250} />
          </div>
        );
      })}
      {/* hero mutant */}
      <div style={{ position: "absolute", left: 960 - HERO / 2, top: 390, transform: `scale(${pop(t, 83.75, { damping: 8, stiffness: 180 })}) rotate(${Math.sin(t * 3) * 2}deg)`, transformOrigin: "50% 90%" }}>
        <div style={{ position: "relative", width: HERO, height: HERO }}>
          <Mutant spec={HOOK_SPEC} size={HERO} />
          {close > 0
            ? EYES.map((e) => {
                const s = HERO / 1254;
                const r = e.r * s;
                return (
                  <div key={e.x} style={{ position: "absolute", left: e.x * s - r, top: e.y * s - r, width: r * 2, height: r * 2, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${close * 100}%`, background: "#fffaf2", borderBottom: `${Math.max(4, r * 0.14)}px solid ${C.ink}` }} />
                  </div>
                );
              })
            : null}
        </div>
      </div>
      {/* wordmark */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 36, display: "flex", justifyContent: "center", transform: `scale(${1 + (1 - pop(t, 84.0, { damping: 11, stiffness: 260 })) * 2.2}) rotate(-2deg)`, opacity: t >= 84.0 ? 1 : 0 }}>
        <Ink size={200} color={C.orange} shadow={16}>WHAT THE NFT?!</Ink>
      </div>
      {/* jpeg line */}
      {t >= 85.75 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 860 - settle * 60, display: "flex", justifyContent: "center", transform: `scale(${pop(t, 85.75, { damping: 7, stiffness: 260 }) * (1 - settle * 0.2)}) rotate(${2 - settle * 1}deg)` }}>
          <Sticker bg={C.pink} color={C.cream} size={82}>NOT ANOTHER BORING JPEG!</Sticker>
        </div>
      ) : null}
      {/* tagline + link */}
      {t >= 87.6 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 950, display: "flex", justifyContent: "center", gap: 18, transform: `scale(${pop(t, 87.6)})` }}>
          <Tag size={26} bg={C.ink} color={C.cream}>Mutant owls · real meme bags · built on NEAR</Tag>
          <Tag size={26} bg={C.cream} color={C.ink}>{url ?? "Season 01 · coming soon"}</Tag>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 14, textAlign: "center", fontFamily: MONO, fontSize: 17, color: C.ink, opacity: at(t, [87.9, 88.3], [0, 0.85]) }}>
        Pre-launch preview: contracts not yet on mainnet · meme tokens are volatile and can go to zero · not financial advice
      </div>
    </AbsoluteFill>
  );
};

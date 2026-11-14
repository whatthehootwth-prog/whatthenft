/** 51–61 s — real marketplace + collection footage (demo data, clearly labelled). */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, MONO } from "../brand";
import { at, BrowserFrame, Halftone, pop, Sticker, Tag, useT } from "../exports";

const SWAP = 56.0;

export const S6Market: React.FC = () => {
  const t = useT();
  const inA = pop(t, 51.1, { damping: 14, stiffness: 120 });
  const swap = at(t, [SWAP - 0.2, SWAP + 0.25], [0, 1]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.violet }}>
      <Halftone color={C.lilac} opacity={0.35} size={28} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 70% 50%, rgba(255,255,255,0.18), transparent 60%)" }} />
      {t < SWAP + 0.3 ? (
        <BrowserFrame clip="market" from={51.0} start={0.6} width={1200} label="MARKETPLACE · DEMO DATA" style={{ left: 650, top: 170, transform: `translateX(${(1 - inA) * 1300 - swap * 1500}px) rotate(${-2 + inA * 1 - swap * 8}deg)` }} />
      ) : null}
      {t > SWAP - 0.25 ? (
        <BrowserFrame clip="collection" from={SWAP - 0.25} start={4.0} width={1290} zoom={1.55} origin="50% 60%" label="MY COLLECTION · DEMO DATA" style={{ left: 590, top: 150, transform: `translateX(${(1 - swap) * 1500}px) scale(${1 + at(t, [56.8, 57.3], [0, 0.04])}) rotate(${1 - (1 - swap) * 6}deg)` }} />
      ) : null}
      <div style={{ position: "absolute", left: 1450, top: 105, transform: `scale(${pop(t, 51.5)}) rotate(5deg)` }}>
        <Sticker bg={C.yellow} size={30}>PREVIEW · DEMO DATA</Sticker>
      </div>
      <div style={{ position: "absolute", left: 60, top: 260, display: "flex", flexDirection: "column", gap: 34, alignItems: "flex-start" }}>
        {[
          { s: 52.0, text: "COLLECT\nYOUR FREAK.", bg: C.lime, color: C.ink, r: -4 },
          { s: 54.4, text: "SHOW\nIT OFF.", bg: C.aqua, color: C.ink, r: 3 },
          { s: 56.8, text: "FILL YOUR\nCOLLECTION\nBOOK!", bg: C.orange, color: C.cream, r: -3 },
        ].map((b) => (
          <div key={b.text} style={{ transform: `scale(${pop(t, b.s, { damping: 8, stiffness: 230 })}) rotate(${b.r + Math.sin(t * 4 + b.s) * 1.2}deg)`, transformOrigin: "left center" }}>
            <Sticker bg={b.bg} color={b.color} size={54} style={{ whiteSpace: "pre", lineHeight: 0.95 }}>{b.text}</Sticker>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: at(t, [51.6, 52.0], [0, 1]) }}>
        <Tag size={22} bg={C.ink} color={C.cream}>Marketplace contract built &amp; tested · goes live at launch · listings shown are demo data</Tag>
      </div>
    </AbsoluteFill>
  );
};

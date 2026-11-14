/** 75–83.5 s — Season 01 · Meme Genesis · 111 mutants → next: seasons, crews, cross-chain (plans). */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, MONO } from "../brand";
import { at, BrowserFrame, Burst, Character, Halftone, Ink, pop, shakeAll, Sticker, Tag, useT } from "../exports";

export const CREW = ["nearkat", "hoodl", "hooters", "three", "moonshot", "raen", "mallace", "idp", "robinhoot", "cybernetic", "batman"];
const NEXT = 79.4;

export const S8Next: React.FC = () => {
  const t = useT();
  const out = at(t, [NEXT - 0.15, NEXT + 0.2], [0, 1]);
  const sh = shakeAll(t, [[75.05, 0.35, 22], [81.95, 0.3, 16]]);
  const n = Math.round(at(t, [77.3, 78.7], [0, 111], (x) => 1 - Math.pow(1 - x, 3)));
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Burst a={C.orange} b="#ff9a4d" rays={26} spin={12} />
      <Halftone opacity={0.08} />
      {/* Season 01 */}
      <AbsoluteFill style={{ transform: `translateY(${-out * 1100}px)` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <div style={{ transform: `scale(${1 + (1 - pop(t, 75.05, { damping: 12, stiffness: 280 })) * 2}) rotate(-3deg)`, opacity: t >= 75.05 ? 1 : 0 }}>
            <Ink size={210} color={C.yellow} shadow={16}>SEASON 01</Ink>
          </div>
          <div style={{ transform: `scale(${pop(t, 75.9)}) rotate(2deg)` }}>
            <Sticker bg={C.ink} color={C.cream} size={60}>MEME GENESIS</Sticker>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 460, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 30, transform: `scale(${pop(t, 77.3)})` }}>
          <Ink size={230} color={C.cream} shadow={16}>{String(n)}</Ink>
          <Ink size={110} color={C.cream}>MUTANTS</Ink>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 720, display: "flex", justifyContent: "center", opacity: at(t, [78.0, 78.4], [0, 1]) }}>
          <Tag size={26} bg={C.cream} color={C.ink}>Fixed 1 NEAR · open until sold out · 12 meme crews</Tag>
        </div>
        {/* crew parade */}
        <div style={{ position: "absolute", top: 790, left: 0, display: "flex", gap: 30, transform: `translateX(${1920 - (t - 75.2) * 520}px)` }}>
          {CREW.map((id, i) => (
            <div key={id} style={{ transform: `translateY(${Math.abs(Math.sin(t * 7 + i)) * -26}px) rotate(${Math.sin(t * 7 + i) * 6}deg)` }}>
              <Character id={id} size={250} />
            </div>
          ))}
        </div>
      </AbsoluteFill>
      {/* NEXT? */}
      {t >= NEXT ? (
        <>
          <BrowserFrame clip="wth" from={NEXT} start={2.4} width={900} label="WTH IS THIS?! · ROADMAP PAGE" style={{ left: 930, top: 230, transform: `translateX(${(1 - pop(t, NEXT + 0.3, { damping: 14, stiffness: 120 })) * 1200}px) rotate(2.5deg)` }} />
          <div style={{ position: "absolute", left: 80, top: 70, transform: `scale(${pop(t, NEXT, { damping: 7, stiffness: 260 })}) rotate(-6deg)`, transformOrigin: "left top" }}>
            <Ink size={200} color={C.cream} shadowColor={C.violet} shadow={14}>NEXT?</Ink>
          </div>
          <div style={{ position: "absolute", left: 80, top: 360, display: "flex", flexDirection: "column", gap: 34, alignItems: "flex-start" }}>
            {[
              { s: 80.2, text: "MORE SEASONS", bg: C.yellow, color: C.ink, r: -3 },
              { s: 81.0, text: "MORE MEME CREWS", bg: C.aqua, color: C.ink, r: 2 },
              { s: 81.95, text: "CROSS-CHAIN CHAOS", bg: C.violet, color: C.cream, r: -2 },
            ].map((b) => (
              <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 18, transform: `scale(${pop(t, b.s, { damping: 8, stiffness: 240 })}) rotate(${b.r}deg)`, transformOrigin: "left center" }}>
                <Sticker bg={b.bg} color={b.color} size={54}>{b.text}</Sticker>
                <Tag size={18} bg={C.ink} color={C.lime}>Planned</Tag>
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 84, bottom: 50, fontFamily: MONO, fontSize: 21, color: C.ink, opacity: 0.8 }}>Roadmap items are plans, not promises.</div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** 41–51 s — Common! Rare! Epic! Legendary! And… MYTHIC! — rarity is cosmetic only. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, RARITY } from "../brand";
import { RarityCard } from "../card";
import { at, Burst, Character, Flash, Halftone, Ink, pop, shakeAll, Sticker, Tag, useT, Vignette } from "../exports";

const CARDS = [
  { s: 41.5, id: "nearkat", name: "SNACK GOBLIN" },
  { s: 42.5, id: "three", name: "PIXEL PANIC" },
  { s: 43.5, id: "moonshot", name: "HIGH NOON HOOT" },
  { s: 44.5, id: "batman", name: "NIGHT SHIFT" },
  { s: 46.75, id: "cybernetic", name: "CYBORG CHAOS" },
];
const ROW = 48.1; // everything lines up with the odds

export const S5Rarity: React.FC = () => {
  const t = useT();
  const dark = at(t, [45.6, 45.9], [0, 1]) * (1 - at(t, [46.7, 46.8], [0, 1]));
  const row = at(t, [ROW, ROW + 0.6], [0, 1]);
  const sh = shakeAll(t, [[46.75, 0.5, 30]]);
  const mythic = t >= 46.75;
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      {mythic ? <Burst a={C.hot} b="#ff8cc6" rays={30} spin={30} /> : <Burst a={C.night2} b="#221d27" rays={20} spin={6} />}
      <Halftone color={mythic ? C.ink : C.violet} opacity={0.1} />
      {CARDS.map((c, i) => {
        if (t < c.s - 0.05) return null;
        const p = pop(t, c.s, { damping: 11, stiffness: 200 });
        const flip = at(t, [c.s, c.s + 0.28], [90, 0]);
        // first four fan across, mythic takes centre stage, then all five line up with the odds
        const fanX = [250, 650, 1050, 1450][i] ?? 960;
        const fanY = 560 + (i % 2) * 40;
        const rowX = 190 + i * 385;
        const isM = i === 4;
        const x0 = isM ? 960 : fanX;
        const y0 = isM ? 560 : fanY;
        const w0 = isM ? 440 : 330;
        const x = x0 + (rowX - x0) * row, y = y0 + (390 - y0) * row, w = w0 + (290 - w0) * row;
        const dim = isM ? 1 : Math.max(0.2, 1 - dark * 0.75 - (mythic && row === 0 ? 0.35 : 0));
        return (
          <div key={c.id} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${p}) perspective(1200px) rotateY(${flip}deg) rotate(${(1 - row) * (isM ? Math.sin(t * 3) * 3 : (i - 1.5) * 4)}deg)`, filter: `brightness(${dim})`, zIndex: isM ? 5 : 1 }}>
            <RarityCard tier={i} name={c.name} num={`#${String(7 + i * 19).padStart(3, "0")} / 111`} width={w} art={<Character id={c.id} size={w * 0.8} />} />
          </div>
        );
      })}
      {/* shouted tier names */}
      {CARDS.map((c, i) => {
        const end = i === 3 ? 45.6 : (CARDS[i + 1]?.s ?? ROW);
        if (t < c.s || t >= end || t >= ROW) return null;
        const p = pop(t, c.s, { damping: 7, stiffness: 280 });
        const r = RARITY[i]!;
        return (
          <div key={r.name} style={{ position: "absolute", left: 0, right: 0, top: i === 4 ? 30 : 60, display: "flex", justifyContent: "center", transform: `scale(${p}) rotate(${i % 2 ? 3 : -3}deg)`, zIndex: 9 }}>
            <Ink size={i === 4 ? 190 : 150} color={r.color} shadow={i === 4 ? 16 : 10}>{`${r.name}!`}</Ink>
          </div>
        );
      })}
      {t >= 45.75 && t < 46.75 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 120, zIndex: 20, display: "flex", justifyContent: "center", transform: `scale(${pop(t, 45.75)})` }}>
          <Ink size={220} color={C.cream} shadowColor={C.hot} shadow={16}>AND…</Ink>
        </div>
      ) : null}
      {/* sparkles for mythic */}
      {mythic && row < 1
        ? Array.from({ length: 16 }, (_, k) => {
            const a = (k / 16) * Math.PI * 2;
            const d = at(t, [46.75, 47.6], [80, 600]);
            return <div key={k} style={{ position: "absolute", left: 960 + Math.cos(a + t) * d, top: 560 + Math.sin(a + t) * d * 0.7, width: 26, height: 26, background: k % 2 ? C.sun : "#fff", transform: `rotate(45deg) scale(${1 - row})`, border: `4px solid ${C.ink}` }} />;
          })
        : null}
      {/* odds + the honest line */}
      {t >= ROW ? (
        <>
          {RARITY.map((r, i) => (
            <div key={r.name} style={{ position: "absolute", left: 190 + i * 385, top: 665, transform: `translateX(-50%) scale(${pop(t, ROW + 0.4 + i * 0.07)})`, zIndex: 6 }}>
              <Sticker bg={r.color} size={40} radius={14}>{`${r.pct}%`}</Sticker>
            </div>
          ))}
          <div style={{ position: "absolute", left: 0, right: 0, top: 46, display: "flex", justifyContent: "center", transform: `scale(${pop(t, ROW + 0.15, { damping: 8 })}) rotate(-2deg)` }}>
            <Sticker bg={C.yellow} size={74}>RARITY IS COSMETIC ONLY</Sticker>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 830, display: "flex", justifyContent: "center", opacity: at(t, [ROW + 0.8, ROW + 1.1], [0, 1]) }}>
            <Tag size={28} bg={C.cream} color={C.ink}>Odds per mint · it changes the frame and the flex, never the bag</Tag>
          </div>
        </>
      ) : null}
      {dark > 0 ? <Vignette strength={0.85 * dark} /> : null}
      <Flash at={46.75} dur={0.35} color="#fff" />
    </AbsoluteFill>
  );
};

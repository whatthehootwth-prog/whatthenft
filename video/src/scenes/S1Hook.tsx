/** 0–6 s — "What if an NFT could buy memes?!" → meme characters crash together into one mutant on the drop. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../brand";
import { at, Burst, Character, Flash, Halftone, Ink, pop, Pow, shakeAll, useT, Vignette } from "../exports";
import { Mutant, type Spec } from "../mutant";

export const HOOK_SPEC: Spec = { body: "raen", head: "moonshot", face: "three", arms: "robinhoot", accessory: "batman", legs: "hooters" };
const CRASHERS: { id: string; from: [number, number]; spin: number }[] = [
  { id: "moonshot", from: [-900, -620], spin: -260 },
  { id: "batman", from: [900, -640], spin: 240 },
  { id: "robinhoot", from: [-1100, 120], spin: -200 },
  { id: "hooters", from: [1100, 180], spin: 220 },
  { id: "three", from: [-700, 760], spin: -180 },
  { id: "raen", from: [720, 760], spin: 200 },
];
const WORDS: [string, number][] = [["WHAT", 0.35], ["IF", 0.62], ["AN", 1.0], ["NFT...", 1.22]];
const DROP = 4.0;

export const S1Hook: React.FC = () => {
  const t = useT();
  const sh = shakeAll(t, [[2.45, 0.25, 14], [2.9, 0.3, 22], [DROP, 0.6, 40], [4.35, 0.2, 10], [4.55, 0.2, 10]]);
  const pre = t < DROP;
  const zoom = pre ? at(t, [0, 3.95], [1, 1.12], (x) => x) : 1;
  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      {pre ? (
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) scale(${zoom}) rotate(${sh.r}deg)` }}>
          <Halftone color={C.violet} opacity={0.18} size={26} />
          <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, rgba(139,92,255,0.35), transparent 60%)` }} />
          {/* line 1, word by word with an RGB glitch on entry */}
          <div style={{ position: "absolute", top: 250, width: "100%", display: "flex", justifyContent: "center", gap: 36 }}>
            {WORDS.map(([w, s]) => {
              const p = pop(t, s, { damping: 9 });
              const g = t - s < 0.18 && t >= s ? 1 : 0;
              return (
                <div key={w} style={{ position: "relative", transform: `scale(${p}) rotate(${(1 - p) * -10}deg)`, opacity: t >= s ? 1 : 0 }}>
                  {g ? <Ink size={150} color={C.aqua} style={{ position: "absolute", left: -10, top: 0, opacity: 0.85 }}>{w}</Ink> : null}
                  {g ? <Ink size={150} color={C.hot} style={{ position: "absolute", left: 10, top: 4, opacity: 0.85 }}>{w}</Ink> : null}
                  <Ink size={150} color={C.cream} shadowColor={C.violet}>{w}</Ink>
                </div>
              );
            })}
          </div>
          {/* line 2 slams */}
          <div style={{ position: "absolute", top: 470, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ transform: `scale(${t >= 2.45 ? 1 + (1 - pop(t, 2.45, { damping: 14, stiffness: 260 })) * 2 : 0})`, opacity: t >= 2.45 ? 1 : 0 }}>
              <Ink size={120} color={C.cream} shadowColor={C.orange}>COULD SUPPORT THE</Ink>
            </div>
            <div style={{ transform: `scale(${t >= 2.9 ? 1 + (1 - pop(t, 2.9, { damping: 10, stiffness: 240 })) * 2.6 : 0}) rotate(-3deg)`, opacity: t >= 2.9 ? 1 : 0 }}>
              <Ink size={150} color={C.yellow} shadowColor={C.hot} shadow={12}>MEME ECOSYSTEM?!</Ink>
            </div>
          </div>
          {/* the crashers rush in from every side */}
          {CRASHERS.map((c, i) => {
            const p = at(t, [3.45 + i * 0.03, 3.98], [0, 1], (x) => x * x * x);
            if (p <= 0) return null;
            return (
              <div key={c.id} style={{ position: "absolute", left: 960 - 190 + c.from[0] * (1 - p), top: 540 - 190 + c.from[1] * (1 - p), transform: `rotate(${c.spin * (1 - p)}deg) scale(${0.7 + p * 0.5})` }}>
                <Character id={c.id} size={380} />
              </div>
            );
          })}
          <Vignette strength={0.7} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ transform: `translate(${sh.x}px, ${sh.y}px) rotate(${sh.r}deg)` }}>
          <Burst a={C.orange} b={C.yellow} rays={26} spin={22} />
          <Halftone opacity={0.08} />
          {/* explosion ring */}
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 200, height: 200, borderRadius: 999, border: `${at(t, [DROP, DROP + 0.5], [60, 0])}px solid ${C.cream}`, transform: `scale(${at(t, [DROP, DROP + 0.5], [0.5, 9])})`, opacity: at(t, [DROP + 0.2, DROP + 0.5], [1, 0]) }} />
          </AbsoluteFill>
          {/* the mutant pops out, parts bouncing into place */}
          <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: `scale(${pop(t, DROP, { damping: 8, stiffness: 200 }) * (1 + 0.04 * Math.max(0, Math.cos(((t - DROP) / 0.5) * Math.PI * 2)))}) rotate(${Math.sin((t - DROP) * 6) * 2}deg)`, marginTop: 40 }}>
              <Mutant
                spec={HOOK_SPEC}
                size={760}
                style={(l, i) => {
                  if (l.slot === "body") return {};
                  const p = pop(t, DROP + 0.12 + i * 0.07, { damping: 9, stiffness: 220 });
                  const dx = (l.anchor[0] - 627) / 627, dy = (l.anchor[1] - 627) / 627;
                  return { transform: `translate(${dx * 500 * (1 - p)}px, ${dy * 500 * (1 - p) - 300 * (1 - p)}px) rotate(${(1 - p) * 40 * (i % 2 ? 1 : -1)}deg)`, opacity: Math.min(1, p * 3) };
                }}
              />
            </div>
          </AbsoluteFill>
          {[
            { s: DROP, text: "BOOM!", x: 160, y: 120, r: -12, bg: C.cream, c: C.red, size: 360 },
            { s: 4.35, text: "BONK!", x: 1440, y: 160, r: 10, bg: C.aqua, c: C.ink, size: 270 },
            { s: 4.55, text: "SPLAT!", x: 1420, y: 700, r: -8, bg: C.lime, c: C.ink, size: 280 },
            { s: 4.75, text: "?!", x: 260, y: 700, r: 8, bg: C.pink, c: C.cream, size: 240 },
          ].map((p) => (
            <div key={p.text} style={{ position: "absolute", left: p.x, top: p.y, transform: `scale(${pop(t, p.s, { damping: 7, stiffness: 260 })})` }}>
              <Pow text={p.text} size={p.size} bg={p.bg} color={p.c} rotate={p.r} />
            </div>
          ))}
        </AbsoluteFill>
      )}
      <Flash at={DROP - 0.03} dur={0.3} />
    </AbsoluteFill>
  );
};

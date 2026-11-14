/** 14–29 s — parts assemble with meme labels → each part buys its meme token → RANDOM PARTS → MEME TOKENS → NFT BAG. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, MONO, SANS } from "../brand";
import { at, Coin, Halftone, Ink, Paper, pop, Sticker, Tag, useT } from "../exports";
import { Mutant, memeColor, memeName, mixOf, SLOT_LABEL, type Slot, type Spec } from "../mutant";

export const CORE_SPEC: Spec = { body: "three", head: "robinhoot", face: "three", arms: "moonshot", legs: "cybernetic", accessory: "idp" };
const ORDER: Slot[] = ["body", "head", "face", "arms", "legs", "accessory"];
const LAND: Record<Slot, number> = { body: 14.5, head: 15.0, face: 15.5, arms: 16.0, legs: 16.5, accessory: 17.0 };
const SHARE: Record<Slot, number> = { head: 16, face: 8, body: 20, arms: 8, legs: 8, accessory: 20 }; // slot weight × 80%
const OWL = { x: 150, y: 210, size: 700 };
const ROW0 = 150, ROWH = 104;
const LABEL_X = 960, COIN_X = 1500;

const toScreen = ([ax, ay]: [number, number]) => [OWL.x + (ax / 1254) * OWL.size, OWL.y + (ay / 1254) * OWL.size] as const;

export const S3Core: React.FC = () => {
  const t = useT();
  const eq = at(t, [24.5, 25.0], [0, 1]);
  const wobble = t > 18.9 && t < 20.4 ? Math.sin((t - 18.9) * 18) * 6 * (1 - (t - 18.9) / 1.5) : 0;
  const owlIn = pop(t, 13.95, { damping: 10 });
  const tokensOn = t >= 21.6;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Paper />
      <AbsoluteFill style={{ transform: `scale(${1 - eq * 0.08})`, opacity: 1 - eq * 0.82, filter: eq > 0 ? `blur(${eq * 6}px)` : undefined }}>
        <div style={{ position: "absolute", left: 60, top: 50, transform: `scale(${pop(t, 14.1)}) rotate(-3deg)`, transformOrigin: "left top" }}>
          <Sticker bg={C.ink} color={C.yellow} size={40}>HOW A MUTANT IS BORN</Sticker>
        </div>
        {/* owl + parts */}
        <div style={{ position: "absolute", left: OWL.x, top: OWL.y, transform: `scale(${owlIn}) rotate(${wobble}deg)`, transformOrigin: "50% 80%" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <Mutant spec={{}} size={OWL.size} />
          </div>
          <Mutant
            spec={CORE_SPEC}
            size={OWL.size}
            shadow={false}
            style={(l) => {
              const s = LAND[l.slot];
              if (t < s - 0.35) return null;
              const p = pop(t, s - 0.3, { damping: 10, stiffness: 210 });
              const dx = (l.anchor[0] - 627) / 627, dy = (l.anchor[1] - 627) / 627;
              if (l.slot === "body") return { opacity: at(t, [s - 0.1, s + 0.1], [0, 1]), transform: `scale(${0.9 + p * 0.1})` };
              return { transform: `translate(${dx * 900 * (1 - p)}px, ${(dy * 600 - 500) * (1 - p)}px) rotate(${(1 - p) * 70}deg)` };
            }}
          />
          {/* stamp */}
          {t > 19.15 ? (
            <div style={{ position: "absolute", left: 360, top: 40, transform: `scale(${pop(t, 19.15, { damping: 8, stiffness: 260 })}) rotate(12deg)` }}>
              <Sticker bg={tokensOn ? C.lime : C.pink} color={C.ink} size={38}>{tokensOn ? "…AND BUYS TOKENS" : "LOOKS RIDICULOUS"}</Sticker>
            </div>
          ) : null}
        </div>
        {/* connector lines */}
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {ORDER.map((slot, i) => {
            const layer = slot === "body" ? ([627, 900] as [number, number]) : null;
            const anchor = layer ?? (ANCHORS[slot] as [number, number]);
            const [x1, y1] = toScreen(anchor);
            const y2 = ROW0 + i * ROWH + 38;
            const p = at(t, [LAND[slot] + 0.05, LAND[slot] + 0.35], [0, 1]);
            if (p <= 0) return null;
            const x2 = LABEL_X - 10;
            const xm = x1 + (x2 - x1) * p, ym = y1 + (y2 - y1) * p;
            return (
              <g key={slot}>
                <line x1={x1} y1={y1} x2={xm} y2={ym} stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 14" />
                <circle cx={x1} cy={y1} r={11} fill={memeColor(CORE_SPEC[slot]!)} stroke={C.ink} strokeWidth={5} />
              </g>
            );
          })}
          {tokensOn
            ? ORDER.map((slot, i) => {
                const y = ROW0 + i * ROWH + 38;
                const p = at(t, [21.75 + i * 0.12, 22.1 + i * 0.12], [0, 1]);
                return p > 0 ? <path key={slot} d={`M${LABEL_X + 400} ${y} H${LABEL_X + 400 + (COIN_X - LABEL_X - 440) * p}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" markerEnd={p > 0.95 ? "url(#arr)" : undefined} /> : null;
              })
            : null}
          <defs>
            <marker id="arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 z" fill={C.ink} />
            </marker>
          </defs>
        </svg>
        {/* labels */}
        {ORDER.map((slot, i) => {
          const id = CORE_SPEC[slot]!;
          const p = pop(t, LAND[slot] + 0.15, { damping: 9, stiffness: 240 });
          return (
            <div key={slot} style={{ position: "absolute", left: LABEL_X, top: ROW0 + i * ROWH, transform: `scale(${p})`, transformOrigin: "left center" }}>
              <Sticker bg={memeColor(id)} color={C.ink} size={34} radius={14} style={{ width: 380, justifyContent: "space-between" }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22 }}>{SLOT_LABEL[slot]}</span>
                <span>{memeName(id)}</span>
              </Sticker>
            </div>
          );
        })}
        {/* coins with the share each part buys */}
        {ORDER.map((slot, i) => {
          const id = CORE_SPEC[slot]!;
          const p = pop(t, 22.05 + i * 0.12, { damping: 8, stiffness: 240 });
          return (
            <div key={slot} style={{ position: "absolute", left: COIN_X, top: ROW0 + i * ROWH - 4, display: "flex", alignItems: "center", gap: 16, transform: `scale(${tokensOn ? p : 0})`, transformOrigin: "left center" }}>
              <Coin size={84} color={memeColor(id)} />
              <Ink size={54} color={C.cream}>{`${SHARE[slot]}%`}</Ink>
            </div>
          );
        })}
        {/* WTH core + total mix */}
        <div style={{ position: "absolute", left: LABEL_X, top: ROW0 + 6 * ROWH + 14, display: "flex", alignItems: "center", gap: 18, transform: `scale(${tokensOn ? pop(t, 22.9) : 0})`, transformOrigin: "left center" }}>
          <Sticker bg={C.orange} color={C.cream} size={34} radius={14} style={{ width: 380, justifyContent: "space-between" }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22 }}>ALWAYS</span>
            <span>WTH CORE</span>
          </Sticker>
          <div style={{ width: 120 }} />
          <Coin size={84} color={C.orange} />
          <Ink size={54} color={C.cream}>20%</Ink>
        </div>
        <MixBar t={t} x={LABEL_X} y={ROW0 + 7 * ROWH + 40} w={880} start={23.2} />
      </AbsoluteFill>
      {/* the equation */}
      {t > 24.6 ? <Equation t={t} /> : null}
    </AbsoluteFill>
  );
};

const ANCHORS: Partial<Record<Slot, [number, number]>> = { head: [666, 211], face: [991, 727], arms: [166, 760], legs: [401, 1124], accessory: [628, 909] };

const MixBar: React.FC<{ t: number; x: number; y: number; w: number; start: number }> = ({ t, x, y, w, start }) => {
  const mix = mixOf(CORE_SPEC);
  const p = at(t, [start, start + 0.7], [0, 1]);
  if (p <= 0) return null;
  let acc = 0;
  return (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: C.ink, marginBottom: 8, letterSpacing: "0.06em" }}>THIS MUTANT'S BAG · SAME FORMULA AS THE CONTRACT</div>
      <div style={{ position: "relative", width: w, height: 44, border: `5px solid ${C.ink}`, borderRadius: 14, overflow: "hidden", background: C.cream, boxShadow: `6px 6px 0 ${C.ink}` }}>
        {mix.map((m) => {
          const left = acc;
          acc += m.pct;
          return <div key={m.id} style={{ position: "absolute", top: 0, bottom: 0, left: `${left * p}%`, width: `${m.pct * p}%`, background: m.color, borderRight: `4px solid ${C.ink}` }} />;
        })}
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 10, fontFamily: SANS, fontWeight: 800, fontSize: 22, color: C.ink, opacity: p }}>
        {mix.map((m) => (
          <span key={m.id}>
            <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 99, background: m.color, border: `3px solid ${C.ink}`, marginRight: 6 }} />
            {m.name} {m.pct}%
          </span>
        ))}
      </div>
    </div>
  );
};

const Equation: React.FC<{ t: number }> = ({ t }) => {
  const boxes = [
    { s: 25.0, title: "RANDOM\nPARTS", bg: C.pink, color: C.cream, x: 340 },
    { s: 26.0, title: "MEME\nTOKENS", bg: C.aqua, color: C.cream, x: 960 },
    { s: 27.0, title: "NFT\nBAG", bg: C.yellow, color: C.cream, x: 1580 },
  ];
  return (
    <AbsoluteFill>
      <Halftone opacity={0.06} />
      {boxes.map((b, i) => {
        const p = pop(t, b.s, { damping: 9, stiffness: 230 });
        const hit = t >= b.s && t < b.s + 0.25 ? 1 + (0.25 - (t - b.s)) * 0.4 : 1;
        return (
          <div key={b.title} style={{ position: "absolute", left: b.x - 230, top: 300, width: 460, height: 460, transform: `scale(${p * hit}) rotate(${(i - 1) * 3}deg)` }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: 40, background: b.bg, border: `10px solid ${C.ink}`, boxShadow: `16px 16px 0 ${C.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {i === 0 ? <Mutant spec={CORE_SPEC} size={210} style={(l, k) => (l.slot === "body" ? {} : { transform: `translate(${Math.sin(t * 6 + k) * 14}px, ${Math.cos(t * 5 + k) * 10}px)` })} /> : null}
                {i === 1 ? (
                  <div style={{ position: "relative", width: 240, height: 170 }}>
                    {["robinhoot", "three", "idp", "wth"].map((id, k) => (
                      <div key={id} style={{ position: "absolute", left: k * 44, top: 40 + Math.sin(t * 7 + k) * 14 - (k % 2) * 30 }}>
                        <Coin size={100} color={id === "wth" ? C.orange : memeColor(id)} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {i === 2 ? <MiniCard t={t} /> : null}
              </div>
              <Ink size={84} color={b.color} style={{ textAlign: "center" }}>{b.title}</Ink>
            </div>
          </div>
        );
      })}
      {[25.5, 26.5].map((s, i) => (
        <div key={s} style={{ position: "absolute", left: 600 + i * 620, top: 480, transform: `scale(${pop(t, s, { damping: 8, stiffness: 260 })})` }}>
          <Ink size={150} color={C.orange}>→</Ink>
        </div>
      ))}
      {t > 27.5 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 860, display: "flex", justifyContent: "center", transform: `scale(${pop(t, 27.5)})` }}>
          <Tag size={26} bg={C.ink} color={C.cream}>The bag lives inside the NFT · whoever holds the NFT owns the bag</Tag>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const MiniCard: React.FC<{ t: number; size?: number }> = ({ t, size = 150 }) => (
  <div style={{ width: size, height: size * 1.3, borderRadius: 16, background: C.cream, border: `6px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`, transform: `rotate(${Math.sin(t * 4) * 5}deg)`, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ flex: 1, borderRadius: 10, background: C.orange, border: `4px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <Mutant spec={CORE_SPEC} size={size * 0.85} shadow={false} />
    </div>
    <div style={{ height: 14, borderRadius: 6, border: `3px solid ${C.ink}`, background: `linear-gradient(90deg, ${C.orange} 0 20%, ${memeColor("three")} 20% 48%, ${memeColor("robinhoot")} 48% 64%, ${memeColor("idp")} 64% 84%, ${memeColor("moonshot")} 84% 92%, ${memeColor("cybernetic")} 92%)` }} />
  </div>
);

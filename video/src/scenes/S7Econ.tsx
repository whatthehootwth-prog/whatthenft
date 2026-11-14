/** 61–75 s — 85 / 10 / 5 split, royalties → WTH treasury → buybacks & holder distributions (designed; activates at launch). */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, MONO, SANS } from "../brand";
import { at, Coin, Ink, pop, Sticker, Tag, useT } from "../exports";

const SRC = { x: 270, y: 560 };
const BOX_X = 760, BOX_W = 540, BOX_H = 150;
const ROWS = [
  { s: 63.9, y: 330, pct: "85%", label: "MEME BAG", sub: "real meme tokens in your NFT", bg: C.orange, color: C.cream },
  { s: 64.6, y: 545, pct: "10%", label: "CREATOR", sub: "keeps the art coming", bg: C.yellow, color: C.cream },
  { s: 67.7, y: 760, pct: "5%", label: "WTH TREASURY", sub: "fuel for the WTH community", bg: C.aqua, color: C.cream },
];
const BUY = { x: 1440, y: 690, w: 420, h: 300 };
const ROY = { x: 120, y: 880 };

export const S7Econ: React.FC = () => {
  const t = useT();
  const up = at(t, [63.3, 63.8], [0, 1]);
  const flow = (t * 120) % 40;
  const treasury = ROWS[2]!;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: C.night2 }}>
      <AbsoluteFill style={{ backgroundImage: "linear-gradient(rgba(46,230,255,0.08) 2px, transparent 2px), linear-gradient(90deg, rgba(46,230,255,0.08) 2px, transparent 2px)", backgroundSize: "60px 60px" }} />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,122,26,0.18), transparent 60%)" }} />
      {/* title: centre → top */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 380 - up * 330, display: "flex", justifyContent: "center", alignItems: "center", gap: 26, transform: `scale(${pop(t, 61.5, { damping: 9 }) * (1 - up * 0.45)})` }}>
        <Img src={staticFile("art/owl-512.webp")} style={{ width: 210, height: 210, filter: `drop-shadow(8px 10px 0 #000)`, transform: `rotate(${Math.sin(t * 5) * 6}deg)` }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Ink size={96} color={C.cream} shadowColor={C.violet}>THE MADNESS SUPPORTS</Ink>
          <Ink size={190} color={C.orange} shadowColor="#000" shadow={14}>WTH!</Ink>
        </div>
      </div>
      {t > 63.4 ? (
        <>
          {/* flows */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {ROWS.map((r) => {
              const p = at(t, [r.s - 0.1, r.s + 0.35], [0, 1]);
              if (p <= 0) return null;
              const d = `M${SRC.x + 110} ${SRC.y} C ${SRC.x + 300} ${SRC.y}, ${BOX_X - 220} ${r.y}, ${BOX_X - 10} ${r.y}`;
              return (
                <g key={r.label}>
                  <path d={d} stroke="#000" strokeWidth={30} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
                  <path d={d} stroke={r.bg} strokeWidth={18} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
                  {p >= 1 ? <path d={d} stroke="rgba(22,17,15,0.55)" strokeWidth={8} fill="none" strokeDasharray="10 30" strokeDashoffset={-flow} strokeLinecap="round" /> : null}
                </g>
              );
            })}
            {t > 70.8 ? (() => {
              const p = at(t, [70.85, 71.3], [0, 1]);
              const d = `M${ROY.x + 470} ${ROY.y + 40} C ${ROY.x + 560} ${ROY.y + 40}, ${BOX_X - 160} ${treasury.y + 40}, ${BOX_X - 10} ${treasury.y + 30}`;
              return (
                <g>
                  <path d={d} stroke="#000" strokeWidth={22} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
                  <path d={d} stroke={C.lime} strokeWidth={12} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
                </g>
              );
            })() : null}
            {t > 72.0 ? (() => {
              const p = at(t, [72.0, 72.4], [0, 1]);
              const d = `M${BOX_X + BOX_W + 10} ${treasury.y} H ${BUY.x - 14}`;
              return (
                <g>
                  <path d={d} stroke="#000" strokeWidth={30} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
                  <path d={d} stroke={C.aqua} strokeWidth={18} fill="none" pathLength={1} strokeDasharray={`${p} 1`} />
                  {p >= 1 ? <path d={d} stroke="rgba(22,17,15,0.55)" strokeWidth={8} fill="none" strokeDasharray="10 30" strokeDashoffset={-flow} strokeLinecap="round" /> : null}
                </g>
              );
            })() : null}
          </svg>
          {/* source coin */}
          <div style={{ position: "absolute", left: SRC.x - 110, top: SRC.y - 110, transform: `scale(${pop(t, 63.5, { damping: 8 })}) rotate(${Math.sin(t * 3) * 6}deg)` }}>
            <Coin size={220} color={C.yellow} text="1 NEAR" textSize={0.19} />
          </div>
          <div style={{ position: "absolute", left: SRC.x - 110, top: SRC.y + 130, width: 220, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 22, color: C.cream, opacity: at(t, [63.7, 64], [0, 1]) }}>EVERY MINT</div>
          {/* split boxes */}
          {ROWS.map((r, i) => {
            const p = pop(t, r.s + 0.2, { damping: 9, stiffness: 220 });
            const glow = i === 2 && t > 67.7 && t < 70.4 ? 0.5 + 0.5 * Math.sin((t - 67.7) * 10) : 0;
            return (
              <div key={r.label} style={{ position: "absolute", left: BOX_X, top: r.y - BOX_H / 2, width: BOX_W, height: BOX_H, transform: `scale(${p})`, transformOrigin: "left center" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: r.bg, border: `7px solid ${C.ink}`, boxShadow: `10px 10px 0 #000${glow ? `, 0 0 ${40 * glow}px ${C.aqua}` : ""}`, display: "flex", alignItems: "center", gap: 22, padding: "0 26px" }}>
                  <Ink size={92} color={r.color}>{r.pct}</Ink>
                  <div>
                    <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 44, color: C.ink, lineHeight: 1 }}>{r.label}</div>
                    <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 22, color: C.ink, opacity: 0.8, marginTop: 6 }}>{r.sub}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* royalties */}
          {t > 70.75 ? (
            <div style={{ position: "absolute", left: ROY.x, top: ROY.y, transform: `scale(${pop(t, 70.75, { damping: 9 })})`, transformOrigin: "left center" }}>
              <Sticker bg={C.lime} size={36} rotate={-2}>MARKET ROYALTY 3%</Sticker>
              <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 700, fontSize: 20, color: C.cream }}>half → creator · half → WTH treasury</div>
            </div>
          ) : null}
          {/* buybacks */}
          {t > 72.15 ? (
            <div style={{ position: "absolute", left: BUY.x, top: BUY.y - 20, width: BUY.w, transform: `scale(${pop(t, 72.15, { damping: 9 })})`, transformOrigin: "left center" }}>
              <div style={{ borderRadius: 26, background: C.cream, border: `7px solid ${C.ink}`, boxShadow: "10px 10px 0 #000", padding: "22px 24px" }}>
                <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.ink, lineHeight: 1.05 }}>WTH BUYBACKS</div>
                <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 40, color: C.orange, lineHeight: 1.05, marginTop: 4 }}>→ HOLDER DROPS</div>
                <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 21, color: C.muted, marginTop: 10 }}>treasury buys WTH and shares it with NFT holders</div>
              </div>
            </div>
          ) : null}
          {t > 72.6 ? (
            <div style={{ position: "absolute", left: 1390, top: 520, transform: `scale(${1 + (1 - pop(t, 72.6, { damping: 12, stiffness: 300 })) * 1.6}) rotate(-8deg)`, opacity: Math.min(1, (t - 72.6) * 8) }}>
              <Sticker bg={C.pink} color={C.cream} size={30}>DESIGNED · ACTIVATES AT LAUNCH</Sticker>
            </div>
          ) : null}
        </>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 26, display: "flex", justifyContent: "center", opacity: at(t, [64, 64.5], [0, 1]) }}>
        <Tag size={20} bg="#000" color={C.fog}>Split coded in the contracts (built &amp; tested, not yet deployed) · not an investment · no returns promised</Tag>
      </div>
    </AbsoluteFill>
  );
};

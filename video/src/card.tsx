/** Collectible card in the site's style (frame colour by rarity, stars, badge, edition number). */
import React from "react";
import { C, DISPLAY, MONO, RARITY } from "./brand";
import { Stars, useT } from "./kit";

export const RarityCard: React.FC<{ tier: number; name: string; art: React.ReactNode; num?: string; width?: number; artBg?: string }> = ({ tier, name, art, num = "#001 / 111", width = 420, artBg }) => {
  const t = useT();
  const r = RARITY[tier]!;
  const frame =
    tier === 4
      ? `conic-gradient(from ${t * 120}deg, #ff8cc6, #ffd23f, #b8ff3d, #2ee6ff, #8b5cff, #ff8cc6)`
      : tier === 3
        ? `linear-gradient(${135 + Math.sin(t * 2) * 30}deg, #fff3a6, #ffd23f 40%, #ff9f1a 70%, #fff3a6)`
        : r.color;
  const s = width / 420;
  return (
    <div style={{ width, borderRadius: 26 * s, padding: 14 * s, background: frame, border: `${7 * s}px solid ${C.ink}`, boxShadow: `${14 * s}px ${14 * s}px 0 ${C.ink}` }}>
      <div style={{ borderRadius: 16 * s, background: C.paper, border: `${5 * s}px solid ${C.ink}`, padding: 14 * s }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 40 * s, color: C.ink, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden" }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * s, marginTop: 8 * s }}>
          <Stars n={r.stars} size={24 * s} />
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18 * s, padding: `${3 * s}px ${10 * s}px`, borderRadius: 8 * s, border: `${3 * s}px solid ${C.ink}`, background: tier >= 3 ? frame : r.color, color: tier === 2 ? "#fff" : C.ink }}>{r.name}</div>
        </div>
        <div style={{ marginTop: 12 * s, aspectRatio: "1 / 1", borderRadius: 14 * s, border: `${5 * s}px solid ${C.ink}`, overflow: "hidden", position: "relative", background: artBg ?? `radial-gradient(circle at 50% 45%, #fff 0%, ${r.color === "#ffffff" ? "#f1e6cf" : r.color} 75%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {art}
        </div>
        <div style={{ marginTop: 10 * s, fontFamily: MONO, fontSize: 18 * s, color: C.muted, textAlign: "right" }}>{num}</div>
      </div>
    </div>
  );
};

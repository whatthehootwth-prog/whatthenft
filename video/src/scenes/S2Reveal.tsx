/** 6–14 s — logo slam, then the real homepage + "One owl. Too many memes. Absolutely zero chill." */
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, MONO } from "../brand";
import { at, BrowserFrame, Burst, Halftone, Ink, pop, shakeAll, Sticker, Tag, useT } from "../exports";

export const S2Reveal: React.FC = () => {
  const t = useT();
  const sh = shakeAll(t, [[6.0, 0.4, 26]]);
  const move = at(t, [7.75, 8.35], [0, 1]);
  const logoIn = pop(t, 6.0, { damping: 9, stiffness: 190 });
  const frameIn = pop(t, 7.95, { damping: 14, stiffness: 120 });
  return (
    <AbsoluteFill style={{ overflow: "hidden", transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <Burst a={C.yellow} b={C.sun} rays={28} spin={10} />
      <Halftone opacity={0.07} />
      {/* logo lockup: centre → top-left */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 470,
          transform: `translate(-50%, -50%) translate(${move * -615}px, ${move * -300}px) scale(${logoIn * (1 - move * 0.6)}) rotate(${(1 - logoIn) * -25 + Math.sin(t * 3) * 1.5}deg)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Img src={staticFile("art/owl-512.webp")} style={{ width: 400, height: 400, filter: `drop-shadow(10px 12px 0 ${C.ink})`, transform: `rotate(${Math.sin(t * 5) * 3}deg)` }} />
        <div style={{ marginTop: -30 }}>
          <Ink size={210} color={C.orange} shadow={14}>WHAT THE NFT?!</Ink>
        </div>
        <div style={{ marginTop: 18, opacity: at(t, [6.5, 6.8], [0, 1]) }}>
          <Tag size={30} bg={C.ink} color={C.yellow}>Season 01 · Meme Genesis · on NEAR</Tag>
        </div>
      </div>
      {/* real homepage footage */}
      {t > 7.8 ? (
        <BrowserFrame clip="home" from={7.9} start={4.0} width={1180} style={{ left: 690, top: 150, transform: `translateX(${(1 - frameIn) * 1400}px) rotate(${2 - frameIn * 3.5}deg)` }} />
      ) : null}
      {/* the three beats */}
      <div style={{ position: "absolute", left: 70, top: 470, display: "flex", flexDirection: "column", gap: 34, alignItems: "flex-start" }}>
        {[
          { s: 8.25, text: "ONE OWL.", bg: C.orange, color: C.cream, r: -4 },
          { s: 9.25, text: "TOO MANY MEMES.", bg: C.aqua, color: C.ink, r: 3 },
          { s: 10.5, text: "ABSOLUTELY ZERO CHILL.", bg: C.pink, color: C.cream, r: -3 },
        ].map((b) => (
          <div key={b.text} style={{ transform: `scale(${pop(t, b.s, { damping: 8, stiffness: 230 })}) rotate(${b.r + Math.sin(t * 4 + b.s) * 1.2}deg)`, transformOrigin: "left center" }}>
            <Sticker bg={b.bg} color={b.color} size={b.text.length > 16 ? 50 : 62}>{b.text}</Sticker>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

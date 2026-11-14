/**
 * 9:16 teaser (1080×1920, ~19 s): hook → rarity → finale, cut from the mastered landscape trailer
 * (public/footage/trailer-master.mp4, copied by `npm run teaser`), framed for phones with burned-in captions.
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { C, MONO } from "./brand";
import { Halftone, Ink, pop, Sticker, Tag } from "./kit";
import { FPS, VO } from "./timeline";

export const SEGMENTS: [number, number][] = [
  [0, 6.0],
  [41.4, 48.0],
  [83.5, 90.0],
];
export const TEASER_S = SEGMENTS.reduce((a, [s, e]) => a + (e - s), 0);

const CAPTION: Record<string, string> = {
  s1a: "WHAT IF… AN NFT…",
  s1b: "COULD BUY MEMES?!",
  s5a: "COMMON!",
  s5b: "RARE!",
  s5c: "EPIC!",
  s5d: "LEGENDARY!",
  s5e: "AND…",
  s5f: "MYTHIC!",
  s9a: "WHAT THE NFT?!",
  s9b: "NOT ANOTHER BORING JPEG!",
};

/** teaser time → trailer time */
function srcTime(t: number) {
  let acc = 0;
  for (const [s, e] of SEGMENTS) {
    if (t < acc + (e - s)) return s + (t - acc);
    acc += e - s;
  }
  return SEGMENTS[SEGMENTS.length - 1]![1];
}

export const Teaser: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const src = srcTime(t);
  const line = VO.find((v) => CAPTION[v.id] && src >= v.at - 0.05 && src < v.end + 0.35);
  let acc = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {SEGMENTS.map(([s, e], i) => {
        const from = acc;
        acc += e - s;
        const len = Math.round((e - s) * FPS);
        const vol = (f: number) => interpolate(f, [0, 4, len - 5, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <Sequence key={i} from={Math.round(from * FPS)} durationInFrames={len}>
            {/* blurred fill */}
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <OffthreadVideo src={staticFile("footage/trailer-master.mp4")} trimBefore={Math.round(s * FPS)} muted style={{ position: "absolute", height: 1920, width: 3413, left: -1166, filter: "blur(40px) brightness(0.55) saturate(1.3)" }} />
            </AbsoluteFill>
            <Halftone color={C.ink} opacity={0.25} size={18} />
            {/* main picture */}
            <div style={{ position: "absolute", left: 0, top: 640, width: 1080, height: 608, borderTop: `8px solid ${C.ink}`, borderBottom: `8px solid ${C.ink}`, overflow: "hidden", boxShadow: "0 18px 0 rgba(0,0,0,0.5)" }}>
              <OffthreadVideo src={staticFile("footage/trailer-master.mp4")} trimBefore={Math.round(s * FPS)} volume={vol} style={{ width: 1080, height: 608 }} />
            </div>
          </Sequence>
        );
      })}
      {/* header */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        <Img src={staticFile("art/owl-512.webp")} style={{ width: 210, height: 210, filter: `drop-shadow(8px 10px 0 ${C.ink})`, transform: `rotate(${Math.sin(t * 4) * 5}deg)` }} />
        <Ink size={124} color={C.orange} shadow={10}>WHAT THE NFT?!</Ink>
      </div>
      {/* caption */}
      {line ? (
        <div key={line.id} style={{ position: "absolute", top: 1340, left: 40, right: 40, display: "flex", justifyContent: "center", transform: `scale(${pop(t, line.at - srcTime(t) + t, { damping: 8, stiffness: 260 })})` }}>
          <Ink size={CAPTION[line.id]!.length > 16 ? 84 : 112} color={C.yellow} shadow={9} style={{ whiteSpace: "normal", textAlign: "center" }}>{CAPTION[line.id]!}</Ink>
        </div>
      ) : null}
      {/* footer */}
      <div style={{ position: "absolute", top: 1600, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <Sticker bg={C.pink} color={C.cream} size={50} rotate={-2}>SEASON 01 · MEME GENESIS</Sticker>
        <Tag size={22} bg={C.cream} color={C.ink}>111 mutants · real meme bags · on NEAR</Tag>
      </div>
      <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 19, color: C.cream, opacity: 0.85 }}>Pre-launch preview · not yet on mainnet · not financial advice</div>
    </AbsoluteFill>
  );
};

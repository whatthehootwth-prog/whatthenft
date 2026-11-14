/** Comic motion-graphics kit in the site's style: thick ink outlines, hard offset shadows, stickers, ray bursts. */
import React from "react";
import { AbsoluteFill, Easing, interpolate, OffthreadVideo, random, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { C, DISPLAY, MONO, SANS } from "./brand";
import { FPS, f, toDesign, toVideo } from "./timeline";

/** Design-clock time in seconds (see KNOTS in timeline.ts). Scenes are not wrapped in time-shifting Sequences. */
export const useT = () => toDesign(useCurrentFrame() / FPS);

/** Spring that starts at `at` seconds. */
export const pop = (t: number, at: number, cfg: Partial<{ damping: number; stiffness: number; mass: number }> = {}) =>
  spring({ frame: Math.round((t - at) * FPS), fps: FPS, config: { damping: 11, stiffness: 170, mass: 0.75, ...cfg } });

/** Clamped interpolate on seconds. */
export const at = (t: number, [a, b]: [number, number], [c, d]: [number, number], ease: (x: number) => number = Easing.bezier(0.2, 0.8, 0.2, 1)) =>
  interpolate(t, [a, b], [c, d], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

/** Decaying camera shake that starts at `start`. */
export function shake(t: number, start: number, dur = 0.35, amp = 18) {
  if (t < start || t > start + dur) return { x: 0, y: 0, r: 0 };
  const k = 1 - (t - start) / dur;
  const i = Math.floor(t * FPS);
  return { x: (random(`x${i}`) - 0.5) * 2 * amp * k, y: (random(`y${i}`) - 0.5) * 2 * amp * k, r: (random(`r${i}`) - 0.5) * 2 * k };
}
export const shakeAll = (t: number, hits: [number, number?, number?][]) =>
  hits.reduce((acc, [s, d, a]) => { const v = shake(t, s, d, a); return { x: acc.x + v.x, y: acc.y + v.y, r: acc.r + v.r }; }, { x: 0, y: 0, r: 0 });

/** Bold comic text: ink stroke painted under the fill + hard offset shadow. */
export const Ink: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  stroke?: number;
  shadow?: number;
  shadowColor?: string;
  font?: string;
  style?: React.CSSProperties;
}> = ({ children, size, color = C.cream, stroke, shadow, shadowColor = C.ink, font = DISPLAY, style }) => {
  const sw = stroke ?? Math.max(4, size * 0.085);
  const sh = shadow ?? Math.max(4, size * 0.06);
  return (
    <span
      style={{
        fontFamily: font,
        fontSize: size,
        color,
        lineHeight: 0.92,
        letterSpacing: font === DISPLAY ? "0.01em" : undefined,
        WebkitTextStroke: `${sw}px ${C.ink}`,
        paintOrder: "stroke fill",
        textShadow: `${sh}px ${sh}px 0 ${shadowColor}`,
        whiteSpace: "pre",
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Sticker / pill with ink border + hard shadow. */
export const Sticker: React.FC<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  size?: number;
  rotate?: number;
  pad?: string;
  radius?: number;
  border?: number;
  font?: string;
  style?: React.CSSProperties;
}> = ({ children, bg = C.yellow, color = C.ink, size = 56, rotate = 0, pad, radius = 20, border, font = DISPLAY, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.3,
      background: bg,
      color,
      fontFamily: font,
      fontSize: size,
      lineHeight: 1,
      padding: pad ?? `${size * 0.28}px ${size * 0.5}px ${size * 0.24}px`,
      borderRadius: radius,
      border: `${border ?? Math.max(4, size * 0.09)}px solid ${C.ink}`,
      boxShadow: `${Math.max(5, size * 0.13)}px ${Math.max(5, size * 0.13)}px 0 ${C.ink}`,
      transform: `rotate(${rotate}deg)`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Small mono honesty tag. */
export const Tag: React.FC<{ children: React.ReactNode; bg?: string; color?: string; size?: number; style?: React.CSSProperties }> = ({ children, bg = C.ink, color = C.cream, size = 22, style }) => (
  <div
    style={{
      display: "inline-block",
      fontFamily: MONO,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      background: bg,
      color,
      padding: `${size * 0.35}px ${size * 0.6}px`,
      borderRadius: 10,
      border: `3px solid ${C.ink}`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Rotating comic ray burst. */
export const Burst: React.FC<{ a: string; b: string; rays?: number; spin?: number; cx?: number; cy?: number; offset?: number }> = ({ a, b, rays = 22, spin = 8, cx = 960, cy = 540, offset = 0 }) => {
  const t = useT();
  const R = 2600;
  const step = (Math.PI * 2) / rays;
  const rot = (t * spin + offset) % 360;
  return (
    <AbsoluteFill style={{ background: a }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`rotate(${rot} ${cx} ${cy})`}>
          {Array.from({ length: rays }, (_, i) => {
            if (i % 2) return null;
            const a0 = i * step, a1 = a0 + step;
            return <polygon key={i} points={`${cx},${cy} ${cx + Math.cos(a0) * R},${cy + Math.sin(a0) * R} ${cx + Math.cos(a1) * R},${cy + Math.sin(a1) * R}`} fill={b} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/** Halftone dot overlay. */
export const Halftone: React.FC<{ color?: string; opacity?: number; size?: number }> = ({ color = C.ink, opacity = 0.1, size = 22 }) => (
  <AbsoluteFill style={{ backgroundImage: `radial-gradient(${color} 22%, transparent 24%)`, backgroundSize: `${size}px ${size}px`, opacity }} />
);

/** Grid paper. */
export const Paper: React.FC<{ bg?: string; line?: string }> = ({ bg = C.page, line = "rgba(22,17,15,0.07)" }) => (
  <AbsoluteFill style={{ background: bg, backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`, backgroundSize: "60px 60px" }} />
);

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${strength}) 100%)` }} />
);

/** White flash that decays. */
export const Flash: React.FC<{ at: number; dur?: number; color?: string }> = ({ at: s, dur = 0.25, color = "#fff" }) => {
  const t = useT();
  const o = t < s ? 0 : Math.max(0, 1 - (t - s) / dur);
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o }} /> : null;
};

/** Website footage in a chunky comic browser window. Plays from `from` (video time), starting `start` s into the clip. */
export const BrowserFrame: React.FC<{
  clip: string;
  from: number;
  start?: number;
  width: number;
  label?: string;
  style?: React.CSSProperties;
  rate?: number;
  zoom?: number;
  origin?: string;
}> = ({ clip, from, start = 0, width, label = "WHAT THE NFT?!", style, rate = 1, zoom = 1, origin = "50% 50%" }) => {
  const h = (width * 9) / 16;
  return (
    <div style={{ position: "absolute", width, borderRadius: 26, border: `8px solid ${C.ink}`, background: C.ink, boxShadow: `18px 18px 0 ${C.ink}`, overflow: "hidden", ...style }}>
      <div style={{ height: 46, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: C.ink }}>
        {[C.red, C.yellow, C.lime].map((c) => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c }} />
        ))}
        <div style={{ marginLeft: 14, flex: 1, height: 28, borderRadius: 8, background: "#2a2430", color: C.fog, fontFamily: MONO, fontSize: 16, display: "flex", alignItems: "center", paddingLeft: 14, letterSpacing: "0.04em" }}>
          {label}
        </div>
      </div>
      <div style={{ width: "100%", height: h, position: "relative", overflow: "hidden", background: C.page }}>
        <Sequence from={f(toVideo(from))} layout="none">
          <OffthreadVideo src={staticFile(`footage/${clip}.mp4`)} trimBefore={f(start)} playbackRate={rate} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`, transformOrigin: origin }} />
        </Sequence>
      </div>
    </div>
  );
};

/** Padlock in brand style. `open` 0..1 lifts the shackle. */
export const Padlock: React.FC<{ size: number; open?: number; body?: string }> = ({ size, open = 0, body = C.yellow }) => {
  const shackle = "M55 112 V70 a45 45 0 0 1 90 0 V112";
  const tf = `translate(0 ${-open * 34}) rotate(${-open * 16} 55 112)`;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 200 230" style={{ overflow: "visible" }}>
      <path d={shackle} transform={tf} fill="none" stroke={C.ink} strokeWidth={36} strokeLinecap="round" />
      <path d={shackle} transform={tf} fill="none" stroke="#d9d2c6" strokeWidth={14} strokeLinecap="round" />
      <rect x={28} y={108} width={164} height={114} rx={26} fill={C.ink} />
      <rect x={18} y={98} width={164} height={114} rx={26} fill={body} stroke={C.ink} strokeWidth={12} />
      <circle cx={100} cy={145} r={16} fill={C.ink} />
      <rect x={92} y={147} width={16} height={34} rx={6} fill={C.ink} />
    </svg>
  );
};

/** Token coin. */
export const Coin: React.FC<{ size: number; color: string; label?: string; text?: string; textSize?: number }> = ({ size, color, label, text, textSize = 0.34 }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${size * 0.06}px, ${size * 0.06}px)`, borderRadius: 999, background: C.ink }} />
    <div style={{ position: "absolute", inset: 0, borderRadius: 999, background: color, border: `${Math.max(4, size * 0.07)}px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: size * 0.12, borderRadius: 999, border: `${Math.max(2, size * 0.035)}px solid rgba(22,17,15,0.35)` }} />
      <div style={{ position: "absolute", left: size * 0.2, top: size * 0.14, width: size * 0.22, height: size * 0.12, borderRadius: 99, background: "rgba(255,255,255,0.65)", transform: "rotate(-30deg)" }} />
      {text ? <span style={{ fontFamily: DISPLAY, fontSize: size * textSize, color: C.ink, position: "relative", whiteSpace: "nowrap" }}>{text}</span> : null}
    </div>
    {label ? (
      <div style={{ position: "absolute", top: size + 10, left: "50%", transform: "translateX(-50%)", fontFamily: SANS, fontWeight: 900, fontSize: Math.max(18, size * 0.24), color: C.ink, whiteSpace: "nowrap" }}>{label}</div>
    ) : null}
  </div>
);

/** Diagonal colour-slab wipe centred on a cut. */
export const Wipe: React.FC<{ at: number; colors: [string, string] }> = ({ at: s, colors }) => {
  const t = useT();
  const d = 0.42;
  if (t < s - d / 2 || t > s + d / 2) return null;
  const p = (t - (s - d / 2)) / d; // 0..1
  const x = interpolate(p, [0, 1], [-2600, 2600], { easing: Easing.inOut(Easing.cubic) });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: -600, left: 0, width: 1500, height: 2400, transform: `translateX(${x}px) rotate(18deg)`, display: "flex" }}>
        <div style={{ width: 120, background: colors[1], borderLeft: `14px solid ${C.ink}` }} />
        <div style={{ flex: 1, background: colors[0], borderLeft: `14px solid ${C.ink}`, borderRight: `14px solid ${C.ink}` }} />
        <div style={{ width: 120, background: colors[1], borderRight: `14px solid ${C.ink}` }} />
      </div>
    </AbsoluteFill>
  );
};

/** Star rating row. */
export const Stars: React.FC<{ n: number; size?: number; color?: string }> = ({ n, size = 26, color = C.ink }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {Array.from({ length: 5 }, (_, i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" fill={i < n ? color : "transparent"} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      </svg>
    ))}
  </div>
);

/** Comic "POW" starburst sticker. */
export const Pow: React.FC<{ text: string; size?: number; bg?: string; color?: string; rotate?: number; points?: number }> = ({ text, size = 260, bg = C.yellow, color = C.red, rotate = -8, points = 14 }) => {
  const pts = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? 0.72 : 1;
    const a = (i / (points * 2)) * Math.PI * 2;
    return `${50 + Math.cos(a) * 50 * r},${50 + Math.sin(a) * 50 * r}`;
  }).join(" ");
  return (
    <div style={{ position: "relative", width: size, height: size * 0.8, transform: `rotate(${rotate}deg)` }}>
      <svg viewBox="-4 -4 108 108" preserveAspectRatio="none" width={size} height={size * 0.8} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <polygon points={pts} transform="translate(4 4)" fill={C.ink} />
        <polygon points={pts} fill={bg} stroke={C.ink} strokeWidth={3.2} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ink size={size * 0.24} color={color} stroke={size * 0.022} shadow={size * 0.012}>
          {text}
        </Ink>
      </div>
    </div>
  );
};

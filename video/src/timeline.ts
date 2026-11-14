/**
 * Single source of truth for timing (seconds on the video clock).
 * VO start times live in cues.json (also read by scripts/srt.mjs and scripts/vo-track.mjs);
 * durations come from the processed VO in vo.json.
 * Music: Mixkit "Dirty Thinkin'" (~120 BPM) enters on the hook drop at 3.5 s, trimmed 16.5 s in (bar-aligned),
 * so every beat lands on a whole or half second and the track's real ending lands on the end card.
 *
 * Pacing: scenes were laid out on a 90 s "design clock". KNOTS map that clock onto the faster 75 s cut
 * (piecewise linear, one knot per voice cue), so every animation stays locked to its line.
 * Scenes read design time via useT(); audio and footage run on real video time.
 */
import vo from "./vo.json";
import cues from "./cues.json";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
const MARK = cues.marks as Record<string, number>;
/** Video length follows the end mark in cues.json (whole seconds). */
export const DURATION_S = Math.round(MARK.end!);
export const f = (s: number) => Math.round(s * FPS);

export const SCENES = {
  hook: [0, 6],
  reveal: [6, 14],
  core: [14, 29],
  bag: [29, 41],
  rarity: [41, 51],
  market: [51, 61],
  econ: [61, 75],
  next: [75, 83.5],
  finale: [83.5, 90],
} as const;
export const CUTS = [6, 14, 29, 41, 51, 61, 75, 83.5]; // design time

const CUE = cues.vo as Record<string, number>;
export const VO = vo.map((v) => ({ id: v.id, text: v.text, seconds: v.seconds, at: CUE[v.id]!, end: CUE[v.id]! + v.seconds }));
export const cue = (id: string) => CUE[id]!;

const TRACK_END = 86.5; // the track's final hit
const rawTrim = TRACK_END - (MARK.end! - 1.5 - MARK.drop!);
const trim = 2.5 + Math.round((rawTrim - 2.5) / 2) * 2; // keep the 2 s bar grid (downbeats at 2.5 + 2k)
export const MUSIC = { file: "audio/music/dirty-thinkin.mp3", at: MARK.drop!, trim, base: 0.56, duck: 0.17, fadeOut: [MARK.end! - 1, MARK.end!] as const };

/** Music gain at video time t: ducks under every VO line (fast attack, slower release), fades at the end. */
export function musicGain(t: number) {
  let g = MUSIC.base;
  for (const v of VO) {
    const a = v.at - 0.12, b = v.end + 0.25;
    let k = 0;
    if (t >= a - 0.1 && t <= b + 0.35) k = t < a ? (t - (a - 0.1)) / 0.1 : t > b ? 1 - (t - b) / 0.35 : 1;
    g = Math.min(g, MUSIC.base - (MUSIC.base - MUSIC.duck) * Math.max(0, Math.min(1, k)));
  }
  // the track's breakdown (62–69 s into the file) is already quiet: lift it a touch so it still reads under the voice
  const bk0 = MUSIC.at + (62 - MUSIC.trim), bk1 = MUSIC.at + (69 - MUSIC.trim);
  if (t > bk0 && t < bk1) g *= 1.25;
  const [fa, fb] = MUSIC.fadeOut;
  if (t > fa) g *= Math.max(0, 1 - (t - fa) / (fb - fa));
  return g;
}

/** design time → video time knots ([design, video]) */
/** Where each voice line and scene mark sits on the 90 s design clock the scenes are animated on. */
const DESIGN_VO: Record<string, number> = {
  s1a: 0.35, s1b: 2.45, s2a: 6.35, s2b: 8.25, s2c: 9.25, s2d: 10.5, s3a: 14.4, s3b: 18.9, s3c: 21.6,
  s4a: 29.3, s4b: 34.6, s4c: 37.4, s4d: 38.8, s5a: 41.5, s5b: 42.5, s5c: 43.5, s5d: 44.5, s5e: 45.75, s5f: 46.75,
  s6a: 52.0, s6b: 54.4, s6c: 56.8, s7a: 61.5, s7b: 64.3, s7c: 67.4, s7d: 70.7,
  s8a: 75.3, s8b: 77.3, s8c: 79.4, s8d: 80.2, s8e: 81.95, s9a: 84.2, s9b: 85.75,
};
const DESIGN_MARK: Record<string, number> = {
  drop: 4.0, reveal: 6.0, core: 14.0, equation: 24.6, bag: 29.0, split: 33.8, rarity: 41.0, row: 48.1,
  market: 51.0, swap: 56.0, econ: 61.0, next: 75.0, finale: 83.5, end: 90.0,
};
/** design time → video time knots ([design, video]), built from cues.json so retiming = editing cues.json only */
export const KNOTS: [number, number][] = ([
  [0, 0] as [number, number],
  ...Object.entries(DESIGN_VO).map(([id, d]) => [d, CUE[id]!] as [number, number]),
  ...Object.entries(DESIGN_MARK).map(([id, d]) => [d, MARK[id]!] as [number, number]),
]).sort((p, q) => p[0] - q[0]) as [number, number][];
const lerpKnots = (x: number, a: 0 | 1, b: 0 | 1) => {
  const k = KNOTS;
  if (x <= k[0]![a]) return k[0]![b];
  for (let i = 1; i < k.length; i++) {
    const p = k[i - 1]!, q = k[i]!;
    if (x <= q[a]) return p[b] + ((x - p[a]) / (q[a] - p[a])) * (q[b] - p[b]);
  }
  return k[k.length - 1]![b];
};
/** video seconds → design seconds */
export const toDesign = (t: number) => lerpKnots(t, 1, 0);
/** design seconds → video seconds */
export const toVideo = (t: number) => lerpKnots(t, 0, 1);

/** [design time, sfx id, volume] — files in public/audio/sfx/<id>.mp3 (Mixkit). */
export const SFX: [number, string, number][] = [
  // 1 hook
  [0.3, "glitch-text", 0.45], [1.25, "glitch-small", 0.35], [2.45, "punch", 0.5], [2.9, "boing", 0.35],
  [3.45, "whoosh-cine", 0.7], [3.97, "explosion-hit", 0.85], [4.0, "impact-trailer", 0.7],
  [4.35, "pop-hard", 0.5], [4.55, "pop-hard", 0.45], [4.75, "pop-long", 0.4], [5.0, "dazzle-birds", 0.35],
  // 2 reveal
  [5.82, "whoosh-fast", 0.6], [6.0, "impact-big", 0.75], [6.05, "glitch-text", 0.3],
  [7.9, "whoosh-air", 0.5], [8.25, "pop-long", 0.45], [9.25, "pop-long", 0.45], [10.5, "pop-cluster", 0.5],
  // 3 core mechanic
  [13.85, "whoosh-fast", 0.55], [14.1, "paper-slide", 0.5],
  [14.5, "pop-hard", 0.45], [15.0, "pop-hard", 0.45], [15.5, "pop-hard", 0.45], [16.0, "pop-hard", 0.45], [16.5, "pop-hard", 0.45], [17.0, "pop-long", 0.45],
  [18.9, "boing", 0.4], [21.6, "whoosh-air", 0.45], [22.2, "coin-win", 0.4], [22.7, "coins-clink", 0.45],
  [24.6, "whoosh-cine", 0.55], [25.0, "punch", 0.5], [26.0, "punch", 0.5], [27.0, "punch", 0.55], [27.1, "money-bag", 0.5],
  // 4 bag + lock
  [28.85, "whoosh-fast", 0.55], [29.4, "coins-clink", 0.45], [31.5, "coin-win", 0.45],
  [33.85, "whoosh-air", 0.45], [34.3, "money-bag", 0.45], [35.05, "lock-gear", 0.5], [35.35, "lock-safe", 0.85], [35.4, "impact-big", 0.3],
  [37.4, "boing", 0.4], [38.75, "whoosh-fast", 0.5], [39.05, "pop-cluster", 0.45],
  // 5 rarity
  [40.85, "whoosh-cine", 0.5], [41.5, "paper-slide", 0.5], [42.5, "paper-slide", 0.5], [43.5, "paper-slide", 0.5],
  [44.5, "magic-sparkle", 0.5], [45.6, "whoosh-air", 0.4], [46.75, "magic-sweep", 0.6], [46.8, "impact-trailer", 0.45],
  [47.2, "magic-success", 0.45], [48.2, "pop-long", 0.4],
  // 6 marketplace + collection
  [50.85, "whoosh-cine", 0.5], [52.0, "pop-hard", 0.45], [54.4, "pop-hard", 0.45], [55.85, "whoosh-fast", 0.5], [56.8, "magic-sparkle", 0.4], [57.6, "paper-slide", 0.45],
  // 7 economy
  [60.85, "whoosh-air", 0.5], [61.5, "glitch-small", 0.35], [63.9, "pop-long", 0.4], [64.7, "coins-clink", 0.4],
  [67.7, "coin-win", 0.4], [70.8, "paper-slide", 0.45], [72.0, "magic-success", 0.4], [72.6, "pop-hard", 0.4],
  // 8 what's next
  [74.85, "whoosh-cine", 0.5], [75.05, "impact-big", 0.55], [77.3, "coins-clink", 0.35], [79.4, "whistle", 0.45],
  [80.2, "pop-hard", 0.45], [81.0, "pop-hard", 0.45], [81.95, "glitch-text", 0.4], [82.0, "explosion-hit", 0.3],
  // 9 finale
  [83.3, "whoosh-cine", 0.55], [84.0, "impact-trailer", 0.7], [84.2, "pop-cluster", 0.45], [85.75, "splat", 0.5],
  [86.9, "owl", 0.6], [87.9, "magic-sparkle", 0.4],
];

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
export const DURATION_S = 75;
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

const CUE = cues as Record<string, number>;
export const VO = vo.map((v) => ({ id: v.id, text: v.text, seconds: v.seconds, at: CUE[v.id]!, end: CUE[v.id]! + v.seconds }));
export const cue = (id: string) => CUE[id]!;

export const MUSIC = { file: "audio/music/dirty-thinkin.mp3", at: 3.5, trim: 16.5, base: 0.56, duck: 0.17, fadeOut: [74.0, 75.0] as const };

/** Music gain at video time t: ducks under every VO line (fast attack, slower release), fades at the end. */
export function musicGain(t: number) {
  let g = MUSIC.base;
  for (const v of VO) {
    const a = v.at - 0.12, b = v.end + 0.25;
    let k = 0;
    if (t >= a - 0.1 && t <= b + 0.35) k = t < a ? (t - (a - 0.1)) / 0.1 : t > b ? 1 - (t - b) / 0.35 : 1;
    g = Math.min(g, MUSIC.base - (MUSIC.base - MUSIC.duck) * Math.max(0, Math.min(1, k)));
  }
  // the breakdown (≈49–56 s) is already quiet: lift it a touch so it still reads under the voice
  if (t > 48.9 && t < 56.1) g *= 1.25;
  const [fa, fb] = MUSIC.fadeOut;
  if (t > fa) g *= Math.max(0, 1 - (t - fa) / (fb - fa));
  return g;
}

/** design time → video time knots ([design, video]) */
export const KNOTS: [number, number][] = [
  [0, 0], [0.35, 0.3], [2.45, 2.1], [4.0, 3.5],
  [6.0, 5.0], [6.35, 5.3], [8.25, 7.2], [9.25, 8.1], [10.5, 9.1],
  [14.0, 11.0], [14.4, 11.3], [18.9, 14.8], [21.6, 17.2], [24.6, 19.9],
  [29.0, 23.0], [29.3, 23.3], [33.8, 27.5], [34.6, 28.0], [37.4, 30.1], [38.8, 31.3],
  [41.0, 33.0], [41.5, 33.4], [42.5, 34.1], [43.5, 34.8], [44.5, 35.5], [45.75, 36.6], [46.75, 37.4], [48.1, 38.6],
  [51.0, 40.5], [52.0, 41.0], [54.4, 42.6], [56.0, 44.0], [56.8, 44.6],
  [61.0, 48.5], [61.5, 49.0], [64.3, 51.4], [67.4, 54.0], [70.7, 56.4],
  [75.0, 60.0], [75.3, 60.3], [77.3, 62.0], [79.4, 63.9], [80.2, 64.6], [81.95, 66.2],
  [83.5, 67.5], [84.2, 68.2], [85.75, 69.7], [90.0, 75.0],
];
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

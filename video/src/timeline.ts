/**
 * Single source of truth for timing (seconds on the video clock).
 * VO start times live in cues.json (also read by scripts/srt.mjs and scripts/vo-track.mjs);
 * durations come from the processed VO in vo.json.
 * Music: Mixkit "Dirty Thinkin'" (~120 BPM) enters on the hook drop at 4.0 s, trimmed 2.5 s in,
 * so every beat lands on a whole or half second of the video.
 */
import vo from "./vo.json";
import cues from "./cues.json";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const DURATION_S = 90;
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
export const CUTS = [6, 14, 29, 41, 51, 61, 75, 83.5];

const CUE = cues as Record<string, number>;
export const VO = vo.map((v) => ({ id: v.id, text: v.text, seconds: v.seconds, at: CUE[v.id]!, end: CUE[v.id]! + v.seconds }));
export const cue = (id: string) => CUE[id]!;

export const MUSIC = { file: "audio/music/dirty-thinkin.mp3", at: 4.0, trim: 2.5, base: 0.56, duck: 0.17, fadeOut: [87.2, 89.8] as const };

/** Music gain at video time t: ducks under every VO line (fast attack, slower release), fades at the end. */
export function musicGain(t: number) {
  let g = MUSIC.base;
  for (const v of VO) {
    const a = v.at - 0.12, b = v.end + 0.25;
    let k = 0;
    if (t >= a - 0.1 && t <= b + 0.35) k = t < a ? (t - (a - 0.1)) / 0.1 : t > b ? 1 - (t - b) / 0.35 : 1;
    g = Math.min(g, MUSIC.base - (MUSIC.base - MUSIC.duck) * Math.max(0, Math.min(1, k)));
  }
  // the breakdown (≈63.5–70.5 s) is already quiet: lift it a touch so it still reads under the voice
  if (t > 63.4 && t < 70.6) g *= 1.25;
  const [fa, fb] = MUSIC.fadeOut;
  if (t > fa) g *= Math.max(0, 1 - (t - fa) / (fb - fa));
  return g;
}

/** [time, sfx id, volume] — files in public/audio/sfx/<id>.mp3 (Mixkit). */
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
  // 6 marketplace
  [50.85, "whoosh-cine", 0.5], [52.0, "pop-hard", 0.45], [54.4, "pop-hard", 0.45], [55.85, "whoosh-fast", 0.5], [56.8, "coin-win", 0.45],
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

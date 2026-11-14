/** Standalone voice-over: every processed phrase placed at its cue on the 75 s timeline → out/what-the-nft-trailer-vo.wav (48 kHz mono). */
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const vo = JSON.parse(readFileSync(join(ROOT, "src/vo.json"), "utf8"));
const cues = JSON.parse(readFileSync(join(ROOT, "src/cues.json"), "utf8"));
mkdirSync(join(ROOT, "out"), { recursive: true });
const inputs = vo.flatMap((v) => ["-i", join(ROOT, "public/audio/vo", `${v.id}.wav`)]);
const chains = vo.map((v, i) => `[${i}:a]adelay=${Math.round(cues[v.id] * 1000)}:all=1[a${i}]`);
const mix = `${vo.map((_, i) => `[a${i}]`).join("")}amix=inputs=${vo.length}:normalize=0:dropout_transition=0,apad=whole_dur=75,atrim=0:75[out]`;
const out = join(ROOT, "out/what-the-nft-trailer-vo.wav");
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", [...chains, mix].join(";"), "-map", "[out]", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", out]);
console.log("→", out);

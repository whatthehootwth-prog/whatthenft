/**
 * Final audio master: two-pass EBU R128 loudness normalisation of the rendered mix to -14 LUFS / -1 dBTP
 * (streaming/social target). Video stream is copied untouched.
 *   node scripts/master.mjs out/trailer-raw.mp4 out/what-the-nft-trailer.mp4
 */
import { execFileSync, spawnSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

const [src = "out/trailer-raw.mp4", dst = "out/what-the-nft-trailer.mp4"] = process.argv.slice(2);
const TARGET = "I=-14:TP=-1.0:LRA=11";
/** stereo + gentle brickwall (-3 dBFS) so loudnorm can apply one linear gain instead of pumping */
const PRE = "aformat=channel_layouts=stereo,alimiter=limit=0.708:attack=3:release=60:level=false";

const p1 = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", src, "-vn", "-af", `${PRE},loudnorm=${TARGET}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(p1.stderr.slice(p1.stderr.lastIndexOf("{"), p1.stderr.lastIndexOf("}") + 1));
console.log("measured:", `I=${m.input_i} LUFS, TP=${m.input_tp} dBTP, LRA=${m.input_lra}`);

const af = `${PRE},loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo`;
execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-map", "0:v:0", "-map", "0:a:0", "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", dst]);

const p3 = spawnSync(ffmpeg, ["-hide_banner", "-nostats", "-i", dst, "-vn", "-af", `loudnorm=${TARGET}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const r = JSON.parse(p3.stderr.slice(p3.stderr.lastIndexOf("{"), p3.stderr.lastIndexOf("}") + 1));
console.log("mastered:", `I=${r.input_i} LUFS, TP=${r.input_tp} dBTP, LRA=${r.input_lra} → ${dst}`);

/**
 * Broadcast-style processing for each Kokoro phrase (subtle on purpose):
 * trim silence → high-pass → body (+3 dB @140 Hz, adds depth without pitch-shifting) → mud cut (-2.5 dB @320 Hz)
 * → presence (+3 dB @3.5 kHz) → air (+2 dB shelf @9 kHz) → de-ess → 3.5:1 compression → light tanh saturation
 * → 48 kHz → loudness normalise (-16 LUFS, -1.5 dBTP).
 * Writes public/audio/vo/<id>.wav, a joined standalone voice-over track, and src/vo.json (durations for the timeline).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(ROOT, "src/vo-raw.json"), "utf8"));
const OUT = join(ROOT, "public/audio/vo");
mkdirSync(OUT, { recursive: true });

/** +1 semitone with formants preserved: same deep chest, a touch brighter and more excited (PITCH_SEMIS env to change). */
const SEMIS = Number(process.env.PITCH_SEMIS ?? 1);
const CHAIN = [
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03",
  "areverse",
  "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08",
  "areverse",
  `rubberband=pitch=${Math.pow(2, SEMIS / 12).toFixed(5)}:formant=preserved:transients=crisp:detector=compound:window=short`,
  "highpass=f=80",
  "lowshelf=f=140:g=3",
  "equalizer=f=320:t=q:w=1.2:g=-2.5",
  "equalizer=f=3200:t=q:w=1:g=4",
  "highshelf=f=9000:g=2",
  "deesser=i=0.4",
  "acompressor=threshold=-24dB:ratio=5:attack=2:release=70:makeup=5",
  "volume=1.7,asoftclip=type=tanh,volume=0.6",
  "aresample=48000",
  "loudnorm=I=-16:TP=-1.5:LRA=7",
  "aresample=48000",
].join(",");

function wavSeconds(file) {
  const b = readFileSync(file);
  let off = 12, sr = 48000, ch = 1, bits = 16;
  while (off < b.length) {
    const id = b.toString("ascii", off, off + 4), sz = b.readUInt32LE(off + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(off + 10); sr = b.readUInt32LE(off + 12); bits = b.readUInt16LE(off + 22); }
    if (id === "data") return sz / (sr * ch * (bits / 8));
    off += 8 + sz;
  }
  return 0;
}

const out = [];
for (const p of raw) {
  const src = join(ROOT, "public/audio/vo-raw", `${p.id}.wav`);
  const dst = join(OUT, `${p.id}.wav`);
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af", CHAIN, "-ac", "1", "-c:a", "pcm_s16le", dst]);
  const seconds = wavSeconds(dst);
  out.push({ id: p.id, text: p.text, voice: p.voice, seconds: Number(seconds.toFixed(3)) });
  console.log(p.id, seconds.toFixed(2) + "s");
}
writeFileSync(join(ROOT, "src/vo.json"), JSON.stringify(out, null, 2));
console.log("→ src/vo.json");

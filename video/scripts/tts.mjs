/**
 * Voice-over with Kokoro-82M (Apache-2.0), run locally through kokoro-js (ONNX). No account, no key.
 *
 *   node scripts/tts.mjs --compare      # same test lines in am_fenrir / am_michael / am_onyx → public/audio/vo-compare/
 *   node scripts/tts.mjs                # all trailer phrases (voice from VOICE env or VO_VOICE below) → public/audio/vo/*.wav + src/vo.json
 *
 * Each phrase is generated separately so timing and emphasis can be tuned per line.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { KokoroTTS } from "kokoro-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const VO_VOICE = process.env.VOICE ?? "am_puck";

/** Script, phrase by phrase. `speed` > 1 is faster. Spelled-out text where needed for pronunciation. */
/** Script lives in src/script.json (shared with scripts/tts_chatterbox.py). */
export const PHRASES = JSON.parse(readFileSync(join(ROOT, "src/script.json"), "utf8"));

const COMPARE = ["What if... an N F T... could buy MEMES?!", "Every mutant is stitched together from different meme communities.", "Common! Rare! Epic! Legendary! And... MYTHIC!"];

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });

if (process.argv.includes("--compare")) {
  const dir = join(ROOT, "public/audio/vo-compare");
  mkdirSync(dir, { recursive: true });
  const voices = (process.env.VOICES ?? "am_fenrir,am_michael,am_onyx").split(",");
  for (const voice of voices) {
    for (const [i, text] of COMPARE.entries()) {
      const a = await tts.generate(text, { voice, speed: Number(process.env.SPEED ?? 1.0) });
      const f = join(dir, `${voice}-${i + 1}.wav`);
      a.save(f);
      console.log(f);
    }
  }
} else {
  const dir = join(ROOT, "public/audio/vo-raw");
  mkdirSync(dir, { recursive: true });
  const out = [];
  for (const p of PHRASES) {
    const a = await tts.generate(p.text, { voice: VO_VOICE, speed: p.speed });
    const f = join(dir, `${p.id}.wav`);
    a.save(f);
    out.push({ ...p, voice: VO_VOICE, seconds: a.audio.length / a.sampling_rate });
    console.log(p.id, (a.audio.length / a.sampling_rate).toFixed(2) + "s", p.text);
  }
  writeFileSync(join(ROOT, "src/vo-raw.json"), JSON.stringify(out, null, 2));
}

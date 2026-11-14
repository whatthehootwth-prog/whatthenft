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
export const VO_VOICE = process.env.VOICE ?? "am_fenrir";

/** Script, phrase by phrase. `speed` > 1 is faster. Spelled-out text where needed for pronunciation. */
export const PHRASES = [
  // 1 — hook
  { id: "s1a", text: "What if... an N F T...", speed: 0.92 },
  { id: "s1b", text: "could buy MEMES?!", speed: 1.0 },
  // 2 — reveal
  { id: "s2a", text: "Meet, What the N F T!", speed: 1.0 },
  { id: "s2b", text: "One owl.", speed: 1.0 },
  { id: "s2c", text: "Too many memes.", speed: 1.0 },
  { id: "s2d", text: "Absolutely zero chill.", speed: 1.02 },
  // 3 — core mechanic
  { id: "s3a", text: "Every mutant is stitched together from different meme communities.", speed: 1.08 },
  { id: "s3b", text: "And those parts don't just look ridiculous.", speed: 1.08 },
  { id: "s3c", text: "They decide which real meme tokens get purchased!", speed: 1.06 },
  // 4 — bag + lock
  { id: "s4a", text: "Eighty-five percent of the base mint price goes into real meme token purchases.", speed: 1.1 },
  { id: "s4b", text: "The tokens stay locked for thirty days.", speed: 1.04 },
  { id: "s4c", text: "But the N F T?", speed: 1.0 },
  { id: "s4d", text: "You can still trade it!", speed: 1.02 },
  // 5 — rarity
  { id: "s5a", text: "Common!", speed: 1.0 },
  { id: "s5b", text: "Rare!", speed: 1.0 },
  { id: "s5c", text: "Epic!", speed: 1.0 },
  { id: "s5d", text: "Legendary!", speed: 1.0 },
  { id: "s5e", text: "And...", speed: 0.9 },
  { id: "s5f", text: "MYTHIC!", speed: 0.95 },
  // 6 — marketplace
  { id: "s6a", text: "Collect your freak.", speed: 1.02 },
  { id: "s6b", text: "Show it off.", speed: 1.02 },
  { id: "s6c", text: "Trade the entire bag!", speed: 1.0 },
  // 7 — WTH economy
  { id: "s7a", text: "And the madness supports W T H!", speed: 1.02 },
  { id: "s7b", text: "Ten percent of mint revenue goes to the creator.", speed: 1.08 },
  { id: "s7c", text: "Five percent funds the W T H treasury.", speed: 1.06 },
  { id: "s7d", text: "Marketplace royalties contribute too.", speed: 1.06 },
  // 8 — what's next
  { id: "s8a", text: "Season One. Meme Genesis.", speed: 1.0 },
  { id: "s8b", text: "One hundred and eleven mutants.", speed: 1.04 },
  { id: "s8c", text: "Next?", speed: 1.0 },
  { id: "s8d", text: "More seasons. More meme crews.", speed: 1.06 },
  { id: "s8e", text: "And cross-chain chaos!", speed: 1.0 },
  // 9 — finale
  { id: "s9a", text: "What the N F T!", speed: 0.98 },
  { id: "s9b", text: "Not another boring J PEG!", speed: 1.0 },
];

const COMPARE = ["What if... an N F T... could buy MEMES?!", "Every mutant is stitched together from different meme communities.", "Common! Rare! Epic! Legendary! And... MYTHIC!"];

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });

if (process.argv.includes("--compare")) {
  const dir = join(ROOT, "public/audio/vo-compare");
  mkdirSync(dir, { recursive: true });
  for (const voice of ["am_fenrir", "am_michael", "am_onyx"]) {
    for (const [i, text] of COMPARE.entries()) {
      const a = await tts.generate(text, { voice, speed: 1.0 });
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

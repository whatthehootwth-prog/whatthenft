/** Subtitles from the same cue table the video uses → out/what-the-nft-trailer.srt */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const vo = JSON.parse(readFileSync(join(ROOT, "src/vo.json"), "utf8"));
const CUES = JSON.parse(readFileSync(join(ROOT, "src/cues.json"), "utf8"));
const cues = CUES.vo;

/** Written forms (the TTS script spells some words phonetically). */
const TEXT = {
  s1a: "What if… an NFT…",
  s1b: "could support the meme ecosystem?",
  s2a: "Meet WHAT THE NFT?!",
  s4a: "85% of the base mint price goes into real meme token purchases.",
  s4c: "But the NFT?",
  s7a: "And the madness supports WTH!",
  s7b: "10% of mint revenue goes to the creator.",
  s7c: "5% funds the WTH treasury.",
  s8a: "Season 01. Meme Genesis.",
  s8b: "111 mutants.",
  s9a: "WHAT THE NFT?!",
  s9b: "Not another boring JPEG!",
};
const lines = vo.map((v) => ({ id: v.id, start: cues[v.id], end: cues[v.id] + v.seconds, text: TEXT[v.id] ?? v.text }));

// merge quick-fire lines (rarity calls etc.) into one subtitle when close together and short
const subs = [];
for (const l of lines) {
  const last = subs[subs.length - 1];
  if (last && l.start - last.end < 0.6 && (last.text + " " + l.text).length <= 44 && l.id[1] === last.id[1]) {
    last.text += " " + l.text;
    last.end = l.end;
  } else subs.push({ ...l });
}
subs.forEach((s, i) => (s.end = Math.min(s.end + 0.3, subs[i + 1] ? subs[i + 1].start - 0.05 : s.end + 0.3)));

const ts = (x) => {
  const ms = Math.round(x * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
mkdirSync(join(ROOT, "out"), { recursive: true });
const out = join(ROOT, "out/what-the-nft-trailer.srt");
writeFileSync(out, subs.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s.text}\n`).join("\n"));
console.log(`${subs.length} subtitles → ${out}`);

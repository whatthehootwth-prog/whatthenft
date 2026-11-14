/**
 * Downloads the trailer's music + sound effects from Mixkit (free, no account, no key) and writes
 * public/audio/credits.json. Files are NOT committed: Mixkit's licenses forbid redistributing the items on their own.
 *
 * Licenses (read 2026-11-14 at https://mixkit.co/license/):
 *  - Stock Music Free License: free for commercial use on web/social media, YouTube, online marketing ads.
 *    Not allowed: CDs/DVDs, TV/radio broadcast, video games, remixing into a music-only track, claiming as own.
 *  - Sound Effects Free License: free for commercial use incl. YouTube, social, ads, film, games.
 *    Not allowed: redistributing the item on its own / as stock, claiming as own.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/audio");

const MUSIC = [
  { id: "dirty-thinkin", title: "Dirty Thinkin'", artist: "Michael Ramir C.", url: "https://assets.mixkit.co/music/989/989.mp3", page: "https://mixkit.co/free-stock-music/mood/energetic/" },
  { id: "punked-up-fun", title: "Punked Up Fun", artist: "Ahjay Stelino", url: "https://assets.mixkit.co/music/47/47.mp3", page: "https://mixkit.co/free-stock-music/mood/energetic/" },
  { id: "sounds-good", title: "Sounds Good", artist: "Michael Ramir C.", url: "https://assets.mixkit.co/music/1077/1077.mp3", page: "https://mixkit.co/free-stock-music/mood/energetic/" },
];

const S = (id, title, n, cat) => ({ id, title, url: `https://assets.mixkit.co/active_storage/sfx/${n}/${n}-preview.mp3`, page: `https://mixkit.co/free-sound-effects/${cat}/` });
const SFX = [
  S("pop-hard", "Hard pop click", 2364, "pop"),
  S("pop-long", "Long pop", 2358, "pop"),
  S("pop-cluster", "Silly pop cluster", 2359, "pop"),
  S("whoosh-fast", "Fast whoosh transition", 1490, "whoosh"),
  S("whoosh-air", "Air woosh", 1489, "whoosh"),
  S("whoosh-cine", "Cinematic whoosh fast transition", 1492, "whoosh"),
  S("glitch-text", "Intro text glitch", 2950, "glitch"),
  S("glitch-small", "Small electric glitch", 2595, "glitch"),
  S("coin-win", "Winning a coin, video game", 2069, "coin"),
  S("coins-clink", "Clinking coins", 1993, "coin"),
  S("money-bag", "Money bag drop", 1989, "coin"),
  S("paper-slide", "Paper slide", 1530, "paper"),
  S("paper-crumple", "Quick paper crumple sound", 2996, "paper"),
  S("impact-trailer", "Movie trailer epic impact", 2908, "impact"),
  S("impact-big", "Big cinematic impact", 788, "impact"),
  S("explosion-hit", "Explosion hit", 1704, "explosion"),
  S("punch", "Impact of a strong punch", 2155, "punch"),
  S("boing", "Boing hit sound", 2894, "cartoon"),
  S("dazzle-birds", "Cartoon dazzle hit and birds", 746, "hit"),
  S("magic-sparkle", "Magic sparkle whoosh", 2350, "magic"),
  S("magic-success", "Fantasy game success notification", 270, "magic"),
  S("magic-sweep", "Sweeping sparkle presentation intro", 2633, "magic"),
  S("lock-safe", "Safe lock", 2853, "lock"),
  S("lock-gear", "Gear metallic lock sound", 2858, "lock"),
  S("owl", "Owl in a forest", 2466, "bird"),
  S("whistle", "Cartoon toy whistle", 616, "cartoon"),
  S("splat", "Funny cartoon fast splat", 2889, "cartoon"),
];

async function get(url, file) {
  if (existsSync(file)) return "cached";
  const r = await fetch(url, { headers: { "user-agent": "wtn-trailer-build" } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  return "downloaded";
}

mkdirSync(join(OUT, "music"), { recursive: true });
mkdirSync(join(OUT, "sfx"), { recursive: true });
for (const m of MUSIC) console.log(m.id, await get(m.url, join(OUT, "music", `${m.id}.mp3`)));
for (const s of SFX) console.log(s.id, await get(s.url, join(OUT, "sfx", `${s.id}.mp3`)));

writeFileSync(
  join(OUT, "credits.json"),
  JSON.stringify(
    {
      retrieved: new Date().toISOString().slice(0, 10),
      license: {
        music: "Mixkit Stock Music Free License — https://mixkit.co/license/#musicFree",
        sfx: "Mixkit Sound Effects Free License — https://mixkit.co/license/#sfxFree",
      },
      music: MUSIC,
      sfx: SFX,
    },
    null,
    2,
  ),
);
console.log("credits →", join(OUT, "credits.json"));

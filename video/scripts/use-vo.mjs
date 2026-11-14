/** Choose which generated voice-over set feeds the edit:  node scripts/use-vo.mjs ref|default  (then npm run vo) */
import { cpSync, copyFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const v = process.argv[2] ?? "ref";
rmSync(join(ROOT, "public/audio/vo-raw"), { recursive: true, force: true });
cpSync(join(ROOT, `public/audio/vo-raw-cb-${v}`), join(ROOT, "public/audio/vo-raw"), { recursive: true });
copyFileSync(join(ROOT, `.tts/vo-raw-cb-${v}.json`), join(ROOT, "src/vo-raw.json"));
console.log(`voice-over set "${v}" → public/audio/vo-raw + src/vo-raw.json`);

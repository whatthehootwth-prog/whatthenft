/** Review helper: bundle once, render stills at the given seconds → .cache/stills/<sec>.jpg   node scripts/stills.mjs 3.2 4.6 … */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const secs = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: join(ROOT, "src/index.ts"), publicDir: join(ROOT, "public") });
const composition = await selectComposition({ serveUrl, id: "Trailer", inputProps: {} });
mkdirSync(join(ROOT, ".cache/stills"), { recursive: true });
for (const s of secs) {
  const output = join(ROOT, ".cache/stills", `${s.toFixed(2)}.jpg`);
  await renderStill({ serveUrl, composition, frame: Math.round(s * 30), output, imageFormat: "jpeg", jpegQuality: 80, scale: 0.5 });
  console.log(output);
}

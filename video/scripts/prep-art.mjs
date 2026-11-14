/**
 * Copies the real artwork from the website into the trailer workspace (no new art is generated):
 *   apps/web/public/art/**  → public/art/**        (founder's transparent 1254×1254 part layers + previews)
 *   apps/web/public/logo.webp, brand/owl-512.webp → public/art/
 *   apps/web/lib/art-registry.json → src/art-registry.json (layer order, names, meme colours)
 */
import { cpSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "../apps/web");
mkdirSync(join(ROOT, "public/art"), { recursive: true });
cpSync(join(WEB, "public/art"), join(ROOT, "public/art"), { recursive: true });
copyFileSync(join(WEB, "public/logo.webp"), join(ROOT, "public/art/logo.webp"));
copyFileSync(join(WEB, "public/brand/owl-512.webp"), join(ROOT, "public/art/owl-512.webp"));
copyFileSync(join(WEB, "lib/art-registry.json"), join(ROOT, "src/art-registry.json"));
console.log("art → public/art, registry → src/art-registry.json");

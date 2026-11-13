/**
 * Organize founder art into the canonical layout, write manifests, and build web copies.
 *
 *   assets/memes/parts/<NN-folder>/<file>.png   (as supplied)
 *        ↓
 *   assets/memes/<memeId>/manifest.json
 *   assets/memes/<memeId>/slots/<slot>/<NN-name>.png
 *   assets/memes/<memeId>/preview.png (+ previews/ for extra variants)
 *   assets/reference/preview-sheet.png
 *   apps/web/public/art/<memeId>/<slot>-<NN>.webp + preview.webp
 *   apps/web/lib/art-registry.json
 *
 * Idempotent: re-running after files were moved only rebuilds manifests/web copies.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { ART_CANVAS, memeManifestSchema } from "@wtn/domain";
import { CATALOG, LAYER_ORDER, SLOTS, type CatalogMeme } from "./catalog";
import { inspectImage } from "./inspect";

const REPO = resolve(import.meta.dirname, "../../..");
const MEMES = join(REPO, "assets/memes");
const WEB_ART = join(REPO, "apps/web/public/art");
const REGISTRY = join(REPO, "apps/web/lib/art-registry.json");

const COLORS: Record<string, string> = {
  wth: "#FF7A1A", hoodl: "#4A4A55", hooters: "#FF8A2A", oyster: "#F4B08A", three: "#19E6B0", moonshot: "#3E9D6B",
  raen: "#FF5A1F", mallace: "#E040FB", idp: "#E8B46A", robinhoot: "#5E7F35", "quantum-cat": "#7C4DFF", inu: "#D88B3C",
  nearkat: "#C6FF3D", cybernetic: "#9BD94A", batman: "#5B6178",
};

const kebab = (s: string) => s.toLowerCase().replace(/\+/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const move = (from: string, to: string) => {
  if (!existsSync(from)) return existsSync(to);
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  return true;
};

async function checkLayer(path: string) {
  const m = await sharp(path).metadata();
  if (m.width !== ART_CANVAS || m.height !== ART_CANVAS) throw new Error(`${path}: ${m.width}x${m.height}, expected ${ART_CANVAS}x${ART_CANVAS}`);
  if (!m.hasAlpha) throw new Error(`${path}: no transparency`);
}

async function organizeMeme(m: CatalogMeme) {
  const dir = join(MEMES, m.memeId);
  const layers = [] as { slot: string; variant: number; name: string; file: string; sha256: string; behind: boolean }[];
  const counters: Record<string, number> = {};
  for (const p of m.parts) {
    const v = counters[p.slot] ?? 0;
    counters[p.slot] = v + 1;
    const file = `slots/${p.slot}/${String(v + 1).padStart(2, "0")}-${kebab(p.name)}.png`;
    const dest = join(dir, file);
    if (!move(join(MEMES, "parts", m.folder, p.src), dest)) throw new Error(`missing source for ${m.memeId}/${p.src}`);
    await checkLayer(dest);
    layers.push({ slot: p.slot, variant: v, name: p.name, file, sha256: sha(dest), behind: !!p.behind });
  }
  // previews: main preview + any extra variants for this meme number
  const prefix = m.folder.slice(0, 2);
  const prevDir = join(MEMES, "previews");
  if (existsSync(prevDir)) {
    for (const f of readdirSync(prevDir).filter((f) => f.startsWith(prefix))) {
      const target = f === m.preview ? join(dir, "preview.png") : join(dir, "previews", f.replace(/^\d+-/, ""));
      move(join(prevDir, f), target);
    }
  }
  const slots = m.memeId === "wth" ? [...SLOTS] : SLOTS.filter((s) => layers.some((l) => l.slot === s));
  const notes = [m.note, m.memeId === "wth" ? "WTH supplies the base owl; for head/face/arms/legs/accessory the WTH variant is the bare owl (no overlay file)." : null].filter(Boolean) as string[];
  const manifest = {
    schemaVersion: 1 as const,
    memeId: m.memeId,
    displayName: m.displayName,
    chain: "near" as const,
    tokenContractId: m.tokenContractId,
    tokenSymbol: m.tokenSymbol,
    tokenDecimals: m.tokenDecimals,
    tokenCandidates: m.tokenCandidates,
    notes,
    activeInSeasons: [1],
    approvedForMint: false,
    commercialArtworkRightsConfirmed: false,
    artLicenseReference: null,
    slots,
    minLiquidityNear: "500",
    maxSlippageBps: 200,
    canvas: { width: ART_CANVAS, height: ART_CANVAS },
    anchors: {},
    layeringOverrides: {},
    notForProduction: false,
    layers,
  };
  const parsed = memeManifestSchema.safeParse(manifest);
  if (!parsed.success) throw new Error(`${m.memeId} manifest invalid: ${parsed.error.message}`);
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  // web copies
  const web = join(WEB_ART, m.memeId);
  mkdirSync(web, { recursive: true });
  const webLayers = [] as { slot: string; variant: number; name: string; src: string; behind: boolean; anchor: [number, number] }[];
  for (const l of layers) {
    const out = `${l.slot}-${String(l.variant + 1).padStart(2, "0")}.webp`;
    await sharp(join(dir, l.file)).webp({ quality: 88, alphaQuality: 100, effort: 5 }).toFile(join(web, out));
    const info = await inspectImage(join(dir, l.file), dir);
    const b = info.bbox ?? { x: 0, y: 0, w: ART_CANVAS, h: ART_CANVAS };
    // body skins point at the belly; other parts at their visual centre
    const anchor: [number, number] = l.slot === "body" ? [627, 900] : [Math.round(b.x + b.w / 2), Math.round(b.y + b.h / 2)];
    webLayers.push({ slot: l.slot, variant: l.variant, name: l.name, src: `/art/${m.memeId}/${out}`, behind: l.behind, anchor });
  }
  let preview: string | null = null;
  if (existsSync(join(dir, "preview.png"))) {
    await sharp(join(dir, "preview.png")).resize(800, 800).webp({ quality: 86, alphaQuality: 100 }).toFile(join(web, "preview.webp"));
    preview = `/art/${m.memeId}/preview.webp`;
  }
  return { memeId: m.memeId, displayName: m.displayName, color: COLORS[m.memeId] ?? "#FFF4DC", verifiedToken: m.tokenContractId, layers: webLayers, preview, slots };
}

function removeIfEmpty(d: string) {
  if (!existsSync(d)) return;
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) removeIfEmpty(p);
  }
  if (readdirSync(d).length === 0) rmdirSync(d);
}

async function main() {
  const out = [];
  for (const m of CATALOG) {
    out.push(await organizeMeme(m));
    console.log(`✓ ${m.memeId}`);
  }
  move(join(MEMES, "preview-sheet.png"), join(REPO, "assets/reference/preview-sheet.png"));
  removeIfEmpty(join(MEMES, "parts"));
  removeIfEmpty(join(MEMES, "previews"));
  writeFileSync(REGISTRY, JSON.stringify({ canvas: ART_CANVAS, layerOrder: ["behind", "body", ...LAYER_ORDER], memes: out }, null, 2) + "\n");
  console.log(`registry → ${REGISTRY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

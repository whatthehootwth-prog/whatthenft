/**
 * NFT image compositor. Builds the final owl image for a minted token from the ORIGINAL art layers
 * (assets/memes/<meme>/slots/…png), stacked in exactly the order the website uses:
 *   behind parts → body → skin markings → legs → outfit → arms → head → face
 * on a solid background tinted from the body meme's colour. Output is deterministic PNG bytes, so
 * re-running for the same token always yields the same file (and the same IPFS CID).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export type Slot = "head" | "face" | "body" | "arms" | "legs" | "accessory";
/** On-chain trait order (matches the contract's SLOTS). */
export const SLOT_ORDER: Slot[] = ["head", "face", "body", "arms", "legs", "accessory"];
/** Compositing order on top of the body (bottom → top). */
const STACK: Slot[] = ["legs", "accessory", "arms", "head", "face"];

export interface Pick {
  memeId: string;
  variant: number;
}
export type Spec = Record<Slot, Pick>;

interface RegistryLayer {
  slot: Slot;
  variant: number;
  name: string;
  behind: boolean;
  skin?: boolean;
}
interface RegistryMeme {
  memeId: string;
  displayName: string;
  color: string;
  verifiedToken: string | null;
  layers: RegistryLayer[];
}
interface ManifestLayer {
  slot: Slot;
  variant: number;
  file: string;
}

export interface ArtLibrary {
  memes: Map<string, RegistryMeme & { files: Map<string, string> }>;
}

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Load the art library: registry (order/flags/colours) + manifests (original PNG paths). */
export function loadArt(root = REPO_ROOT): ArtLibrary {
  const reg = JSON.parse(readFileSync(join(root, "apps/web/lib/art-registry.json"), "utf8")) as { memes: RegistryMeme[] };
  const memes = new Map<string, RegistryMeme & { files: Map<string, string> }>();
  for (const m of reg.memes) {
    const manifest = JSON.parse(readFileSync(join(root, "assets/memes", m.memeId, "manifest.json"), "utf8")) as { layers: ManifestLayer[] };
    const files = new Map(manifest.layers.map((l) => [`${l.slot}:${l.variant}`, join(root, "assets/memes", m.memeId, l.file)]));
    memes.set(m.memeId, { ...m, files });
  }
  return { memes };
}

/** Map on-chain traits (season meme index + variant per slot) to a spec. */
export function specFromTraits(slots: { meme_idx: number; variant: number }[], seasonMemeIds: string[]): Spec {
  const spec = {} as Spec;
  SLOT_ORDER.forEach((s, i) => {
    const t = slots[i];
    spec[s] = { memeId: (t && seasonMemeIds[t.meme_idx]) || "wth", variant: t?.variant ?? 0 };
  });
  return spec;
}

interface Placed {
  file: string;
  behind: boolean;
  skin: boolean;
  slot: Slot;
}

function layerFor(art: ArtLibrary, slot: Slot, pick: Pick): Placed | null {
  const m = art.memes.get(pick.memeId);
  if (!m) return null;
  const opts = m.layers.filter((l) => l.slot === slot);
  if (opts.length === 0) return null;
  const l = opts[pick.variant % opts.length]!;
  const file = m.files.get(`${l.slot}:${l.variant}`);
  return file ? { file, behind: l.behind, skin: !!l.skin, slot } : null;
}

/** Ordered PNG paths for a spec — identical rule to the website's stackOf(). */
export function stackFiles(art: ArtLibrary, spec: Spec): Placed[] {
  const body = layerFor(art, "body", spec.body) ?? layerFor(art, "body", { memeId: "wth", variant: 0 });
  if (!body) throw new Error("WTH base body missing from the art library");
  const over = STACK.map((s) => layerFor(art, s, spec[s])).filter((l): l is Placed => !!l);
  const top = over.filter((l) => !l.behind);
  return [...over.filter((l) => l.behind), body, ...top.filter((l) => l.skin), ...top.filter((l) => !l.skin)];
}

/** Body meme colour mixed with white, as the card backgrounds on the site. */
export function backgroundFor(art: ArtLibrary, spec: Spec, mix = 0.5): { r: number; g: number; b: number } {
  const bodyMeme = layerFor(art, "body", spec.body) ? spec.body.memeId : "wth";
  const hex = (art.memes.get(bodyMeme)?.color ?? "#FF7A1A").replace("#", "");
  const c = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const [r, g, b] = c.map((v) => Math.round(v * mix + 255 * (1 - mix)));
  return { r: r!, g: g!, b: b! };
}

/** Compose the final image. Deterministic PNG. */
export async function composeImage(art: ArtLibrary, spec: Spec, size = 1254): Promise<Buffer> {
  const layers = stackFiles(art, spec);
  const bg = backgroundFor(art, spec);
  const inputs = await Promise.all(
    layers.map(async (l) => ({ input: size === 1254 ? readFileSync(l.file) : await sharp(l.file).resize(size, size).png().toBuffer(), top: 0, left: 0 })),
  );
  return sharp({ create: { width: size, height: size, channels: 4, background: { ...bg, alpha: 1 } } })
    .composite(inputs)
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .withMetadata({})
    .toBuffer();
}

/** NEP-177 media_hash: base64 of the sha256 of the image bytes. */
export function mediaHashB64(img: Buffer): string {
  return createHash("sha256").update(img).digest("base64");
}

/** Random spec from mintable memes only (for previews / samples). */
export function randomSpec(art: ArtLibrary, rnd: () => number = Math.random): Spec {
  const mintable = [...art.memes.values()].filter((m) => m.memeId === "wth" || m.verifiedToken);
  const spec = {} as Spec;
  for (const s of SLOT_ORDER) {
    const opts = mintable.flatMap((m) => m.layers.filter((l) => l.slot === s).map((l) => ({ memeId: m.memeId, variant: l.variant })));
    spec[s] = opts.length && (s === "body" || rnd() < 0.65) ? opts[Math.floor(rnd() * opts.length)]! : { memeId: "wth", variant: 0 };
  }
  return spec;
}

/**
 * Inspect every raster under assets/memes: size, alpha, opaque bounding box, coverage, hash.
 *   pnpm --filter @wtn/assets inspect [dir]
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import sharp from "sharp";

export interface ImageInfo {
  file: string;
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  /** Fraction of pixels with alpha > 8. */
  coverage: number;
  /** Bounding box of pixels with alpha > 8. */
  bbox: { x: number; y: number; w: number; h: number } | null;
  /** Fraction of fully-opaque pixels that are near-black (helps detect black backgrounds). */
  cornerAlpha: number[];
  sha256: string;
  bytes: number;
}

export function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

export async function inspectImage(path: string, root: string): Promise<ImageInfo> {
  const buf = readFileSync(path);
  const img = sharp(buf);
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = -1, maxY = -1, opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3]!;
      if (a > 8) {
        opaque++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const a = (x: number, y: number) => data[(y * width + x) * channels + 3]!;
  return {
    file: relative(root, path).replace(/\\/g, "/"),
    width,
    height,
    format: meta.format ?? "?",
    hasAlpha: !!meta.hasAlpha,
    coverage: opaque / (width * height),
    bbox: maxX >= 0 ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null,
    cornerAlpha: [a(0, 0), a(width - 1, 0), a(0, height - 1), a(width - 1, height - 1)],
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
  };
}

async function main() {
  const root = resolve(import.meta.dirname, "../../../assets/memes");
  const dir = resolve(process.argv[2] ?? root);
  const files = walk(dir).filter((f) => /\.(png|webp|jpe?g|svg)$/i.test(f));
  for (const f of files) {
    if (/\.svg$/i.test(f)) {
      console.log(`${relative(root, f)}  SVG (rejected for production)`);
      continue;
    }
    const i = await inspectImage(f, root);
    console.log(
      `${i.file.padEnd(60)} ${i.width}x${i.height} ${i.format}${i.hasAlpha ? "+a" : " NO-ALPHA"} cov=${(i.coverage * 100).toFixed(1)}% bbox=${i.bbox ? `${i.bbox.x},${i.bbox.y} ${i.bbox.w}x${i.bbox.h}` : "empty"} corners=${i.cornerAlpha.join("/")} ${(i.bytes / 1024).toFixed(0)}KB`,
    );
  }
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

/** Rebuild each meme from base + parts and compare to the founder's preview (lower diff = better). */
import { resolve } from "node:path";
import sharp from "sharp";
import { CATALOG, type Slot } from "./catalog";

const ROOT = resolve(import.meta.dirname, "../../../assets/memes");

async function composite(base: string, overlays: string[]): Promise<Buffer> {
  return sharp(base).composite(overlays.map((input) => ({ input }))).ensureAlpha().raw().toBuffer();
}

async function diff(a: Buffer, b: Buffer): Promise<number> {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const aa = a[i + 3]! / 255;
    const ba = b[i + 3]! / 255;
    for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c]! * aa - b[i + c]! * ba);
    sum += Math.abs(a[i + 3]! - b[i + 3]!);
    n += 4;
  }
  return sum / n;
}

async function main() {
  const orders: Record<string, Slot[]> = {
    A_legs_acc_arms_head_face: ["legs", "accessory", "arms", "head", "face"],
    B_arms_legs_acc_head_face: ["arms", "legs", "accessory", "head", "face"],
    C_legs_acc_head_face_arms: ["legs", "accessory", "head", "face", "arms"],
    D_legs_acc_arms_face_head: ["legs", "accessory", "arms", "face", "head"],
  };
  for (const m of CATALOG) {
    if (!m.preview) continue;
    const folder = `${ROOT}/parts/${m.folder}`;
    const skin = m.parts.find((p) => p.slot === "body");
    const base = skin ? `${folder}/${skin.src}` : `${ROOT}/parts/00-base/wth-original.png`;
    const preview = await sharp(`${ROOT}/previews/${m.preview}`).ensureAlpha().raw().toBuffer();
    const scores: string[] = [];
    for (const [name, order] of Object.entries(orders)) {
      const overlays = order.flatMap((s) => m.parts.filter((p) => p.slot === s).map((p) => `${folder}/${p.src}`));
      scores.push(`${name.slice(0, 1)}=${(await diff(await composite(base, overlays), preview)).toFixed(2)}`);
    }
    console.log(`${m.memeId.padEnd(12)} ${scores.join("  ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

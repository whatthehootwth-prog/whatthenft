/**
 * Records real website footage (production build on http://localhost:3110) with Chrome's DevTools screencast:
 * sharp 1920×1080 JPEG frames with timestamps → constant 30 fps H.264 clips in public/footage/.
 *
 *   pnpm --filter @wtn/web build && pnpm --filter @wtn/web start   # in another terminal
 *   node scripts/record.mjs [clip …]
 */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.SITE ?? "http://localhost:3110";
const OUT = join(ROOT, "public/footage");
const W = 1920, H = 1080;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Smooth eased scroll inside the page. */
const smoothScroll = (page, toY, ms) =>
  page.evaluate(
    ([toY, ms]) =>
      new Promise((res) => {
        const from = window.scrollY, t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const step = (now) => {
          const p = Math.min(1, (now - t0) / ms);
          window.scrollTo(0, from + (toY - from) * ease(p));
          p < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      }),
    [toY, ms],
  );

const CLIPS = {
  /** Homepage: on-load intro, then the shuffling card, names, rarity and arrows. */
  home: { url: "/", seconds: 14, run: async () => {} },
  /** Marketplace: header stats, grid, filters (demo data badge visible). */
  market: {
    url: "/marketplace",
    seconds: 12,
    run: async (page) => {
      await sleep(2500);
      await smoothScroll(page, 520, 2600);
      await sleep(900);
      const card = page.locator(".mk-card").nth(1);
      await card.hover().catch(() => {});
      await sleep(1200);
      await smoothScroll(page, 0, 1800);
      await page.getByRole("button", { name: /Filters/ }).click().catch(() => {});
      await sleep(900);
      await page.getByRole("button", { name: /^LEGENDARY/ }).click().catch(() => {});
      await sleep(1500);
    },
  },
  /** Collection binder: page turns + pulling a card out of its sleeve. */
  collection: {
    url: "/my-nfts",
    seconds: 12,
    run: async (page) => {
      await sleep(1800);
      await page.evaluate(() => document.querySelector(".binder-cover")?.scrollIntoView({ block: "center" }));
      await sleep(1500);
      await page.getByRole("button", { name: /Next/ }).click().catch(() => {});
      await sleep(1600);
      await page.getByRole("button", { name: /Prev/ }).click().catch(() => {});
      await sleep(1500);
      await page.locator("button.pocket").first().click().catch(() => {});
      await sleep(3500);
    },
  },
  /** Mint page: fixed 1 NEAR price + full fee breakdown. */
  mint: {
    url: "/mint",
    seconds: 8,
    run: async (page) => {
      await sleep(3500);
      await smoothScroll(page, 260, 2500);
      await sleep(1500);
    },
  },
  /** WTH page: curvy road + walking owl while scrolling. */
  wth: {
    url: "/wth",
    seconds: 11,
    run: async (page) => {
      await sleep(1600);
      await smoothScroll(page, 2200, 8000);
      await sleep(1000);
    },
  },
};

async function record(browser, name, clip) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", async (f) => {
    frames.push({ data: f.data, t: f.metadata.timestamp });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await page.goto(BASE + clip.url, { waitUntil: "domcontentloaded" });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const t0 = Date.now();
  await clip.run(page);
  const rest = clip.seconds * 1000 - (Date.now() - t0);
  if (rest > 0) await sleep(rest);
  const tEnd = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await ctx.close();

  // frames → constant 30 fps clip (each frame held until the next one arrives)
  const dir = join(ROOT, ".cache/frames", name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const lines = [];
  frames.forEach((f, i) => {
    const file = join(dir, `${String(i).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    const next = frames[i + 1]?.t ?? Math.max(tEnd, f.t + 1 / 30);
    lines.push(`file '${file.replace(/\\/g, "/")}'`, `duration ${Math.max(1 / 60, next - f.t).toFixed(4)}`);
  });
  lines.push(`file '${join(dir, `${String(frames.length - 1).padStart(5, "0")}.jpg`).replace(/\\/g, "/")}'`);
  writeFileSync(join(dir, "list.txt"), lines.join("\n"));
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, `${name}.mp4`);
  execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-movflags", "+faststart", out]);
  console.log(`${name}: ${frames.length} frames → ${out}`);
}

const want = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--force-device-scale-factor=1", "--disable-gpu-vsync"] });
for (const [name, clip] of Object.entries(CLIPS)) if (!want.length || want.includes(name)) await record(browser, name, clip);
await browser.close();

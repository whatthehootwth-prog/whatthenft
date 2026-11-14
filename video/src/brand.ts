/** Brand tokens copied from apps/web/app/globals.css + lib/rarity.ts. */
import { loadFont as lilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as outfit } from "@remotion/google-fonts/Outfit";
import { loadFont as spaceMono } from "@remotion/google-fonts/SpaceMono";

export const DISPLAY = lilita("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const SANS = outfit("normal", { weights: ["500", "700", "800", "900"], subsets: ["latin"] }).fontFamily;
export const MONO = spaceMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;

export const C = {
  ink: "#16110f",
  cream: "#fff4dc",
  paper: "#fffbf0",
  page: "#fff8e7",
  orange: "#ff7a1a",
  yellow: "#ffd23f",
  sun: "#ffe14d",
  aqua: "#2ee6ff",
  cyan: "#3ec6e0",
  pink: "#ff5fa2",
  hot: "#ff3ea5",
  lime: "#b8ff3d",
  violet: "#8b5cff",
  lilac: "#c9b6ff",
  night: "#0b0a0c",
  night2: "#17141a",
  red: "#e8402a",
  green: "#1f9d55",
  muted: "#6b5e55",
  fog: "#b9ad9f",
};

export const RARITY = [
  { name: "COMMON", stars: 1, pct: 60, color: "#ffffff" },
  { name: "RARE", stars: 2, pct: 25, color: "#7ee3ff" },
  { name: "EPIC", stars: 3, pct: 10, color: "#b48cff" },
  { name: "LEGENDARY", stars: 4, pct: 4, color: "#ffd23f" },
  { name: "MYTHIC", stars: 5, pct: 1, color: "#ff8cc6" },
] as const;

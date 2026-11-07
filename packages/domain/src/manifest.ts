import { sha256 } from "@noble/hashes/sha2.js";
import { z } from "zod";
import { SLOTS } from "./allocation";
import { hex } from "./rng";

/** NEAR account id rules (NEP-? account id spec): 2..64 chars, lowercase, separators . _ - */
export const NEAR_ACCOUNT_RE = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
export const nearAccountId = z.string().regex(NEAR_ACCOUNT_RE, "Invalid NEAR account id");

const PLACEHOLDER_RE = /REPLACE|PLACEHOLDER|TODO|EXAMPLE/i;
const slotEnum = z.enum(SLOTS);

export const memeManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    memeId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,31}$/, "memeId: lowercase a-z0-9 and dashes, 2..32 chars"),
    displayName: z.string().min(1).max(40),
    chain: z.literal("near"), // other chains are rejected until Milestone C adapters exist
    tokenContractId: nearAccountId.refine((v) => !PLACEHOLDER_RE.test(v), "tokenContractId is a placeholder"),
    tokenSymbol: z.string().min(1).max(16),
    tokenDecimals: z.number().int().min(0).max(32),
    activeInSeasons: z.array(z.number().int().positive()),
    approvedForMint: z.boolean(),
    commercialArtworkRightsConfirmed: z.boolean(),
    artLicenseReference: z.string().min(3).max(500).nullable(),
    slots: z.array(slotEnum).min(1),
    minLiquidityNear: z.string().regex(/^\d+(\.\d+)?$/),
    maxSlippageBps: z.number().int().min(1).max(1000),
    canvas: z.object({ width: z.literal(1024), height: z.literal(1024) }),
    anchors: z.record(z.string(), z.object({ x: z.number().int(), y: z.number().int() })).default({}),
    layeringOverrides: z.record(z.string(), z.number().int().min(0).max(99)).default({}),
    /** Marks dev-only placeholder art. Production publishing rejects any manifest with this set. */
    notForProduction: z.boolean().default(false),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (new Set(m.slots).size !== m.slots.length) ctx.addIssue({ code: "custom", message: "duplicate slots" });
    if (m.approvedForMint && !m.commercialArtworkRightsConfirmed) {
      ctx.addIssue({ code: "custom", path: ["approvedForMint"], message: "Cannot approve for mint without confirmed commercial artwork rights" });
    }
    if (m.approvedForMint && !m.artLicenseReference) {
      ctx.addIssue({ code: "custom", path: ["artLicenseReference"], message: "Approved memes need a license/partner-permission reference" });
    }
    if (m.approvedForMint && m.notForProduction) {
      ctx.addIssue({ code: "custom", path: ["notForProduction"], message: "Placeholder art cannot be approved for mint" });
    }
  });
export type MemeManifest = z.infer<typeof memeManifestSchema>;

/** Registered layer file: content hash recorded at import time. */
export const layerRecordSchema = z
  .object({
    memeId: z.string(),
    slot: z.union([slotEnum, z.literal("base")]),
    variant: z.number().int().min(0),
    file: z.string(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    width: z.literal(1024),
    height: z.literal(1024),
    hasAlpha: z.literal(true),
  })
  .strict();
export type LayerRecord = z.infer<typeof layerRecordSchema>;

const yoctoString = z.string().regex(/^\d{1,40}$/);

export const seasonManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    seasonId: z.number().int().positive(),
    name: z.string().min(1).max(60),
    network: z.enum(["testnet", "mainnet"]),
    coreContract: nearAccountId,
    mintStartsAt: z.string().datetime(),
    mintEndsAt: z.string().datetime(),
    maxSupply: z.number().int().min(1).max(100_000),
    targetBaseYocto: yoctoString,
    maxBaseYocto: yoctoString,
    minLegYocto: yoctoString,
    tiers: z.array(z.object({ minBaseYocto: yoctoString, maxPartners: z.number().int().min(0).max(5) })).min(1),
    lockSeconds: z.number().int().min(0).max(366 * 24 * 3600),
    fees: z.object({ basketBps: z.number().int(), creatorBps: z.number().int(), treasuryBps: z.number().int() }),
    royalty: z.object({ royaltyBps: z.number().int(), creatorShareOfRoyaltyBps: z.number().int() }),
    allocation: z.object({ coreWthBps: z.number().int(), slotWeightsBps: z.record(slotEnum, z.number().int()) }),
    rarityBps: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int()]),
    wthSlotBps: z.number().int().min(0).max(10_000),
    randomness: z.object({ version: z.literal("WTN-TRAITS-v1"), source: z.literal("near-block-random-seed-next-block") }),
    memes: z
      .array(
        z.object({
          memeId: z.string(),
          tokenContractId: nearAccountId,
          weight: z.number().int().min(0),
          slotVariants: z.tuple([z.number().int(), z.number().int(), z.number().int(), z.number().int(), z.number().int(), z.number().int()]),
          route: z.object({ kind: z.enum(["rhea-dcl", "rhea-v2"]), poolId: z.string().min(1) }),
          manifestSha256: z.string().regex(/^[0-9a-f]{64}$/),
        }),
      )
      .min(1),
    layers: z.array(layerRecordSchema),
    rulesText: z.string().min(1),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (Date.parse(s.mintEndsAt) <= Date.parse(s.mintStartsAt)) ctx.addIssue({ code: "custom", message: "mint window ends before it starts" });
    if (s.fees.basketBps + s.fees.creatorBps + s.fees.treasuryBps !== 10_000) ctx.addIssue({ code: "custom", message: "fees must sum to 10000" });
    if (s.rarityBps.reduce((a, b) => a + b, 0) !== 10_000) ctx.addIssue({ code: "custom", message: "rarity must sum to 10000" });
    const slotSum = Object.values(s.allocation.slotWeightsBps).reduce((a, b) => a + b, 0);
    if (slotSum !== 10_000) ctx.addIssue({ code: "custom", message: "slot weights must sum to 10000" });
    const contracts = new Map<string, string>();
    for (const m of s.memes) {
      const prev = contracts.get(m.tokenContractId);
      if (prev) ctx.addIssue({ code: "custom", message: `token contract ${m.tokenContractId} used by both ${prev} and ${m.memeId}` });
      contracts.set(m.tokenContractId, m.memeId);
    }
    if (s.memes[0] && s.memes[0].slotVariants.some((v) => v < 1)) ctx.addIssue({ code: "custom", message: "memes[0] must be WTH with art for every slot" });
  });
export type SeasonManifest = z.infer<typeof seasonManifestSchema>;

/** Canonical JSON: sorted object keys, no whitespace. Used for manifest hashes. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") {
    if (typeof v === "bigint") return JSON.stringify(v.toString());
    if (typeof v === "number" && !Number.isFinite(v)) throw new Error("non-finite number in manifest");
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const keys = Object.keys(v as Record<string, unknown>).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`).join(",")}}`;
}

export const manifestHash = (v: unknown): string => hex(sha256(new TextEncoder().encode(canonicalJson(v))));

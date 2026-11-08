# Artwork

## Layout

```
assets/memes/<memeId>/
  manifest.json                 # schema: memeManifestSchema (packages/domain/src/manifest.ts)
  preview.png                   # the founder's full-character preview
  previews/                     # extra colour variants (optional)
  slots/<slot>/NN-<name>.png    # one transparent layer per file
assets/reference/preview-sheet.png
```

Slots: `head` (hats, ears, head armour) · `face` (eye/cheek overlays) · `body` (full fur recolour — replaces the base owl) · `arms` (wings, held or carried items) · `legs` (lower body, feet) · `accessory` (chest, outfit, cape, emblem).

## Rules

- Every layer is a **transparent PNG at exactly 1254 × 1254**, drawn in place on the WTH owl (the native whatthehoot.lol owl canvas). No SVG, no scripts.
- Only **WTH must cover every slot**; its non-body slots are the bare owl (no file). Partner memes supply 1–6 slots. A missing slot uses WTH and that share of the bag goes to WTH.
- Compositing order (bottom → top): `behind` parts → body → legs → accessory → arms → head → face. Parts marked `"behind": true` (e.g. Robinhoot's quiver) sit behind the owl. This order reproduces every supplied preview (verified pixel-diff ≤ 0.17).
- `tokenContractId` is a **verified full NEAR contract id or `null`**. Unverified leads go in `tokenCandidates` and are never used for minting.
- `approvedForMint: true` requires a verified token, `commercialArtworkRightsConfirmed: true` and an `artLicenseReference`.

## Adding or updating art

1. Drop new PNGs in `assets/memes/parts/<NN-meme>/` and add them to `packages/assets/src/catalog.ts` (slot + display name).
2. Run `pnpm --filter @wtn/assets organize`. It moves files into place, checks size/transparency, hashes every layer, writes `manifest.json`, and rebuilds the web copies (`apps/web/public/art`) and `apps/web/lib/art-registry.json`.
3. `pnpm --filter @wtn/assets inspect` prints size / alpha / bounding box for any folder.

## Season 01 status (2026-11-09)

| Meme | Slots supplied | Token |
|---|---|---|
| WTH | body (base) | `wth-0b2227.launchpad.justhoot.near` ✓ |
| HOODL | body, head, arms | not found |
| HOOTERS | accessory, legs | not found · trademark permission needed |
| OYSTER | head, accessory | not found |
| THREE | body, face | not found |
| MOONSHOT | head, accessory, arms | candidates: `moon.token0.near`, `nmoon.tkn.near` (tiny liquidity) |
| RAEN | body | candidate: `raen-608.meme-cooking.near` (~$3.2k liquidity) |
| MALLACE | body | not found |
| IDP | accessory, arms | not found · ICP logo permission |
| ROBINHOOT | head, accessory, arms (quiver behind) | not found |
| QUANTUM CAT | body | candidates: `qcat-3.nearlytrade.near`, `qcat-2223.meme-cooking.near` (tiny) |
| INU | body | candidate: `sinu-8.smithii.near` |
| NEARKAT | body, accessory | `kat.token0.near` ✓ |
| CYBERNETIC | body, head, face, legs | not found · only tan fur supplied (previews show 4 more colours) |

Nothing is `approvedForMint` yet: each meme needs its token confirmed and written art/name permission.

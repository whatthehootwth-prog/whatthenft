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

| Meme | Slots supplied | Token (verified 2026-11-13) | RHEA route |
|---|---|---|---|
| WTH | body (base) | `wth-0b2227.launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| HOODL | body, head, arms | `hoodl-95275b.launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| HOOTERS | accessory, legs | `hooters-f5dd7a.launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| OYSTER | head, accessory | `oyster.v2-launchpad.justhoot.near` (token ok) | ✗ no wNEAR pool |
| THREE | body, face | `three-de86d6.launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| MOONSHOT | head, accessory, arms | `moonshot.v2-launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| RAEN | body | `raen-e1328c.launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| MALLACE | body | `mallace.v2-launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| IKP (folder `idp`) | accessory, arms | `ikp.v2-launchpad.justhoot.near` ✓ (INDERNED KEPUTER) | DCL 1% ✓ |
| ROBINHOOT | head, accessory, arms (quiver behind) | `robinhoot-2.v2-launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| QUANTUM CAT | body | `qcat-3.nearlytrade.near` (token ok) | ✗ only v2 #8930: ~6.5 NEAR, 9% fee |
| INU | body | `ninu-4.nearlytrade.near` (token ok) | ✗ only v2 #8721: ~2.9 NEAR, 10% fee |
| NEARKAT | body, accessory | `nearkat-630f25.nearlytrade.near` ✓ | DCL 1% ✓ |
| IMEME (folder `cybernetic`) | body, head, face, legs | `imeme-2.v2-launchpad.justhoot.near` ✓ | DCL 1% ✓ |
| BATMAN | head (cowl), accessory (cape), legs (utility belt) | `batman-4.nearlytrade.near` ✓ | DCL 1% ✓ |

Nothing is `approvedForMint` yet: each meme needs its token confirmed and written art/name permission.

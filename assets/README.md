# Artwork drop zone

Put each meme in its own folder: `assets/memes/<memeId>/` with a `manifest.json` (schema: `memeManifestSchema` in `packages/domain/src/manifest.ts`) and transparent 1024×1024 PNG/WebP layers:

```
assets/memes/wth/manifest.json
assets/memes/wth/base/body.png
assets/memes/wth/base/outline.png
assets/memes/wth/slots/{head,face,body,arms,legs,accessory}/*.png
assets/memes/<partner>/manifest.json
assets/memes/<partner>/slots/<slot>/*.png
```

Rules enforced by the schema/importer:
- `tokenContractId` must be a real, verified NEAR account (no placeholders, no ticker matching); chain `near` only until Milestone C.
- `approvedForMint: true` requires `commercialArtworkRightsConfirmed: true` and an `artLicenseReference`.
- Placeholder art must set `notForProduction: true` and can never be approved.
- No SVG or scripts; only raster layers with alpha at exactly 1024×1024.

The layer importer/compositor CLI (validate → hash → preview combinations → render) is the next Milestone A task; nothing has been supplied yet, so every card shows **ARTWORK NOT YET AVAILABLE**.

# WHAT THE NFT?! — official trailer

The project's 90-second launch trailer, built in [Remotion](https://www.remotion.dev): 1920×1080, 30 fps, H.264 + AAC. Everything is code, so you can edit any line, timing or colour and render again.

## Outputs (`out/`, gitignored)

| File | What |
|---|---|
| `what-the-nft-trailer.mp4` | Final master (−14 LUFS, −1 dBTP) |
| `trailer-raw.mp4` | Remotion render before loudness mastering |
| `what-the-nft-trailer-vo.wav` | Standalone voice-over on the same 90 s timeline (48 kHz mono) |
| `what-the-nft-trailer.srt` | Subtitles generated from the same cue table |
| `what-the-nft-teaser-9x16.mp4` | 1080×1920 teaser (~19 s): hook → rarity → finale with burned-in captions (`npm run teaser`) |

## Rebuild from scratch

You need Node 22. Run these from `video/`:

```bash
npm install
npm run fetch-audio      # Mixkit music + SFX + credits.json (no account)
npm run prep             # copy the real art layers + logo from apps/web
npm run tts              # Kokoro voice-over, local CPU (first run downloads the ~330 MB model)
npm run vo               # broadcast processing → public/audio/vo + src/vo.json
npm run record           # screen-record the site (needs the prod site on :3110, see below)
npm run render           # render → master → VO track → SRT
```

Footage is recorded from the production build:

```bash
pnpm --filter @wtn/web build
pnpm --filter @wtn/web exec next start -p 3110
```

Other commands:

- `npm run studio`: open the Remotion Studio and scrub the timeline.
- `npm run stills -- 4.9 35.9 87`: render quick review frames to `.cache/stills/`.
- `npm run voices`: regenerate the voice comparison (am_fenrir / am_michael / am_onyx).

## Where things live

- `src/cues.json`: when each voice line starts. The video, the SRT and the VO track all read it.
- `src/timeline.ts`: scene boundaries, music entry and ducking curve, and every SFX hit.
  - The music enters on the 4.0 s drop, 2.5 s into the track, so the 120 BPM beats land on whole and half seconds.
- `src/scenes/S1Hook … S9Finale`: the nine storyboard scenes.
- `src/kit.tsx`, `src/card.tsx`, `src/mutant.tsx`: brand kit.
  - Ink text, stickers, bursts, browser frame, padlock, coins, rarity cards.
  - The mutant stack uses the same layer order and token-mix formula as the site and contracts.
- `scripts/tts.mjs`: the narration script. Some words are spelled out for pronunciation, e.g. "N F T".

## The official link

The repo doesn't contain an official URL yet, so the end card says "Season 01 · coming soon". Once the domain exists, render with:

```bash
npx remotion render src/index.ts Trailer out/trailer-raw.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k --props='{"url":"yourdomain.xyz"}'
npm run master
```

## Honesty notes (built into the edit)

- **Pre-launch status:**
  - A "Pre-launch preview · not yet on mainnet" tag is on screen from 6 s to 83.5 s.
  - The end card states that the contracts are not yet on mainnet, that meme tokens are volatile and can go to zero, and that this is not financial advice.
- **Marketplace and collection footage** is labelled "Preview · demo data", and the scene says the market goes live at launch.
- **Buybacks and holder drops** are labelled "Designed · activates at launch". The split is described as coded and tested, not yet deployed.
- **Future seasons, crews and cross-chain** are tagged "Planned", with the line "Roadmap items are plans, not promises."
- **Rarity** is shown as cosmetic only, with the real odds (60/25/10/4/1).
- **The token mix** on screen comes from the production formula: 20% WTH core plus slot weights.

See `CREDITS.md` for music, SFX, voice, font and tool licences.

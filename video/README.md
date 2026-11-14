# WHAT THE NFT?! — official trailer

The project's 75-second launch trailer, built in [Remotion](https://www.remotion.dev): 1920×1080, 30 fps, H.264 + AAC. Everything is code, so you can edit any line, timing or colour and render again.

## Outputs (`out/`, gitignored)

| File | What |
|---|---|
| `what-the-nft-trailer.mp4` | Final master (−14 LUFS, −1 dBTP) |
| `trailer-raw.mp4` | Remotion render before loudness mastering |
| `what-the-nft-trailer-vo.wav` | Standalone voice-over on the same 75 s timeline (48 kHz mono) |
| `what-the-nft-trailer.srt` | Subtitles generated from the same cue table |

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
- `npm run stills -- 3.3 29.2 74`: render quick review frames to `.cache/stills/`.
- `VOICES=am_puck,am_fenrir SPEED=1.1 npm run voices`: regenerate a voice comparison into `public/audio/vo-compare/`.

## Where things live

- `src/cues.json`: when each voice line starts (video seconds). The video, the SRT and the VO track all read it.
- `src/timeline.ts`: scene boundaries, music entry and ducking curve, and every SFX hit.
  - The music enters on the 3.5 s drop, 16.5 s into the track, so the 120 BPM beats land on whole and half seconds and the track's real ending lands on the end card.
  - `KNOTS` maps the scenes' original 90 s design clock onto the faster 75 s cut, one knot per voice cue. To retime, move a cue in `cues.json` and its knot together.
- `src/scenes/S1Hook … S9Finale`: the nine storyboard scenes.
- `src/kit.tsx`, `src/card.tsx`, `src/mutant.tsx`: brand kit.
  - Ink text, stickers, bursts, browser frame, padlock, coins, rarity cards.
  - The mutant stack uses the same layer order and token-mix formula as the site and contracts.
- `scripts/tts.mjs`: the narration script. Some words are spelled out for pronunciation, e.g. "N F T". WTH is read as "What the Hoot", while the on-screen text stays WTH.

## The official link

The repo doesn't contain an official URL yet, so the end card shows no link. Once the domain exists, render with:

```bash
npx remotion render src/index.ts Trailer out/trailer-raw.mp4 --codec=h264 --crf=17 --audio-codec=aac --audio-bitrate=320k --props='{"url":"yourdomain.xyz"}'
npm run master
```

## Honesty notes (built into the edit)

- **Pre-launch status:**
  - A "Pre-launch preview · not yet on mainnet" tag is on screen from about 5 s to 67.5 s (every scene except the hook and the end card).
  - The bag scene says meme tokens are volatile and can fall to zero; the economy scene says it is not an investment and no returns are promised.
- **Marketplace and collection footage** is labelled "Preview · demo data", and the scene says the market goes live at launch.
- **Buybacks and holder drops** are labelled "Designed · activates at launch". The split is described as coded and tested, not yet deployed.
- **Future seasons, crews and cross-chain** are tagged "Planned", with the line "Roadmap items are plans, not promises."
- **Rarity** is shown as cosmetic only, with the real odds (60/25/10/4/1).
- **The token mix** on screen comes from the production formula: 20% WTH core plus slot weights.

See `CREDITS.md` for music, SFX, voice, font and tool licences.

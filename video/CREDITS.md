# Trailer credits & licences

Everything in the trailer is free to use, needed no account or API key, and is listed here. The audio files are **not** committed: Mixkit's licences don't allow redistributing the files on their own. `npm run fetch-audio` downloads them again (the URLs are in `scripts/fetch-audio.mjs`).

## Music

| Track | Artist | Source | Licence |
|---|---|---|---|
| Dirty Thinkin' (used, ~120 BPM, enters on the 3.5 s drop, 16.5 s into the track) | Michael Ramir C. | https://assets.mixkit.co/music/989/989.mp3 · page: https://mixkit.co/free-stock-music/mood/energetic/ | [Mixkit Stock Music Free License](https://mixkit.co/license/#musicFree) |
| Punked Up Fun (alternative, downloaded, not used) | Ahjay Stelino | https://assets.mixkit.co/music/47/47.mp3 | same |
| Sounds Good (alternative, downloaded, not used) | Michael Ramir C. | https://assets.mixkit.co/music/1077/1077.mp3 | same |

The licence was read on 2026-11-14 in the "View License" panel on mixkit.co.
- **Allowed:** commercial use on websites, social media, YouTube and online ads, with no attribution required.
- **Not allowed:**
  - CDs/DVDs, TV or radio broadcast, or video games
  - remixing the music into a music-only track
  - claiming it as your own
- **What this means for this trailer:**
  - You can publish it on X, YouTube, the site and in online ads.
  - Clear a TV or broadcast spot separately.

## Sound effects (Mixkit Sound Effects Free License)

https://mixkit.co/license/#sfxFree allows commercial use in videos, film, ads and games. It forbids redistributing the item on its own or claiming it as your own.

| id in project | Mixkit title | Mixkit # |
|---|---|---|
| pop-hard | Hard pop click | 2364 |
| pop-long | Long pop | 2358 |
| pop-cluster | Silly pop cluster | 2359 |
| whoosh-fast | Fast whoosh transition | 1490 |
| whoosh-air | Air woosh | 1489 |
| whoosh-cine | Cinematic whoosh fast transition | 1492 |
| glitch-text | Intro text glitch | 2950 |
| glitch-small | Small electric glitch | 2595 |
| coin-win | Winning a coin, video game | 2069 |
| coins-clink | Clinking coins | 1993 |
| money-bag | Money bag drop | 1989 |
| paper-slide | Paper slide | 1530 |
| impact-trailer | Movie trailer epic impact | 2908 |
| impact-big | Big cinematic impact | 788 |
| explosion-hit | Explosion hit | 1704 |
| punch | Impact of a strong punch | 2155 |
| boing | Boing hit sound | 2894 |
| dazzle-birds | Cartoon dazzle hit and birds | 746 |
| magic-sparkle | Magic sparkle whoosh | 2350 |
| magic-success | Fantasy game success notification | 270 |
| magic-sweep | Sweeping sparkle presentation intro | 2633 |
| lock-safe | Safe lock | 2853 |
| lock-gear | Gear metallic lock sound | 2858 |
| owl | Owl in a forest | 2466 |
| whistle | Cartoon toy whistle | 616 |
| splat | Funny cartoon fast splat | 2889 |

Each file is at `https://assets.mixkit.co/active_storage/sfx/<#>/<#>-preview.mp3`. `paper-crumple` (2996) is also downloaded but not used.

## Voice-over

- **Model:** [Chatterbox](https://github.com/resemble-ai/chatterbox) 0.1.7 by Resemble AI, **MIT licence**. It runs locally on the CPU from `video/.tts` (set up with `npm run setup-tts`), with no account or key.
  - Chatterbox embeds Resemble's inaudible Perth watermark in every generated line, marking it as AI-generated. It is left on.
- **Voice:** Chatterbox's built-in male voice, exaggeration 0.85, CFG 0.35. The project owner picked it by ear over a clone of the earlier Kokoro voice (`public/audio/vo-compare-cb/`).
  - The first two cuts used Kokoro-82M (Apache-2.0, `am_fenrir` then `am_puck`). It reads too calmly for a hype trailer. It is still used for the optional clone reference (`npm run tts:ref`, `public/audio/vo-ref.wav`).
  - **Take selection:** every line gets 3–9 takes.
    - Each take is transcribed with a local Whisper model (faster-whisper `base.en`, MIT).
    - The most energetic take whose words match the script is kept.
  - **Rarity chant:** it is read as one sentence and split at the pauses, because one-word lines are unstable.
  - **Pronunciation:** WTH is read as "What the Hoot". ALL-CAPS words are de-capped before generation, because Chatterbox reads capitals as letters.
- **Processing** (`scripts/process-vo.mjs`, ffmpeg):
  1. trim silence
  2. optional pitch shift with formants preserved (rubberband; off by default)
  3. high-pass at 80 Hz
  4. +3 dB body at 140 Hz
  5. −2.5 dB mud cut at 320 Hz
  6. +4 dB presence at 3.2 kHz
  7. +2 dB air at 9 kHz
  8. de-ess
  9. 5:1 fast compression
  10. tanh saturation (more drive for an aggressive edge)
  11. −16 LUFS per phrase
- **In the mix:** the music ducks to about 30% under every line, and the final master is two-pass loudnorm at −14 LUFS / −1 dBTP.

## Fonts (Google Fonts, SIL Open Font License 1.1)

- Lilita One: display
- Outfit: UI
- Space Mono: tags

Loaded with `@remotion/google-fonts`.

## Visuals

- **Art:**
  - All owl art and part layers are the founder's original artwork from `apps/web/public/art`, copied by `scripts/prep-art.mjs`. No AI-generated or stock art.
  - Partner meme characters (NEARKAT, HOODL, HOOTERS, THREE, MOONSHOT, RAEN, MALLACE, IKP, ROBINHOOT, IMEME, BATMAN) appear in the trailer. **Confirm each partner community is happy with this before publishing.** Their mint approval flags are still off in `packages/chain/src/seasons.ts`.
- **Footage:** real screen recordings of the project's own production build (`scripts/record.mjs`, headless Chrome screencast), running locally. Marketplace and collection data is the site's labelled demo data.
- **Tooling:**
  - [Remotion](https://www.remotion.dev) 4.0.543. Free for individuals and companies of up to 3 people; larger companies need a [company licence](https://www.remotion.dev/license).
  - ffmpeg 6.0 via `ffmpeg-static` (GPL build, used only as a tool).
  - Playwright with system Chrome.

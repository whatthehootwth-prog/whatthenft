# WHAT THE NFT?! — Production UI/UX spec & design system

Source of truth for brand DNA: the live https://www.whatthehoot.lol/ (inspected 2026-11-07: CSS variables, fonts, borders and shadows extracted from `/_next/static/css/28eace61ef427158.css`, plus screenshots). The brief's palette was approximate; the values below are the site's real ones.

## 1. Two registers, one system

| Register | Where | Rules |
|---|---|---|
| **LOUD** (comic) | Home hero, season banner, reveal moment, empty states, 404 | Sunburst rays, chunky Lilita lettering with ink stroke, tilted stickers, halftone dots, hand-written Gochi asides. Motion allowed (respecting reduced-motion). |
| **CLEAR** (finance) | Hatch confirmation, cost breakdown, order status, holdings, redemption, admin, status | Cream paper, ink text, 2–3px ink rules, **no rotation, no rays, no animation of numbers**, Space Mono tabular numerals, every amount with unit + source + timestamp. Bright colors only as state signals. |

A money action is never inside a LOUD surface. LOUD surfaces link to CLEAR ones.

## 2. Tokens

```
--ink      #16110F   text, borders, shadows
--cream    #FFF4DC   page/paper
--paper    #FFFBF0   raised panels (CLEAR)
--orange   #FF7A1A   primary action, brand
--yellow   #FFD23F   highlight, LOCKED state
--cyan     #3EC6E0   info, UNLOCKED state, links on ink
--pink     #FF5FA2   accent, rarity EPIC
--red      #E8402A   destructive/failed
--purple   #7C64A8   rarity LEGENDARY
--green    #1F9D55   success/FUNDED confirmations (added: WTH site has no green; needed for unambiguous success)
--muted    #6B5E55   secondary text on cream (contrast 6.1:1)
```
Contrast: ink on cream 17.6:1; ink on orange 7.0:1 (orange buttons always use ink text, never white); ink on yellow 13:1; cream on ink 17.6:1. Never white text on orange/yellow/cyan.

State colors (fixed meaning, used everywhere):
- `LOCKED · FUNDED` → yellow chip + lock glyph
- `UNLOCKED · FUNDED` → cyan chip + open-lock glyph
- `EMPTY · REDEEMED` → cream chip with dashed ink border + "0 assets" text
- `PENDING` → paper chip with animated ellipsis only (no spinner on numbers)
- `FAILED / RECOVERY` → red chip + text reason; `REFUNDED` → ink chip

## 3. Typography

| Role | Font | Size (mobile → desktop) | Notes |
|---|---|---|---|
| Display (LOUD) | Lilita One | clamp(48px, 11vw, 132px) | ink stroke 3–6px via `paint-order: stroke`, cream/white fill |
| H1 (CLEAR) | Lilita One | 32 → 44px | no stroke |
| H2 | Lilita One | 24 → 30px | |
| H3 / labels | Lilita One | 18 → 20px | letter-spacing .01em |
| Body | system sans (`ui-sans-serif, system-ui`) | 16px / 1.55 | same as WTH site body |
| Numbers, ids, hashes | Space Mono | 14–16px | `font-variant-numeric: tabular-nums`, right-aligned in tables |
| Asides | Gochi Hand | 18–22px | max one per section, never for information that matters |

Minimum text size 14px (12px only for table footnotes ≥ 4.5:1 contrast).

## 4. Grid, spacing, breakpoints

- 4px base; spacing scale 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Container max 1200px; gutters 16px (<640), 24px (≥640), 32px (≥1024).
- Breakpoints validated: **320, 390, 768, 1024, 1440**. Layout switches at 640 (sm), 768 (md), 1024 (lg).
- Transaction screens are single column below 1024; at ≥1024 a 7/5 split (form | sticky receipt).

## 5. Components (variants & states)

- **Button**: `primary` (orange, ink 3px border, 4px hard shadow), `secondary` (cream), `ink` (ink bg, cream text), `danger` (red), `ghost`. States: hover (shadow 6px, −1px translate), active (shadow 0, +2px translate), focus-visible (3px cyan outline offset 3px), disabled (muted stripe pattern + `aria-disabled` + **visible reason text below**), loading (label replaced by "Waiting for wallet…" text; width locked). Min tap target 44×44.
- **Panel**: CLEAR card = paper bg, 3px ink border, radius 14px, 5px hard shadow. LOUD sticker = rotated ±2°, uneven radius `14px 10px 16px 9px` (site value).
- **Chip** (state chip above), **Amount** (value + unit + optional fiat-free secondary; never abbreviates below 6 significant digits on CLEAR surfaces), **AddressMono** (truncates middle with copy button and explorer link; full value in `title` + accessible label).
- **Receipt** (cost breakdown): two-column table, ink rules, totals row double rule, every line has a source note (e.g. "from season config", "live Rhea quote 08:10:57 UTC").
- **Stepper** (order status): vertical; each step = state + timestamp + tx link; current step pulses opacity only.
- **Alert**: info (cyan rule), warning (yellow), error (red). Always text + icon, never color alone.
- **Modal**: focus-trapped, Esc closes (except while a transaction is being signed), labelled by heading, returns focus.
- **Empty state**: LOUD sticker with Gochi aside + one honest sentence + one real action.

## 6. Motion

- Durations 120ms (press), 200ms (hover/enter), 600ms (reveal only). Easing `cubic-bezier(.2,.8,.2,1)`.
- `prefers-reduced-motion: reduce` disables rays rotation, wobble and reveal flips; state changes become instant.
- Numbers never tween. Pending states animate an ellipsis, not the amount.

## 7. Accessibility

Semantic landmarks; one H1 per page; all icons decorative or labelled; focus order follows visual order; color never the only signal; forms with `<label>`, `aria-describedby` for errors and disabled reasons; live regions (`aria-live=polite`) for order status updates; WCAG 2.2 AA contrast for all text.

## 8. Honesty rules (release-blocking)

- No sample/fake NFTs, prices, users, activity, charts or testimonials. Unavailable data renders `UNAVAILABLE` with a reason, never `0`.
- Every CTA performs its label or is disabled with a visible reason.
- Artwork: until approved partner art exists, cards show **ARTWORK NOT YET AVAILABLE** with the real trait list. Dev placeholders are watermarked `NOT FOR PRODUCTION` and never reachable on mainnet builds.
- Collectible value vs basket value are always separate labelled numbers. NAV is labelled with its method (`EXECUTABLE SELL QUOTE` or `ESTIMATED`) and timestamp.

## 9. QA checklist (per screen, per breakpoint 320/390/768/1024/1440)

alignment · type hierarchy · whitespace · wrapping of long account ids/hashes · no horizontal scroll · tap targets ≥44px · keyboard path · focus visible · disabled reasons visible · empty/loading/error states reachable · numbers tabular & unit-labelled · contrast · reduced motion · no fake data.

# WHAT THE NFT?! — Project Summary

> **One owl. Too many memes.**
> A NEAR NFT collection where every NFT is a mutant WTH owl stitched together from meme-community body parts — and each NFT holds a **real bag of those meme tokens**, bought on RHEA at mint.

_Status as of 11 Nov 2026 · latest commit `baad986` · branch `main` · nothing deployed yet._

---

## 1. At a glance

| Area | Status |
|---|---|
| Core NFT + vault contract (`contracts/core`) | ✅ Built · 17/17 tests pass · **not deployed** |
| Buyback treasury contract (`contracts/buyback`) | ✅ Built · 14/14 tests pass · compiles (185 KB) · **not deployed** |
| Keeper bot (`apps/keeper`) | ✅ Built · 12/12 tests · live read-only preview works on mainnet data |
| Shared economics/traits logic (`packages/domain`) | ✅ 32/32 tests |
| Chain helpers (`packages/chain`) | ✅ RPC, RHEA quotes, token registry, season draft |
| Art pipeline (`packages/assets`) | ✅ 15 meme folders organised (incl. BATMAN), manifests, web-ready layers |
| Website (`apps/web`) | ✅ Homepage, Marketplace, My Collection, WTH is this?!, Mint, Treasury, Risk, Terms |
| Marketplace contract (`contracts/market`) | ✅ Built · 9/9 tests · compiles (215 KB) · **not deployed** · pages switch to live data when configured |
| NFT image compositor + IPFS pinning | ✅ Built in keeper (compose from original layers → Pinata → `set_token_media`) · needs Pinata key |
| Order runner (advances mint steps) | ✅ Built in keeper + `run-all` cron command · mint page has "Continue my order" |
| Mainnet season config with real memes | ✅ 12 memes verified with RHEA routes (OYSTER, QCAT, NINU lack pools) · partner approval flags pending |
| Audit / legal review | ❌ Not done |

**Network today:** website set to `testnet`, no contract connected. The only mainnet interaction so far has been **read-only** (token metadata, holder balances, RHEA quotes). No transactions have been sent and no real money has moved.

---

## 2. The concept

- Every NFT is a **mutant WTH owl** with six parts — **head, face, body, arms, legs, outfit** — each from a different meme community (WTH plus partner memes).
- The parts aren't just art: **the parts decide the bag.** At mint, 85% of the price buys the real meme tokens matching the owl's parts. The NFT **holds** those tokens.
- The bag is **locked for 30 days**, then the **current owner** can withdraw it. The NFT stays as an **EMPTY** collectible, and can be **reloaded** in an eligible season.
- Trade any time (even while locked) — **the bag travels with the NFT**.
- Seasonal, capped drops. **Season 01 "Meme Genesis" = 111 mutants.**
- Part of the **WHAT THE HOOT?! ($WTH)** universe; WTH always gets a guaranteed share of every bag.

**Why it fits a meme track:** meme culture (14 meme communities mashed into one character) + real on-chain meme-token utility on NEAR (RHEA swaps, verified token custody, tradable token-backed NFTs).

---

## 3. User workflow

```
 Mint (pay NEAR)
   │  NEAR randomness in a LATER block picks 6 parts + rarity (nobody can choose or re-roll)
   ▼
 Buy the bag  ── contract wraps NEAR → buys each meme token on RHEA (min_out from on-chain quote)
   │            ── re-reads its own token balance → credits only what verifiably arrived
   ▼
 NFT minted (only after every leg is funded — "no bag, no NFT")
   │
   ├── Trade any time (bag included, lock timer does NOT restart) ── 3% royalty
   │
   ▼ after 30 days
 Withdraw: current owner redeems the exact tokens → NFT becomes EMPTY (art stays)
   │
   ▼
 Reload (eligible season): same token mix, new payment, new 30-day lock
```

If a swap route fails **before** anything is bought, the minter is refunded. Partial failures go to a recovery path (retry → unwind → refund), never a silent loss.

---

## 4. Economics (launch settings)

### Price
**Fixed 1 NEAR per mint.** Every owl is WTH + up to 2 partner memes. Wallet pays ~1.039 NEAR (1 + 0.009 storage + 0.03 refundable reserve).

### Mint split (of the base price)
| Share | Goes to | On a 0.1 NEAR mint |
|---|---|---|
| **85%** | The NFT's meme-token bag (owned by whoever holds the NFT) | **0.85** (at 1 NEAR) |
| **10%** | Creator (you) — paid only after the NFT is fully funded | **0.10** |
| **5%** | Buyback treasury — paid only after full funding | **0.05** |

Charged **on top** of the base (never taken from the bag): storage fee **0.009 NEAR**, retry reserve **0.03 NEAR** (unused part refunded), advance fee **0.01 NEAR**, network gas (~0.003). A 0.1 mint attaches ~0.15 NEAR and nets ~0.12–0.13.

### Marketplace royalty
**3% of each sale**, split **50% creator / 50% buyback treasury** (NEP-199 payout, enforced by any compliant marketplace). 10 NEAR sale → seller 9.70 · creator 0.15 · treasury 0.15. Wallet-to-wallet transfers pay nothing.

### Bag allocation (which tokens, how much)
- **WTH core:** 20% of every bag, always.
- **Remaining 80%** follows the parts, by slot weight: head 20% · face 10% · body 25% · arms 10% · legs 10% · outfit 25%. A slot whose partner has no art falls back to WTH.
- **Price tiers** limit partner count: < 1 NEAR → WTH + 1 partner · ≥ 1 NEAR → 2 · ≥ 5 NEAR → 3.
- 30% chance any slot stays WTH even if a partner has art (`wthSlotBps = 3000`).
- Every token purchase (leg) must be ≥ **0.005 NEAR**; max price impact 3%. Compositions that can't meet this are re-drawn; final fallback is all-WTH.

### Minimum price
- Smallest possible leg share = 8% of the bag → base ≥ ~**0.0735 NEAR** with an 85% bag.
- **0.1 NEAR** chosen: clean number, ~35% headroom, bag is still the biggest part of what you pay.

### Rarity (cosmetic only — never changes the bag)
| Tier | Stars | Odds | ≈ of 111 |
|---|---|---|---|
| COMMON | ★ | 60% | 67 |
| RARE | ★★ | 25% | 28 |
| EPIC | ★★★ | 10% | 11 |
| LEGENDARY | ★★★★ | 4% | 4 |
| MYTHIC | ★★★★★ | 1% | ~1 |

Rolled on-chain, independent of the parts. The homepage showcase card uses boosted display odds (15/20/25/22/18) **for display only**.

### Season 01 parameters
111 supply · **open until sold out** (end date set 10 years out; owner can pause) · 30-day lock · **fixed 1 NEAR** · rules, fees and odds **frozen on-chain** when a season opens. Old seasons stay tradable; new memes arrive in new seasons.

---

## 5. Automatic $WTH buyback → holders

```
Treasury (buyback contract) receives: 5% of mints + 50% of royalties (plain NEAR)
   │
   │  keeper checks every few minutes
   ▼
Spendable NEAR worth ≥ $20?  (RHEA on-chain NEAR/USDC + CoinGecko must agree within 10%)
   │ yes
   ▼
buy(): wrap NEAR → on-chain RHEA quote → swap with min_out (3% default, 10% hard cap)
       → credit only verified WTH → unwrap unused wNEAR
   ▼
Snapshot $WTH holders (FastNEAR top list, every balance re-read on-chain)
   ▼
Split pro-rata by balance → publish rounds/<net>-round-N.json
   ▼
start_round(sha256, total) → pay(≤20 per batch) × N → close_round()
       close reconciles from the real WTH balance: failed/unpaid amounts roll over
```

**Rules:** min holding **1,000 WTH** · payouts under **1 WTH** roll over · excluded: `dclv2.ref-labs.near`, `v2.ref-finance.near`, `intents.near`, `launchpad.justhoot.near`, the WTH token contract, the buyback account, the keeper. **No other exclusions** (by decision, `root.near` and `whatthehoot.near` are paid like any holder).

**Safety:** keeper can only buy (per-buy cap, min interval, slippage bound) and pay inside an open round — it can **never send NEAR**. One operation at a time. Unverifiable swap → auto-pause. Owner (multisig recommended) can pause, change keeper/limits, and **only while paused** emergency-withdraw (logged on-chain).

**Live preview (read-only, mainnet data):** 1,000 WTH would be split across **45** qualifying holders; 12.9 WTH rolls over. NEAR/USD sources agreed at ~$3.61.

**$WTH token:** `wth-0b2227.launchpad.justhoot.near` (WHAT THE HOOT, 18 decimals), RHEA DCL pool `wrap.near|wth-0b2227.launchpad.justhoot.near|10000`.

---

## 6. Art system

- **15 meme folders:** WTH (base) + HOODL, HOOTERS, OYSTER, THREE, MOONSHOT, RAEN, MALLACE, IDP, ROBINHOOT, QUANTUM CAT, INU, NEARKAT, CYBERNETIC, BATMAN (cowl · cape · utility belt).
- Each part is a **transparent 1254×1254 layer** drawn in place on the WTH owl; stacking reproduces the founder previews exactly.
- **Layer order:** behind → body → *skin markings* → legs → outfit → arms → head → face.
- **Skin markings** (always directly on the body, under everything): NEAR emblem (NEARKAT outfit), pixel-3 tattoo (THREE face), cybernetic temple shell + cyber eye.
- **Possible looks today:** 7 × 3 × 9 × 5 × 4 × 8 = 30,240 with all art; **17,640 mintable** with the 12 routable memes (grows with every new variant).
- **Pipeline:** `pnpm --filter @wtn/assets organize` → `assets/memes/<meme>/{manifest.json, preview.png, slots/<slot>/NN-name.png}` + web WebPs in `apps/web/public/art/` + `apps/web/lib/art-registry.json`.
- **Token readiness (verified 2026-11-13):** **12 mintable** — WTH, NEARKAT, HOODL, HOOTERS, THREE, MOONSHOT, RAEN, MALLACE, IKP, ROBINHOOT, IMEME, BATMAN (all RHEA DCL 1% pools, < 0.05% impact at 0.68 NEAR). OYSTER, QCAT, NINU excluded until they get a usable wNEAR pool.
- **Funny names:** generated from the actual parts (body = who it is, other parts add a word) — e.g. "CAPTAIN OUTLAW CYBORG", "DOGGO.EXE", "PROFESSOR SCHRÖDINGER".

---

## 7. Repository map

| Path | What |
|---|---|
| `contracts/core` | Rust (near-sdk 5.30.1) NFT + vault + order engine |
| `contracts/buyback` | Rust buyback treasury |
| `packages/domain` | Exact bigint economics, allocation, trait derivation (shared test vectors with the contract), manifest schemas, executable-minimum engine |
| `packages/chain` | RPC client, network registry (RHEA accounts, token routes), RHEA quotes, Season 01 draft |
| `packages/assets` | Art organiser / validator (sharp) |
| `apps/web` | Next.js 16 · React 19 · Tailwind 4 · NEAR wallet-selector 10 |
| `apps/keeper` | Buyback keeper CLI + payout preview |
| `test-vectors/traits-v1.json` | Cross-language trait vectors (TS ↔ Rust) |
| `docs/` | DESIGN, FEASIBILITY, RUNBOOK, THREAT_MODEL, this summary |

---

## 8. Core contract (`contracts/core`)

**Order engine:** `mint` → `on_reveal` (randomness from a **later** block) → `on_wrapped` → per leg `on_leg_prepared` (balance + on-chain quote) → swap → `on_leg_swapped` → `on_leg_verified` (credit verified delta) → finalize (mint NFT, pay creator/treasury fees).
Order states: `Escrowed · TraitsAssigned · SwapsPending · FullyBackedLocked · FailedPreExecution · RefundPending · Refunded · PartialExecutionRecovery`.
Recovery: `advance_order` (permissionless, paid from the retry reserve), `retry_order`, `unwind_order`, `refund_order`, `reconcile_anomaly`.

**NFT + vault:** NEP-171/177/178/181 NFT, NEP-199 royalty payouts (`nft_payout`, `nft_transfer_payout`), `nft_basket`, `redeem` (owner after unlock; revokes marketplace approvals; restores claim if transfer fails), `reload`, `set_token_media`.
Card states: `FullyBackedLocked · Unlocked · Redeeming · RedeemedEmpty · Reloading`.

**Admin:** `propose_owner/accept_owner`, `set_operator`, `set_revenue_accounts`, `set_mints_paused`, `set_route_paused`, `register_tokens`, `create_season/update_season/open_season/close_season`, `set_current_min_base`, `check_conservation`.

**Guarantees tested:** NFT minted only after every leg verified · no admin path moves backed funds · per-token swap mutex · quote failure before any swap refunds everything · anomalies freeze the order · sold-while-locked buyer inherits the full claim · reload rebuys the same composition with a new lock · parallel orders never share ids · traits match the TypeScript vectors exactly · season config immutable once open (basket ≥ 50%, royalty ≤ 10%).

---

## 9. Website (`apps/web`)

| Page | What it does |
|---|---|
| **Home** | Full-screen hero only (no footer): live SUPPLY · PRICE · STATUS label, "ONE OWL. TOO MANY MEMES.", description, MINT NOW / HOW IT WORKS. **3-card stack** — front card swaps one part every 0.5 s with a glitch, funny name + rarity re-roll every ~2 s, 3 dotted "X powered by MEME" arrows (one fixed bottom-right, two follow the latest swaps), background colour follows the body meme. On-load intro (stats drop, title slams, card flies in, back cards fan out, stickers pop), floating stickers, hover bounce. |
| **Marketplace** | Collection header (Floor, 24h volume, Total volume, Top sale, Listed, Owners — count-up), search, sort (price, rarity, recent, id), filters (rarity, meme crew, price range), card grid with BUY, load more, sticky **Activity** (live demo feed) / **Holders** tabs. **Demo data, labelled.** |
| **My Collection** | Pokémon-style **binder**: 111 numbered pockets (owned cards in sleeves, others "?"), page turns, divider tabs (Full album / My cards / Locked / Unlocked / Listed / Empty), completion bar, sticky notes, card pop-out with bag mix, lock countdown and actions. **Demo data, labelled.** |
| **WTH is this?!** | Animated adventure map: curvy marching-dots road through 6 stops (Mint → Real token bag → Trade → Withdraw → Where the money goes → Seasons), owl rider that **walks** as you scroll, blob illustrations, speech bubbles, pop-in cards, "One serious thing…" note linking Risk + Treasury. |
| **Mint** | Price presets / custom amount, live quote from mainnet RHEA, full fee breakdown, pack-reveal animation. Works once a contract is connected. |
| **Treasury / Risk / Terms / Status / Admin** | Rules and disclosures (auto-buyback + distribution described honestly, nothing promised), live account balances once deployed, admin season tools. |

**Nav:** floating dark pill (WHAT THE HOOT style): Home · Marketplace · My Collection · WTH is this?! · Connect wallet · MINT NOW. No footer on any page.

**Design system:** Lilita One (display) + Outfit (body) + Space Mono (numbers); ink-outline comic style, hard shadows, bright palette (orange, sun, aqua, hot pink, lime, violet); rarity frames (silver, aqua, purple, gold, animated rainbow for MYTHIC); all motion disabled under `prefers-reduced-motion`.

---

## 10. Demo data — honest disclosure

Until the contracts are live, these use **clearly labelled demo data** generated from the real part library: Marketplace (111 owls, prices, activity, holders with made-up `*.near` names), My Collection (`you.demo.near`), homepage card (preview, boosted rarity display odds). Every BUY / WITHDRAW / SELL / RELOAD button shows a "Demo only" notice; nothing is sent. **Switch to on-chain data (or hide) before mainnet.**

---

## 11. Verification

| Suite | Result |
|---|---|
| Core contract (Rust, Docker) | 17/17 |
| Buyback contract (Rust, Docker) | 14/14 |
| Domain (TypeScript) | 32/32 |
| Keeper (TypeScript) | 12/12 |
| Typecheck web / chain / keeper | clean |
| Buyback WASM build | 184,766 bytes · sha256 `233ba410…f8cb1b8` |

Browser checks at 1440×900 and 375×812 for every redesigned page (no horizontal overflow).

---

## 12. Strategy & key decisions

- **Real backing over hype:** "no bag, no NFT", verified balances, refunds on failure, bag belongs to the holder — the honest core that makes it more than a JPEG.
- **Fun first:** loud comic design, mutant mash-ups, funny names, rarity reveals, collection binder — collecting should feel like opening card packs.
- **Fair randomness:** reveal uses a later block's randomness; nobody (including the team) can pick outcomes.
- **Creator income** mainly via royalties (50% of 3%) plus 10% of mints, keeping the bag the clear majority (85%).
- **WTH flywheel:** every bag holds ≥20% WTH; treasury revenue buys WTH and shares it with WTH holders.
- **Safety by design:** keepers can't move funds, limits are on-chain, admin can't touch backed funds, everything logged.
- **Supply:** 111 for Season 01 (scarcity, less duplicate risk, thin meme pools stay manageable); grow via new seasons and more art.
- **Risks to keep visible:** meme tokens can go to zero; 30-day lock; no audit yet; holder distributions look dividend-like (legal review recommended); "Not yield / no promises" copy kept.

---

## 13. Go-live checklist (mainnet)

**You provide**
- [ ] Mainnet accounts: core contract, buyback treasury, creator, owner (multisig), keeper — keys stay with you
- [ ] Funding: ~6–7 NEAR core storage · ~2–3 NEAR buyback · ~1 NEAR keeper gas
- [ ] **Verified token contracts for the other 12 memes** (or launch with fewer memes)
- [ ] Partner art/name permissions
- [ ] Season dates, final price, marketplace-page decision (hide / coming soon / external), legal sign-off

**I prepare**
- [ ] Rebuild core WASM (5 tiers, 85/10/5, 3% 50/50) + publish checksum
- [ ] Real Season 01 config (verified memes + RHEA routes only)
- [ ] NFT image compositor + IPFS pinning (`set_token_media`)
- [ ] Order runner (keeper step or "continue" in the mint UI)
- [ ] Remove/hide demo data on mainnet · switch site to `mainnet` · production build + hosting

**Launch (each step needs your explicit approval)**
- [ ] Smoke test on a throwaway mainnet account (3 × 0.1 NEAR mints, transfer, short-lock withdraw, one buyback round; ~6.5 NEAR mostly recoverable) → withdraw bags → delete test account
- [ ] Deploy core + buyback on the real accounts; point core's treasury at the buyback account
- [ ] Create Season 01 (not open) → final check → open season → start keeper

---

## 14. Commit history

| Commit | What |
|---|---|
| `bb468e3` | Milestone A foundation: domain economics, core contract, web app, feasibility docs |
| `c88d434` | Collectible redesign: owl mutant hero, pack reveal, market, binder, guide |
| `6a9d460` | Todo list |
| `bf6e5b7` | Season 01 art organised + manifests; bright redesign from real layers |
| `5a6a435` | Playful redesign: card hero, roadmap guide, demo marketplace, 5-tier rarity |
| `d52043d` | Funny part-based names, new WTH copy, sticky market sidebar |
| `caee10b` | Launch economics 85/10/5 + 3% royalty 50/50; collection binder; site polish |
| `baad986` | Buyback treasury contract + keeper: auto WTH buyback, pro-rata to holders |

All commits authored by `whatthehootwth <whatthehootwth@gmail.com>`; nothing pushed.

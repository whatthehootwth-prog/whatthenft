# WHAT THE NFT?! — Complete System Reference

> **One owl. Too many memes.**
> A NEAR NFT collection where every NFT is a mutant WTH owl stitched together from meme-community body parts. Each NFT holds a **real bag of those meme tokens**, bought on RHEA at mint and locked inside the NFT.

This is the single, complete reference for how the project works: product, architecture, smart contracts, economy, keeper bot, website, art, deployment, live mainnet evidence, security and operations.

_Status as of **2026-11-15**: contracts **live on NEAR mainnet**, full end-to-end test passed on mainnet, **Season 01 created** (opens when the owner calls `open_season`). Website: **https://nft.whatthehoot.lol**._

> **Hackathon project.** Built by Claude (AI). The smart contracts had an **AI security audit by Claude and ChatGPT**; that is **not** a professional audit. Meme tokens are volatile and can go to zero. Not financial advice.

---

## Table of contents

1. [Live deployment at a glance](#1-live-deployment-at-a-glance)
2. [The product](#2-the-product)
3. [Architecture](#3-architecture)
4. [Repository map](#4-repository-map)
5. [Core contract: NFT + vault + order engine](#5-core-contract-nft--vault--order-engine)
6. [Marketplace contract](#6-marketplace-contract)
7. [Buyback treasury contract](#7-buyback-treasury-contract)
8. [Economy](#8-economy)
9. [Token transfer fees](#9-token-transfer-fees)
10. [Seasons, manifest and immutability](#10-seasons-manifest-and-immutability)
11. [Art system](#11-art-system)
12. [Keeper bot](#12-keeper-bot)
13. [Website](#13-website)
14. [Deployment](#14-deployment)
15. [Mainnet test evidence](#15-mainnet-test-evidence)
16. [Security model](#16-security-model)
17. [Operations runbook](#17-operations-runbook)
18. [Known limitations and risks](#18-known-limitations-and-risks)
19. [Trailer pipeline](#19-trailer-pipeline)
20. [Glossary](#20-glossary)

---

## 1. Live deployment at a glance

| Item | Value |
|---|---|
| Website | https://nft.whatthehoot.lol (Railway, Next.js) |
| Network | NEAR **mainnet** |
| Owner + creator | `whatthenft.near` |
| Core contract (NFT + bags) | `core.whatthenft.near` |
| Marketplace contract | `market.whatthenft.near` |
| Buyback treasury | `buyback.whatthenft.near` |
| Keeper bot account | `keeper.whatthenft.near` (core operator + buyback keeper) |
| DEX | RHEA (`dclv2.ref-labs.near` DCL, `v2.ref-finance.near` v2), wNEAR `wrap.near` |
| Season 01 | MEME GENESIS · 111 supply · **0.3 NEAR** · 30-day lock · WTH + up to 2 partners · on-chain season id **2** |
| Keeper | Railway cron, every 5 minutes |
| Source | public GitHub repo (no secrets tracked) |

**Deployed contract builds** (`contracts/CHECKSUMS.md`):

| Contract | Size | sha256 |
|---|---|---|
| core | 522,493 bytes | `15264715b3d6371cd7116415cabfe31e19ab20dedb15fec966661b2d5f6dab6a` |
| market | 214,734 bytes | `3b26af91b47bf00c4b0f58bc8d2714379532897c71a9f6571b5bad874600a6a5` |
| buyback | 183,926 bytes | `496ce18f62e632f839c00d618687a9bfd37bf64a4d01d89b7c184ceae35d42fe` |

Verify a deployed contract: `near contract download-wasm <account> save-to-file x.wasm network-config mainnet now`, then compare `sha256sum x.wasm` against the table.

---

## 2. The product

### 2.1 Concept

- **Every NFT is a mutant owl.** The base is the WTH owl. Six parts are drawn at random: **head, face, body, arms, legs, outfit**. Each comes from WTH or a partner meme community.
- **The parts decide the bag.** At mint, 85% of the price buys the real meme tokens matching the owl's parts. The NFT contract holds those tokens for the NFT.
- **Locked, but tradable.** The bag is locked for 30 days. The NFT can be sold at any time, and the bag goes with it.
- **Withdraw.** After the lock, the current owner withdraws the exact tokens. The NFT stays as an **EMPTY** collectible (the art keeps living).
- **Reload.** An EMPTY NFT can be refunded with its original token mix in a season that allows reloads, with a new 30-day lock.
- **Rarity is cosmetic.** Common → Mythic changes the frame, never the bag.
- **The WTH flywheel.** WTH gets a guaranteed share of every bag. Treasury income (5% of mints + half of royalties) buys WTH and shares it with WTH holders.

### 2.2 User journey

```
 Mint (pay 0.339 NEAR)
   │  Randomness from a LATER block picks rarity + 6 parts (nobody can choose or re-roll)
   ▼
 Buy the bag  ── contract wraps NEAR → buys each meme token on RHEA (min_out from an on-chain quote)
   │            ── re-reads its own balance → credits only what verifiably arrived
   ▼
 NFT minted   ── only after every token purchase is verified ("no bag, no NFT")
   │
   ├── Trade any time (bag included, lock does NOT restart) ── 3% royalty
   │
   ▼ after 30 days
 Withdraw     ── current owner redeems the exact tokens → NFT becomes EMPTY (art stays)
   │
   ▼
 Reload       ── same token mix, new payment, new 30-day lock (seasons with reloads enabled)
```

If a swap route fails **before** anything is bought, the minter is refunded in full. Partial failures go to a recovery path (retry → unwind → refund), never a silent loss.

---

## 3. Architecture

```
                         ┌──────────────────────────────────────────┐
   Browser               │  nft.whatthehoot.lol  (Next.js on Railway) │
   (wallet-selector) ───►│  pages · /api/quote · /api/nav · /api/status│
        │                └───────────────┬──────────────────────────┘
        │ signs txs                       │ read-only RPC (views, RHEA quotes)
        ▼                                 ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         NEAR mainnet                                    │
 │                                                                         │
 │  core.whatthenft.near ──── wrap / swap / verify ────► RHEA DCL / v2     │
 │   NFT (NEP-171/177/178/181/199)                       wrap.near (wNEAR) │
 │   vault: bags per NFT                                 meme token FTs    │
 │   order engine · seasons · fee tolerance                                │
 │        │ 10% creator ──► whatthenft.near                                │
 │        │  5% treasury ─► buyback.whatthenft.near ──► buys WTH ─► holders│
 │        ▲                                                                │
 │        │ nft_transfer_payout (3% royalty: 1.5% creator / 1.5% treasury) │
 │  market.whatthenft.near (fixed-price listings, this collection only)    │
 └───────────────────────▲────────────────────────────────────────────────┘
                         │ advance_order · set_token_media · set_transfer_fees
                         │ accept_fee_shortfall · buy / start_round / pay / close_round
             ┌───────────┴─────────────┐        ┌────────────────────┐
             │ keeper (Railway cron 5m) │──────►│ Pinata (IPFS pins) │
             │ fees → orders → media →  │        └────────────────────┘
             │ buyback                  │──────► FastNEAR (holder list), CoinGecko + RHEA (NEAR/USD)
             └──────────────────────────┘
```

**Principles:**
- **Everything that holds value is on-chain.** The website and keeper hold no user funds.
- **Permissionless liveness.** Anyone can push a mint forward (`advance_order`). The keeper does it automatically and is reimbursed a small fixed fee from the order's refundable reserve.
- **Verify, don't trust.** Every swap result is checked against the contract's real token balance before it counts.

---

## 4. Repository map

| Path | What |
|---|---|
| `contracts/core` | Rust (near-sdk 5.30.1): NFT + vault + order engine + seasons. Modules: `lib.rs` (admin, seasons, fee tolerance), `order.rs` (mint/legs), `vault.rs` (redeem, reload, unwind, recovery, media), `nft.rs` (standards, royalty payout), `traits.rs` (randomness), `types.rs` |
| `contracts/market` | Rust: fixed-price marketplace for this collection |
| `contracts/buyback` | Rust: WTH buyback treasury + holder payouts |
| `contracts/res/*.wasm` | Deployed builds (gitignored, reproducible in Docker `wtn-build`) |
| `packages/domain` | TypeScript, exact bigint economics: fee splits, allocation, trait derivation (shared test vectors with Rust), NAV, executable minimum, manifest schema |
| `packages/chain` | RPC client (failover), network registry (RHEA accounts, 12 token routes), RHEA quotes, Season 01 draft + price constant |
| `packages/assets` | Art organiser/validator (sharp): manifests, web layers, art registry |
| `apps/web` | Next.js 16 · React 19 · Tailwind 4 · NEAR wallet-selector |
| `apps/keeper` | Keeper bot: fee sync, order runner, NFT images (compose + IPFS), buyback; deploy-plan + token-fees generators |
| `deploy/mainnet` | Generated deploy files, args, season configs, published season manifest, step-by-step commands |
| `deploy/railway` | Railway config-as-code (`web.json`, `keeper.json`) + env templates |
| `video/` | Remotion trailer project (standalone npm workspace) |
| `test-vectors/traits-v1.json` | Cross-language randomness vectors (TS ↔ Rust) |
| `docs/` | This file, DESIGN, RUNBOOK, THREAT_MODEL, FEASIBILITY, GO_LIVE, DEPLOY_RAILWAY, PROJECT_SUMMARY |

---

## 5. Core contract: NFT + vault + order engine

`core.whatthenft.near`. The heart of the system. It is the NFT contract **and** the vault that holds every NFT's tokens.

### 5.1 State (simplified)

| Field | Purpose |
|---|---|
| `owner`, `operators` | Owner (admin) and operators (keeper) |
| `creator_account`, `treasury_account` | Fee recipients (`whatthenft.near`, `buyback.whatthenft.near`) |
| `wrap_near`, `rhea_v2`, `rhea_dcl` | DEX + wNEAR accounts |
| `seasons` | Season configs + status + counters |
| `orders` | Mint/reload orders and their legs |
| `tokens` (NFT standard) + `token_info` | NFT ownership + bag per NFT (holdings, lock, state, traits, media) |
| `accounted[token]`, `wnear_accounted` | What the vault owes, per token (conservation check) |
| `registered` | Tokens the vault is storage-registered on |
| `busy` | Per-token mutex: one swap per token at a time |
| `route_paused`, `mints_paused` | Circuit breakers |
| `tfee:<token>` (raw storage) | Transfer-fee tolerance per token (see §9) |

### 5.2 Mint order lifecycle

```
mint(season_id, base)  [payer attaches base + storage_per_mint + retry_reserve]
   │  checks: season Open, inside window, base within [current_min, max], supply left
   ▼
Escrowed ──(next block)── on_reveal: seed = later block's random_seed → traits (rarity + 6 slots) + legs
   ▼
TraitsAssigned ── wrap basket NEAR → wNEAR (near_deposit)
   ▼
SwapsPending ── per leg:
   │   on_leg_prepared: read vault balance ∧ RHEA quote (joint read, then callback)
   │   min_out = quote × (1 − max_slippage)       (2% per meme in Season 01)
   │   ft_transfer_call(wNEAR → RHEA, Swap{pool, output_token, min_output_amount})
   │   on_leg_swapped → read balance again → on_leg_verified:
   │      used == amount_in  AND  received ≥ min_out × (1 − token transfer fee)  → leg Done
   │      used == 0                                                             → retry (≤3) / refund
   │      anything else                                                         → anomaly, order frozen
   ▼
all legs Done ── internal_finalize: mint NFT to payer, lock 30 days,
                 pay 10% creator + 5% treasury, refund unused retry reserve
   ▼
FullyBackedLocked
```

**Failure states:** `FailedPreExecution → RefundPending → Refunded` (nothing bought: full refund) · `PartialExecutionRecovery` (something bought, something failed: the payer chooses `retry_order` or `unwind_order`; operators can also unwind).

Every step is one `advance_order(order_id)` call. It's permissionless: anyone can call it. Callers other than the payer get `advance_fee` (0.01 NEAR) per started step, taken from the order's `retry_reserve` (0.03 NEAR max). The payer advancing their own order pays nothing.

### 5.3 Randomness and traits (`WTN-TRAITS-v1`)

- **Reveal in a later block.** The mint tx records the order. The reveal uses `env::random_seed()` of a **later** block, so neither the user, the keeper nor the owner can see the outcome when submitting.
- **Deterministic derivation:**
  - `seed32 = sha256("WTN-TRAITS-v1" ‖ random_seed ‖ u64le(order_id))`
  - `draw(l) = u64le(sha256(seed32 ‖ u32le(l))[0..8])`, `pick(l, n) = draw(l) mod n`
- **Rarity:** `pick(0, 10000)` against the season's rarity bps (60/25/10/4/1).
- **Composition:**
  1. Draw up to `max_partners` partner memes by weight.
  2. For each slot, if a partner has art for it, the slot uses that partner unless a `wth_slot_bps` (30%) roll keeps it WTH.
  3. Draw the variant.
- **Viability:** every leg must be ≥ `min_leg` (0.005 NEAR). Non-viable compositions are re-drawn with fresh labels (up to 8 attempts); the final fallback is all-WTH. Nobody can pick among outcomes.
- **Same code, two languages:** the TypeScript implementation (`packages/domain`) and Rust (`contracts/core/src/traits.rs`) are cross-checked by `test-vectors/traits-v1.json`.

### 5.4 Bag allocation

- **WTH core:** 20% of every bag, always.
- **Remaining 80%** split by slot weight to whichever meme provides each slot: head 20% · face 10% · body 25% · arms 10% · legs 10% · outfit 25%. Slots provided by the same meme add up.
- Integer bps with largest-remainder rounding, so shares always sum to exactly 10,000.

Example (mainnet NFT #1, WTH + HOOTERS): HOOTERS provided legs + outfit → 80% × 35% = 28%; WTH 20% core + 52% from the other four slots = **72% / 28%**.

### 5.5 NFT and vault

- **Standards:** NEP-171 (core), 177 (metadata), 178 (approvals), 181 (enumeration), 199 (royalty payouts: `nft_payout`, `nft_transfer_payout`).
- **Card states:** `FullyBackedLocked` → (time) `Unlocked` → `Redeeming` → `RedeemedEmpty` → `Reloading` → `FullyBackedLocked`.
- **`redeem(token_id)`:**
  - only the current owner, only after unlock, 1 yoctoNEAR (forces a full-access key);
  - revokes all marketplace approvals first;
  - sends each token as its own detached transfer with its own callback;
  - a failed transfer (e.g. receiver not registered) restores that claim to the NFT;
  - `token_emptied` fires when everything left.
- **`reload(token_id, season_id, base)`:** EMPTY cards only, owner only; rebuys the original composition (same bps), new lock, no new randomness.
- **`set_token_media(token_id, ipfs://cid, sha256)`:** operator, once per token, content-addressed only.
- **Views:** `nft_basket`, `get_tokens`, `get_tokens_for_owner`, `get_order(s)`, `get_season(s)`, `get_config`, `get_accounted`, `is_registered`, `get_transfer_fee_bps`.

### 5.6 Admin surface

| Method | Who | Effect |
|---|---|---|
| `propose_owner` / `accept_owner` | owner | Two-step ownership transfer |
| `set_operator` | owner | Add/remove operators (keeper) |
| `set_revenue_accounts` | owner | Future fee recipients only |
| `set_mints_paused` | operator | Pause **new** mints/reloads (in-flight orders, transfers, redemptions continue) |
| `set_route_paused` | operator | Pause one token's swap route |
| `register_tokens` | operator | Vault storage registration on FTs (≤10 per call, ≤0.1 NEAR each) |
| `create_season` / `update_season` / `open_season` / `close_season` | operator | Season lifecycle; config frozen at open |
| `set_current_min_base` | operator | Live minimum within the frozen bounds |
| `set_transfer_fees` | operator | Per-token transfer-fee tolerance (≤10%) |
| `accept_fee_shortfall` | operator | Release a leg frozen only by a token's transfer fee |
| `reconcile_anomaly` | operator | Attribute only the vault's unclaimed surplus to an anomaly leg |
| `check_conservation` | anyone | Emits accounted vs. real balance for a token |

**No admin function can move a backed bag.** The only paths that move bag tokens are: the owner's `redeem`, swaps into season-frozen pools with on-chain-quoted `min_out`, and recovery unwinds whose proceeds can only go back to the order's payer.

### 5.7 Two mainnet lessons built into the code

1. **No joint-promise returns.** The NEAR runtime rejects a function that *returns* a combined promise (`a.and(b)`). `register_tokens`, `redeem`, buyback `pay` and `emergency_withdraw` now schedule each transfer as its own detached promise with its own callback. Joint *reads* followed by `.then(...)` (balance ∧ quote) are allowed and unchanged.
2. **Fee-on-transfer tokens.** See §9.

---

## 6. Marketplace contract

`market.whatthenft.near`: fixed-price listings for this collection only.

- **List:** the owner calls core `nft_approve(token_id, market, msg = {"price":"<yocto>"})` (0.01 NEAR covers approval storage). Core calls the market's `nft_on_approve`, which stores the listing. Only the core contract can create listings.
- **Buy:** `buy(token_id)` with deposit ≥ price (~150 Tgas):
  1. The listing is removed first (no double sale).
  2. Core `nft_transfer_payout` moves the NFT and returns the NEP-199 payout.
  3. `on_bought` pays seller, creator and treasury, and refunds any excess.
  4. If the transfer fails, the buyer gets a full refund.
- **Royalty:** 3% of the price → 1.5% creator + 1.5% buyback treasury; the seller gets 97%. Wallet-to-wallet transfers pay nothing.
- **Seller tools:** `delist`, `update_price` (1 yocto); anyone can `remove_stale` (owner changed or approval gone).
- **Views:** `get_listings`, `get_listings_by_owner`, `get_recent_sales` (last 100), `get_stats` (floor, listed, sale count, volume, top sale).
- **Safety:** a redeemed (emptied) NFT has all approvals revoked, so a stale listing can never sell an emptied card as if it were full.

---

## 7. Buyback treasury contract

`buyback.whatthenft.near`: turns treasury income into WTH and shares it with WTH holders.

**Income:** 5% of every mint + 1.5% of every marketplace sale, as plain NEAR.

```
keeper (every 5 min): spendable NEAR worth ≥ THRESHOLD_USD ($3)?
     │  NEAR/USD: RHEA on-chain NEAR→USDC quote + CoinGecko must agree within 10%
     ▼ yes
buy(amount): wrap NEAR → RHEA quote → swap with min_output_amount → credit the WTH that actually arrived → unwrap unused wNEAR
     ▼
snapshot WTH holders: FastNEAR top list → every balance re-read on-chain (ft_balance_of)
     ▼
split pro-rata → publish round JSON (pinned to IPFS)
     ▼
start_round(sha256, total) → pay(≤20 per batch) × N → close_round()
     close reconciles from the real WTH balance: unpaid/failed amounts roll over
```

**Rules:**
- **Who gets paid:** minimum holding 1,000 WTH; payouts under 1 WTH roll over to the next round.
- **Excluded holders:** `dclv2.ref-labs.near`, `v2.ref-finance.near`, `intents.near`, `launchpad.justhoot.near`, the WTH token contract, the buyback account and the keeper. Add more with `EXCLUDE`.

**On-chain limits (set at init):**

| Limit | Value |
|---|---|
| Max slippage | 3% (hard cap 10%) |
| Max spend per buy | 5 NEAR |
| Min time between buys | 1 hour |
| Reserve kept beyond storage | 0.05 NEAR |

**Powers:**
- **Keeper:** can only `buy` (within the limits) and `pay` inside an open round. It can **never** send NEAR.
- **Owner:** can `pause` / `unpause` and change keeper and limits. Only while paused, it can call `emergency_withdraw`, which is logged on-chain.
- **One operation at a time:** a `busy` flag.
- **Unreadable swap result:** the contract auto-pauses.

The WTH token keeps 3% on the DEX → treasury transfer during a buy, so each buy yields about 3% less WTH. The buyback credits only the WTH that actually arrived. Payouts to holders are plain contract → wallet transfers. On mainnet those arrived without a fee (observed on redeem), but the token owner controls this.

---

## 8. Economy

### 8.1 Season 01 price

**Fixed base price: 0.3 NEAR** (`SEASON_01_PRICE_NEAR`). At this price every owl can be WTH + up to 2 partners.

| The minter's wallet attaches | NEAR | What happens to it |
|---|---|---|
| Base | 0.300 | Split 85 / 10 / 5 (below) |
| Storage fee | 0.009 | Pays the NFT's on-chain storage (stays with the contract) |
| Retry reserve | 0.030 | Pays the keeper's `advance_fee` (0.01 per step it runs); the unused part is refunded |
| **Total attached** | **0.339** | plus ~0.003 NEAR network gas for the mint tx |

### 8.2 Mint split (of the base)

| Share | Goes to | Per 0.3 NEAR mint | 111 sold |
|---|---|---|---|
| **85%** | The NFT's meme-token bag (owned by the NFT holder) | 0.255 | 28.305 NEAR |
| **10%** | Creator (`whatthenft.near`), paid only after full funding | 0.030 | 3.33 NEAR |
| **5%** | Buyback treasury, paid only after full funding | 0.015 | 1.665 NEAR |
| **100%** | | **0.300** | **33.3 NEAR** |

Creator and treasury fees are paid **only when the NFT is fully funded**. A refunded mint pays them nothing.

What actually lands in the bag is the 0.255 NEAR spend minus the pool fee (RHEA DCL 1%) and each token's own transfer fee (0–3%, §9). Roughly **82–84% of the base in tokens**.

### 8.3 Marketplace royalty

**3% of every sale**, split **50% creator / 50% buyback treasury** (NEP-199, honoured by any compliant marketplace).
Example from the mainnet test: a 0.05 NEAR sale → seller 0.0485 · creator 0.00075 · treasury 0.00075. The owner was also the seller there, so the payouts were merged as 0.04925 + 0.00075.

### 8.4 Bag rules recap

| Rule | Value |
|---|---|
| WTH core share | 20% of every bag |
| Slot weights (rest 80%) | head 20 · face 10 · body 25 · arms 10 · legs 10 · outfit 25 |
| Partners per owl | < 5 NEAR: up to 2 · ≥ 5 NEAR: up to 3 (Season 01 is fixed at 0.3) |
| Chance a slot stays WTH | 30% (`wth_slot_bps = 3000`) |
| Minimum per token purchase | 0.005 NEAR (smallest Season 01 leg ≈ 0.02 NEAR) |
| Slippage per meme | 2% (`max_slippage_bps = 200`) |
| Lock | 30 days from funding |

### 8.5 Rarity (cosmetic only)

| Tier | Stars | Odds | ≈ of 111 |
|---|---|---|---|
| COMMON | ★ | 60% | 67 |
| RARE | ★★ | 25% | 28 |
| EPIC | ★★★ | 10% | 11 |
| LEGENDARY | ★★★★ | 4% | 4 |
| MYTHIC | ★★★★★ | 1% | ~1 |

Rolled on-chain, independent of the parts; it never changes the bag. The homepage showcase card uses boosted display odds for fun. That is **display only**.

### 8.6 The WTH flywheel

```
mints ──5%──┐
            ├──► buyback treasury ──($3+)──► buy WTH on RHEA ──► pro-rata to WTH holders (≥1,000 WTH)
sales ─1.5%─┘
every bag ──► ≥20% WTH bought at mint (demand on every mint)
```

At sell-out the treasury receives about 1.67 NEAR from mints, plus royalty income from trading. The $3 trigger is set so buybacks actually happen at this scale. There are no promised returns; distributions depend entirely on activity.

### 8.7 Operating costs (owner side)

| Item | NEAR | Nature |
|---|---|---|
| Core account | 5.35 + 0.15 top-up | Mostly locked storage for 522 KB of code (1 NEAR per 100 KB) |
| Market account | 2.2 | Locked storage (215 KB) |
| Buyback account | 1.9 + 0.1 top-up | Locked storage (184 KB) + 0.05 reserve |
| Keeper account | 0.2 | Gas; refilled by `advance_fee` reimbursements |
| **Total committed** | **≈ 9.9** | Storage is a **deposit**, refundable if the contracts are ever deleted |

Gas for user actions is paid by the user's wallet. Gas for keeper steps is reimbursed from each order's retry reserve.

---

## 9. Token transfer fees

**Discovered in the first live mint.** RHEA paid out 29,046 WTH (above `min_out`), but the WTH token kept **3% (871 WTH) as a `transfer_fee`** on the way to the vault, so the vault received 28,174. The contract correctly flagged an anomaly and froze the order instead of minting.

**Live fees** (from each token's `get_config().transfer_fee_pips`, 1,000,000 = 100%; `pnpm --filter @wtn/keeper token-fees`):

| Token | Contract | Fee |
|---|---|---|
| WTH | `wth-0b2227.launchpad.justhoot.near` | 3% |
| HOOTERS | `hooters-f5dd7a.launchpad.justhoot.near` | 3% |
| THREE | `three-de86d6.launchpad.justhoot.near` | 3% |
| MALLACE | `mallace.v2-launchpad.justhoot.near` | 3% |
| IKP | `ikp.v2-launchpad.justhoot.near` | 3% |
| HOODL | `hoodl-95275b.launchpad.justhoot.near` | 2% |
| MOONSHOT | `moonshot.v2-launchpad.justhoot.near` | 2% |
| ROBINHOOT | `robinhoot-2.v2-launchpad.justhoot.near` | 2% |
| RAEN | `raen-e1328c.launchpad.justhoot.near` | 1.5% |
| IMEME | `imeme-2.v2-launchpad.justhoot.near` | 0% |
| NEARKAT | `nearkat-630f25.nearlytrade.near` | 0% (plain NEP-141) |
| BATMAN | `batman-4.nearlytrade.near` | 0% (plain NEP-141) |

**Observed:** the fee applied on the DEX → vault transfer. The vault → owner transfer on redeem arrived in full (no fee event).

**How the system handles it:**

1. **Fee-aware check.** Core stores a per-token tolerance under a raw storage key (no state-layout change), set by an operator, capped at 10%. A swap passes if `received ≥ min_out × (1 − fee)`. The DEX still enforces `min_out` on its own payout.
2. **Unwinds.** Selling a fee token back sizes `min_out` on the post-fee amount the DEX actually receives.
3. **Rescue.** `accept_fee_shortfall(order, leg)` releases a leg that froze only because of the fee. A larger shortfall stays frozen.
4. **Automatic sync.** Every keeper run reads each season token's live fee, calls `set_transfer_fees` if a token owner changed it, and auto-accepts any frozen leg the fee fully explains.

The website says this plainly: most meme tokens take their own 1.5–3% fee on the DEX buy, so the bag lands a little under 85%.

---

## 10. Seasons, manifest and immutability

**Season config** (contract-shaped JSON in `deploy/mainnet/season-01.json`, generated by `pnpm --filter @wtn/keeper deploy-plan`) contains:
- name, window, supply;
- base bounds and minimum leg;
- tiers;
- lock;
- fees, royalty, allocation, rarity, `wth_slot_bps`;
- the 12 memes (token, weight, variants per slot, route, slippage);
- execution reserve;
- `manifest_hash`, `media_base_uri`, `reload_enabled`.

**Validation at create/update:**
- fees sum to 10,000, and the basket share is ≥ 50%;
- royalty ≤ 10%;
- slot weights and rarity each sum to 10,000;
- memes[0] is WTH with art for every slot;
- no duplicate tokens or ids;
- slippage between 1 and 1,000 bps;
- manifest hash is 64 hex characters;
- media base is set.

**Lifecycle:** `create_season` (Draft, editable via `update_season`) → `open_season` → `close_season`.
- **At open:** the vault must already be registered on wNEAR and every season token. The contract then stores `config_hash = sha256(borsh(config))` and freezes the config forever.
- **Afterwards:** the live minimum can only move inside the frozen `[min_base_floor, max_base]` range.

**Published manifest.** `deploy/mainnet/season-01-manifest.json` (public in the repo) lists:
- the collection, season and rules;
- every meme's token, route and slot coverage;
- the **sha256 of every art file**.

Its sha256 `b4b56f4e…a253c1` is stored on-chain in the season and in every NFT's `season_manifest_hash`. Anyone can verify the rules and art never changed.

**Season 01 on-chain** (season id 2; id 1 was the closed test season):

| Field | Value |
|---|---|
| Name | MEME GENESIS |
| Supply | 111 |
| Price | 0.3 NEAR (target = floor = max) |
| Window | open until sold out (end set 10 years out) |
| Lock | 30 days |
| Tiers | 0 → 2 partners · 5 NEAR → 3 |
| Memes | 12 |
| Fees | 8,500 / 1,000 / 500 bps |
| Royalty | 300 bps, 50% creator |

**Draft vs. chain.** `packages/chain/src/seasons.ts` is the off-chain draft the site uses before contracts are connected. Once a season exists, the on-chain config always wins.

---

## 11. Art system

- **12 mintable meme crews:** WTH (base), NEARKAT, HOODL, HOOTERS, THREE, MOONSHOT, RAEN, MALLACE, IKP, ROBINHOOT, IMEME (cybernetic), BATMAN. Art also exists for OYSTER, QUANTUM CAT and INU; they're excluded from Season 01 because their tokens have no usable wNEAR pool.
- **Layers:** each part is a transparent 1254×1254 layer drawn in place on the WTH owl, so stacking layers reproduces the founder's previews exactly.
- **Layer order:** behind parts → body → skin markings (NEAR emblem, pixel-3 tattoo, cybernetic temple and eye) → legs → outfit → arms → head → face.
- **Possible looks:** 17,640 mintable combinations with the 12 routable memes (30,240 with all art). This grows with every new variant.
- **Pipeline:** `pnpm --filter @wtn/assets organize` produces:
  - `assets/memes/<meme>/manifest.json` (file hashes);
  - web WebP layers in `apps/web/public/art`;
  - `apps/web/lib/art-registry.json`.
- **Rendering:**
  - The website renders owls client-side from the layers.
  - The keeper composes the final NFT image (deterministic 1254×1254 PNG on a background tinted from the body meme) using the same order. It pins the image to IPFS via Pinata and records `ipfs://<cid>` + sha256 on-chain. Re-runs produce the same CID.
- **Names:** generated from the actual parts (body = who it is, other parts add a word), e.g. "PIXEL OUTLAW", "CYBORG CHAOS".
- **Rights:** the founder confirmed partner art and name permission on 2026-11-15 (`approvedForMint: true`).

---

## 12. Keeper bot

`apps/keeper`, deployed as a Railway cron (`*/5 * * * *`, `pnpm --filter @wtn/keeper run-all --send`, restart policy Never). One run, in order:

| Step | What it does | Needs |
|---|---|---|
| **0. fees** | Read every season token's live transfer fee → `set_transfer_fees` for changes → `accept_fee_shortfall` for legs frozen only by the fee | `CORE_CONTRACT` |
| **1. orders** | Scan recent orders → `advance_order` each in-progress mint (reveal → wrap → each swap) → `refund_order` stuck refunds → report orders that need a human | `CORE_CONTRACT` |
| **2. media** | For minted NFTs without an image: compose from original layers → pin to Pinata → `set_token_media` | `CORE_CONTRACT`, `PINATA_JWT` |
| **3. buyback** | Price check ($3 trigger, two sources) → `buy` → holder snapshot → `start_round` / `pay` / `close_round`, snapshot pinned to IPFS | `BUYBACK_CONTRACT` |

**Each step fails independently** (logged, run continues). It's a dry run unless `--send`. Secrets come only from the environment (`KEEPER_PRIVATE_KEY`, `PINATA_JWT` sealed in Railway).

**Other keeper tools:**

| Command | What it does |
|---|---|
| `deploy-plan` | Generates every mainnet deploy file and season config |
| `token-fees` | Writes live fees to `deploy/mainnet/args/transfer-fees.json` |
| `media --samples 6` | Renders offline sample owls |
| `preview 1000` | Read-only payout preview for 1,000 WTH |

**Env:**
```
NETWORK=mainnet  RPC_URL=https://rpc.mainnet.fastnear.com
CORE_CONTRACT=core.whatthenft.near  BUYBACK_CONTRACT=buyback.whatthenft.near
KEEPER_ACCOUNT=keeper.whatthenft.near  KEEPER_PRIVATE_KEY=(sealed)  PINATA_JWT=(sealed)
THRESHOLD_USD=3  MIN_HOLDING_WTH=1000  MIN_PAYOUT_WTH=1  EXCLUDE=
```

---

## 13. Website

`apps/web` (Next.js 16, React 19, Tailwind 4, NEAR wallet-selector), on Railway at **nft.whatthehoot.lol**.

### 13.1 Pages

| Page | What it does |
|---|---|
| **Home** | Full-screen comic hero: live supply / price / status strip, "ONE OWL. TOO MANY MEMES.", a 3-card stack whose front card swaps parts every 0.5 s with a glitch, re-rolls funny names and rarity, and shows "powered by MEME" callouts. MINT NOW / HOW IT WORKS. |
| **Mint** | Live season card (minted / supply, status chip), fixed price, **you pay** total, essentials (85% bag, 30-day lock, WTH + N memes), token-fee note, full breakdown from a live RHEA quote, risk checkbox, wallet connect, mint, order tracker with "continue my order", pack-reveal animation. |
| **Marketplace** | Collection header (floor, volume, top sale, listed, owners), search / sort / filters, card grid with BUY, Activity / Holders tabs. **Live** once `NEXT_PUBLIC_MARKET_CONTRACT` is set. |
| **My Collection** | Pokémon-style binder: 111 numbered pockets, page turns, divider tabs (all / mine / locked / unlocked / listed / empty), card pop-out with bag mix, lock countdown, withdraw / sell / reload. Live for a connected wallet; labelled demo cards when no wallet is connected. |
| **NFT detail** | One NFT: art, traits, bag, lock state, valuation, actions. |
| **WTH is this?!** | Animated adventure map: Mint → Real token bag → Trade → Withdraw → Where the money goes → Seasons; owl rider walks as you scroll. |
| **Treasury / Risk / Terms / Status / Admin** | Disclosures, live balances, system health, admin season tools (wallet-signed). |

### 13.2 Hackathon notice

Every **Mint now** button (header, mobile menu, hero, WTH page) and the real mint transaction first show a modal:
- hackathon demo, built by Claude;
- AI security audit by Claude and ChatGPT (not a professional audit firm);
- contracts live on NEAR mainnet with real NEAR and volatile tokens;
- mint at your own risk.

Accepted once per browser session. It's rendered through a portal so animated ancestors can't trap it, and Esc, "Not now" or clicking the backdrop closes it.

### 13.3 Server routes

| Route | Purpose |
|---|---|
| `/api/quote?base=…` | Live mint quote from mainnet RHEA: split, execution reserve, tier, per-meme routes, executability check |
| `/api/nav?h=token:amount,…` | Executable SELL quotes (token → wNEAR) for a bag. Missing quotes are UNAVAILABLE, never zero |
| `/api/status` | Health: RPCs, contract config, every token route, account balances |

**Config (build-time `NEXT_PUBLIC_*`):** `NEXT_PUBLIC_NETWORK=mainnet`, `NEXT_PUBLIC_CORE_CONTRACT`, `NEXT_PUBLIC_MARKET_CONTRACT`, `NEXT_PUBLIC_RPC_URLS`; server: `QUOTE_NETWORK`, `QUOTE_RPC_URLS`.

**Browser RPC fix:** the shared RPC client wraps `fetch`. Calling the native `fetch` as a method of another object throws "Illegal invocation" in browsers (not in Node). Running the production build against mainnet found and fixed this.

### 13.4 Design system

- **Fonts:** Lilita One (display), Outfit (body), Space Mono (numbers).
- **Look:**
  - comic ink outlines and hard offset shadows;
  - palette: ink, cream, orange, sun, aqua, pink, lime, violet;
  - rarity frames: white, aqua, violet, gold gradient, animated rainbow for MYTHIC.
- **Registers:** LOUD comic surfaces for fun, CLEAR finance surfaces for money: tabular numbers, units, sources, no animated amounts.
- **Accessibility:** everything respects `prefers-reduced-motion`. Full spec: `docs/DESIGN.md`.

---

## 14. Deployment

### 14.1 Contracts (owner runs, keys never leave the owner's machine)

The exact commands are in `deploy/mainnet/README.md`, generated for `whatthenft.near`. They use near-cli-rs with `file-args`, so there's no JSON quoting in any shell.

1. **Create accounts** (from `whatthenft.near`): core 5.35, market 2.2, buyback 1.9, keeper 0.2 NEAR (the keeper key is saved to the legacy keychain for Railway).
2. **Deploy with init:**
   - core `new(owner, creator, treasury=buyback, wrap, rhea_v2, rhea_dcl)`;
   - market `new(owner, nft_contract=core)`;
   - buyback `new(owner, keeper, wrap, rhea_dcl, wth, pool, limits)`.
3. **Wire up:**
   - `register_tokens` (wNEAR + 12 tokens, two calls);
   - `set_operator(keeper)`;
   - buyback storage on wNEAR and WTH;
   - `set_transfer_fees`.
4. **Test season** (0.2 NEAR, 10-minute lock, max 2): mint → advance → withdraw → list → buy → pause → close.
5. **Create Season 01** → check the site → `open_season`.

**Updating code in place:** `near contract deploy <account> use-file <wasm> without-init-call …`. State is kept and no new deposit is needed, beyond extra storage if the code grows.

### 14.2 Hosting (Railway)

- **Two services** from the same repo, using config-as-code (paths need the leading slash):
  - **web:** `/deploy/railway/web.json` (build `pnpm --filter @wtn/web build`, start `next start`).
  - **keeper:** `/deploy/railway/keeper.json` (build `pnpm install`, start `run-all --send`, cron every 5 minutes).
- **Domain:** `nft.whatthehoot.lol` → CNAME `nft` to the Railway target (DNS-only).

### 14.3 Reproducible builds

- **Contracts:**
  ```bash
  docker run --rm -v "$PWD:/work" -w /work/contracts/<c> wtn-build cargo near build non-reproducible-wasm --no-abi
  ```
  Compare the result with `contracts/CHECKSUMS.md`.
- **Tests:**

  | Suite | Result |
  |---|---|
  | Core | 19 |
  | Buyback | 14 |
  | Market | 9 |
  | Domain (TS) | 32 |
  | Keeper (TS) | 26 |

  Web and keeper typecheck clean.

---

## 15. Mainnet test evidence

Hidden test season (on-chain season 1, 0.2 NEAR, 10-minute lock), run on **2026-11-15**:

| Test | Result |
|---|---|
| Mint order #1 | 0.239 NEAR attached; traits: WTH + HOOTERS, rarity EPIC |
| WTH leg | 0.1224 wNEAR → RHEA paid 29,046 WTH → vault received **28,174** (token kept 3%) → anomaly → fixed via fee tolerance + `accept_fee_shortfall` |
| HOOTERS leg | 0.0476 wNEAR → **13,375 HOOTERS**, verified with fee tolerance |
| Finalize | NFT #1 minted, `FullyBackedLocked`; creator 0.02, treasury 0.01; retry reserve 0.03 **refunded in full** |
| Pause switch | `set_mints_paused(true/false)` OK |
| Lock | Redeem before unlock rejected ("Token is not unlocked") |
| Withdraw | After 10 min: **28,174 WTH + 13,375 HOOTERS** arrived in full; NFT → `RedeemedEmpty` |
| Market | Listed at 0.05 NEAR; bought by a throwaway wallet; payouts: seller + creator 0.04925, treasury 0.00075 |
| Close | Test season closed (1 minted) |
| NFT image | Keeper composed NFT #1 (WTH owl + HOOTERS bikini), pinned `ipfs://bafybeia5fbaqetgy7unyt24tmkroyaprz3sledd4xfmr3lcdupn6dmlg4q`, set on-chain |
| Website | Production build against mainnet: mint page and marketplace read live data |

Reference transactions (NEAR explorer):
- **Swap with transfer fee:** `F1AeUsbRn32AQ9hYaK27UYKVrtXtGp4RsZHxyGnwZNRM`
- **Redeem:** `EumTFVqnCfCt9qLgSME5hDmY748GGEBaVJ9BQ9DRFnsE`
- **Market buy:** `5nRn92ixEpB7v32VSCYujkAxGyQV4JZXEQ5vV8bGfUtZ`
- **Close test season:** `4haGETbJTmJCPsF6b9zvPdtPWGRVTLLJoB2v8DttF9Vx`

---

## 16. Security model

| Threat | Mitigation |
|---|---|
| Admin/operator steals bags | No function moves bag tokens except the owner's `redeem`, swaps with on-chain-quoted `min_out` into season-frozen pools, and unwinds that only refund the payer |
| Rules changed mid-season | Config frozen at `open_season` (sha256 stored); live minimum only inside the frozen bounds |
| Seller redeems after selling | `redeem` checks the current NFT owner in the same contract |
| Stale listing sells an emptied card | `redeem` / `reload` revoke all approvals; transfers blocked while Redeeming / Reloading |
| Underfunded tradable NFT | NFT minted only when every leg is verified Done |
| Forged callbacks | All callbacks `#[private]`; amounts from `ft_transfer_call` results + real balance deltas, never from caller input |
| Concurrent orders misattributing balances | Per-token mutex; unwind requires no wNEAR operations in flight |
| Sandwich / manipulated quote | `min_out` from an on-chain quote in the same receipt chain; slippage 2% (≤ 10% by validation) |
| Keeper grinding randomness | Reveal uses a later block's seed; deterministic from (seed, order id) |
| Keeper draining reserves | Fee only when a step actually starts, capped by the order's retry reserve |
| Fake token with the same ticker | Full contract ids in the season; duplicates rejected |
| Fee-on-transfer tokens | Per-token tolerance; larger shortfalls freeze the order; keeper syncs live fees |
| Malicious / failing token | Failed redeem transfer restores the claim; rejected swap refunds wNEAR |
| Execution anomaly | Order frozen, mutex kept, wNEAR assumed spent; operator tools can only credit surplus or accept fee-sized shortfalls |
| Metadata substitution | `set_token_media` once only, content-addressed, sha256 required |
| Joint-promise runtime rule | Never returned; each transfer is its own detached promise with a callback |
| Buyback keeper abuse | Keeper can only buy within caps/intervals and pay inside an open round; never sends NEAR |

**Audit status:** AI security audit by Claude and ChatGPT. **No professional audit.** Details: `docs/THREAT_MODEL.md`.

---

## 17. Operations runbook

| Situation | Action |
|---|---|
| Stop new mints now | `set_mints_paused {"paused":true}` on core (owner/operator). In-flight orders, transfers and redeems continue |
| One token's route misbehaves | `set_route_paused {"token":"…","paused":true}` |
| Order stuck in progress | The keeper advances it every 5 min; anyone can call `advance_order {"order_id":"N"}` (250+ Tgas) |
| Order in `PartialExecutionRecovery` | If the shortfall equals the token fee, the keeper auto-accepts it. Otherwise the payer chooses `retry_order` or `unwind_order`; operators can `unwind_order` / `reconcile_anomaly` |
| Token owner changed their fee | The keeper syncs it automatically; manual: `pnpm --filter @wtn/keeper token-fees`, then `set_transfer_fees` with `deploy/mainnet/args/transfer-fees.json` |
| Contract needs a fix | Rebuild in Docker → update `CHECKSUMS.md` → `near contract deploy <acct> use-file … without-init-call` (top up first if the code grows) |
| Buyback misbehaves | Owner `pause` on buyback; `emergency_withdraw` only while paused (logged) |
| Check accounting | `check_conservation {"token":"…"}` or `/api/status` |
| Low keeper gas | Send NEAR to `keeper.whatthenft.near` (reimbursements normally cover it) |
| New season | Edit the draft in `packages/chain/src/seasons.ts` → `deploy-plan` → `register_tokens` for new tokens → `create_season` → `open_season` |

---

## 18. Known limitations and risks

- **No professional audit.** AI review only (Claude + ChatGPT). The contracts were tested on mainnet with small amounts.
- **Meme tokens are volatile** and can go to zero. Bags are locked for 30 days.
- **Token owners control their fees.** A fee increase freezes swaps of that token until the tolerance is updated (automated by the keeper). Fees above 10% would need a contract change.
- **Thin pools.** Buys are small (≈ 0.02–0.18 NEAR per leg), but a pool losing liquidity can make a route fail. Before anything is bought, the mint refunds; after a partial buy, it goes to recovery.
- **Holder distributions look dividend-like.** Get legal review before scaling; the copy never promises returns.
- **Single owner key.** `whatthenft.near` is a plain account. A multisig owner (`propose_owner` / `accept_owner`) is recommended.
- **Keeper key in Railway.** It's a full-access key on an account holding ~0.2 NEAR, and it has operator powers (pause, seasons, fee tolerance, media). It can't move bags.
- **Holder snapshot.** The FastNEAR top list is capped at 100 accounts. Every balance is re-read on-chain.
- **My Collection** shows labelled demo cards until a wallet connects.

---

## 19. Trailer pipeline

`video/`, a Remotion project, 78 s, 1920×1080, 30 fps, mastered to −14 LUFS.

- **Voice:** Chatterbox (MIT, local) built-in male voice, exaggeration 0.85, several takes per line, each checked by local Whisper; Perth watermark kept. WTH is read as "What the Hoot".
- **Music and SFX:** Mixkit (free license; files fetched by script, not committed). "Dirty Thinkin'" enters on the drop, beat-synced cuts, ducking under the voice.
- **Footage:** real recordings of the production site (headless Chrome screencast), including the live Season 01 mint page.
- **Timing:** `video/src/cues.json` holds the voice cues and scene marks. A time map retimes all animations, and the music trim follows the marks.
- **Outputs:**
  - `video/out/what-the-nft-trailer.mp4`
  - `video/out/what-the-nft-trailer-vo.wav`
  - `video/out/what-the-nft-trailer.srt`

Credits and licences: `video/CREDITS.md`; commands: `video/README.md`.

---

## 20. Glossary

| Term | Meaning |
|---|---|
| **Bag** | The meme tokens held by the vault for one NFT |
| **Base** | The mint price before storage fee and reserve (0.3 NEAR in Season 01) |
| **Leg** | One token purchase within a mint (wNEAR → meme token) |
| **min_out** | Minimum output the DEX must pay, from an on-chain quote minus slippage |
| **Transfer-fee tolerance** | Per-token allowance (bps) for tokens that keep a cut of transfers |
| **Retry reserve** | Refundable part of the mint payment that reimburses whoever advances the order |
| **advance_order** | Permissionless call that moves an order one step forward |
| **Keeper** | The bot that advances orders, sets images, syncs fees and runs buybacks |
| **Season manifest** | Published JSON of rules + art hashes; its sha256 is on-chain |
| **EMPTY** | An NFT whose bag was withdrawn; still a collectible, reloadable |
| **RHEA** | NEAR DEX used for all swaps (DCL and v2 pools) |
| **WTH** | WHAT THE HOOT token; ≥20% of every bag, bought back by the treasury |

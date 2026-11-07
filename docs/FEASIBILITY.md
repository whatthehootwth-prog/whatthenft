# Technical feasibility & risk assessment — 2026-11-07

All numbers below come from live, read-only mainnet reads made on 2026-11-07 ≈08:00–08:55 UTC (`pnpm feasibility`, raw data in `docs/feasibility-snapshot.json`). Nothing was signed and no funds moved. Re-run before any season opens: liquidity changes.

## 1. Where WTH actually trades

| Fact | Evidence |
|---|---|
| WTH = `wth-0b2227.launchpad.justhoot.near`, symbol `WTH`, 18 decimals, total supply ≈ 989,979,646.7 WTH | `ft_metadata`, `ft_total_supply` |
| Primary liquidity: Rhea DCL pool `wrap.near\|wth-0b2227.launchpad.justhoot.near\|10000` (1% fee tier), state `Running` | `dclv2.ref-labs.near.get_pool`; also linked from whatthehoot.lol (dexscreener) |
| Rhea classic pool #8915 exists but holds ≈ $1.37 TVL — unusable | `api.rhea.finance/list-top-pools` |
| **NEAR Intents 1Click does NOT support WTH** (`tokenOut is not valid`) | `POST /v0/quote` dry |

**Consequence:** the brief's preferred 1Click execution path cannot buy the core WTH allocation. The vault therefore swaps **directly on Rhea from the contract**, which is also the safer design for NEAR-native assets: the contract itself sets `min_out` from an on-chain quote and credits only its own verified balance delta (no off-chain solver trust, no deposit addresses). 1Click remains the adapter for Milestone C cross-chain assets. The 1Click base URL is `https://1click.chaindefuser.com` (the brief's docs link is correct; `chaindefuse.com` without the "r" does not resolve).

## 2. Candidate NEAR memes (verified by full contract id)

| Meme | Contract | Dec | Rhea route | Pool fee | 1Click |
|---|---|---|---|---|---|
| WTH | wth-0b2227.launchpad.justhoot.near | 18 | DCL 1% | 100 bps | ✗ not listed |
| SHITZU | token.0xshitzu.near | 18 | v2 #4369 | 30 bps | ✓ |
| BLACKDRAGON | blackdragon.tkn.near | 24 | v2 #4276 | 30 bps | ✓ |
| JAMBO | jambo-1679.meme-cooking.near | 18 | v2 #6518 | 10 bps | ✓ |
| KAT (NearKat) | kat.token0.near | 18 | v2 #5391 | 30 bps | ✓ |
| PURGE | purge-558.meme-cooking.near | 18 | v2 #5650 | 10 bps | listed but **"No liquidity available"** on every dry quote, while the Rhea pool quotes fine |

All six passed `ft_metadata` (symbol AND decimals match) and pool-pairing checks. Every token's NEP-145 storage minimum is 0.00125 NEAR (one-time per token for the vault).

## 3. Is 0.1 NEAR executable? — Yes for swaps, but overheads matter

Quotes (wNEAR → token) at the exact leg sizes a 0.1 NEAR mint produces (0.09 basket; WTH ≥ 20% = 0.018; smallest partner slot 8% = 0.0072):

| Size (NEAR) | WTH out | impact | SHITZU out | BLACKDRAGON out | JAMBO out | KAT out |
|---|---|---|---|---|---|---|
| 0.0072 | 1,957.7 | 0 bps | 17.69 | 4,045,289 | 134.1 | 279.9 |
| 0.018 | 4,894.4 | 0 bps | 44.22 | 10,113,203 | 335.3 | 699.8 |
| 0.09 | 24,471.5 | 1 bps | 221.07 | 50,565,360 | 1,676.4 | 3,498.8 |
| 9 | 2,436,103 | 46 bps | 22,078.6 | 5,048,429,447 | 167,411.7 | 348,654.6 |
| 45 | 12,030,976 | 168 bps | 109,814.4 | 25,079,693,664 | 832,516.7 | 1,718,865 |

(Impact excludes the pool fee, which is charged separately and recorded per card.)

- Rhea has **no per-order minimum**; every leg of a 0.1 NEAR mint quotes with ≤1 bps impact.
- The minimum engine (`getExecutableMintMinimum`, min leg 0.005 NEAR, max impact 300 bps) returns **0.1 NEAR executable** for WTH + each of SHITZU / BLACKDRAGON / JAMBO / KAT / PURGE.
- **The real constraint at 0.1 NEAR is fixed execution cost, quoted separately:**
  - NFT + basket storage: **650 bytes = 0.0065 NEAR measured** in `contracts/core` tests (2-leg mint). Draft fee 0.009 NEAR leaves margin for 4 legs.
  - Gas at 0.0001 NEAR/Tgas: mint tx (reveal + wrap) ≈ 0.003 NEAR paid by the minter's wallet; each swap leg is one more ~250 Tgas-attached transaction, typically run by the keeper and reimbursed from a refundable retry reserve (0.01 NEAR per step, 0.03 NEAR max, unused refunded).
  - So a 0.1 NEAR mint attaches 0.139 NEAR and typically nets ≈ 0.1 + 0.009 + 0.02 = ~0.13 NEAR all-in. **Overhead ≈ 25–30% at 0.1 NEAR, ≈ 3% at 1 NEAR.** The 90% backing is never reduced by these costs; they are shown as separate lines.
- Recommendation: keep 0.1 NEAR as the advertised floor (it is genuinely executable) but show the all-in cost prominently; consider promoting 0.5–1 NEAR as the default preset.

## 4. Season sizing

Largest WTH leg probed within 300 bps impact: 45 NEAR. A 50 NEAR season max is therefore safe at today's depth; 111 mints at 0.1–5 NEAR are far below pool capacity. Repeat the probe before opening — the WTH DCL pool is the binding constraint.

## 5. Blockers & honest status (what is NOT done)

| # | Item | Status |
|---|---|---|
| B1 | Testnet has no WTH or partner memes, and no WTH DCL pool. A real testnet E2E needs project-deployed test FTs + Rhea testnet pools (`ref-finance-101.testnet` / DCL testnet). | Needs a funded testnet account (the founder's) — not created by me |
| B2 | Founder art layers not supplied. Production mint must reject missing/placeholder art. | Waiting on assets |
| B3 | Partner artwork / name rights unconfirmed for every partner meme. | `approvedForMint: false` everywhere |
| B4 | Marketplace contract, buyback treasury contract, indexer, keeper bot | Milestone B |
| B5 | Third-party audit; legal review (incl. Malaysia SC digital-asset rules) | Required before mainnet / public launch |
| B6 | Solana via Chain Signatures | Milestone C — labelled COMING SOON |

## 6. Randomness

`env::random_seed()` of a block **after** the payment block (the contract refuses to reveal in the request block and reschedules). The user cannot abort after seeing the outcome (reveal is final in the same receipt that consumes it), the keeper cannot choose the block's seed (it is unknown when the advancing tx is submitted), and non-viable compositions are re-drawn deterministically (no human choice). Residual risk: a block producer could withhold a block — negligible incentive at these sizes, documented in `/risk`. Refunds happen only on external route failure before any swap, which the user cannot trigger, limiting reroll abuse.

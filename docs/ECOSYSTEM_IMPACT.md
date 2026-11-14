# Ecosystem impact

Why WHAT THE NFT?! exists, which problems it addresses for meme communities and collectors, the research behind those problems, and how impact can be measured.

---

## 1. Four problems

### 1. Revenue beyond trading is thin
Meme communities usually fund rewards and development through activity around their token: trading fees, launchpad fee shares, holder reflections. When trading slows, those flows slow with it. Communities benefit from additional, non-speculative reasons for people to acquire and hold their token.

### 2. Collaboration rarely moves tokens
Meme communities collaborate all the time: shared art, cross-posts, joint events. Those efforts build culture, but they rarely produce a measurable purchase of each other's tokens, let alone a recurring one.

### 3. Most NFTs are just pictures
A typical collectible NFT represents artwork and membership. It doesn't hold redeemable assets on-chain or plug into the token economies of the communities it depicts. Its value depends entirely on collector demand for the image.

### 4. Attention is short-lived
Meme-token markets move in sharp waves. Large parts of the market see intense trading followed by rapid decline, with few mechanisms that reward sustained participation.

## 2. Research

We only cite figures we could read at the source, with their scope and limits. None of these figures measure NEAR specifically. We haven't found reliable public data on NEAR meme-token lifespans, so we make no claim about it.

| # | Finding | Publisher & date | Scope / method | Limitation |
|---|---|---|---|---|
| R1 | **68.67%** (12,825,175 of 18,675,645) of Pump.fun tokens recorded their **last trade on the day they were created**; **80.37%** within one day; only **4.55%** still traded after 90+ days. | CoinGecko Research, *The Average Lifespan of Pump.fun Memecoins Is Less Than a Day*, published 23 June 2026 ([link](https://www.coingecko.com/research/publications/average-lifespan-of-pumpfun-tokens)) | Solana, Pump.fun only. Tokens launched 14 Jan 2024 – 18 Jun 2026, via Dune (bonding-curve trade events). Lifespan = calendar days from creation to last Pump.fun bonding-curve trade; tokens with zero trades excluded. | Trading after a token graduates to an external DEX (Raydium, Meteora, PumpSwap) isn't captured, so lifespans are a lower bound. The authors note graduation rates of about 1%. Single platform, single chain. |
| R2 | Total memecoin market cap peaked at **$150.6B (December 2024)** and fell to **$47.2B (November 2025)**, about **−69%**. Average daily memecoin volume rose **767%**, from **$1.1B (2023) to $9.7B (2024)**. | CoinGecko, *State of Memecoins Report 2025*, published 16 Dec 2025, updated 2 May 2026 ([link](https://www.coingecko.com/research/publications/state-of-memecoins-2025)) | Sector-wide memecoin market data compiled by CoinGecko. | The report doesn't publish its methodology or a single data cut-off. Market-wide, not NEAR-specific. Volume and market cap are influenced by a few large tokens. |

**What this supports:** attention in meme markets is concentrated and short-lived (R1), and the sector swings sharply over months (R2). Both point to the value of mechanisms that create **purchases from collecting rather than speculation** and **hold tokens for a fixed period**. That's the gap WHAT THE NFT?! targets.

## 3. How WHAT THE NFT?! responds

| Problem | Mechanism | Status |
|---|---|---|
| Revenue beyond trading | 10% of every mint to the creator and 5% to the WTH treasury; 3% royalty on every resale (half to the treasury) | Live |
| Collaboration that moves tokens | Each mutant combines parts from several communities, and each part buys that community's token at mint | Live: 12 communities in Season 01 |
| NFTs that hold assets | A per-NFT vault holds the purchased tokens; the current owner redeems after unlock; reload refills it | Live (reload contract-ready) |
| Short-lived attention | Purchased tokens are locked 30 days; collecting, trading and seasons give reasons to come back | Live (Season 01) |

We make no claim that buying or locking tokens raises their price. What the mechanism guarantees is verifiable: real purchases, tokens held for a defined period, and transparent fee flows.

## 4. Activity per mint, at Season 01 settings

- **Buying:** about 0.255 NEAR of market buying on RHEA, spread over 2–3 tokens. WTH always gets at least 20%.
- **Holding:** those tokens are held in the vault for at least 30 days.
- **Fees:** 0.03 NEAR to the creator and 0.015 NEAR to the WTH treasury.

Scenario if all 111 sell (illustration only): about 28.3 NEAR of meme-token purchases, at least 5.66 NEAR of WTH, 3.33 NEAR creator revenue and 1.67 NEAR treasury revenue. Royalties add more on every resale. See [ECONOMICS.md](ECONOMICS.md).

## 5. Measuring impact

These metrics can all be computed from on-chain data (core, market and buyback contract views and events):

| Metric | Source |
|---|---|
| NEAR spent per community token (cumulative, per season) | `leg_filled` events / order legs |
| Tokens held in vaults right now, and for how long | `get_tokens` holdings + `lock_until_ns`; `check_conservation` |
| Redemption rate, and time held after unlock | `redeemed` / `token_emptied` events |
| Secondary volume and royalties | market `get_stats`, `sale` events |
| WTH bought and distributed, holders reached | buyback `get_state`, round snapshots on IPFS |
| Number of participating communities | season configs |

**Adoption targets** for the coming seasons (goals, not results):
- sell out each season;
- add new partner communities every season;
- complete the first treasury buyback and holder distribution;
- keep a healthy secondary market, measured in resales per NFT.

## 6. Beyond a single collection

The model is a reusable pattern: **an NFT as a programmable basket of community tokens.** Each season can bring in new communities, new art and different allocation rules, all frozen on-chain at open. The same contracts can support:
- partner-led seasons;
- themed baskets;
- cross-chain tokens via NEAR's cross-chain infrastructure, as planned (see [ROADMAP.md](ROADMAP.md)).

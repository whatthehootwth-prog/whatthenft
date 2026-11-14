# Economics

How value moves through WHAT THE NFT?!: what a mint buys, who receives what, how the WTH treasury works, and how the model sustains itself across seasons. Every parameter is read from the deployed Season 01 configuration (`core.whatthenft.near`, season id 2) and from the contract code.

> Meme tokens are volatile and can fall to zero. Nothing in this document is a promise of price, yield or income.

---

## 1. Season 01 parameters

| Parameter | Value | Where it's enforced |
|---|---|---|
| Supply | 111 | `max_supply` (season config, frozen at open) |
| Base mint price | 0.3 NEAR, fixed | `target_base = min_base_floor = max_base` |
| Split of the base | 85% tokens · 10% creator · 5% treasury | `fees` 8500 / 1000 / 500 bps |
| WTH in every bag | at least 20% | `allocation.core_wth_bps = 2000` |
| Partner tokens | up to 2 per NFT | `tiers` |
| Lock | 30 days from funding | `lock_ns` |
| Marketplace royalty | 3%, half creator / half treasury | `royalty` 300 bps, creator share 5000 bps |
| Rarity | 60 / 25 / 10 / 4 / 1 %, cosmetic only | `rarity_bps` (doesn't affect the bag) |

## 2. What a mint costs, and where it goes

| Item | Amount | Notes |
|---|---|---|
| **Base price** | 0.300 NEAR | Split 85 / 10 / 5 below |
| → meme-token purchases | 0.255 NEAR | Swapped on RHEA into the NFT's vault |
| → creator (`whatthenft.near`) | 0.030 NEAR | Paid only after every swap is verified |
| → WTH treasury (`buyback.whatthenft.near`) | 0.015 NEAR | Paid only after every swap is verified |
| **Storage fee** | 0.009 NEAR | Pays for the NFT's own on-chain storage |
| **Retry reserve** | 0.030 NEAR | Refundable. If the keeper finishes the order, it is reimbursed 0.01 per step it actually performs; the rest returns to the minter. |
| **Wallet attaches** | **0.339 NEAR** | Plus ~0.003 NEAR network gas |

**From NEAR to tokens.** The 0.255 NEAR basket is split into legs, one per token. Each leg's swap passes two deductions:
- **RHEA's 1% pool fee** (all Season 01 routes are 1% DCL pools);
- **the token's own transfer fee:** 3% for WTH, HOOTERS, THREE, MALLACE and IKP; 2% for HOODL, MOONSHOT and ROBINHOOT; 1.5% for RAEN; 0% for NEARKAT, IMEME and BATMAN. Token owners can change these, and the keeper syncs them every run.

The vault books exactly what arrived, measured from the contract's own token balance.

**Real mint (#2, mainnet):** basket 0.255 NEAR → 0.204 NEAR bought **46,522 WTH**, and 0.051 NEAR bought **4,598 THREE**. The reserve was refunded in full because the minter finished the order themselves.

## 3. How the bag is composed

Every NFT has six slots: head, face, body, arms, legs and outfit. The reveal picks which meme community supplies each slot, using a later block's randomness. The bag follows the art:

1. **20% always goes to WTH** (`core_wth_bps`).
2. **The remaining 80%** is split by slot weight: head 20 · face 10 · body 25 · arms 10 · legs 10 · outfit 25 (%). Each slot's share buys the token of the community that supplied it. Where WTH supplies a slot (the bare owl), that share also buys WTH.
3. **Tier rule:** at 0.3 NEAR each NFT carries WTH plus up to 2 partner communities.

The same integer formula runs in the contract and in the website (`packages/domain`). The bag shown before minting matches what the contract buys.

## 4. Three perspectives

**Collectors**
- A one-of-a-kind mutant whose visual parts are also its portfolio.
- Real tokens held in the NFT's vault, verified on-chain.
- Freedom to sell or transfer the NFT at any time (the bag goes with it) or to redeem the tokens after 30 days.
- Optional *reload*: refill an emptied NFT while its season is still open.

**Participating meme communities**
- Each mint that uses a community's parts creates a real market purchase of its token on RHEA.
- Purchased tokens stay in the vault for at least 30 days.
- After that, they stay until the holder chooses to redeem; many holders may keep the NFT intact.

**WHAT THE HOOT?! (WTH)**
- WTH is in every bag (at least 20%).
- 10% creator revenue and 1.5% royalty fund ongoing development.
- 5% of every mint and 1.5% of every resale go to the buyback treasury, which buys WTH and distributes it to eligible holders.

## 5. The WTH treasury: buybacks and holder distributions

The treasury is its own contract, `buyback.whatthenft.near`. The keeper operates it under limits that the contract enforces:

| Rule | Value |
|---|---|
| Trigger | Treasury worth at least $3 (keeper `THRESHOLD_USD`); two independent NEAR/USD prices must agree, from RHEA on-chain and CoinGecko |
| Max per buy | 5 NEAR |
| Min time between buys | 1 hour |
| Slippage cap | 3% against an on-chain quote (hard maximum 10%) |
| Reserve kept | 0.05 NEAR |
| Distribution | Pro-rata to WTH holders with at least 1,000 WTH; payouts under 1 WTH roll over. DEX and launchpad contracts, the WTH token contract, the treasury and the keeper are excluded. |
| Transparency | Each round's snapshot is pinned to IPFS; its hash is stored on-chain; rounds reconcile against the real WTH balance |

The keeper can only buy within those caps and pay inside an open round. It can never send NEAR. The owner can pause the treasury, and can make an emergency withdrawal only while it's paused, which is logged on-chain.

**Status:** deployed and funded by every mint and resale. The first buyback round runs once the treasury reaches the trigger.

## 6. Scenario: Season 01 sells out

*Illustration only, not realised revenue. Based on 111 × 0.3 NEAR.*

| Flow | NEAR |
|---|---|
| Gross base revenue | 33.30 |
| Meme-token purchases (85%) | 28.305 |
| of which WTH, at least (20% of each basket) | 5.661 |
| Creator (10%) | 3.33 |
| WTH treasury (5%) | 1.665 |
| Storage fees (pay for NFT storage, not revenue) | 0.999 |

Secondary trading adds **1.5% to the creator and 1.5% to the treasury** on every resale. For example, 10 NEAR of resales adds 0.15 NEAR to each.

## 7. Operating costs and sustainability

- **Owner side:** about 9.3 NEAR is locked as storage stake for the three contracts (≈921 KB of code plus state). It's a deposit, not an expense, and is recoverable if a contract is ever removed. The keeper needs about 0.3 NEAR of headroom to reserve gas; its actual gas is mostly reimbursed from the orders it completes.
- **Collector side:** each NFT pays its own storage (0.009 NEAR), so growth doesn't create a subsidy burden.
- **Revenue model:**
  - per-season mint fees;
  - an ongoing royalty on all secondary trading;
  - treasury flows that return to the WTH community;
  - new partner communities each season.

Each season's rules are frozen on-chain when it opens, so collectors know the terms can't change after they mint.

## 8. Related

- System reference: [SYSTEM.md](SYSTEM.md) §8 (Economy), §9 (Token transfer fees)
- On-chain values and transactions: [MAINNET_VERIFICATION.md](MAINNET_VERIFICATION.md)
- Impact and research: [ECOSYSTEM_IMPACT.md](ECOSYSTEM_IMPACT.md)

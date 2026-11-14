# Mainnet verification

Everything on this page can be checked independently on NEAR mainnet. Explorer links go to [NearBlocks](https://nearblocks.io). Times are UTC, and amounts are read from the contracts' own views and events.

_Snapshot: 2026-11-14, 21:30 UTC._

---

## 1. Deployed accounts

| Role | Account | Explorer |
|---|---|---|
| Owner + creator revenue | `whatthenft.near` | [view](https://nearblocks.io/address/whatthenft.near) |
| Core: NFT, seasons, orders, vault | `core.whatthenft.near` | [view](https://nearblocks.io/address/core.whatthenft.near) |
| Marketplace | `market.whatthenft.near` | [view](https://nearblocks.io/address/market.whatthenft.near) |
| Buyback treasury | `buyback.whatthenft.near` | [view](https://nearblocks.io/address/buyback.whatthenft.near) |
| Keeper (automation) | `keeper.whatthenft.near` | [view](https://nearblocks.io/address/keeper.whatthenft.near) |
| DEX | RHEA DCL `dclv2.ref-labs.near`, wNEAR `wrap.near` | |

**Deployed contract builds** (sha256 of the WASM; see [`contracts/CHECKSUMS.md`](../contracts/CHECKSUMS.md)):

| Contract | Size | sha256 |
|---|---|---|
| core | 522,493 bytes | `15264715b3d6371cd7116415cabfe31e19ab20dedb15fec966661b2d5f6dab6a` |
| market | 214,734 bytes | `3b26af91b47bf00c4b0f58bc8d2714379532897c71a9f6571b5bad874600a6a5` |
| buyback | 183,926 bytes | `496ce18f62e632f839c00d618687a9bfd37bf64a4d01d89b7c184ceae35d42fe` |

## 2. Season 01 on-chain configuration

Read with `get_season {"season_id":2}` on `core.whatthenft.near`. Season id 1 was the hidden test season.

| Field | Value |
|---|---|
| Name | MEME GENESIS |
| Status | **Open** since 2026-11-14 20:50:59 UTC ([tx](https://nearblocks.io/txns/E8Tu2AsxFE55KrbyCuNULKGGTQH7riXftjdkgbVr7DgG)) |
| Supply | 111 |
| Base price | 0.3 NEAR (`target_base = min_base_floor = max_base`) |
| Fees | basket 8500 · creator 1000 · treasury 500 bps |
| Royalty | 300 bps, creator share 5000 bps |
| Allocation | WTH core 2000 bps; slot weights head 2000 · face 1000 · body 2500 · arms 1000 · legs 1000 · outfit 2500 |
| Rarity odds | 6000 / 2500 / 1000 / 400 / 100 bps (cosmetic) |
| Lock | 30 days |
| Partner tiers | WTH + up to 2 partners (WTH + 3 from 5 NEAR) |
| Per-mint extras | storage 0.009 NEAR · retry reserve 0.03 NEAR · keeper advance fee 0.01 NEAR/step |
| Memes | 12 (WTH + 11 partners), full contract ids |
| Manifest hash | `b4b56f4ead207beb19b966c91bde4305ff06ff4e1887927239a986f351a253c1` = sha256 of [`deploy/mainnet/season-01-manifest.json`](../deploy/mainnet/season-01-manifest.json) |
| Config hash (frozen at open) | `99753cb73dd60485c35ee63f4c0cbedc186f14775f195881f0fc2aa08d8ea534` |

## 3. Deployment and setup transactions

| Step | Transaction |
|---|---|
| Create core / market / buyback / keeper accounts | [core](https://nearblocks.io/txns/DdNz1kHnTkGaLapUvEsbdbgAZVbuvoUGRrm4XhwGxpDK) · [market](https://nearblocks.io/txns/Ggyn3xG5oV87kWFiF5EWW6Bj3FAr6yxcou8CKnxzW66E) · [buyback](https://nearblocks.io/txns/BrL2WPuuSg7vjoBQnHnVqoonzw6ejmAwgUkvNuH6gZfk) · [keeper](https://nearblocks.io/txns/9TeiC3puse29yYrnmmZLwVoEBkHjdX61NMnCMRQvJcc6) |
| Deploy + init core | [GoHqbyf3…](https://nearblocks.io/txns/GoHqbyf3hhywe6UVUL3wBipEzSjVcj82M6CCgaFiH4jN) |
| Deploy + init market | [CKJeeCm1…](https://nearblocks.io/txns/CKJeeCm1V2CB7fgfPe9Pb3fEo4yKyjHgCsaAk9nu9boM) |
| Deploy + init buyback | [8bFReHoR…](https://nearblocks.io/txns/8bFReHoRnfsqttjDub5ZgRFY7gqWmKKnFVzM4izVfdL3) |
| Register core on wNEAR + 12 tokens | [kTLxcV4o…](https://nearblocks.io/txns/kTLxcV4oLEyMWn7s5ovyeptu51qAJxjBYmtnrsjfaNe) · [FCbLsceS…](https://nearblocks.io/txns/FCbLsceSzrHQchEBGymzyvXKXoYBfgsNiQDXp2zjEU9z) |
| Keeper made core operator | [FsJkqSRp…](https://nearblocks.io/txns/FsJkqSRpVg2fsLj3Np9nAQyzXFGnQ1VPEf94c3UhH954) |
| Buyback registered on wNEAR / WTH | [EaeFRDvp…](https://nearblocks.io/txns/EaeFRDvpTkwRfLxv8bb2XZTtf3t8ViAsSToL2CRGLiHA) · [9ACWNUbL…](https://nearblocks.io/txns/9ACWNUbLRAiuo5ayXJVdcZLQn9Vwp7kQ5L2jVtkQAnmF) |
| Contract upgrades in place (§6) | core [Ex1DQyr5…](https://nearblocks.io/txns/Ex1DQyr5Fvto3vHoY4XwM7W95V3YvRshWMPuC3mjuxaH), [E4NsnNPJ…](https://nearblocks.io/txns/E4NsnNPJxrKnTiqEdo6BZPZL3G4djAPNgGsQcjTNRHTc) · buyback [8P6ahv3Z…](https://nearblocks.io/txns/8P6ahv3ZU89q9y4sCLd4mazzYMLPdsYNiT7qTRdWkmKv) |
| Token transfer-fee tolerances set | [D8hTDcJ5…](https://nearblocks.io/txns/D8hTDcJ5C18Pv456bxZQv77D3SMJJC6VPcCCaaKPm8z4) |

## 4. Full lifecycle test: hidden test season (season 1)

The test season used a 0.2 NEAR price and a 10-minute lock, so the whole lifecycle could be checked quickly.

| Step | What happened | Transaction |
|---|---|---|
| Create + open | Test season (max 2) | [create](https://nearblocks.io/txns/59xGL8aQarvadp55rCtqA9LuLCPttqaD2QHQ3FWTiaxr) · [open](https://nearblocks.io/txns/54BY99ZYQZ5EHdAZckA3derNTpBA4iMcJAZLfdSWVubC) |
| Mint order #1 | 0.239 NEAR attached; traits WTH + HOOTERS, rarity EPIC | [mint](https://nearblocks.io/txns/G1o7Lt6H1efJttu4jo8nFgsH4ixwXX1HdUQDNTtKmDCZ) |
| WTH swap | 0.1224 wNEAR → RHEA paid 29,046 WTH; the WTH token kept a 3% transfer fee, so the vault received **28,174 WTH**. The contract flagged the shortfall instead of minting. | [swap](https://nearblocks.io/txns/F1AeUsbRn32AQ9hYaK27UYKVrtXtGp4RsZHxyGnwZNRM) |
| Fee-aware upgrade | Per-token fee tolerance; frozen leg released | [set fees](https://nearblocks.io/txns/D8hTDcJ5C18Pv456bxZQv77D3SMJJC6VPcCCaaKPm8z4) · [accept](https://nearblocks.io/txns/Hqc7Q5Vj1bFdYWsXzys6Ze4aQmnfCd4JczYXsGt8ScdR) |
| HOOTERS swap + finalize | 0.0476 wNEAR → **13,375 HOOTERS**; NFT #1 minted in the same transaction (`leg_filled`, `nft_mint`, `mint_settled`); creator 0.02, treasury 0.01; reserve 0.03 refunded | [swap + mint](https://nearblocks.io/txns/4tojuWrJKLwVEfZam7XUsQknmrhqGUx3hw7XHbxSruht) |
| Lock enforced | Redeem before unlock rejected ("Token is not unlocked") | [rejected](https://nearblocks.io/txns/5E51CBgybtSV3qp1EZzynRWrgQ8APbAVSoy6e7ZY56Je) |
| Pause switch | Mints paused and resumed | [pause](https://nearblocks.io/txns/ATd3guh6PqbMXRTfQBwFKCnW3uzUqPi3vRvhiyMjeWTx) · [resume](https://nearblocks.io/txns/FudGPe4uJrRi7z6Uy8pSkmPcgMNcpbkHc2Rr7Szcdye7) |
| Redemption | **28,174 WTH + 13,375 HOOTERS** sent to the owner in full; NFT → `RedeemedEmpty` | [redeem](https://nearblocks.io/txns/EumTFVqnCfCt9qLgSME5hDmY748GGEBaVJ9BQ9DRFnsE) |
| Listing | NFT #1 listed at 0.05 NEAR | [list](https://nearblocks.io/txns/3gKAhFptFKSKQzbeeX87uDLcTntxo8vM3S9YyoGG6997) |
| Marketplace sale | Buyer paid 0.05 NEAR. Payouts: `whatthenft.near` 0.04925 (97% seller + 1.5% creator), `buyback.whatthenft.near` 0.00075 (1.5%) | [buy](https://nearblocks.io/txns/5nRn92ixEpB7v32VSCYujkAxGyQV4JZXEQ5vV8bGfUtZ) |
| Close | Test season closed with 1 minted | [close](https://nearblocks.io/txns/4haGETbJTmJCPsF6b9zvPdtPWGRVTLLJoB2v8DttF9Vx) |
| Artwork | Keeper composed NFT #1 from the original layers, pinned it to IPFS and recorded it on-chain | [set_token_media](https://nearblocks.io/txns/7tXdzh6tAqSE39hU786s9kRyHmKVoamaRJwPvMHLwX13) |

## 5. Season 01 mints

| Order | Bag (vault received) | Completion | Transactions |
|---|---|---|---|
| #2 → NFT #2 | 0.204 NEAR → **46,522 WTH** · 0.051 NEAR → **4,598 THREE** | Finished by the minter; reserve 0.03 refunded | [mint](https://nearblocks.io/txns/475pFhgQsqNQvMXNjEDzHei23JKiTrHEfUApo5ZMM62q) · [WTH swap](https://nearblocks.io/txns/BjN8ENwmsRomeixni7URQ8ia546Zr9S1mPtiJbkRqebZ) · [THREE swap + mint](https://nearblocks.io/txns/Aro3cpR4ab9D3X3kMvCq4Zyrf9NuRedc2yXJWc4eXxnc) · [image](https://nearblocks.io/txns/EdnNrp5bMtZCyATQYNAunQVfjoUeE3APJ39FrPADQkNq) |
| #3 → NFT #3 | 0.1122 NEAR → **25,583 WTH** · 0.0918 NEAR → **53,122 ROBINHOOT** · 0.051 NEAR → **9,954 HOODL** | Finished automatically by the keeper (2 steps, 0.02 NEAR reimbursed from the reserve, `keeper_paid`) | [HOODL swap + mint by keeper](https://nearblocks.io/txns/DacSN29aVxXWh8DxjigPrPAi8xLGJszafKLy7tberxpn) · [image](https://nearblocks.io/txns/3HtiVqnD4wdMKeTDGisfFQeyjPiHGQfB7fammznFiQUA) |

Each Season 01 mint sent **0.03 NEAR to the creator** and **0.015 NEAR to the WTH treasury**. The marketplace currently shows one live listing: NFT #3 at 2 NEAR ([listing](https://nearblocks.io/txns/Ewx4awiVHSBLS7SDph4BiRXaQmMeN5jbu3tgZe3EDC1j)).

**WTH treasury** (`buyback.get_state`): 0.1418 NEAR spendable, no rounds yet. The keeper buys and distributes once the treasury is worth at least $3 (two independent NEAR/USD prices must agree).

## 6. What mainnet testing changed

Real conditions surfaced three issues that unit tests couldn't. Each was fixed, re-tested and redeployed in place, with no loss of funds:

1. **Joint promises.** The NEAR runtime refuses a function that *returns* a combined promise. Token registration, redemption and buyback payouts now schedule each transfer separately, each with its own callback.
2. **Token transfer fees.** Most Justhoot launchpad tokens take 1.5–3% on DEX transfers. Core now accepts a swap once the received amount covers the DEX minimum minus that token's fee. The keeper syncs live fees every run. Larger shortfalls still freeze the order.
3. **Browser RPC calls.** A client-side `fetch` binding bug blocked contract reads in browsers. It was fixed and verified against the live contracts.

## 7. Verify it yourself

```bash
# Season 01 config and status
near contract call-function as-read-only core.whatthenft.near get_season json-args '{"season_id":2}' network-config mainnet now
# Every NFT with its vault holdings, lock and image
near contract call-function as-read-only core.whatthenft.near get_tokens json-args '{"from_index":0,"limit":50}' network-config mainnet now
# Marketplace stats and recent sales
near contract call-function as-read-only market.whatthenft.near get_stats json-args '{}' network-config mainnet now
# Treasury state
near contract call-function as-read-only buyback.whatthenft.near get_state json-args '{}' network-config mainnet now
# Deployed code matches the published build
near contract download-wasm core.whatthenft.near save-to-file core.wasm network-config mainnet now && sha256sum core.wasm
# Season manifest matches the on-chain hash
sha256sum deploy/mainnet/season-01-manifest.json
```

Live health checks (RPC, routes, contract reads): https://nft.whatthehoot.lol/api/status

## 8. Test suites

| Suite | Tests |
|---|---|
| Core contract (Rust) | 19 |
| Buyback contract (Rust) | 14 |
| Marketplace contract (Rust) | 9 |
| Domain economics + traits (TypeScript) | 32 |
| Keeper (TypeScript) | 26 |
| **Total** | **100** |

Contract tests run in Docker (`cargo test --release` in `contracts/`). TypeScript tests run with `pnpm test`. The security review was AI-assisted (Claude and ChatGPT); no independent professional audit has been done yet.

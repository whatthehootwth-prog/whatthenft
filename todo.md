# TODO

## Founder actions (blocking)

### Accounts & keys (never share keys or seed phrases)
- [ ] Create and fund testnet accounts: core contract, creator, treasury, owner (multisig recommended), keeper
- [ ] Decide mainnet account names: core, creator, buyback treasury, owner multisig, operator, keeper
- [ ] Set up a multisig / DAO as the contract owner (hardware wallet signers)

### Testnet setup
- [ ] Deploy two test FTs (e.g. `wth-test`, `meme-test`)
- [ ] Create wNEAR pools for them on Rhea testnet (`ref-finance-101.testnet`, DCL testnet if available)
- [ ] Send me the testnet token and pool ids so I can fill in `TESTNET.assets` in `packages/chain/src/registry.ts`
- [ ] Deploy `contracts/res/wtn_core.wasm` and fund the contract account with ~5 testnet NEAR for storage
- [ ] Set `NEXT_PUBLIC_CORE_CONTRACT` in `apps/web/.env.local`

### Artwork
- [ ] Drop WTH base + 6 slot layer folders into `assets/memes/wth/` (transparent 1024×1024 PNG/WebP)
- [ ] Drop partner meme layer folders (`assets/memes/<memeId>/`)
- [ ] Get written art/name permission from each partner meme community and record the license reference
- [ ] Confirm which partners join Season 01 (current proposal: SHITZU, BLACKDRAGON, JAMBO, KAT)

### Decisions
- [ ] Confirm season params: 111 supply, 7-day window, 30-day lock, 0.1 NEAR floor, 50 NEAR max
- [ ] Decide the default amount preset (0.1 has ~25–30% overhead; 0.5–1 NEAR is suggested)
- [ ] Confirm the storage fee (0.009 NEAR) and retry reserve (0.03 NEAR, refundable)
- [ ] Decide whether bought-back WTH is held in the treasury (default) or burned later

### Legal & security (before mainnet)
- [ ] Legal review in Malaysia (SC digital assets) and other target markets; geofencing if advised
- [ ] Finalise terms of use with counsel (`/terms` is a draft)
- [ ] Book an independent smart-contract / custody audit
- [ ] Approve the exact mainnet deployment and smoke-test budget (proposed: 3 × 0.1 NEAR mints + execution ≈ 0.42 NEAR + 1 redemption)

## Engineering (next tasks)

### Milestone A — finish
- [ ] Art importer CLI: validate, hash, preview combinations, publish the frozen season manifest
- [ ] Deterministic compositor (Sharp) + IPFS pinning + `set_token_media`
- [ ] Keeper bot (advances orders, retries legs, alerts on anomalies)
- [ ] Reload checkout UI (contract side is done)
- [ ] Testnet end-to-end: mint → transfer → unlock → redeem → empty → reload, logging every tx in `docs/TESTNET_EVIDENCE.md`
- [ ] Reproducible wasm build (`cargo near build reproducible-wasm`) and publish the hash
- [ ] Re-run `pnpm feasibility` before opening the season

### Milestone B
- [ ] Marketplace contract (listings, NEP-199 payout settlement, no double sales)
- [ ] Buyback treasury contract (whitelisted route, slippage/size limits, pause, keeper without withdrawal rights)
- [ ] Indexer + revenue/treasury dashboard
- [ ] Monitoring and alerts (conservation, anomalies, stuck orders, storage headroom)

### Milestone C
- [ ] Solana via Chain Signatures (only after real custody, purchase and redemption tests pass)

## My notes

- [ ] Add "mints left" to the homepage
- [ ] Improve the entire design and make it more colorful
- [ ] Prepare the real collection

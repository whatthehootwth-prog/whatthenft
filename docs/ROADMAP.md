# Roadmap

## Completed

| Milestone | Notes |
|---|---|
| Core NFT + vault contract | Seasons, on-chain randomness, mint orders, RHEA swaps with balance verification, per-NFT vault, lock, redemption, reload, recovery |
| Marketplace contract | Fixed-price listings, royalty payouts, stale-listing protection |
| WTH buyback treasury | Capped buys on RHEA, pro-rata WTH distributions in reconciled rounds, snapshots on IPFS |
| Token transfer-fee support | Per-token tolerance, synced automatically from live token configs |
| Keeper automation | Order completion, artwork, fee sync, buybacks; Railway cron every 5 minutes |
| Art system | 12 meme communities, original layered art, deterministic composition, IPFS pinning |
| Website | Mint with live quotes, marketplace, collection binder, NFT pages, treasury, status, risk |
| Mainnet launch | Contracts deployed; full lifecycle verified: mint, swaps, lock, redemption, resale ([evidence](MAINNET_VERIFICATION.md)) |
| Season 01, MEME GENESIS | 111 mutants at 0.3 NEAR; opened on-chain 2026-11-14 |

## Next

| Item | Status |
|---|---|
| First WTH buyback and holder distribution | Runs automatically once the treasury reaches its $3 trigger |
| Multisig ownership of the contracts | Planned (`propose_owner` / `accept_owner` already in the contract) |
| Independent security audit | Planned before larger seasons |
| Faster mint completion (server-side step right after mint) | Planned |

## Future (planned)

1. **More seasons.** New art, new partner crews, new supply. Each season's rules are frozen on-chain at open.
2. **More meme-community partnerships** on NEAR, with partner-led seasons and themed baskets.
3. **Cross-chain meme tokens** through suitable NEAR cross-chain infrastructure (for example NEAR Intents). Planned, not live; the current version buys NEAR-native tokens on RHEA only.
4. **NFT fusion and cosmetic evolution.** Combine or evolve mutants. Planned.
5. **Richer collecting.** Binder achievements, set bonuses (cosmetic), marketplace offers and search. Planned.

Roadmap items are plans, not commitments. Dates depend on partners, audits and community demand.

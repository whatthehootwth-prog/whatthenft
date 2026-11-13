# WHAT THE NFT?!

**ONE OWL. TOO MANY MEMES.** WTH-themed collectible NFTs on NEAR. Each card owns a segregated basket of real NEAR meme tokens, bought on RHEA by the contract itself, locked 30 days after funding, then redeemable by the current owner.

Status: **Milestone A in progress — nothing deployed, no funds handled.** See `docs/FEASIBILITY.md` for live-quote findings and blockers.

## Repo

| Path | What |
|---|---|
| `contracts/buyback` | Buyback treasury: swaps treasury NEAR → $WTH on RHEA with on-chain-quote slippage limits, then pays $WTH holders pro-rata in reconciled rounds |
| `apps/keeper` | Keeper bot: $20 trigger (two agreeing prices), holder snapshot, exact pro-rata split, dry-run by default |
| `packages/domain` | Exact integer economics: 85/10/5 split, 3% royalty 50/50, slot→token bps allocation, WTN-TRAITS-v1 deterministic traits, executable-minimum engine, order state machine, manifest schemas, NAV. 31 tests. |
| `packages/chain` | NEAR RPC (failover), verified asset/route registry, RHEA quotes, 1Click client, feasibility probe, Season 01 draft. |
| `contracts/core` | `wtn-core` (Rust, near-sdk 5.30): NEP-171/177/178/181/199 + seasons + mint orchestrator + per-NFT vault ledger + redemption/reload/recovery. 17 tests incl. cross-language trait vectors. |
| `apps/web` | Next.js 16 app: `/`, `/hatch`, `/collection`, `/market`, `/nft/[id]`, `/my-nfts`, `/treasury`, `/status`, `/faq`, `/risk`, `/terms`, `/admin`. |
| `test-vectors/` | Shared TS↔Rust trait derivation vectors. |
| `docs/` | `FEASIBILITY.md`, `DESIGN.md`, `THREAT_MODEL.md`, `RUNBOOK.md`, `feasibility-snapshot.json`. |
| `assets/memes/` | Drop founder art here (see `assets/README.md`). |

## Commands

```bash
pnpm install
pnpm test            # TS unit tests
pnpm typecheck
pnpm feasibility     # live mainnet quotes, read-only
pnpm dev             # web on http://localhost:3110 (copy apps/web/.env.example → .env.local)
```
Contracts: see `docs/RUNBOOK.md` (Docker build; Windows hosts lack a C toolchain for near-sdk unit tests).

## Non-negotiables enforced in code

No NFT before every swap is verified · no admin withdrawal of baskets · season config frozen at open · redemption only by current owner after unlock · approvals revoked on redeem · every number in the UI is live or labelled UNAVAILABLE · no sample/fake data anywhere.

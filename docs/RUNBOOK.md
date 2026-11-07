# Runbook — build, deploy, operate, recover

> Mainnet deployment, permission changes and any live-funds smoke test require the founder's explicit approval of the exact accounts, wasm hash and budget. Nothing in this repo does it automatically.

## Failure policy (implemented in contracts/core)

| Situation | State | What happens | Who can act |
|---|---|---|---|
| Quote missing/zero, balance read fails, DEX rejects (min_out) | leg `Failed`, order stays `SwapsPending` | retried up to 3 attempts per leg via `advance_order` | anyone (keeper reimbursed from retry reserve; payer free) |
| All attempts fail and **no** leg executed | `FailedPreExecution → RefundPending → Refunded` | unwrap wNEAR, refund base + storage fee + unused reserve | automatic; `refund_order` retry if unwrap fails |
| Some legs executed, another exhausted | `PartialExecutionRecovery` | no NFT; payer chooses `retry_order` (re-arms failed legs) or `unwind_order` (sell executed legs to wNEAR at on-chain-quoted min_out, refund what was actually recovered + unspent + fees + unused reserve; loss recorded in `leg_unwound`) | payer (unwind also operator) |
| Swap used funds but result unverifiable / below min_out | `PartialExecutionRecovery` + `execution_anomaly` event, token mutex held | operator runs `reconcile_anomaly` (credits only vault surplus to that leg), then continue or unwind | operator |
| Mints paused | new `mint`/`reload` rejected | in-flight orders, transfers, redemption continue | operator |
| Route paused | legs on that token wait | resume, or recovery per above | operator |
| Redemption transfer fails (receiver unregistered) | claim restored to card, `redeem_failed` | owner registers storage and retries | owner |
| RPC/indexer down | UI shows UNAVAILABLE and disables new trades | custody unaffected | — |
| User closes browser | order continues on-chain; `/my-nfts` shows real status | keeper or user `advance_order` | anyone |

## Build

```bash
pnpm install
pnpm test                      # domain (31 tests) + chain
pnpm feasibility               # live read-only quotes → docs/feasibility-snapshot.json
docker build -t wtn-build -f contracts/Dockerfile.build contracts
docker run --rm -v "$PWD:/work" -v wtn-cargo-registry:/usr/local/cargo/registry -w /work/contracts rust:1.99 cargo test -p wtn-core
docker run --rm -v "$PWD:/work" -w /work/contracts/core wtn-build cargo near build non-reproducible-wasm --no-abi
```
Before mainnet use `cargo near build reproducible-wasm` and publish the sha256.

## Testnet deployment (Milestone A acceptance)

1. Founder creates/funds testnet accounts (never paste keys into chat): `wtn-core.<you>.testnet`, `wtn-creator.<you>.testnet`, `wtn-treasury.<you>.testnet`, an owner (multisig recommended), a keeper.
2. Deploy two test FTs (`wth-test`, `meme-test`) and create wNEAR pools on Rhea testnet (`ref-finance-101.testnet`; DCL testnet if available) — write the ids into `packages/chain/src/registry.ts` `TESTNET.assets`.
3. Deploy core: `near contract deploy wtn-core.<you>.testnet use-file contracts/res/wtn_core.wasm with-init-call new json-args '{"owner":"…","creator_account":"…","treasury_account":"…","wrap_near":"wrap.testnet","rhea_v2":"ref-finance-101.testnet","rhea_dcl":"<dcl testnet>"}' …`
4. Fund the contract account for storage (≈5 NEAR testnet) and run `register_tokens` for wrap + both test FTs.
5. Import art (`assets/memes/*`), publish season manifest, `create_season` (admin page or CLI), `open_season`.
6. E2E: mint 0.1 → keeper advances legs → NFT → transfer → (wait lock or use a short-lock test season) → redeem → EMPTY → reload. Record every tx hash in `docs/TESTNET_EVIDENCE.md`.
7. Set `NEXT_PUBLIC_CORE_CONTRACT` and re-run `/status` (conservation must be OK for every token).

## Mainnet (only after approval, audit and legal review)

Same as testnet with `wrap.near`, `v2.ref-finance.near`, `dclv2.ref-labs.near`, mainnet registry ids, owner = multisig, operator = separate hot key with no owner rights, keeper = separate account. Smoke test budget proposal: 3 mints × 0.1 NEAR + execution (~0.42 NEAR) + 1 redemption, approved explicitly beforehand.

## Monitoring & alerts (to wire in Milestone B worker)

- Every 5 min: `check_conservation` per token (or `/api/status`); alert on `conservation_violation` / `unknown`.
- Watch events: `execution_anomaly`, `order_partial_recovery`, `leg_failed` attempt 3, `redeem_failed`, orders in `SwapsPending` > 10 min.
- Contract account NEAR balance (storage headroom) < 2 NEAR → alert.
- Route health: `/api/status` Rhea checks; auto-raise `set_current_min_base` or pause route when impact > ceiling.

## Incident playbook

1. `set_mints_paused(true)` (stops new risk; redemptions continue).
2. If a token/pool is compromised: `set_route_paused(token, true)`.
3. Snapshot affected orders (`get_orders`), conservation per token, events since last good block.
4. Resolve anomalies with `reconcile_anomaly`; guide payers to `retry_order` / `unwind_order`.
5. Post status on `/status` and socials with tx links. Never promise outcomes not yet on-chain.
6. Contract upgrade path: owner multisig redeploy with state migration reviewed by auditor; there is intentionally no admin "rescue funds" function.

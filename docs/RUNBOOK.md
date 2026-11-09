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

## Buyback treasury + $WTH holder distribution

**What it is.** `contracts/buyback` is the buyback treasury account. Point the core contract's
`treasury_account` at it (`set_revenue_accounts`), so it receives the 5% mint share and the
treasury half of the 3% royalty as plain NEAR. `apps/keeper` is a small bot that presses its buttons.

**Flow.** When spendable NEAR is worth ≥ $20 (Rhea on-chain NEAR/USDC quote and CoinGecko must
agree within 10%), the keeper calls `buy(amount)`: the contract wraps NEAR, takes an on-chain
Rhea quote, swaps with `min_out = quote × (1 − max_slippage)`, credits only the WTH that verifiably
arrived, and unwraps unused wNEAR. The keeper then snapshots $WTH holders (FastNEAR top list,
every balance re-read on-chain), splits the WTH pro-rata, writes `apps/keeper/rounds/<net>-round-N.json`,
and calls `start_round(sha256, total)` → `pay(batch of ≤20)` × N → `close_round()`. Close reconciles
from the real WTH balance, so failed or unpaid amounts roll over.

**Rules (defaults).** Min holding 1,000 WTH · min payout 1 WTH (smaller amounts roll over) · excluded:
`dclv2.ref-labs.near`, `v2.ref-finance.near`, `intents.near`, `launchpad.justhoot.near`, the WTH
token contract, the buyback account and the keeper. Add more with `EXCLUDE=a.near,b.near`.

**Contract limits.** Keeper can only buy (capped per buy, rate limited, slippage ≤ 10% hard cap) and pay
inside an open round; it can never send NEAR. One operation at a time. Owner (use a multisig) can
pause, change keeper/limits and — only while paused — `emergency_withdraw` (logged on-chain).
An unverifiable swap auto-pauses the contract.

**Deploy (testnet first; mainnet only with explicit approval of account names + budget).**
```bash
docker run --rm -v "$PWD:/work" -w /work/contracts/buyback wtn-build cargo near build non-reproducible-wasm --no-abi
near contract deploy <buyback>.testnet use-file contracts/target/near/wtn_buyback/wtn_buyback.wasm \
  with-init-call new json-args '{"owner":"<owner>","keeper":"<keeper>","wrap_near":"wrap.testnet",
  "rhea_dcl":"dclv2.ref-dev.testnet","wth":"<test-wth>.testnet","pool_id":"wrap.testnet|<test-wth>.testnet|10000",
  "limits":{"max_slippage_bps":300,"max_spend_per_buy":"10000000000000000000000000",
  "min_buy_interval_ns":"3600000000000","reserve":"1000000000000000000000000"}}' \
  prepaid-gas '100 Tgas' attached-deposit '0 NEAR' network-config testnet
```

**Run the keeper.** Secrets come from the environment only — never commit them.
```bash
# read-only preview of how 1,000 WTH would be split across today's holders (mainnet data)
pnpm --filter @wtn/keeper preview 1000
# dry run against a deployed buyback contract (sends nothing)
NETWORK=testnet BUYBACK_CONTRACT=<buyback>.testnet WTH_TOKEN=<test-wth>.testnet TEST_NEAR_USD=3.6 pnpm --filter @wtn/keeper buyback --distribute
# live, every 5 minutes
NETWORK=testnet BUYBACK_CONTRACT=... WTH_TOKEN=... KEEPER_ACCOUNT=<keeper>.testnet KEEPER_PRIVATE_KEY=ed25519:... \
  pnpm --filter @wtn/keeper buyback --send --watch 5
```
`TEST_NEAR_USD` is refused on mainnet. Publish every `rounds/*-round-N.json` (its sha256 is on-chain).

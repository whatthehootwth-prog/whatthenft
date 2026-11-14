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
2. Deploy two test FTs (`wth-test`, `meme-test`) and create wNEAR pools on RHEA testnet (`ref-finance-101.testnet`; DCL testnet if available) — write the ids into `packages/chain/src/registry.ts` `TESTNET.assets`.
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
- Route health: `/api/status` RHEA checks; auto-raise `set_current_min_base` or pause route when impact > ceiling.

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

**Flow.** When spendable NEAR is worth ≥ $20 (RHEA on-chain NEAR/USDC quote and CoinGecko must
agree within 10%), the keeper calls `buy(amount)`: the contract wraps NEAR, takes an on-chain
RHEA quote, swaps with `min_out = quote × (1 − max_slippage)`, credits only the WTH that verifiably
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

## Marketplace (`contracts/market`)

Fixed-price listings for the WHAT THE NFT?! collection only.
- **List:** owner calls core `nft_approve(token_id, <market>, msg = {"price":"<yocto>"})` (site attaches 0.01 NEAR for approval storage) → `nft_on_approve` stores the listing.
- **Buy:** `buy(token_id)` with deposit ≥ price, ~150 Tgas. Listing is removed first (no double sale) → core `nft_transfer_payout` → `on_bought` pays seller / creator / buyback treasury (3% royalty, 50/50) and refunds any excess. Transfer failure → full refund.
- **Delist / update_price:** seller, 1 yoctoNEAR. **remove_stale:** anyone (owner changed or approval gone).
- **Views:** `get_listings`, `get_listings_by_owner`, `get_recent_sales` (last 100, used by the Activity tab), `get_stats`.
- Only the core contract can create listings (max 111 tokens → bounded storage; fund the account with ~1 NEAR).

```bash
docker run --rm -v "$PWD:/work" -w /work/contracts/market wtn-build cargo near build non-reproducible-wasm --no-abi
near contract deploy <market>.near use-file contracts/target/near/wtn_market/wtn_market.wasm \
  with-init-call new json-args '{"owner":"<owner>","nft_contract":"<core>.near"}' \
  prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config mainnet
```
Then set `NEXT_PUBLIC_MARKET_CONTRACT=<market>.near` — the Marketplace and My Collection pages switch from demo data to live data automatically (both env vars required).

**Season 01 pricing:** fixed 0.3 NEAR per mint (`SEASON_01_PRICE_NEAR`, `targetBase = maxBase`), and the tier table gives every owl WTH + up to 2 partner memes. Most meme tokens take their own 1.5–3% fee on DEX transfers; core tolerates it per token (`set_transfer_fees`, synced by the keeper every run). The season stays open until all 111 are minted (`mintWindowDays = 3650`; the contract requires an end date); the owner can still pause minting.

## NFT images (compose → IPFS → on-chain)

`apps/keeper` composes each minted NFT's image from the ORIGINAL art layers, in exactly the
website's order (behind → body → skin markings → legs → outfit → arms → head → face), on a
background tinted from the body meme. Output is a deterministic 1254×1254 PNG (≈0.8–1.4 MB), so
re-runs always produce the same IPFS CID. It is pinned with **Pinata** and recorded on-chain via
`core.set_token_media(token_id, "ipfs://<cid>", sha256)` — media is immutable once set.

Setup: create a Pinata account → API key (JWT) → store as `PINATA_JWT` in Railway (never in git or chat).
Make the keeper an operator on core: `set_operator(<keeper>, true)` from the owner account.

```bash
pnpm --filter @wtn/keeper media --samples 6        # render random owls to apps/keeper/samples/ (offline)
CORE_CONTRACT=<core> pnpm --filter @wtn/keeper media     # dry run for minted tokens without an image
CORE_CONTRACT=<core> PINATA_JWT=... KEEPER_ACCOUNT=... KEEPER_PRIVATE_KEY=... pnpm --filter @wtn/keeper media --send
```
Skin markings (NEAR emblem, pixel-3 tattoo, cybernetic shell + eye) are flagged `skin: true` in
`packages/assets/src/catalog.ts`; both the website and the compositor read that flag from the art registry.

## Order runner + the all-in-one keeper run

Each mint moves one step per permissionless `advance_order` call (reveal → wrap → one swap per
token → NFT minted). The keeper's order runner scans recent orders and steps each in-progress one
until it's done (max 6 steps per run; it stops early if nothing moves, e.g. a token busy with
another order). Orders updated in the last 20 s are left to the minter's page, which polls every
3 s and offers **Continue my order**. `RefundPending` orders get `refund_order`; orders in
`PartialExecutionRecovery` / `FailedPreExecution` are reported for a human.
The keeper is reimbursed `advance_fee` from the order's retry reserve (unused reserve is refunded).

**Railway cron (every 1–2 minutes):**
```bash
pnpm --filter @wtn/keeper run-all --send
```
Runs, in order: orders → NFT images → WTH buyback; each part is skipped when its env vars are
missing. Env: `NETWORK`, `CORE_CONTRACT`, `BUYBACK_CONTRACT`, `KEEPER_ACCOUNT`, `KEEPER_PRIVATE_KEY`,
`PINATA_JWT`, optional `RPC_URL`, plus the buyback settings above.

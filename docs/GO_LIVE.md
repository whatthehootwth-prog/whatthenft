# Go live — step by step

Hosting: **Railway** (website + keeper cron). Chain: **NEAR mainnet**.
Plan: test everything on **Contract A** (throwaway accounts, real money, tiny) → clean up → deploy the same code to **Contract B** (real accounts).

> 🔐 Keys and seed phrases stay with you. Never paste them in chat. Commands that need a key are run **by you** on your machine (near-cli stores keys in your OS keychain).

---

## Phase 0 — Decisions & prep (you)

- [ ] **Meme tokens for Season 01.** Either send the exact NEAR token contract for each meme, or choose **WTH + NEARKAT only** for Season 01 (safest; more memes in Season 2).
- [ ] **Account names** — pick a root you control, e.g. `whatthenft.near`:

| Role | Contract A (test) | Contract B (real) |
|---|---|---|
| Core (NFT + bags) | `t1.whatthenft.near` | `whatthenft.near` (or `core.whatthenft.near`) |
| Marketplace | `t1-market.whatthenft.near` | `market.whatthenft.near` |
| Buyback treasury | `t1-buyback.whatthenft.near` | `buyback.whatthenft.near` |
| Creator (your income) | your wallet | your wallet |
| Owner (admin) | your wallet | **multisig** recommended |
| Keeper (bot) | `keeper.whatthenft.near` | same |

- [ ] **Funding** (approx.): A ≈ 10 NEAR storage (mostly returned on cleanup) + ~4 NEAR for test mints/trades · B ≈ 6–7 core + 1 market + 2–3 buyback · keeper ≈ 1 NEAR.
- [ ] Install near-cli-rs: `npm i -g near-cli-rs` (or see near.cli.rs). Log in: `near account import-account using-web-wallet network-config mainnet`.
- [ ] Railway account + your domain ready.

## Phase 1 — Final build work (Claude)

- [ ] Season 01 config with the chosen tokens (verify each token + RHEA pool on-chain)
- [ ] Rebuild core WASM (5 tiers · 85/10/5 · 3% royalty 50/50 · fixed 1 NEAR) + checksums for core / market / buyback
- [ ] NFT image compositor + IPFS pinning (`set_token_media`)
- [ ] Order runner (keeper advances stuck mints; mint page "continue" button)
- [ ] Keeper as a Railway cron service (buyback + order runner), dry-run by default
- [ ] Railway config for the website; env-var template; production build check
- [ ] Remove leftover demo-only bits for production (demo labels hide automatically once contracts are set)

## Phase 2 — Contract A: live test with real money

1. **Create A accounts** (you run; each funds itself from your root):
   ```bash
   near account create-account fund-myself t1.whatthenft.near '7 NEAR' autogenerate-new-keypair save-to-keychain sign-as whatthenft.near network-config mainnet sign-with-keychain send
   ```
   (repeat for `t1-market` ~1 NEAR, `t1-buyback` ~3 NEAR, `keeper` ~1 NEAR)
2. **Deploy + init** core, market, buyback on A — exact commands generated in Phase 1 (season uses a **10-minute lock** for testing).
3. **Point core's treasury at the buyback account**, register tokens, create + open the test season.
4. **Railway preview service** pointed at A (private URL, not your domain).
5. **Test checklist** (real money, small):
   - [ ] Mint 2–3 NFTs (1 NEAR each) → all complete, images show, bags hold real tokens
   - [ ] Creator receives 10%, buyback receives 5%
   - [ ] List one NFT → buy it from a 2nd wallet → seller 97% / creator 1.5% / treasury 1.5%
   - [ ] After the 10-min lock: withdraw a bag → tokens arrive → NFT shows EMPTY
   - [ ] Keeper dry-run, then one live buyback round (top up treasury to ≥ $20 if needed) → WTH paid to holders, snapshot published
   - [ ] Pause / unpause works on core, market, buyback
6. Fix anything → redeploy A → repeat until clean.

## Phase 3 — Clean up A

- [ ] Withdraw every bag to your wallet; `emergency_withdraw` any test buyback funds (pause first)
- [ ] Delete A accounts (storage NEAR returns to the beneficiary):
   ```bash
   near account delete-account t1.whatthenft.near beneficiary whatthenft.near network-config mainnet sign-with-keychain send
   ```

## Phase 4 — Contract B: real launch (each step with your explicit OK)

- [ ] Deploy the **same tested WASMs** (compare checksums) to B accounts; init owner = multisig
- [ ] Core treasury → `buyback.whatthenft.near`; register tokens; create Season 01 (**30-day lock**, fixed 1 NEAR, open until sold out) — not opened yet
- [ ] Railway production: set env vars (`NEXT_PUBLIC_NETWORK=mainnet`, `NEXT_PUBLIC_CORE_CONTRACT`, `NEXT_PUBLIC_MARKET_CONTRACT`, …), deploy, point your domain
- [ ] Final review on the live domain
- [ ] **Open Season 01** → start the keeper cron (live)
- [ ] Watch the first mints closely; pause switches ready

## Phase 5 — Submission

- [ ] Demo video (home → mint → reveal → bag → marketplace → My Collection → WTH page)
- [ ] README + X posts (source: `docs/PROJECT_SUMMARY.md`)
- [ ] Submit

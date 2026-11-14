# Mainnet deploy: whatthenft.near (minimal NEAR)

You run every command yourself, from the project folder in **Git Bash**. Your keys stay in near-cli's keychain on your machine; nothing secret goes in chat or in git. All arguments come from files in this folder (`file-args`), so there's nothing to quote or edit.

| Account | Role | Funded with |
|---|---|---|
| `whatthenft.near` | owner + creator (gets the 10% mint fee) | your 11 NEAR |
| `core.whatthenft.near` | NFT + bags contract | 5.35 NEAR (≈5.2 locked for storage) |
| `market.whatthenft.near` | marketplace contract | 2.2 NEAR (≈2.15 locked) |
| `buyback.whatthenft.near` | WTH buyback treasury (gets the 5%) | 1.9 NEAR (≈1.85 locked) |
| `keeper.whatthenft.near` | bot: advances mints, sets images, runs buybacks | 0.2 NEAR (gas) |
| `buyer.whatthenft.near` | throwaway second wallet for the market test | 0.1 NEAR |

**Budget:** 9.75 NEAR goes into the accounts. The test mint costs about 0.24 NEAR (0.02 comes straight back as the creator fee, and the unused reserve is refunded). Gas totals under 0.1 NEAR. That leaves roughly 1 NEAR spare in `whatthenft.near`.

Contract files: `contracts/res/*.wasm`. Check them first; the hashes must match `contracts/CHECKSUMS.md`:
```bash
sha256sum contracts/res/*.wasm
```

---

## 1. Create the accounts
```bash
near account create-account fund-myself core.whatthenft.near '5.35 NEAR' autogenerate-new-keypair save-to-keychain sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near account create-account fund-myself market.whatthenft.near '2.2 NEAR' autogenerate-new-keypair save-to-keychain sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near account create-account fund-myself buyback.whatthenft.near '1.9 NEAR' autogenerate-new-keypair save-to-keychain sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
The keeper key is saved as a file (`~/.near-credentials/mainnet/keeper.whatthenft.near.json`) so you can copy it into Railway later:
```bash
near account create-account fund-myself keeper.whatthenft.near '0.2 NEAR' autogenerate-new-keypair save-to-legacy-keychain sign-as whatthenft.near network-config mainnet sign-with-keychain send
```

## 2. Deploy the three contracts (with init)
```bash
near contract deploy core.whatthenft.near use-file contracts/res/wtn_core.wasm with-init-call new file-args deploy/mainnet/core-init.json prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config mainnet sign-with-keychain send
```
```bash
near contract deploy market.whatthenft.near use-file contracts/res/wtn_market.wasm with-init-call new file-args deploy/mainnet/market-init.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' network-config mainnet sign-with-keychain send
```
```bash
near contract deploy buyback.whatthenft.near use-file contracts/res/wtn_buyback.wasm with-init-call new file-args deploy/mainnet/buyback-init.json prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' network-config mainnet sign-with-keychain send
```

## 3. Wire it up (signed by whatthenft.near, the owner)
Register core on wNEAR + the 12 meme tokens. Core pays 0.00125 NEAR each from its own balance:
```bash
near contract call-function as-transaction core.whatthenft.near register_tokens file-args deploy/mainnet/register-a.json prepaid-gas '300.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near contract call-function as-transaction core.whatthenft.near register_tokens file-args deploy/mainnet/register-b.json prepaid-gas '300.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
Make the keeper an operator (needed to set NFT images):
```bash
near contract call-function as-transaction core.whatthenft.near set_operator file-args deploy/mainnet/args/set-operator-keeper.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
Register the buyback treasury on wNEAR and WTH, so it can swap and hold WTH:
```bash
near contract call-function as-transaction wrap.near storage_deposit file-args deploy/mainnet/args/storage-buyback.json prepaid-gas '30.0 Tgas' attached-deposit '0.00125 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near contract call-function as-transaction wth-0b2227.launchpad.justhoot.near storage_deposit file-args deploy/mainnet/args/storage-buyback.json prepaid-gas '30.0 Tgas' attached-deposit '0.00125 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```

## 4. Cheap live test: hidden test season (0.2 NEAR, 10-minute lock, max 2)
Create it (it becomes season **1**) and open it:
```bash
near contract call-function as-transaction core.whatthenft.near create_season file-args deploy/mainnet/season-test.json prepaid-gas '50.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near contract call-function as-transaction core.whatthenft.near open_season file-args deploy/mainnet/args/season-1.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
**Mint one.** The deposit is 0.2 base + 0.009 storage + 0.03 refundable retry reserve:
```bash
near contract call-function as-transaction core.whatthenft.near mint file-args deploy/mainnet/args/mint-test.json prepaid-gas '300.0 Tgas' attached-deposit '0.239 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
**Push the order through.** Wait about 5 seconds, then run this; repeat it until the order shows `FullyBackedLocked` (usually 3–5 times: reveal → wrap → one swap per meme):
```bash
near contract call-function as-transaction core.whatthenft.near advance_order file-args deploy/mainnet/args/order-1.json prepaid-gas '300.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near contract call-function as-read-only core.whatthenft.near get_orders file-args deploy/mainnet/args/orders.json network-config mainnet now
```
See the NFT and its bag (note its `token_id` and which tokens are in it):
```bash
near contract call-function as-read-only core.whatthenft.near get_tokens_for_owner file-args deploy/mainnet/args/tokens-owner.json network-config mainnet now
```
**Send me the output of these two views.** I'll check the split (10% to you, 5% to buyback) and the bag.

**After 10 minutes: withdraw the bag.** First register yourself on each token in the bag (0.00125 NEAR each). Replace `<token>` with each token contract from the view above:
```bash
near contract call-function as-transaction <token> storage_deposit file-args deploy/mainnet/args/storage-owner.json prepaid-gas '30.0 Tgas' attached-deposit '0.00125 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
Then redeem. I'll write the one-line `redeem` args file once I see your `token_id`.

**Market test.** I'll write these args files once I know the `token_id`:
- list the NFT for 0.05 NEAR;
- create `buyer.whatthenft.near` (0.1 NEAR) and buy it from there;
- check the 97% / 1.5% / 1.5% payout.

**Pause switch:**
```bash
near contract call-function as-transaction core.whatthenft.near set_mints_paused file-args deploy/mainnet/args/pause-mints.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near contract call-function as-transaction core.whatthenft.near set_mints_paused file-args deploy/mainnet/args/unpause-mints.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
**Close the test season:**
```bash
near contract call-function as-transaction core.whatthenft.near close_season file-args deploy/mainnet/args/season-1.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```

## 5. Website + keeper (Railway) and the domain
- **web variables:**
  - `NEXT_PUBLIC_NETWORK=mainnet`
  - `NEXT_PUBLIC_CORE_CONTRACT=core.whatthenft.near`
  - `NEXT_PUBLIC_MARKET_CONTRACT=market.whatthenft.near`
  - the RPC lines from `deploy/railway/web.env.example`
  - then redeploy web.
- **keeper variables:**
  - `CORE_CONTRACT=core.whatthenft.near`
  - `BUYBACK_CONTRACT=buyback.whatthenft.near`
  - `KEEPER_ACCOUNT=keeper.whatthenft.near`
  - `KEEPER_PRIVATE_KEY`: the `private_key` value from `~/.near-credentials/mainnet/keeper.whatthenft.near.json`. Mark it **sealed**.
  - `PINATA_JWT`: from Pinata → API Keys. Mark it **sealed**.
- **Domain:** Railway → web → Settings → Networking → Custom Domain → `nft.whatthehoot.lol`. Then at the DNS provider for `whatthehoot.lol`, add the CNAME record Railway shows (name `nft`, DNS-only / grey cloud).

## 6. Launch Season 01 (MEME GENESIS: 1 NEAR, 30-day lock, 111, open until sold out)
Regenerate so the start time is "now", then create (season **2**) and open:
```bash
pnpm --filter @wtn/keeper deploy-plan
```
```bash
near contract call-function as-transaction core.whatthenft.near create_season file-args deploy/mainnet/season-01.json prepaid-gas '50.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
```bash
near contract call-function as-transaction core.whatthenft.near open_season file-args deploy/mainnet/args/season-2.json prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' sign-as whatthenft.near network-config mainnet sign-with-keychain send
```
Once open, the season's config is frozen. The on-chain `config_hash` and the `manifest_hash` (sha256 of `season-01-manifest.json`, published in this repo) prove it never changes.

---

**If anything fails:** copy the error (never a key) and send it to me. Contracts can be redeployed in place without paying the storage deposit again:
```bash
near contract deploy <account> use-file <wasm> without-init-call network-config mainnet sign-with-keychain send
```

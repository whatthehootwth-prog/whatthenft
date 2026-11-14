# Contract build checksums

Built with `cargo near build non-reproducible-wasm --no-abi` inside the `wtn-build` Docker image
(`contracts/Dockerfile.build`). Deploy ONLY these files and compare the sha256 before every deploy.

| Contract | File | Size | sha256 | Built |
|---|---|---|---|---|
| core | `contracts/res/wtn_core.wasm` | 522493 bytes | `15264715b3d6371cd7116415cabfe31e19ab20dedb15fec966661b2d5f6dab6a` | 2026-11-15 (transfer-fee aware) |
| market | `contracts/res/wtn_market.wasm` | 214734 bytes | `3b26af91b47bf00c4b0f58bc8d2714379532897c71a9f6571b5bad874600a6a5` | 2026-11-13 |
| buyback | `contracts/res/wtn_buyback.wasm` | 183926 bytes | `496ce18f62e632f839c00d618687a9bfd37bf64a4d01d89b7c184ceae35d42fe` | 2026-11-15 (joint-promise fix) |

**2026-11-15 fix.** The NEAR runtime refuses a function that *returns* a joint promise (`a.and(b)`).
`register_tokens`, `redeem` (core), and `pay` / `emergency_withdraw` (buyback) did that, so any call
touching more than one token or payee failed on mainnet. Unit tests run outside the runtime, so they
didn't catch it. Each transfer is now its own detached promise with its own callback. Joint promises
followed by `.then(...)` (the swap quote/balance reads) are allowed and unchanged.

**2026-11-15 transfer-fee fix (core).** Justhoot launchpad tokens take 1.5–3% on every transfer, so the vault
receives less than the DEX paid out and the first live mint froze as an anomaly. Core now keeps a per-token
fee tolerance (`set_transfer_fees`, operator, max 10%, raw storage key so the state layout is unchanged).
A swap passes if the received amount is at least min_out minus that fee. Unwinds size min_out on the
post-fee amount. `accept_fee_shortfall` releases a leg that froze only because of the fee.
Live fees: `pnpm --filter @wtn/keeper token-fees`.

Superseded builds (replaced in place on mainnet, 2026-11-15):
core `dccd230d…6dad67` (513322 bytes) → `9d34a60c…641cbe` (512817 bytes) → current; buyback `233ba410…f8cb1b8` (184766 bytes) → current.

Rebuild + verify:
```bash
for c in core market buyback; do docker run --rm -v "$PWD:/work" -w /work/contracts/$c wtn-build cargo near build non-reproducible-wasm --no-abi; done
sha256sum contracts/target/near/*/*.wasm
```
After deploying, `near contract download-wasm <account> save-to-file x.wasm network-config mainnet now` and
`sha256sum x.wasm` must match this table.

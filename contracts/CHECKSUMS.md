# Contract build checksums

Built with `cargo near build non-reproducible-wasm --no-abi` inside the `wtn-build` Docker image
(`contracts/Dockerfile.build`). Deploy ONLY these files and compare the sha256 before every deploy.

| Contract | File | Size | sha256 | Built |
|---|---|---|---|---|
| core | `contracts/res/wtn_core.wasm` | 512817 bytes | `9d34a60c601be5852121083a1201a6bc4d1bec62f9084f5b05f05a5743641cbe` | 2026-11-15 (joint-promise fix) |
| market | `contracts/res/wtn_market.wasm` | 214734 bytes | `3b26af91b47bf00c4b0f58bc8d2714379532897c71a9f6571b5bad874600a6a5` | 2026-11-13 |
| buyback | `contracts/res/wtn_buyback.wasm` | 183926 bytes | `496ce18f62e632f839c00d618687a9bfd37bf64a4d01d89b7c184ceae35d42fe` | 2026-11-15 (joint-promise fix) |

**2026-11-15 fix.** The NEAR runtime refuses a function that *returns* a joint promise (`a.and(b)`).
`register_tokens`, `redeem` (core), and `pay` / `emergency_withdraw` (buyback) did that, so any call
touching more than one token or payee failed on mainnet. Unit tests run outside the runtime, so they
didn't catch it. Each transfer is now its own detached promise with its own callback. Joint promises
followed by `.then(...)` (the swap quote/balance reads) are allowed and unchanged.

Superseded builds (first mainnet deploy, 2026-11-15, replaced in place):
core `dccd230d…6dad67` (513322 bytes), buyback `233ba410…f8cb1b8` (184766 bytes).

Rebuild + verify:
```bash
for c in core market buyback; do docker run --rm -v "$PWD:/work" -w /work/contracts/$c wtn-build cargo near build non-reproducible-wasm --no-abi; done
sha256sum contracts/target/near/*/*.wasm
```
After deploying, `near contract download-wasm <account> save-to-file x.wasm network-config mainnet now` and
`sha256sum x.wasm` must match this table.

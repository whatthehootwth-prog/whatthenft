# Contract build checksums

Built 2026-11-13 from commit `713abe5` with `cargo near build non-reproducible-wasm --no-abi`
inside the `wtn-build` Docker image (`contracts/Dockerfile.build`). Deploy ONLY these files and
compare the sha256 before every deploy (Contract A and Contract B must use identical bytes).

| Contract | File | Size | sha256 |
|---|---|---|---|
| core | `contracts/res/wtn_core.wasm` | 513322 bytes | `dccd230d5da967b5e8db67cc0fff2446e1445225207604689a5c2ee9ec6dad67` |
| market | `contracts/res/wtn_market.wasm` | 214734 bytes | `3b26af91b47bf00c4b0f58bc8d2714379532897c71a9f6571b5bad874600a6a5` |
| buyback | `contracts/res/wtn_buyback.wasm` | 184766 bytes | `233ba410b6e090b7a3127d97d57519a173b930d297b4868f025024e16f8cb1b8` |

Rebuild + verify:
```bash
for c in core market buyback; do docker run --rm -v "$PWD:/work" -w /work/contracts/$c wtn-build cargo near build non-reproducible-wasm --no-abi; done
sha256sum contracts/target/near/*/*.wasm
```
After deploying, `near contract download-wasm <account> save-to-file x.wasm network-config mainnet now` and
`sha256sum x.wasm` must match this table.

# Threat model — wtn-core (Milestone A)

Assets at risk: basket tokens held by the vault (customer property), escrowed NEAR/wNEAR for in-flight orders, creator/treasury fees, NFT ownership, randomness fairness.

| Threat | Mitigation in code | Test |
|---|---|---|
| Admin/operator steals baskets | No function moves FT holdings except: owner-signed `redeem` (1 yocto, current owner only), swaps into season-frozen Rhea pools with on-chain-quoted `min_out`, recovery unwinds whose proceeds only refund `order.payer`. | `no_admin_path_moves_backed_funds_and_media_pins_once` |
| Operator changes rules mid-season | `update_season` only in Draft; `open_season` stores sha256(borsh(config)); live min only within frozen [floor, max]. | `season_is_immutable_once_open_and_capped` |
| Seller redeems after selling | `redeem` checks `predecessor == owner_by_id`; ownership is the NFT standard's single source of truth in the same contract. | `sold_while_locked_buyer_inherits_full_claim_seller_cannot_redeem` |
| Stale listing sells an emptied card | `redeem`/`reload` revoke all approvals; transfers & `nft_transfer_payout` blocked while Redeeming/Reloading. | `redemption_revokes_marketplace_approvals_…` |
| Double sale / stale approval | NEP-178 approval ids are single-use; transfer clears approvals. | sold-while-locked test (stale approval rejected) |
| Underfunded tradable NFT | NFT minted only in `internal_finalize`, which requires every leg `Done` with verified `acquired > 0`. | `full_mint_mints_only_after_all_legs_verified`, partial recovery test |
| Forged swap callback | All callbacks `#[private]`; amounts come from `ft_transfer_call` return value + vault `ft_balance_of` delta, never from caller input. | callback tests |
| Balance-delta misattribution between concurrent orders | Per-token mutex (`busy`); unwind requires no wNEAR ops in flight and sets `wnear_measuring`. | `token_mutex_blocks_parallel_swaps_on_same_token` |
| Sandwich / manipulated quote | `min_out` = on-chain quote × (1 − max_slippage) taken in the same receipt chain immediately before the swap; slippage ≤ 10% enforced by config validation (2% used). Residual: quote can be manipulated in an earlier block; bounded by pool fee cost and slippage cap. | — (testnet integration) |
| Keeper grinding randomness | Reveal uses the seed of a later block; keeper cannot know it at submission; outcome deterministic from (seed, order id); retry only on external failure. | TS + Rust vector tests, `deriveTraits` determinism |
| Keeper drains reserve | Fee only when a step actually starts; capped by `retry_reserve`; payer advancing pays nothing. | full mint test (fees = steps × fee) |
| Fake token with same ticker | Season memes are full contract ids; duplicate contracts rejected; registry verifies symbol + decimals on chain. | manifest tests, `validate_season` |
| Malicious token contract (transfer fails) | Failed redemption transfer restores the claim to the NFT; failed swap refunds wNEAR (`used = 0`). | redemption failure test, rejected swap test |
| Execution anomaly (partial use, unreadable balance) | Order frozen in `PartialExecutionRecovery`, mutex retained, wNEAR assumed spent (conservative), operator `reconcile_anomaly` can only attribute vault *surplus*. | `anomaly_freezes_order_and_keeps_mutex_until_reconcile` |
| Conservation drift | `accounted[token]` maintained on every credit/debit; `check_conservation` + `/status` compare against real `ft_balance_of`. | `/status` live check |
| Metadata substitution | `set_token_media` once only, content-addressed URIs only, sha256 required. | media pin test |
| Overflow | `overflow-checks = true` in release; checked add/sub on accounting. | split tests with u128 extremes |

Open items before mainnet: independent audit; testnet integration with real Rhea pools (gas budgets, DCL `Swap` msg acceptance, output-transfer failure path into Rhea internal balance); keeper bot; multisig owner; storage-cost top-up monitoring for the contract account.

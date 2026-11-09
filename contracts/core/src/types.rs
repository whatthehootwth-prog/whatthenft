use near_sdk::json_types::{U128, U64};
use near_sdk::{near, AccountId};

pub const SLOT_COUNT: usize = 6;
pub const SLOT_NAMES: [&str; SLOT_COUNT] = ["head", "face", "body", "arms", "legs", "accessory"];
pub const RARITY_TIERS: usize = 5;
pub const RARITY_NAMES: [&str; RARITY_TIERS] = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
pub const BPS: u128 = 10_000;

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum RouteKind {
    /// Rhea DCL (concentrated liquidity). pool_id = "tokenX|tokenY|fee".
    RheaDcl,
    /// Rhea classic AMM (v2.ref-finance.near). pool_id = numeric id.
    RheaV2,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Route {
    pub kind: RouteKind,
    pub pool_id: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SeasonMeme {
    pub meme_id: String,
    /// Full verified NEP-141 contract id (never ticker matching).
    pub token: AccountId,
    /// Partner selection weight (ignored for memes[0] == WTH).
    pub weight: u32,
    /// Approved art variants per slot (head, face, body, arms, legs, accessory). 0 = no art.
    pub slot_variants: [u16; SLOT_COUNT],
    pub route: Route,
    /// Max slippage vs the on-chain quote taken immediately before the swap.
    pub max_slippage_bps: u16,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Tier {
    pub min_base: U128,
    pub max_partners: u8,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct MintFees {
    pub basket_bps: u16,
    pub creator_bps: u16,
    pub treasury_bps: u16,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct RoyaltyConfig {
    /// Share of a completed sale price. Default 250 (2.5%).
    pub royalty_bps: u16,
    /// Share of the royalty paid to the creator; rest to treasury. Default 1000 (10%).
    pub creator_share_bps: u16,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct AllocationConfig {
    pub core_wth_bps: u16,
    pub slot_weights_bps: [u16; SLOT_COUNT],
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct ExecutionReserveConfig {
    /// Fixed NEAR storage charge per mint (measured; see tests). Not refunded: it is staked
    /// for the NFT, its metadata and its basket ledger.
    pub storage_per_mint: U128,
    /// Refundable reserve that reimburses permissionless advancers if the automatic
    /// execution chain needs extra transactions. Unused part returns to the payer.
    pub retry_reserve: U128,
    /// Fixed reimbursement per advancement step paid from retry_reserve.
    pub advance_fee: U128,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SeasonConfig {
    pub name: String,
    pub mint_start_ns: U64,
    pub mint_end_ns: U64,
    pub max_supply: u32,
    /// Advertised target floor (e.g. 0.1 NEAR). Informational; executable min is enforced.
    pub target_base: U128,
    /// Lowest base the operator may ever set as the live minimum for this season.
    pub min_base_floor: U128,
    pub max_base: U128,
    /// Every nonzero leg must be at least this much wNEAR.
    pub min_leg: U128,
    pub tiers: Vec<Tier>,
    pub lock_ns: U64,
    pub fees: MintFees,
    pub royalty: RoyaltyConfig,
    pub allocation: AllocationConfig,
    pub rarity_bps: [u16; RARITY_TIERS],
    pub wth_slot_bps: u16,
    /// memes[0] MUST be WTH with art for every slot.
    pub memes: Vec<SeasonMeme>,
    pub reserve: ExecutionReserveConfig,
    /// sha256 (hex) of the published canonical season manifest (art hashes, rules, etc.).
    pub manifest_hash: String,
    /// Content-addressed base for rendered media, e.g. "ipfs://<cid>".
    pub media_base_uri: String,
    pub reload_enabled: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum SeasonStatus {
    Draft,
    Open,
    Closed,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Season {
    pub id: u32,
    pub config: SeasonConfig,
    pub status: SeasonStatus,
    pub minted: u32,
    pub in_flight: u32,
    /// Live executable minimum, adjustable only within [min_base_floor, max_base].
    pub current_min_base: U128,
    pub opened_at_ns: Option<U64>,
    /// sha256 of the borsh-serialized config at open time (on-chain immutability proof).
    pub config_hash: Option<String>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum OrderKind {
    Mint,
    Reload { token_id: String },
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum OrderStatus {
    Escrowed,
    TraitsAssigned,
    SwapsPending,
    FullyBackedLocked,
    FailedPreExecution,
    RefundPending,
    Refunded,
    PartialExecutionRecovery,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum LegStatus {
    Pending,
    InFlight,
    Done,
    Failed,
    Unwinding,
    Unwound,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Leg {
    pub meme_idx: u8,
    pub token: AccountId,
    pub bps: u16,
    pub amount_in: U128,
    pub acquired: U128,
    pub min_out: U128,
    pub attempts: u8,
    pub status: LegStatus,
    pub last_error: Option<String>,
    /// wNEAR recovered if this leg was unwound in recovery.
    pub unwind_out: U128,
    /// True once the leg's wNEAR has left the vault (success or anomaly). If false, the
    /// leg's amount_in is still held as wNEAR for this order.
    pub spent: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct SlotPick {
    pub meme_idx: u8,
    pub variant: u16,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Traits {
    pub rarity: u8,
    pub attempt: u8,
    pub slots: [SlotPick; SLOT_COUNT],
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct RevealProof {
    pub block_height: U64,
    /// env::random_seed() of the reveal block, hex. Anyone can recompute traits from this.
    pub random_seed_hex: String,
    pub seed_hex: String,
    pub version: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Order {
    pub id: U64,
    pub kind: OrderKind,
    pub payer: AccountId,
    pub season_id: u32,
    pub base: U128,
    pub basket: U128,
    pub creator_fee: U128,
    pub treasury_fee: U128,
    pub storage_fee: U128,
    pub retry_reserve: U128,
    pub keeper_fees_paid: U128,
    pub status: OrderStatus,
    pub created_ns: U64,
    pub updated_ns: U64,
    pub request_block: U64,
    pub reveal: Option<RevealProof>,
    pub traits: Option<Traits>,
    pub legs: Vec<Leg>,
    pub wrapped: bool,
    pub token_id: Option<String>,
    pub refunded: U128,
    pub note: Option<String>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum BackingState {
    FullyBackedLocked,
    Unlocked,
    Redeeming,
    RedeemedEmpty,
    Reloading,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Holding {
    pub meme_id: String,
    pub token: AccountId,
    /// Original allocation share (bps) — reload rebuys the same composition.
    pub bps: u16,
    pub amount: U128,
    /// Amount currently in flight to a redemption receiver.
    pub pending_out: U128,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct TokenInfo {
    pub season_id: u32,
    pub serial: u32,
    pub traits: Traits,
    pub meme_ids: Vec<String>,
    pub holdings: Vec<Holding>,
    pub state: BackingState,
    pub funded_at_ns: U64,
    pub lock_until_ns: U64,
    pub origin_order_id: U64,
    pub reload_count: u32,
    pub season_manifest_hash: String,
    pub reveal: RevealProof,
    /// Set once (immutable afterwards) when the deterministic render is pinned.
    pub media_cid: Option<String>,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct TokenView {
    pub token_id: String,
    pub owner_id: Option<AccountId>,
    pub info: TokenInfo,
    /// State with the lock evaluated against the current block time.
    pub effective_state: BackingState,
}

use near_sdk::json_types::U128;
use near_sdk::{ext_contract, AccountId, Gas, PromiseOrValue};

pub const G_VIEW: Gas = Gas::from_tgas(10);
pub const G_QUOTE: Gas = Gas::from_tgas(25);
pub const G_WRAP: Gas = Gas::from_tgas(10);
pub const G_FT_TRANSFER: Gas = Gas::from_tgas(15);
pub const G_FT_TRANSFER_CALL: Gas = Gas::from_tgas(110);
pub const G_STORAGE_DEPOSIT: Gas = Gas::from_tgas(10);
pub const G_CALLBACK_SMALL: Gas = Gas::from_tgas(10);
/// on_leg_verified may finalize inline (mint + fee transfers).
pub const G_ON_LEG_VERIFIED: Gas = Gas::from_tgas(50);
pub const G_ON_LEG_SWAPPED: Gas = Gas::from_tgas(10 + 10 + 50); // own + view + verified
pub const G_ON_LEG_PREPARED: Gas = Gas::from_tgas(10 + 110 + 70); // own + transfer_call + swapped
/// Total gas an advance step needs to run one full leg.
pub const G_LEG_TOTAL: Gas = Gas::from_tgas(10 + 25 + 190 + 10);
pub const G_ON_REVEAL: Gas = Gas::from_tgas(40);
pub const G_ON_WRAPPED: Gas = Gas::from_tgas(15);
pub const G_REFUND: Gas = Gas::from_tgas(30);
pub const G_REDEEM_CB: Gas = Gas::from_tgas(10);

#[ext_contract(ext_ft)]
pub trait ExtFt {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn ft_transfer_call(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>, msg: String) -> PromiseOrValue<U128>;
    fn ft_balance_of(&self, account_id: AccountId) -> U128;
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
}

#[ext_contract(ext_wrap)]
pub trait ExtWrap {
    fn near_deposit(&mut self);
    fn near_withdraw(&mut self, amount: U128);
}

#[ext_contract(ext_rhea_v2)]
pub trait ExtRheaV2 {
    fn get_return(&self, pool_id: u64, token_in: AccountId, amount_in: U128, token_out: AccountId) -> U128;
}

#[ext_contract(ext_rhea_dcl)]
pub trait ExtRheaDcl {
    fn quote(&self, pool_ids: Vec<String>, input_token: AccountId, output_token: AccountId, input_amount: U128, tag: Option<String>);
}

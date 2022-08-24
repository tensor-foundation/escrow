use anchor_lang::prelude::*;
use std::fmt::Debug;
use std::sync::Arc;

pub const CURRENT_TSWAP_VERSION: u8 = 1;
pub const CURRENT_POOL_VERSION: u8 = 1;

// todo currently hardcoding, not to waste time passing in
pub const TSWAP_FEE_VAULT: &str = "5u1vB9UeQSCzzwEhmKPhmQH1veWP9KZyZ8xFxFrmj8CK";
pub const TSWAP_FEE_BPS: u16 = 5000;

// --------------------------------------- tswap

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct TSwapConfig {
    pub fee_bps: u16,
}

#[account]
pub struct TSwap {
    pub version: u8,

    //signs off on everything program related
    pub authority: Pubkey,
    pub auth_bump: [u8; 1],
    // todo for v1 keeping it super naive - just a pk we control
    pub owner: Pubkey,

    pub config: TSwapConfig,
    // todo for v1 keeping it super naive - just a pk we control
    pub fee_vault: Pubkey,
}

// --------------------------------------- pool

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub enum PoolType {
    Token, //buys NFTs
    NFT,   //sells NFTs
    Trade, //both buys & sells
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub enum CurveType {
    Linear,
    Exponential,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct Collection {
    // intentionally NOT public
    root_hash: [u8; 32],
    verified: bool,
}

impl Collection {
    pub fn get_hash(&self) -> &[u8; 32] {
        &self.root_hash
    }
    pub fn set_new_hash(&mut self, new_hash: [u8; 32]) {
        self.root_hash = new_hash;
        self.verified = false;
    }
    pub fn verify_hash(&mut self) {
        self.verified = true;
    }
}

#[account]
pub struct Pool {
    pub version: u8,

    /// Ownership & belonging
    pub tswap: Pubkey,
    pub creator: Pubkey,

    /// Collection stuff
    pub collection: Collection,

    /// Config
    pub pool_type: PoolType,
    // todo later can be made into a dyn Trait
    pub curve_type: CurveType,
    pub delta: u64,
    pub fee: u16,
    pub fee_vault: Pubkey,
    pub spot_price: u64,
    pub honor_royalties: bool,

    /// Accounting & tracking
    pub trade_count: u64,
    pub nfts_held: u32,
    pub is_active: bool,
}

// --------------------------------------- mint

#[account]
pub struct PooledMint {
    pub pool: Pubkey,
    pub nft_mint: Pubkey,
    // todo is this even needed?
    pub token_account: Pubkey,
}

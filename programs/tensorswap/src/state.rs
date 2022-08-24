use crate::*;
use std::fmt::Debug;
use vipers::throw_err;

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

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub enum PoolType {
    Token = 0, //buys NFTs
    NFT = 1,   //sells NFTs
    Trade = 2, //both buys & sells
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub enum CurveType {
    Linear = 0,
    Exponential = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct Collection {
    // intentionally NOT public
    root_hash: [u8; 32],
    verified: bool,
}

impl Collection {
    pub fn new(root_hash: [u8; 32]) -> Self {
        Self {
            root_hash,
            verified: false,
        }
    }
    pub fn get_hash(&self) -> Result<&[u8; 32]> {
        // todo enable when ready
        // if !self.verified {
        //     throw_err!(PoolNotVerified);
        // }
        Ok(&self.root_hash)
    }
    // todo not possible in v1
    // pub fn set_new_hash(&mut self, new_hash: [u8; 32]) {
    //     self.root_hash = new_hash;
    //     self.verified = false;
    // }
    pub fn verify_hash(&mut self) {
        self.verified = true;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct PoolConfig {
    pub pool_type: PoolType,
    // todo later can be made into a dyn Trait
    pub curve_type: CurveType,
    pub starting_price: u64, //lamports
    pub delta: u64,          //lamports pr bps

    pub honor_royalties: bool,

    /// Trade pools only
    pub fee_bps: Option<u16>,
    pub fee_vault: Option<Pubkey>,
}

#[account]
pub struct Pool {
    pub version: u8,
    pub pool_bump: [u8; 1],

    /// Ownership & belonging
    pub tswap: Pubkey,
    pub creator: Pubkey,

    /// Collection stuff
    pub collection: Collection,

    /// Config
    pub config: PoolConfig,

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

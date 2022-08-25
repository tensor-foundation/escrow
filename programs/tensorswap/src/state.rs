use std::fmt::Debug;
use vipers::throw_err;

use crate::*;

pub const CURRENT_TSWAP_VERSION: u8 = 1;
pub const CURRENT_POOL_VERSION: u8 = 1;

// todo currently hardcoding, not to waste time passing in
pub const TSWAP_FEE_VAULT: &str = "5u1vB9UeQSCzzwEhmKPhmQH1veWP9KZyZ8xFxFrmj8CK";
pub const TSWAP_FEE_BPS: u16 = 5000;

pub const TENSOR_WHITELIST_ADDR: &str = "CyrMiKJphasn4kZLzMFG7cR9bZJ1rifGF37uSpJRxVi6";

pub const MAX_MM_FEES_BPS: u16 = 2500; //25%
pub const HUNDRED_PCT_BPS: u16 = 10000;
pub const MAX_DELTA_BPS: u16 = 9999; //99%

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
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, PartialEq)]
pub enum PoolType {
    Token = 0, //buys NFTs
    NFT = 1,   //sells NFTs
    Trade = 2, //both buys & sells
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, PartialEq)]
pub enum CurveType {
    Linear = 0,
    Exponential = 1,
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
    pub mm_fee_bps: Option<u16>,
    pub mm_fee_vault: Option<Pubkey>,
}

#[account]
pub struct Pool {
    pub version: u8,
    pub pool_bump: [u8; 1],

    /// Ownership & belonging
    pub tswap: Pubkey,
    pub creator: Pubkey,

    /// Collection stuff
    pub whitelist: Pubkey,

    /// Config & calc
    pub config: PoolConfig,

    /// Accounting
    pub pool_nft_purchase_count: u64,
    pub pool_nft_sale_count: u64,
    pub nfts_held: u32,
    pub sol_funding: u64, //total deposits - total withdrawals - any spent sol
    pub is_active: bool,
}

impl Pool {
    // todo rust is being fucking painful - not wasting time fighting the complier rn
    //  https://stackoverflow.com/questions/73481281/rust-returns-a-value-referencing-data-owned-by-the-current-function
    // pub fn pool_seeds(&self) -> [&[u8]; 7] {
    //     [
    //         self.tswap.as_ref(),
    //         self.creator.as_ref(),
    //         self.whitelist.as_ref(),
    //         &[self.config.pool_type as u8],
    //         &[self.config.curve_type as u8],
    //         &self.config.starting_price.to_le_bytes(),
    //         &self.config.delta.to_le_bytes(),
    //     ]
    // }

    pub fn set_active(&mut self) -> bool {
        if self.nfts_held > 0 || self.sol_funding > self.current_price {
            self.is_active = true;
        } else {
            self.is_active = false;
        }
        self.is_active
    }

    pub fn calc_mm_fee(&self) -> Result<u64> {
        if self.config.pool_type != PoolType::Trade {
            throw_err!(WrongPoolType);
        }

        // todo precision
        // todo overflow
        let fee = unwrap_checked!({
            (self.config.mm_fee_bps.unwrap() as u64)
                .checked_mul(self.current_price)?
                .checked_div(HUNDRED_PCT_BPS as u64)
        });

        Ok(fee)
    }

    pub fn calc_tswap_fee(&self, tswap_fee_bps: u16) -> Result<u64> {
        // todo precision
        // todo overflow
        let fee = unwrap_checked!({
            (tswap_fee_bps as u64)
                .checked_mul(self.current_price)?
                .checked_div(HUNDRED_PCT_BPS as u64)
        });

        Ok(fee)
    }

    pub fn current_price(&self) -> Result<u64> {
        let current_price = unwrap_int!(self.config.starting_price.checked_pow())
        Ok(current_price)
    }

    // todo check boundary conditions
    pub fn adjust_current_price(&mut self, direction: Option<Direction>) -> Result<()> {
        match self.config.pool_type {
            //Token pool = buy nfts = each sell into the pool LOWERS the price
            PoolType::Token => self.shift_price_by_delta(Direction::Down)?,
            //NFT pool = sell nfts = each buy from the pool INCREASES the price
            PoolType::NFT => self.shift_price_by_delta(Direction::Up)?,
            //Trade pool = do both = logic like the above 2
            PoolType::Trade => self.shift_price_by_delta(direction.unwrap())?,
        }
        Ok(())
    }

    // todo verify math via tests below
    pub fn shift_price_by_delta(&mut self, direction: Direction) -> Result<()> {
        self.current_price = match self.config.curve_type {
            CurveType::Exponential => match direction {
                Direction::Up => unwrap_checked!({
                    self.current_price
                        .checked_mul(
                            (HUNDRED_PCT_BPS as u64).checked_add(self.config.delta as u64)?,
                        )?
                        .checked_div(HUNDRED_PCT_BPS as u64)
                }),
                Direction::Down => unwrap_checked!({
                    self.current_price
                        .checked_div(
                            (HUNDRED_PCT_BPS as u64).checked_add(self.config.delta as u64)?,
                        )?
                        .checked_mul(HUNDRED_PCT_BPS as u64)
                }),
            },
            CurveType::Linear => match direction {
                Direction::Up => {
                    unwrap_int!(self.current_price.checked_add(self.config.delta as u64))
                }
                Direction::Down => {
                    unwrap_int!(self.current_price.checked_sub(self.config.delta as u64))
                }
            },
        };
        Ok(())
    }
}

pub enum Direction {
    Up,
    Down,
}

// --------------------------------------- receipts

#[account]
pub struct NftDepositReceipt {
    pub pool: Pubkey,
    pub nft_mint: Pubkey,
    pub nft_escrow: Pubkey,
}

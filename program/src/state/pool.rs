use anchor_lang::prelude::*;
use mpl_token_metadata::accounts::Metadata;
use spl_math::precise_number::PreciseNumber;
use tensor_toolbox::calc_creators_fee;
use vipers::{throw_err, unwrap_checked, unwrap_int};

use crate::{
    constants::{
        HUNDRED_PCT_BPS, SNIPE_FEE_BPS, SNIPE_MIN_FEE, SNIPE_PROFIT_SHARE_BPS, SPREAD_TICKS,
        TSWAP_TAKER_FEE_BPS,
    },
    error::ErrorCode,
};

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum PoolType {
    Token = 0, //buys NFTs
    NFT = 1,   //sells NFTs
    Trade = 2, //both buys & sells
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurveType {
    Linear = 0,
    Exponential = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct PoolConfig {
    pub pool_type: PoolType,
    pub curve_type: CurveType,
    pub starting_price: u64, //lamports
    pub delta: u64,          //lamports pr bps
    /// Trade pools only
    pub mm_compound_fees: bool,
    pub mm_fee_bps: Option<u16>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, Default)]
pub struct PoolStats {
    pub taker_sell_count: u32,
    pub taker_buy_count: u32,
    pub accumulated_mm_profit: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy, Default)]
pub struct Frozen {
    pub amount: u64,
    pub time: i64,
}

#[account]
pub struct Pool {
    pub version: u8,
    pub bump: [u8; 1],
    pub sol_escrow_bump: [u8; 1],
    /// Unix timestamp in seconds when pool was created
    pub created_unix_seconds: i64,
    pub config: PoolConfig,
    pub tswap: Pubkey,
    pub owner: Pubkey,
    pub whitelist: Pubkey,
    /// Used by Trade / Token pools only, but always initiated
    /// Amount to spend is implied by balance - rent
    /// (!) for margin accounts this should always be empty EXCEPT when we move frozen amount in
    pub sol_escrow: Pubkey,
    /// How many times a taker has SOLD into the pool
    pub taker_sell_count: u32,
    /// How many times a taker has BOUGHT from the pool
    pub taker_buy_count: u32,
    pub nfts_held: u32,

    //v0.3
    pub nft_authority: Pubkey,
    /// All stats incorporate both 1)carried over and 2)current data
    pub stats: PoolStats,

    //v1.0
    /// If margin account present, means it's a marginated pool (currently bids only)
    pub margin: Option<Pubkey>,
    /// Offchain actor signs off to make sure an offchain condition is met (eg trait present)
    pub is_cosigned: bool,
    /// Order type for indexing ease (anchor enums annoying, so using a u8)
    /// 0 = standard, 1 = sniping (in the future eg 2 = take profit, etc)
    pub order_type: u8,
    /// Order is being executed by an offchain party and can't be modified at this time
    /// incl. deposit/withdraw/edit/close/buy/sell
    pub frozen: Option<Frozen>,
    /// Last time a buy or sell order has been executed
    pub last_transacted_seconds: i64,

    //v1.1
    /// Limit how many buys a pool can execute - useful for cross-margin, else keeps buying into infinity
    // Ideally would use an option here, but not enough space w/o migrating pools, hence 0 = no restriction
    pub max_taker_sell_count: u32,
    // (!) make sure aligns with last number in SIZE
    // pub _reserved: [u8; 0],
}

pub fn calc_tswap_fee(fee_bps: u16, current_price: u64) -> Result<u64> {
    let fee = unwrap_checked!({
        (fee_bps as u64)
            .checked_mul(current_price)?
            .checked_div(HUNDRED_PCT_BPS as u64)
    });

    Ok(fee)
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const POOL_SIZE: usize = 8 + (3 * 1)
        + 8
        + (2 * 1) + (2 * 8) + 1 + 3 //pool config
        + (5 * 32)
        + (3 * 4)
        + (2 * 4) + 8 //pool stats
        + 32 + 1 //(!) option takes up 1 extra byte
        + 1
        + 1
        + 8 + 8 + 1 //frozen (!) option takes up 1 extra byte
        + 8
        + 4;

impl Pool {
    pub fn taker_allowed_to_sell(&self) -> Result<()> {
        //0 indicates no restriction on buy count / if no margin not relevant
        if self.max_taker_sell_count == 0 || self.margin.is_none() {
            return Ok(());
        }

        //if the pool has made more sells than buys, by defn it can buy more to get to initial state
        if self.stats.taker_buy_count > self.stats.taker_sell_count {
            return Ok(());
        }

        //<= because equal means taker can no longer sell
        if self.max_taker_sell_count <= self.stats.taker_sell_count - self.stats.taker_buy_count {
            throw_err!(ErrorCode::MaxTakerSellCountExceeded);
        }
        Ok(())
    }

    //used when editing pools to prevent setting a new cap that's too low
    pub fn valid_max_sell_count(&self, new_count: u32) -> Result<()> {
        //0 indicates no restriction
        if new_count == 0 {
            return Ok(());
        }

        //if the pool has made more sells than buys, by defn we can set any cap (including lowest = 1)
        if self.stats.taker_buy_count > self.stats.taker_sell_count {
            return Ok(());
        }

        //< without = because we should let them edit the cap to stop sales
        if new_count < self.stats.taker_sell_count - self.stats.taker_buy_count {
            throw_err!(ErrorCode::MaxTakerSellCountTooSmall);
        }

        Ok(())
    }

    /// This check is against the following scenario:
    /// 1. user sets cap to 1 and reaches it (so 1/1)
    /// 2. user detaches margin
    /// 3. user sells more into the pool (so 2/1)
    /// 4. user attaches margin again, but 2/1 is theoretically invalid
    pub fn adjust_pool_max_taker_sell_count(&mut self) -> Result<()> {
        if self
            .valid_max_sell_count(self.max_taker_sell_count)
            .is_err()
        {
            self.max_taker_sell_count = self.stats.taker_sell_count - self.stats.taker_buy_count;
        }

        Ok(())
    }

    pub fn sol_escrow_seeds<'a>(&'a self, pool_key: &'a Pubkey) -> [&'a [u8]; 3] {
        [b"sol_escrow", pool_key.as_ref(), &self.sol_escrow_bump]
    }

    pub fn calc_mm_fee(&self, current_price: u64) -> Result<u64> {
        if self.config.pool_type != PoolType::Trade {
            throw_err!(ErrorCode::WrongPoolType);
        }

        let fee = unwrap_checked!({
            // NB: unrwap_or(0) since we had a bug where we allowed someone to edit a trade pool to have null mm_fees.
            (self.config.mm_fee_bps.unwrap_or(0) as u64)
                .checked_mul(current_price)?
                .checked_div(HUNDRED_PCT_BPS as u64)
        });

        Ok(fee)
    }

    pub fn calc_tswap_fee(&self, current_price: u64) -> Result<u64> {
        let fee_bps = match self.order_type {
            0 => TSWAP_TAKER_FEE_BPS,
            1 => SNIPE_FEE_BPS,
            _ => unimplemented!(),
        };

        let fee = calc_tswap_fee(fee_bps, current_price)?;

        //for sniping we have a min base fee so that we don't get drained
        if self.order_type == 1 {
            return Ok(std::cmp::max(fee, SNIPE_MIN_FEE));
        }

        Ok(fee)
    }

    pub fn calc_tswap_profit_share(&self, original_price: u64, actual_price: u64) -> Result<u64> {
        let fee_bps = match self.order_type {
            1 => SNIPE_PROFIT_SHARE_BPS,
            _ => unimplemented!(),
        };

        let fee = unwrap_checked!({
            (fee_bps as u64)
                .checked_mul(original_price.checked_sub(actual_price)?)?
                .checked_div(HUNDRED_PCT_BPS as u64)
        });

        Ok(fee)
    }

    pub fn calc_creators_fee(
        &self,
        metadata: &Metadata,
        current_price: u64,
        optional_royalty_pct: Option<u16>,
    ) -> Result<u64> {
        calc_creators_fee(
            metadata.seller_fee_basis_points,
            current_price,
            metadata.token_standard,
            optional_royalty_pct,
        )
    }

    pub fn current_price(&self, side: TakerSide) -> Result<u64> {
        match (self.config.pool_type, side) {
            //Token pool = buys nfts = each sell into the pool LOWERS the price
            (PoolType::Token, TakerSide::Sell) => {
                self.shift_price_by_delta(Direction::Down, self.taker_sell_count)
            }
            //NFT pool = sells nfts = each buy from the pool INCREASES the price
            (PoolType::NFT, TakerSide::Buy) => {
                self.shift_price_by_delta(Direction::Up, self.taker_buy_count)
            }
            //if sales > purchases, Trade pool acts as an NFT pool
            (PoolType::Trade, side) => {
                // The price of selling into a trade pool is 1 tick lower.
                // We simulate this by increasing the purchase count by 1.
                let offset = match side {
                    TakerSide::Buy => 0,
                    TakerSide::Sell => SPREAD_TICKS,
                };
                let modified_taker_sell_count =
                    unwrap_int!(self.taker_sell_count.checked_add(offset as u32));

                if self.taker_buy_count > modified_taker_sell_count {
                    self.shift_price_by_delta(
                        Direction::Up,
                        unwrap_int!(self.taker_buy_count.checked_sub(modified_taker_sell_count)),
                    )
                } else {
                    //else, Trade pool acts as a Token pool
                    self.shift_price_by_delta(
                        Direction::Down,
                        unwrap_int!(modified_taker_sell_count.checked_sub(self.taker_buy_count)),
                    )
                }
            }
            _ => {
                throw_err!(ErrorCode::WrongPoolType);
            }
        }
    }

    pub fn shift_price_by_delta(&self, direction: Direction, times: u32) -> Result<u64> {
        let current_price = match self.config.curve_type {
            CurveType::Exponential => {
                let hundred_pct = unwrap_int!(PreciseNumber::new(HUNDRED_PCT_BPS.into()));

                let base = unwrap_int!(PreciseNumber::new(self.config.starting_price.into()));
                let factor = unwrap_checked!({
                    PreciseNumber::new(
                        (HUNDRED_PCT_BPS as u64)
                            .checked_add(self.config.delta)?
                            .into(),
                    )?
                    .checked_div(&hundred_pct)?
                    .checked_pow(times.into())
                });

                let result = match direction {
                    // price * (1 + delta)^trade_count
                    Direction::Up => base.checked_mul(&factor),
                    //same but / instead of *
                    Direction::Down => base.checked_div(&factor),
                };

                unwrap_int!(u64::try_from(unwrap_checked!({ result?.to_imprecise() })).ok())
            }
            CurveType::Linear => match direction {
                Direction::Up => {
                    unwrap_checked!({
                        self.config
                            .starting_price
                            .checked_add((self.config.delta).checked_mul(times as u64)?)
                    })
                }
                Direction::Down => {
                    unwrap_checked!({
                        self.config
                            .starting_price
                            .checked_sub((self.config.delta).checked_mul(times as u64)?)
                    })
                }
            },
        };
        Ok(current_price)
    }
}

pub enum Direction {
    Up,
    Down,
}

#[derive(PartialEq, Eq)]
pub enum TakerSide {
    Buy,  // Buying from the pool.
    Sell, // Selling into the pool.
}

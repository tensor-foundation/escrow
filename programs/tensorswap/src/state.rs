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
// #[proc_macros::assert_size(176)]
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
    pub pool_nft_purchase_count: u32, //how many times the pool BOUGHT an nft
    pub pool_nft_sale_count: u32, //how many times the pool SOLD an nft
    pub nfts_held: u32,
    pub is_active: bool,

    /// Trade / Token pools only
    pub sol_funding: u64, //total deposits - total withdrawals - any spent sol
                          // pub sol_escrow: Option<Pubkey>,
}

impl Pool {
    // todo to work on
    // pub fn SIZE() -> usize {
    //     //bools + u8s + u16s + u32s + u64s + pk
    //     (2 * 1) + (4 * 1) + 2 + (3 * 4) + (3 * 8) + (4 * 32)
    // }

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

    pub fn set_active(&mut self, current_price: u64) -> bool {
        if self.nfts_held > 0 || self.sol_funding > current_price {
            self.is_active = true;
        } else {
            self.is_active = false;
        }
        self.is_active
    }

    pub fn calc_mm_fee(&self, current_price: u64) -> Result<u64> {
        if self.config.pool_type != PoolType::Trade {
            throw_err!(WrongPoolType);
        }

        let fee = unwrap_checked!({
            (self.config.mm_fee_bps.unwrap() as u64)
                .checked_mul(current_price)?
                .checked_div(HUNDRED_PCT_BPS as u64)
        });

        Ok(fee)
    }

    pub fn calc_tswap_fee(&self, tswap_fee_bps: u16, current_price: u64) -> Result<u64> {
        let fee = unwrap_checked!({
            (tswap_fee_bps as u64)
                .checked_mul(current_price)?
                .checked_div(HUNDRED_PCT_BPS as u64)
        });

        Ok(fee)
    }

    pub fn current_price(&self) -> Result<u64> {
        match self.config.pool_type {
            //Token pool = buys nfts = each sell into the pool LOWERS the price
            PoolType::Token => {
                self.shift_price_by_delta(Direction::Down, self.pool_nft_purchase_count)
            }
            //NFT pool = sells nfts = each buy from the pool INCREASES the price
            PoolType::NFT => self.shift_price_by_delta(Direction::Up, self.pool_nft_sale_count),
            //if sales > purchases, Trade pool acts as an NFT pool
            PoolType::Trade if self.pool_nft_sale_count > self.pool_nft_purchase_count => self
                .shift_price_by_delta(
                    Direction::Up,
                    unwrap_int!(self
                        .pool_nft_sale_count
                        .checked_sub(self.pool_nft_purchase_count)),
                ),
            //else, Trade pool acts as a Token pool
            PoolType::Trade => self.shift_price_by_delta(
                Direction::Down,
                unwrap_int!(self
                    .pool_nft_purchase_count
                    .checked_sub(self.pool_nft_sale_count)),
            ),
        }
    }

    // todo think through edge cases at boundaries together
    pub fn shift_price_by_delta(&self, direction: Direction, times: u32) -> Result<u64> {
        let current_price = match self.config.curve_type {
            CurveType::Exponential => match direction {
                // price * (1 + delta)^trade_count
                // todo this won't work: price * (10000 + delta)^trade_count / 10000^trade_count
                //  is there a better way than looping?
                Direction::Up => {
                    let mut result = self.config.starting_price;
                    for _n in 1..=times {
                        result = unwrap_checked!({
                            result
                                .checked_mul(
                                    (HUNDRED_PCT_BPS as u64)
                                        .checked_add(self.config.delta as u64)?,
                                )?
                                .checked_div(HUNDRED_PCT_BPS as u64)
                        });
                    }
                    result
                }
                //same but / instead of *
                Direction::Down => {
                    let mut result = self.config.starting_price;
                    for _n in 1..=times {
                        result = unwrap_checked!({
                            result.checked_mul(HUNDRED_PCT_BPS as u64)?.checked_div(
                                (HUNDRED_PCT_BPS as u64).checked_add(self.config.delta as u64)?,
                            )
                        });
                    }
                    result
                }
            },
            CurveType::Linear => match direction {
                Direction::Up => {
                    unwrap_checked!({
                        self.config
                            .starting_price
                            .checked_add((self.config.delta as u64).checked_mul(times as u64)?)
                    })
                }
                Direction::Down => {
                    unwrap_checked!({
                        self.config
                            .starting_price
                            .checked_sub((self.config.delta as u64).checked_mul(times as u64)?)
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

// --------------------------------------- receipts

#[account]
pub struct NftDepositReceipt {
    pub pool: Pubkey,
    pub nft_mint: Pubkey,
    pub nft_escrow: Pubkey,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

    impl Pool {
        pub fn new(
            pool_type: PoolType,
            curve_type: CurveType,
            starting_price: u64,
            delta: u64,
            pool_nft_purchase_count: u32,
            pool_nft_sale_count: u32,
            mm_fee_bps: Option<u16>,
        ) -> Self {
            Self {
                version: 1,
                pool_bump: [1],
                tswap: Pubkey::default(),
                creator: Pubkey::default(),
                whitelist: Pubkey::default(),
                config: PoolConfig {
                    pool_type,
                    curve_type,
                    starting_price,
                    delta,
                    honor_royalties: false,
                    mm_fee_bps,
                    mm_fee_vault: None,
                },
                pool_nft_purchase_count,
                pool_nft_sale_count,
                nfts_held: 0,
                is_active: false,
                sol_funding: 0,
                // sol_escrow: None,
            }
        }
    }

    // --------------------------------------- fees

    #[test]
    fn tst_mm_fees() {
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            LAMPORTS_PER_SOL,
            0,
            0,
            Some(1000), //10%
        );

        assert_eq!(
            p.calc_mm_fee(LAMPORTS_PER_SOL).unwrap(),
            LAMPORTS_PER_SOL / 10
        );

        p.config.mm_fee_bps = Some(123);
        assert_eq!(
            p.calc_mm_fee(LAMPORTS_PER_SOL).unwrap(),
            LAMPORTS_PER_SOL * 123 / 10000
        );

        //if price too small, fee will start to look weird, but who cares at these levels
        //todo 0xrwu - thoughts?
        p.config.mm_fee_bps = Some(2499);
        assert_eq!(p.calc_mm_fee(10).unwrap(), 2); //2.499

        p.config.mm_fee_bps = Some(2499);
        assert_eq!(p.calc_mm_fee(100).unwrap(), 24); //24.99

        p.config.mm_fee_bps = Some(2499);
        assert_eq!(p.calc_mm_fee(1000).unwrap(), 249); //249.9
    }

    #[test]
    fn tst_tswap_fees() {
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            LAMPORTS_PER_SOL,
            0,
            0,
            None,
        );

        assert_eq!(
            p.calc_tswap_fee(1000, LAMPORTS_PER_SOL).unwrap(),
            LAMPORTS_PER_SOL / 10
        );

        assert_eq!(
            p.calc_tswap_fee(123, LAMPORTS_PER_SOL).unwrap(),
            LAMPORTS_PER_SOL * 123 / 10000
        );

        //if price too small, fee will start to look weird, but who cares at these levels
        //todo 0xrwu - thoughts?
        assert_eq!(p.calc_tswap_fee(2499, 10).unwrap(), 2); //2.499
        assert_eq!(p.calc_tswap_fee(2499, 100).unwrap(), 24); //24.99
        assert_eq!(p.calc_tswap_fee(2499, 1000).unwrap(), 249); //249.9
    }

    // --------------------------------------- linear

    // token

    #[test]
    fn test_linear_token_pool() {
        let delta = LAMPORTS_PER_SOL / 10;
        let mut p = Pool::new(
            PoolType::Token,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.pool_nft_sale_count += 999999;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        p.pool_nft_purchase_count += 1;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL - delta);
        p.pool_nft_purchase_count += 2;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL - delta * 3);
        //pool can pay 0
        p.pool_nft_purchase_count += 7;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL - delta * 10);
    }

    #[test]
    #[should_panic]
    fn test_linear_token_pool_panic() {
        let delta = LAMPORTS_PER_SOL / 10;
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            11,
            0,
            None,
        );
        p.current_price().unwrap();
    }

    // nft

    #[test]
    fn test_linear_nft_pool() {
        let delta = LAMPORTS_PER_SOL / 10;
        let mut p = Pool::new(
            PoolType::NFT,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.pool_nft_purchase_count += 999999;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        p.pool_nft_sale_count += 1;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL + delta);
        p.pool_nft_sale_count += 2;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL + delta * 3);
        //go much higher
        p.pool_nft_sale_count += 9999996;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL + delta * 9999999
        );
    }

    #[test]
    #[should_panic]
    fn test_linear_nft_pool_panic() {
        let delta = LAMPORTS_PER_SOL / 10 * 100;
        let mut p = Pool::new(
            PoolType::NFT,
            CurveType::Linear,
            LAMPORTS_PER_SOL * 100,
            delta,
            0,
            u32::MAX - 1, //get this to overflow
            None,
        );
        p.current_price().unwrap();
    }

    // trade

    #[test]
    fn test_linear_trade_pool() {
        let delta = LAMPORTS_PER_SOL / 10;
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //pool's a buyer -> price goes down
        p.pool_nft_purchase_count += 1;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL - delta);
        p.pool_nft_purchase_count += 2;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL - delta * 3);
        //pool can pay 0
        p.pool_nft_purchase_count += 7;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL - delta * 10);

        //pool's neutral
        p.pool_nft_sale_count = 10;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //pool's a seller -> price goes up
        p.pool_nft_sale_count += 1;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL + delta);
        p.pool_nft_sale_count += 2;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL + delta * 3);
        //go much higher
        p.pool_nft_sale_count += 9999996;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL + delta * 9999999
        );
    }

    #[test]
    #[should_panic]
    fn test_linear_trade_pool_panic_lower() {
        let delta = LAMPORTS_PER_SOL / 10;
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            11,
            0,
            None,
        );
        p.current_price().unwrap();
    }

    #[test]
    #[should_panic]
    fn test_linear_trade_pool_panic_upper() {
        let delta = LAMPORTS_PER_SOL / 10 * 100;
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL * 100,
            delta,
            u32::MAX - 1, //get this to overflow
            0,
            None,
        );
        p.current_price().unwrap();
    }

    // --------------------------------------- exponential

    const MAX_BPS: u64 = 10000;

    #[test]
    fn test_expo_token_pool() {
        let delta = 1000;
        let mut p = Pool::new(
            PoolType::Token,
            CurveType::Exponential,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.pool_nft_sale_count += 999999;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        p.pool_nft_purchase_count += 1;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        p.pool_nft_purchase_count += 2;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 13310
        );

        // todo the below 2 are broadly in line with what they should be, but not perfect - fix?
        // p.pool_nft_purchase_count += 7;
        // assert_eq!(
        //     p.current_price().unwrap(),
        //     LAMPORTS_PER_SOL * MAX_BPS / 25937
        // );

        // p.pool_nft_purchase_count += 90;
        // assert_eq!(
        //     p.current_price().unwrap(),
        //     LAMPORTS_PER_SOL * MAX_BPS / 125278293
        // );
    }

    // nft

    #[test]
    fn test_expo_nft_pool() {
        let delta = 1000;
        let mut p = Pool::new(
            PoolType::NFT,
            CurveType::Exponential,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.pool_nft_purchase_count += 999999;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        p.pool_nft_sale_count += 1;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * 11000 / MAX_BPS
        );

        p.pool_nft_sale_count += 2;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * 13310 / MAX_BPS
        );

        // p.pool_nft_sale_count += 7;
        // assert_eq!(
        //     p.current_price().unwrap(),
        //     LAMPORTS_PER_SOL * 25937 / MAX_BPS
        // );

        // todo wow here difference actually really adds up: 7071633084312 vs 12527829300000
        // p.pool_nft_sale_count += 90;
        // assert_eq!(
        //     p.current_price().unwrap(),
        //     LAMPORTS_PER_SOL * 125278293 / MAX_BPS
        // );
    }

    // todo fix
    // #[test]
    // #[should_panic]
    // fn test_expo_nft_pool_panic() {
    //     let delta = 1000;
    //     let mut p = Pool::new(
    //         PoolType::NFT,
    //         CurveType::Exponential,
    //         LAMPORTS_PER_SOL * 100,
    //         delta,
    //         0,
    //         u32::MAX - 1, //get this to overflow,
    //         None
    //     );
    //     p.current_price().unwrap();
    // }

    // trade

    #[test]
    fn test_expo_trade_pool() {
        let delta = 1000;
        let mut p = Pool::new(
            PoolType::Trade,
            CurveType::Exponential,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //pool's a buyer -> price goes down
        p.pool_nft_purchase_count += 1;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );
        p.pool_nft_purchase_count += 2;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 13310
        );

        //pool's neutral
        p.pool_nft_sale_count = 3;
        assert_eq!(p.current_price().unwrap(), LAMPORTS_PER_SOL);

        //pool's a seller -> price goes up
        p.pool_nft_sale_count += 1;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * 11000 / MAX_BPS
        );
        p.pool_nft_sale_count += 2;
        assert_eq!(
            p.current_price().unwrap(),
            LAMPORTS_PER_SOL * 13310 / MAX_BPS
        );
    }

    // todo fix
    // #[test]
    // #[should_panic]
    // fn test_expo_trade_pool_panic_upper() {
    //     let delta = 1000;
    //     let mut p = Pool::new(
    //         PoolType::Trade,
    //         CurveType::Exponential,
    //         LAMPORTS_PER_SOL * 100,
    //         delta,
    //         u32::MAX - 1, //get this to overflow
    //         0,
    //         None,
    //     );
    //     p.current_price().unwrap();
    // }
}

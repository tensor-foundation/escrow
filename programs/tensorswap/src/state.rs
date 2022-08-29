use spl_math::precise_number::PreciseNumber;
use std::fmt::Debug;
use vipers::throw_err;

use crate::*;

pub const CURRENT_TSWAP_VERSION: u8 = 1;
pub const CURRENT_POOL_VERSION: u8 = 1;

// todo currently hardcoding, not to waste time passing in
pub const TSWAP_FEE_VAULT: &str = "5u1vB9UeQSCzzwEhmKPhmQH1veWP9KZyZ8xFxFrmj8CK";
pub const TSWAP_FEE_BPS: u16 = 50; //0.5%

pub const TENSOR_WHITELIST_ADDR: &str = "CyrMiKJphasn4kZLzMFG7cR9bZJ1rifGF37uSpJRxVi6";

pub const MAX_MM_FEES_BPS: u16 = 2500; //25%
pub const HUNDRED_PCT_BPS: u16 = 10000;
pub const MAX_DELTA_BPS: u16 = 9999; //99%

//how many ticks is the spread between a buy and sell for a trade pool
pub const SPREAD_TICKS: u8 = 1;

// --------------------------------------- tswap

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct TSwapConfig {
    pub fee_bps: u16,
}

#[account]
pub struct TSwap {
    pub version: u8,
    pub bump: [u8; 1],

    // todo for v1 keeping it super naive - just a pk we control
    pub owner: Pubkey,

    pub config: TSwapConfig,
    // todo for v1 keeping it super naive - just a pk we control
    pub fee_vault: Pubkey,
}

impl TSwap {
    pub fn seeds(&self) -> [&[u8]; 1] {
        [&self.bump]
    }
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

    // todo disable for v1?
    pub honor_royalties: bool,

    /// Trade pools only
    pub mm_fee_bps: Option<u16>,
}
// #[proc_macros::assert_size(176)]
#[account]
pub struct Pool {
    pub version: u8,
    pub bump: [u8; 1],
    pub sol_escrow_bump: [u8; 1],

    /// Ownership & belonging
    pub tswap: Pubkey,
    pub owner: Pubkey,

    /// Collection stuff
    pub whitelist: Pubkey,

    /// Config & calc
    pub config: PoolConfig,

    /// Accounting
    pub pool_nft_purchase_count: u32, //how many times the pool BOUGHT an nft
    pub pool_nft_sale_count: u32, //how many times the pool SOLD an nft
    pub nfts_held: u32,

    /// Trade / Token pools only
    /// We technically could read funding as balance of sol_escrow (- rent)
    /// but kind of annoying so let's keep this for now.
    pub sol_funding: u64, //total deposits - total withdrawals - any spent sol
    pub sol_escrow: Pubkey, //always initialized regardless of type
}

impl Pool {
    // todo to work on
    // pub fn SIZE() -> usize {
    //     //bools + u8s + u16s + u32s + u64s + pk
    //     (2 * 1) + (4 * 1) + 2 + (3 * 4) + (3 * 8) + (4 * 32)
    // }

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

    pub fn current_price(&self, side: TradeAction) -> Result<u64> {
        match (self.config.pool_type, side) {
            //Token pool = buys nfts = each sell into the pool LOWERS the price
            (PoolType::Token, TradeAction::Sell) => {
                self.shift_price_by_delta(Direction::Down, self.pool_nft_purchase_count)
            }
            //NFT pool = sells nfts = each buy from the pool INCREASES the price
            (PoolType::NFT, TradeAction::Buy) => {
                self.shift_price_by_delta(Direction::Up, self.pool_nft_sale_count)
            }
            //if sales > purchases, Trade pool acts as an NFT pool
            (PoolType::Trade, side) => {
                // The price of selling into a trade pool is 1 tick lower.
                // We simulate this by increasing the purchase count by 1.
                let offset = match side {
                    TradeAction::Buy => 0,
                    TradeAction::Sell => SPREAD_TICKS,
                };
                let mod_purchase_count =
                    unwrap_int!(self.pool_nft_purchase_count.checked_add(offset as u32));

                if self.pool_nft_sale_count > mod_purchase_count {
                    self.shift_price_by_delta(
                        Direction::Up,
                        unwrap_int!(self.pool_nft_sale_count.checked_sub(mod_purchase_count)),
                    )
                } else {
                    //else, Trade pool acts as a Token pool
                    self.shift_price_by_delta(
                        Direction::Down,
                        unwrap_int!(mod_purchase_count.checked_sub(self.pool_nft_sale_count)),
                    )
                }
            }
            _ => {
                throw_err!(WrongPoolType);
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
                            .checked_add(self.config.delta.into())?
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

pub enum TradeAction {
    Buy,  // Buying from the pool.
    Sell, // Selling into the pool.
}

// --------------------------------------- receipts

#[account]
pub struct NftDepositReceipt {
    pub bump: u8,
    pub pool: Pubkey,
    pub nft_mint: Pubkey,
    pub nft_escrow: Pubkey,
}

// todo since we're allowing the pool to go infinitely each direction, think through security / ux of limits
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
                bump: [1],
                sol_escrow_bump: [1],
                tswap: Pubkey::default(),
                owner: Pubkey::default(),
                whitelist: Pubkey::default(),
                config: PoolConfig {
                    pool_type,
                    curve_type,
                    starting_price,
                    delta,
                    honor_royalties: false,
                    mm_fee_bps,
                },
                pool_nft_purchase_count,
                pool_nft_sale_count,
                nfts_held: 0,
                sol_funding: 0,
                sol_escrow: Pubkey::default(),
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
        let p = Pool::new(
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
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL
        );

        //should have no effect
        p.pool_nft_sale_count += 999999;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL
        );

        p.pool_nft_purchase_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta
        );
        p.pool_nft_purchase_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 3
        );
        //pool can pay 0
        p.pool_nft_purchase_count += 7;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 10
        );
    }

    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_linear_token_pool_panic_overflow() {
        let delta = LAMPORTS_PER_SOL / 10;
        let p = Pool::new(
            PoolType::Token,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            11,
            0,
            None,
        );
        p.current_price(TradeAction::Sell).unwrap();
    }

    #[test]
    #[should_panic(expected = "WrongPoolType")]
    fn test_linear_token_pool_panic_on_buy() {
        let delta = LAMPORTS_PER_SOL / 10;
        let p = Pool::new(
            PoolType::Token,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            0,
            0,
            None,
        );
        p.current_price(TradeAction::Buy).unwrap();
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
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.pool_nft_purchase_count += 999999;
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);

        p.pool_nft_sale_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta
        );
        p.pool_nft_sale_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 3
        );
        //go much higher
        p.pool_nft_sale_count += 9999996;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 9999999
        );
    }

    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_linear_nft_pool_panic_overflow() {
        let delta = LAMPORTS_PER_SOL / 10 * 100;
        let p = Pool::new(
            PoolType::NFT,
            CurveType::Linear,
            LAMPORTS_PER_SOL * 100,
            delta,
            0,
            u32::MAX - 1, //get this to overflow
            None,
        );
        p.current_price(TradeAction::Buy).unwrap();
    }

    #[test]
    #[should_panic(expected = "WrongPoolType")]
    fn test_linear_nft_pool_panic_on_sell() {
        let delta = LAMPORTS_PER_SOL / 10 * 100;
        let p = Pool::new(
            PoolType::NFT,
            CurveType::Linear,
            LAMPORTS_PER_SOL * 100,
            delta,
            0,
            0,
            None,
        );
        p.current_price(TradeAction::Sell).unwrap();
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
        // NB: selling into the pool is always 1 delta lower than buying.

        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta
        );

        //pool's a buyer -> price goes down
        p.pool_nft_purchase_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL - delta
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 2
        );

        p.pool_nft_purchase_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL - delta * 3
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 4
        );
        //pool can pay 0
        p.pool_nft_purchase_count += 7;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL - delta * 10
        );
        // Sell price will overflow.

        //pool's neutral
        p.pool_nft_sale_count = 10;
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta
        );

        //pool's a seller -> price goes up
        p.pool_nft_sale_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL
        );
        p.pool_nft_sale_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 3
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL + delta * 2
        );
        //go much higher
        p.pool_nft_sale_count += 9999996;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 9999999
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL + delta * 9999998
        );
    }

    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_linear_trade_pool_panic_lower() {
        let delta = LAMPORTS_PER_SOL / 10;
        let p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            11,
            0,
            None,
        );
        p.current_price(TradeAction::Buy).unwrap();
    }

    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_linear_trade_pool_panic_sell_side_lower() {
        let delta = LAMPORTS_PER_SOL / 10;
        let p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            LAMPORTS_PER_SOL,
            delta,
            10, //10+1 tick for selling = overflow
            0,
            None,
        );
        p.current_price(TradeAction::Sell).unwrap();
    }

    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_linear_trade_pool_panic_upper() {
        let delta = LAMPORTS_PER_SOL * 10_000_000_000;
        let p = Pool::new(
            PoolType::Trade,
            CurveType::Linear,
            delta,
            delta,
            0,
            1, //just enough to overflow
            None,
        );
        p.current_price(TradeAction::Buy).unwrap();
    }

    #[test]
    fn test_linear_trade_pool_sell_side_upper() {
        let delta = LAMPORTS_PER_SOL * 10_000_000_000;
        let p = Pool::new(PoolType::Trade, CurveType::Linear, delta, delta, 0, 1, None);
        // This shouldn't oveflow for sell side (1 tick lower).
        assert_eq!(p.current_price(TradeAction::Sell).unwrap(), delta);
    }

    // --------------------------------------- exponential

    const MAX_BPS: u64 = HUNDRED_PCT_BPS as u64;

    fn calc_price_frac(price: u64, numer: u64, denom: u64) -> u64 {
        u64::try_from(
            PreciseNumber::new(price.into())
                .unwrap()
                .checked_mul(&PreciseNumber::new(numer.into()).unwrap())
                .unwrap()
                .checked_div(&PreciseNumber::new(denom.into()).unwrap())
                .unwrap()
                .to_imprecise()
                .unwrap(),
        )
        .unwrap()
    }

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
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL
        );

        //should have no effect
        p.pool_nft_sale_count += 999999;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL
        );

        p.pool_nft_purchase_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        p.pool_nft_purchase_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 13310)
        );

        p.pool_nft_purchase_count += 7;
        // This one has very small rounding error (within 1 bps).
        assert!((p.current_price(TradeAction::Sell).unwrap()) > LAMPORTS_PER_SOL * MAX_BPS / 25938);
        assert!((p.current_price(TradeAction::Sell).unwrap()) < LAMPORTS_PER_SOL * MAX_BPS / 25937);

        p.pool_nft_purchase_count += 90;
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 137806123)
        );
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
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.pool_nft_purchase_count += 999999;
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);

        p.pool_nft_sale_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL * 11000 / MAX_BPS
        );

        p.pool_nft_sale_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL * 13310 / MAX_BPS
        );

        p.pool_nft_sale_count += 7;
        // This one has very small rounding error (within 1 bps).
        assert!(p.current_price(TradeAction::Buy).unwrap() > LAMPORTS_PER_SOL * 25937 / MAX_BPS);
        assert!(p.current_price(TradeAction::Buy).unwrap() < LAMPORTS_PER_SOL * 25938 / MAX_BPS);

        p.pool_nft_sale_count += 90;
        // This one has very small rounding error (within 1 bps).
        assert!(
            p.current_price(TradeAction::Buy).unwrap() > LAMPORTS_PER_SOL * 137806123 / MAX_BPS
        );
        assert!(
            p.current_price(TradeAction::Buy).unwrap() < LAMPORTS_PER_SOL * 137806124 / MAX_BPS
        );
    }

    // todo fix
    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_expo_nft_pool_panic() {
        let delta = 1000;
        let p = Pool::new(
            PoolType::NFT,
            CurveType::Exponential,
            LAMPORTS_PER_SOL * 100,
            delta,
            0,
            u32::MAX - 1, // this will overflow
            None,
        );
        p.current_price(TradeAction::Buy).unwrap();
    }

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
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        //pool's a buyer -> price goes down
        p.pool_nft_purchase_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 12100)
        );
        p.pool_nft_purchase_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 13310)
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 14641
        );

        //pool's neutral
        p.pool_nft_sale_count = 3;
        assert_eq!(p.current_price(TradeAction::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        //pool's a seller -> price goes up
        p.pool_nft_sale_count += 1;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL * 11000 / MAX_BPS
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL
        );
        p.pool_nft_sale_count += 2;
        assert_eq!(
            p.current_price(TradeAction::Buy).unwrap(),
            LAMPORTS_PER_SOL * 13310 / MAX_BPS
        );
        assert_eq!(
            p.current_price(TradeAction::Sell).unwrap(),
            LAMPORTS_PER_SOL * 12100 / MAX_BPS
        );
    }

    #[test]
    #[should_panic(expected = "IntegerOverflow")]
    fn test_expo_trade_pool_panic_upper() {
        let delta = 1000;
        let p = Pool::new(
            PoolType::Trade,
            CurveType::Exponential,
            u64::MAX - 1,
            delta,
            0, //get this to overflow
            1,
            None,
        );
        p.current_price(TradeAction::Buy).unwrap();
    }

    #[test]
    fn test_expo_trade_pool_sell_side_upper() {
        let delta = 1000;
        let p = Pool::new(
            PoolType::Trade,
            CurveType::Exponential,
            u64::MAX - 1,
            delta,
            0,
            1,
            None,
        );
        // 1 tick lower, should not panic.
        assert_eq!(p.current_price(TradeAction::Sell).unwrap(), u64::MAX - 1);
    }
}

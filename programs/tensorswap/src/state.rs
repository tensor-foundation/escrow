use std::{cmp, fmt::Debug};

use mpl_token_auth_rules::payload::{Payload, PayloadType, ProofInfo, SeedsVec};
use mpl_token_metadata::{processor::AuthorizationData, state::Metadata};
use spl_math::precise_number::PreciseNumber;
use tensor_nft::calc_creators_fee;
use vipers::throw_err;

use crate::*;

// (!) DONT USE UNDERSCORES (3_000) OR WONT BE ABLE TO READ JS-SIDE
#[constant]
pub const CURRENT_TSWAP_VERSION: u8 = 1;

//version history (these don't match with IDL version):
// v2 = added edit pools functionality
#[constant]
pub const CURRENT_POOL_VERSION: u8 = 2;

#[constant]
pub const MAX_MM_FEES_BPS: u16 = 9999; //99%
#[constant]
pub const HUNDRED_PCT_BPS: u16 = 10000;
#[constant]
pub const MAX_DELTA_BPS: u16 = 9999; //99%

//how many ticks is the spread between a buy and sell for a trade pool
#[constant]
pub const SPREAD_TICKS: u8 = 1;

// --------------------------------------- fees

//(!) Keep in sync with TBID_FEE_BPS and SDK constants
#[constant]
pub const TSWAP_TAKER_FEE_BPS: u16 = 140;
//taken out of taker fee
#[constant]
pub const MAKER_REBATE_BPS: u16 = 40;

//fixed fee applied on top of initial snipe value
//eg if user wants to snipe for 100, we charge 1.5% on top
//(!) should always >= STANDARD_FEE_BPS
#[constant]
pub const SNIPE_FEE_BPS: u16 = 150;
//needed so that we don't get drained for creating PDAs (0.01 sol)
#[constant]
pub const SNIPE_MIN_FEE: u64 = 10000000;

//profit share, so eg if we snipe for 90 instead of 100 and profit share is 20%, we take home 20% * (100-90) = 2
#[constant]
pub const SNIPE_PROFIT_SHARE_BPS: u16 = 2000;

// TODO currently disabled
#[constant]
pub const TAKER_BROKER_PCT: u64 = 0;

// --------------------------------------- tswap

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct TSwapConfig {
    pub fee_bps: u16,
}

#[account]
pub struct TSwap {
    pub version: u8,
    pub bump: [u8; 1],
    /// @DEPRECATED, use constant above instead
    pub config: TSwapConfig,

    //More security sensitive than cosigner
    pub owner: Pubkey,
    pub fee_vault: Pubkey,
    pub cosigner: Pubkey,
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const TSWAP_SIZE: usize = 8 + 1 + 1 + 2 + 32 * 3;

impl TSwap {
    pub fn seeds(&self) -> [&[u8]; 1] {
        [&self.bump]
    }
}

// --------------------------------------- pool

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
            throw_err!(MaxTakerSellCountExceeded);
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
            throw_err!(MaxTakerSellCountTooSmall);
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
            throw_err!(WrongPoolType);
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
            return Ok(cmp::max(fee, SNIPE_MIN_FEE));
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
            metadata.data.seller_fee_basis_points,
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

// --------------------------------------- margin

// TODO: if size ever changes, be sure to update APPROX_SOL_MARGIN_RENT in tensor-infra
#[account]
pub struct MarginAccount {
    pub owner: Pubkey,
    pub name: [u8; 32],
    pub nr: u16,
    pub bump: [u8; 1],
    //needed to know if we can close margin account
    pub pools_attached: u32,
    // TODO: we forgot to track bids attached.
    // Revisit this maybe for margin account V2.
    //(!) this is important - otherwise rent will be miscalculated by anchor client-side
    pub _reserved: [u8; 64],
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const MARGIN_SIZE: usize = 8 + 32 + 32 + 2 + 1 + 4 + 64;

// --------------------------------------- single listing

#[account]
pub struct SingleListing {
    pub owner: Pubkey,
    pub nft_mint: Pubkey,
    pub price: u64,
    pub bump: [u8; 1],
    pub _reserved: [u8; 64],
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const SINGLE_LISTING_SIZE: usize = 8 + (32 * 2) + 8 + 1 + 64;

// --------------------------------------- receipts

/// Represents NFTs deposited into our protocol.
/// Always associated to (1) NFT mint (2) NFT escrow and (3) pool (every type).
#[account]
pub struct NftDepositReceipt {
    pub bump: u8,
    pub nft_authority: Pubkey,
    pub nft_mint: Pubkey,
    pub nft_escrow: Pubkey,
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const DEPOSIT_RECEIPT_SIZE: usize = 8 + 1 + 32 * 3;

// --------------------------------------- authority

/// Connector between a pool and all the NFTs in it, to be able to re-attach them to a different pool if needed
#[account]
pub struct NftAuthority {
    pub random_seed: [u8; 32],
    pub bump: [u8; 1],
    pub pool: Pubkey,
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const NFT_AUTHORITY_SIZE: usize = 8 + 1 + 32 + 32;

// --------------------------------------- escrows

/// Need dummy Anchor account so we can use `close` constraint.
#[account]
pub struct SolEscrow {}

// --------------------------------------- events

#[event]
pub struct BuySellEvent {
    #[index]
    pub current_price: u64,
    #[index]
    pub tswap_fee: u64,
    #[index]
    pub mm_fee: u64,
    #[index]
    pub creators_fee: u64,
}

#[event]
pub struct DelistEvent {
    #[index]
    pub current_price: u64,
}

// --------------------------------------- replicating mplex type for anchor IDL export
//have to do this because anchor won't include foreign structs in the IDL

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct AuthorizationDataLocal {
    pub payload: Vec<TaggedPayload>,
}
impl From<AuthorizationDataLocal> for AuthorizationData {
    fn from(val: AuthorizationDataLocal) -> Self {
        let mut p = Payload::new();
        val.payload.into_iter().for_each(|tp| {
            p.insert(tp.name, PayloadType::try_from(tp.payload).unwrap());
        });
        AuthorizationData { payload: p }
    }
}

//Unfortunately anchor doesn't like HashMaps, nor Tuples, so you can't pass in:
// HashMap<String, PayloadType>, nor
// Vec<(String, PayloadTypeLocal)>
// so have to create this stupid temp struct for IDL to serialize correctly
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct TaggedPayload {
    pub name: String,
    pub payload: PayloadTypeLocal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub enum PayloadTypeLocal {
    /// A plain `Pubkey`.
    Pubkey(Pubkey),
    /// PDA derivation seeds.
    Seeds(SeedsVecLocal),
    /// A merkle proof.
    MerkleProof(ProofInfoLocal),
    /// A plain `u64` used for `Amount`.
    Number(u64),
}
impl From<PayloadTypeLocal> for PayloadType {
    fn from(val: PayloadTypeLocal) -> Self {
        match val {
            PayloadTypeLocal::Pubkey(pubkey) => PayloadType::Pubkey(pubkey),
            PayloadTypeLocal::Seeds(seeds) => {
                PayloadType::Seeds(SeedsVec::try_from(seeds).unwrap())
            }
            PayloadTypeLocal::MerkleProof(proof) => {
                PayloadType::MerkleProof(ProofInfo::try_from(proof).unwrap())
            }
            PayloadTypeLocal::Number(number) => PayloadType::Number(number),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct SeedsVecLocal {
    /// The vector of derivation seeds.
    pub seeds: Vec<Vec<u8>>,
}
impl From<SeedsVecLocal> for SeedsVec {
    fn from(val: SeedsVecLocal) -> Self {
        SeedsVec { seeds: val.seeds }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct ProofInfoLocal {
    /// The merkle proof.
    pub proof: Vec<[u8; 32]>,
}
impl From<ProofInfoLocal> for ProofInfo {
    fn from(val: ProofInfoLocal) -> Self {
        ProofInfo { proof: val.proof }
    }
}

// --------------------------------------- tests

#[cfg(test)]
mod tests {
    use anchor_lang::solana_program::native_token::LAMPORTS_PER_SOL;

    use super::*;

    impl Pool {
        pub fn new(
            pool_type: PoolType,
            curve_type: CurveType,
            starting_price: u64,
            delta: u64,
            taker_sell_count: u32,
            taker_buy_count: u32,
            mm_fee_bps: Option<u16>,
        ) -> Self {
            Self {
                version: 1,
                bump: [1],
                sol_escrow_bump: [1],
                created_unix_seconds: 1234,
                tswap: Pubkey::default(),
                owner: Pubkey::default(),
                whitelist: Pubkey::default(),
                config: PoolConfig {
                    pool_type,
                    curve_type,
                    starting_price,
                    delta,
                    mm_compound_fees: true,
                    mm_fee_bps,
                },
                taker_sell_count,
                taker_buy_count,
                nfts_held: 0,
                sol_escrow: Pubkey::default(),
                stats: PoolStats::default(),
                nft_authority: Pubkey::default(),
                order_type: 0,
                frozen: None,
                margin: None,
                is_cosigned: false,
                last_transacted_seconds: 0,
                max_taker_sell_count: 10,
                // _reserved: [0; 4],
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
        p.config.mm_fee_bps = Some(2499);
        assert_eq!(p.calc_mm_fee(10).unwrap(), 2); //2.499 floored

        p.config.mm_fee_bps = Some(2499);
        assert_eq!(p.calc_mm_fee(100).unwrap(), 24); //24.99 floored

        p.config.mm_fee_bps = Some(2499);
        assert_eq!(p.calc_mm_fee(1000).unwrap(), 249); //249.9 floored
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
            p.calc_tswap_fee(LAMPORTS_PER_SOL).unwrap(),
            LAMPORTS_PER_SOL * TSWAP_TAKER_FEE_BPS as u64 / 10000
        );
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
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.taker_buy_count += 999999;
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), LAMPORTS_PER_SOL);

        p.taker_sell_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta
        );
        p.taker_sell_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 3
        );
        //pool can pay 0
        p.taker_sell_count += 7;
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
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
        p.current_price(TakerSide::Sell).unwrap();
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
        p.current_price(TakerSide::Buy).unwrap();
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
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.taker_sell_count += 999999;
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);

        p.taker_buy_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta
        );
        p.taker_buy_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 3
        );
        //go much higher
        p.taker_buy_count += 9999996;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
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
        p.current_price(TakerSide::Buy).unwrap();
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
        p.current_price(TakerSide::Sell).unwrap();
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

        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta
        );

        //pool's a buyer -> price goes down
        p.taker_sell_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL - delta
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 2
        );

        p.taker_sell_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL - delta * 3
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta * 4
        );
        //pool can pay 0
        p.taker_sell_count += 7;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL - delta * 10
        );
        // Sell price will overflow.

        //pool's neutral
        p.taker_buy_count = 10;
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL - delta
        );

        //pool's a seller -> price goes up
        p.taker_buy_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta
        );
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), LAMPORTS_PER_SOL);
        p.taker_buy_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 3
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL + delta * 2
        );
        //go much higher
        p.taker_buy_count += 9999996;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL + delta * 9999999
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
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
        p.current_price(TakerSide::Buy).unwrap();
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
        p.current_price(TakerSide::Sell).unwrap();
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
        p.current_price(TakerSide::Buy).unwrap();
    }

    #[test]
    fn test_linear_trade_pool_sell_side_upper() {
        let delta = LAMPORTS_PER_SOL * 10_000_000_000;
        let p = Pool::new(PoolType::Trade, CurveType::Linear, delta, delta, 0, 1, None);
        // This shouldn't oveflow for sell side (1 tick lower).
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), delta);
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
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.taker_buy_count += 999999;
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), LAMPORTS_PER_SOL);

        p.taker_sell_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        p.taker_sell_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 13310)
        );

        p.taker_sell_count += 7;
        // This one has very small rounding error (within 1 bps).
        assert!((p.current_price(TakerSide::Sell).unwrap()) > LAMPORTS_PER_SOL * MAX_BPS / 25938);
        assert!((p.current_price(TakerSide::Sell).unwrap()) < LAMPORTS_PER_SOL * MAX_BPS / 25937);

        p.taker_sell_count += 90;
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
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
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);

        //should have no effect
        p.taker_sell_count += 999999;
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);

        p.taker_buy_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL * 11000 / MAX_BPS
        );

        p.taker_buy_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL * 13310 / MAX_BPS
        );

        p.taker_buy_count += 7;
        // This one has very small rounding error (within 1 bps).
        assert!(p.current_price(TakerSide::Buy).unwrap() > LAMPORTS_PER_SOL * 25937 / MAX_BPS);
        assert!(p.current_price(TakerSide::Buy).unwrap() < LAMPORTS_PER_SOL * 25938 / MAX_BPS);

        p.taker_buy_count += 90;
        // This one has very small rounding error (within 1 bps).
        assert!(p.current_price(TakerSide::Buy).unwrap() > LAMPORTS_PER_SOL * 137806123 / MAX_BPS);
        assert!(p.current_price(TakerSide::Buy).unwrap() < LAMPORTS_PER_SOL * 137806124 / MAX_BPS);
    }

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
        p.current_price(TakerSide::Buy).unwrap();
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
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        //pool's a buyer -> price goes down
        p.taker_sell_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 12100)
        );
        p.taker_sell_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            calc_price_frac(LAMPORTS_PER_SOL, MAX_BPS, 13310)
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 14641
        );

        //pool's neutral
        p.taker_buy_count = 3;
        assert_eq!(p.current_price(TakerSide::Buy).unwrap(), LAMPORTS_PER_SOL);
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
            LAMPORTS_PER_SOL * MAX_BPS / 11000
        );

        //pool's a seller -> price goes up
        p.taker_buy_count += 1;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL * 11000 / MAX_BPS
        );
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), LAMPORTS_PER_SOL);
        p.taker_buy_count += 2;
        assert_eq!(
            p.current_price(TakerSide::Buy).unwrap(),
            LAMPORTS_PER_SOL * 13310 / MAX_BPS
        );
        assert_eq!(
            p.current_price(TakerSide::Sell).unwrap(),
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
        p.current_price(TakerSide::Buy).unwrap();
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
        assert_eq!(p.current_price(TakerSide::Sell).unwrap(), u64::MAX - 1);
    }
}

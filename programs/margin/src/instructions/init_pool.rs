//! User creating a (empty) pool to trade NFTs (buy, sell or both)
use tensor_whitelist::{self, Whitelist};
use vipers::{throw_err, try_or_err, Validate};

use self::constants::{CURRENT_POOL_VERSION, MAX_DELTA_BPS, MAX_MM_FEES_BPS};
use crate::{error::ErrorCode, *};

#[derive(Accounts)]
#[instruction(config: PoolConfig, auth_seeds: [u8; 32])]
pub struct InitPool<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        init, payer = owner,
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[config.pool_type as u8],
            &[config.curve_type as u8],
            &config.starting_price.to_le_bytes(),
            &config.delta.to_le_bytes()
        ],
        bump,
        space = POOL_SIZE,
    )]
    pub pool: Box<Account<'info, Pool>>,

    #[account(
        init, payer = owner,
        seeds = [
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump,
        space = 8
    )]
    pub sol_escrow: Box<Account<'info, SolEscrow>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// CHECK: used in seed derivation
    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(
        init, payer = owner,
        seeds = [b"nft_auth".as_ref(), &auth_seeds],
        bump,
        space = NFT_AUTHORITY_SIZE
    )]
    pub nft_authority: Box<Account<'info, NftAuthority>>,
}

impl<'info> InitPool<'info> {
    fn validate_pool_type(&self, config: PoolConfig) -> Result<()> {
        match config.pool_type {
            PoolType::NFT | PoolType::Token => {
                if config.mm_fee_bps.is_some() {
                    throw_err!(ErrorCode::FeesNotAllowed);
                }
            }
            PoolType::Trade => {
                if config.mm_fee_bps.is_none() {
                    throw_err!(ErrorCode::MissingFees);
                }
                if config.mm_fee_bps.unwrap() > MAX_MM_FEES_BPS {
                    throw_err!(ErrorCode::FeesTooHigh);
                }
            }
        }

        //for exponential pool delta can't be above 99.99% and has to fit into a u16
        if config.curve_type == CurveType::Exponential {
            let u16delta = try_or_err!(u16::try_from(config.delta), ErrorCode::ArithmeticError);
            if u16delta > MAX_DELTA_BPS {
                throw_err!(ErrorCode::DeltaTooLarge);
            }
        }

        Ok(())
    }
}

impl<'info> Validate<'info> for InitPool<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate_pool_type(config); ctx.accounts.validate())]
pub fn process_init_pool<'info>(
    ctx: Context<'_, '_, '_, 'info, InitPool<'info>>,
    config: PoolConfig,
    auth_seeds: [u8; 32],
    is_cosigned: bool,
    order_type: u8,
    max_taker_sell_count: Option<u32>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    if config.starting_price < 1 {
        throw_err!(ErrorCode::StartingPriceTooSmall);
    }

    pool.version = CURRENT_POOL_VERSION;
    pool.bump = [ctx.bumps.pool];
    pool.sol_escrow_bump = [ctx.bumps.sol_escrow];
    pool.created_unix_seconds = Clock::get()?.unix_timestamp;
    pool.config = config;

    pool.tswap = ctx.accounts.tswap.key();
    pool.owner = ctx.accounts.owner.key();
    pool.whitelist = ctx.accounts.whitelist.key();
    pool.sol_escrow = ctx.accounts.sol_escrow.key();

    pool.taker_buy_count = 0;
    pool.taker_sell_count = 0;
    pool.nfts_held = 0;

    pool.stats = PoolStats::default();

    //2-way link between the authority and the pool
    pool.nft_authority = ctx.accounts.nft_authority.key();

    if is_cosigned && config.pool_type != PoolType::Token {
        throw_err!(ErrorCode::WrongPoolType);
    }
    pool.is_cosigned = is_cosigned;
    pool.order_type = order_type;
    //in the future might decide we want to allow creation of frozen orders, but dont see the need rn
    pool.frozen = None;
    //all pools start off as non-marginated, and can be attached later
    pool.margin = None;
    pool.last_transacted_seconds = Clock::get()?.unix_timestamp;

    if let Some(max_taker_sell_count) = max_taker_sell_count {
        pool.max_taker_sell_count = max_taker_sell_count;
    }

    // --------------------------------------- serialize authority

    let auth = &mut ctx.accounts.nft_authority;

    auth.random_seed = auth_seeds;
    auth.bump = [ctx.bumps.nft_authority];

    //2-way link between the authority and the pool
    auth.pool = ctx.accounts.pool.key();

    Ok(())
}

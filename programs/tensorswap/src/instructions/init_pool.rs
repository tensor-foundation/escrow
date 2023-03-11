//! User creating a (empty) pool to trade NFTs (buy, sell or both)
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

use crate::*;

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
        space = 8 + Pool::SIZE,
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
        space = 8 + NftAuthority::SIZE
    )]
    pub nft_authority: Box<Account<'info, NftAuthority>>,
}

impl<'info> InitPool<'info> {
    fn validate_pool_type(&self, config: PoolConfig) -> Result<()> {
        match config.pool_type {
            PoolType::NFT | PoolType::Token => {
                if config.mm_fee_bps.is_some() {
                    throw_err!(FeesNotAllowed);
                }
            }
            PoolType::Trade => {
                if config.mm_fee_bps.is_none() {
                    throw_err!(MissingFees);
                }
                if config.mm_fee_bps.unwrap() > MAX_MM_FEES_BPS {
                    throw_err!(FeesTooHigh);
                }
            }
        }

        //for exponential pool delta can't be above 99.99% and has to fit into a u16
        if config.curve_type == CurveType::Exponential {
            let u16delta = try_or_err!(
                u16::try_from(config.delta),
                crate::ErrorCode::ArithmeticError
            );
            if u16delta > MAX_DELTA_BPS {
                throw_err!(DeltaTooLarge);
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
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, InitPool<'info>>,
    config: PoolConfig,
    auth_seeds: [u8; 32],
    is_cosigned: bool,
    order_type: u8,
    max_taker_sell_count: Option<u32>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    pool.version = CURRENT_POOL_VERSION;
    pool.bump = [unwrap_bump!(ctx, "pool")];
    pool.sol_escrow_bump = [unwrap_bump!(ctx, "sol_escrow")];
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
        throw_err!(WrongPoolType);
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
    auth.bump = [unwrap_bump!(ctx, "nft_authority")];

    //2-way link between the authority and the pool
    auth.pool = ctx.accounts.pool.key();

    Ok(())
}

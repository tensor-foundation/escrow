//! User creating a (empty) pool to trade NFTs (buy, sell or both)
use std::str::FromStr;

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
        if !config.honor_royalties {
            throw_err!(RoyaltiesEnabled);
        }

        match config.pool_type {
            PoolType::NFT | PoolType::Token => {
                if config.mm_fee_bps != None {
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
            let u16delta = try_or_err!(u16::try_from(config.delta), ArithmeticError);
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
) -> Result<()> {
    let whitelist = &ctx.accounts.whitelist;

    let hardcoded_whitelist_prog = Pubkey::from_str(TENSOR_WHITELIST_ADDR).unwrap();
    //we have to make sure the passed whitelist PDA is not malicious. Checks:
    // (Don't think this is necessary, but why not)
    //1/3: make sure it's owned by the hardcoded WL program
    if *whitelist.to_account_info().owner != hardcoded_whitelist_prog {
        throw_err!(BadWhitelist);
    }

    //2/3: make sure uuid + WL prog address -> correct seeds
    let (derived_whitelist, bump) =
        Pubkey::find_program_address(&[&whitelist.uuid], &hardcoded_whitelist_prog);
    if derived_whitelist != whitelist.key() || bump != whitelist.bump {
        throw_err!(BadWhitelist);
    }

    //3/3: make sure whitelist is verified
    if !whitelist.verified {
        throw_err!(WhitelistNotVerified);
    }

    // --------------------------------------- serialize pool

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

    // --------------------------------------- serialize authority

    let auth = &mut ctx.accounts.nft_authority;

    auth.random_seed = auth_seeds;
    auth.bump = [unwrap_bump!(ctx, "nft_authority")];

    //2-way link between the authority and the pool
    auth.pool = ctx.accounts.pool.key();

    Ok(())
}

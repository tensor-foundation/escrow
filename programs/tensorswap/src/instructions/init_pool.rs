//! User creating a (empty) pool to trade NFTs (buy, sell or both)
use crate::*;
use std::str::FromStr;
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct InitPool<'info> {
    /// Needed for pool seeds derivation
    #[account(seeds = [], bump = tswap.bump[0])]
    pub tswap: Box<Account<'info, TSwap>>,

    // todo test creating multiple pool types/curve types/prices/deltas
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
        //todo
        space = 8 + Pool::SIZE,
        // space = 8 + std::mem::size_of::<Pool>(),
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
    pub sol_escrow: Account<'info, SolEscrow>,

    /// Needed for pool seeds derivation / will be stored inside pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// Needed for pool seeds derivation / paying fr stuff
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitPool<'info> {
    // todo write tests for all these conditions
    fn validate_pool_type(&self, config: PoolConfig) -> Result<()> {
        if config.honor_royalties {
            throw_err!(RoyaltiesDisabled);
        }

        match config.pool_type {
            PoolType::NFT | PoolType::Token => {
                // todo test
                if config.mm_fee_bps != Some(0) && config.mm_fee_bps != None {
                    throw_err!(WrongPoolType);
                }
            }
            PoolType::Trade => {
                // todo test
                if config.mm_fee_bps.is_none() {
                    throw_err!(MissingFees);
                }
                // todo test
                if config.mm_fee_bps.unwrap() > MAX_MM_FEES_BPS {
                    throw_err!(FeesTooHigh);
                }
            }
        }

        //for exponential pool delta can't be above 99.99% and has to fit into a u16
        if config.curve_type == CurveType::Exponential {
            let u16delta = try_or_err!(u16::try_from(config.delta), ArithmeticError);
            // todo test
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
pub fn handler(ctx: Context<InitPool>, config: PoolConfig) -> Result<()> {
    // todo: test whitelist fails for unverified stuff

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

    //3/3: make sure whitelist is verified (todo might rethink for v2)
    if !whitelist.verified {
        throw_err!(WhitelistNotVerified);
    }

    let pool = &mut ctx.accounts.pool;

    pool.version = CURRENT_POOL_VERSION;
    pool.bump = [unwrap_bump!(ctx, "pool")];
    pool.sol_escrow_bump = [unwrap_bump!(ctx, "sol_escrow")];
    pool.tswap = ctx.accounts.tswap.key();
    pool.owner = ctx.accounts.owner.key();
    pool.whitelist = ctx.accounts.whitelist.key();
    pool.config = config;
    pool.taker_buy_count = 0;
    pool.taker_sell_count = 0;
    pool.nfts_held = 0;
    pool.sol_escrow = ctx.accounts.sol_escrow.key();

    Ok(())
}

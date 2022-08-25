use crate::*;
use std::str::FromStr;
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(pool_bump: u8, config: PoolConfig)]
pub struct InitPool<'info> {
    /// Needed for pool seeds derivation
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(init, payer = creator, seeds = [
        tswap.key().as_ref(),
        creator.key().as_ref(),
        whitelist.key().as_ref(),
        &[config.pool_type as u8],
        &[config.curve_type as u8],
        &config.starting_price.to_le_bytes(),
        &config.delta.to_le_bytes()
    ], bump, space = 8 + std::mem::size_of::<Pool>())]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// Needed for pool seeds derivation / paying fr stuff
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitPool<'info> {
    fn validate_pool_type(&self, config: PoolConfig) -> Result<()> {
        //user fees can only be collected on Trade pools
        //can't check fee_pct coz FE has to set it to 0 rather than null to avoid certain errors
        if config.pool_type != PoolType::Trade && config.mm_fee_vault.is_some() {
            throw_err!(WrongPoolType);
        }

        //if it is indeed a Trade pool, ensure fees are correctly configured
        if config.pool_type != PoolType::Trade {
            if config.mm_fee_vault.is_none() || config.mm_fee_bps.is_none() {
                throw_err!(MissingFees);
            }
            if config.mm_fee_bps.unwrap() > MAX_MM_FEES_BPS {
                throw_err!(FeesTooHigh);
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
pub fn handler(ctx: Context<InitPool>, pool_bump: u8, config: PoolConfig) -> Result<()> {
    // todo make sure config passed in fee/fee vault only allowed for trade pools
    let whitelist = &ctx.accounts.whitelist;

    let hardcoded_whitelist_prog = Pubkey::from_str(TENSOR_WHITELIST_ADDR).unwrap();

    //we have to make sure the passed whitelist PDA is not malicious. Checks:
    //1/3: make sure it's owned by the hardcoded WL program
    if *whitelist.to_account_info().owner != hardcoded_whitelist_prog {
        throw_err!(BadWhitelist);
    }

    //2/3: make sure uuid + WL prog address -> correct seeds
    let (derived_whitelist, _bump) =
        Pubkey::find_program_address(&[&whitelist.uuid], &hardcoded_whitelist_prog);
    if derived_whitelist != whitelist.key() {
        throw_err!(BadWhitelist);
    }

    //3/3: make sure whitelist is verified (todo might rethink for v2)
    if !whitelist.verified {
        throw_err!(WhitelistNotVerified);
    }

    let pool = &mut ctx.accounts.pool;

    pool.version = CURRENT_POOL_VERSION;
    pool.pool_bump = [pool_bump];
    pool.tswap = ctx.accounts.tswap.key();
    pool.creator = ctx.accounts.creator.key();
    pool.whitelist = ctx.accounts.whitelist.key();
    pool.config = config;
    pool.current_price = config.starting_price;
    pool.pool_bought_times = 0;
    pool.nfts_held = 0;
    pool.is_active = false;

    Ok(())
}

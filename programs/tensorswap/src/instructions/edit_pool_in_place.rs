//! User editing a pool, where the params that change don't impact the seeds (hence in place)
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct EditPoolInPlace<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        mut,
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[config.pool_type as u8],
            &[config.curve_type as u8],
            &config.starting_price.to_le_bytes(),
            &config.delta.to_le_bytes()
        ],
        bump = pool.bump[0],
        has_one = tswap, has_one = whitelist, has_one = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

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
}

impl<'info> Validate<'info> for EditPoolInPlace<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.version != CURRENT_POOL_VERSION {
            throw_err!(WrongPoolVersion);
        }
        if self.pool.frozen.is_some() {
            throw_err!(PoolFrozen);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(
    ctx: Context<EditPoolInPlace>,
    is_cosigned: Option<bool>,
    max_taker_sell_count: Option<u32>,
    mm_compound_fees: Option<bool>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // --------------------------------------- (!!!) SYNC WITH EDIT POOL
    // (!) code is formatted differently (clippy complains) but should do the same

    //need to be able to adjust this boolean when broad order <--> narrow (trait specific)
    if let Some(is_cosigned) = is_cosigned {
        //currently bids only
        if pool.config.pool_type != PoolType::Token {
            throw_err!(WrongPoolType);
        }
        pool.is_cosigned = is_cosigned;
    }

    if let Some(max_taker_sell_count) = max_taker_sell_count {
        pool.valid_max_sell_count(max_taker_sell_count)?;
        pool.max_taker_sell_count = max_taker_sell_count;
    }

    // --------------------------------------- (!!!) SYNC WITH EDIT POOL END

    //in the other edit ix we do this via passing in a new config
    if let Some(mm_compound_fees) = mm_compound_fees {
        pool.config.mm_compound_fees = mm_compound_fees;
    }

    Ok(())
}

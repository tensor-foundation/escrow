use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct ReallocPool<'info> {
    #[account(
        seeds = [],
        bump = tswap.bump[0],
        has_one = cosigner
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(mut,
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
        has_one = tswap, has_one = owner, has_one = whitelist,
        realloc = POOL_SIZE,
        realloc::payer = cosigner,
        realloc::zero = false,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// CHECK: used in seed derivation - NOT A SIGNER, COZ WE'RE MIGRATING ON THEIR BEHALF
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub cosigner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for ReallocPool<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.version != 1 {
            throw_err!(WrongPool);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<ReallocPool>) -> Result<()> {
    Ok(())
}

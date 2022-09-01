//! User (owner) closing their pool and reclaims rent (+ SOL escrow)
use crate::*;
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct ClosePool<'info> {
    /// Needed for pool seeds derivation
    #[account(seeds = [], bump = tswap.bump[0])]
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
        has_one = tswap, has_one = owner, has_one = whitelist, has_one = sol_escrow,
        close = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
        close = owner,
    )]
    pub sol_escrow: Account<'info, SolEscrow>,

    /// CHECK: Needed for pool seeds derivation, has_one = whitelist in pool
    pub whitelist: UncheckedAccount<'info>,

    /// Needed for pool seeds derivation / paying fr stuff
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for ClosePool<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.nfts_held > 0 {
            throw_err!(ExistingNfts);
        }

        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<ClosePool>) -> Result<()> {
    // todo: test if closing pool also moves money from escrow
    Ok(())
}

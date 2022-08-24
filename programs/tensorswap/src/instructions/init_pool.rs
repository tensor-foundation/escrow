use crate::*;

#[derive(Accounts)]
#[instruction(auth_bump: u8, pool_bump: u8, root_hash: [u8; 32], config: PoolConfig)]
pub struct InitPool<'info> {
    #[account(has_one = authority)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: via seed derivation macro below
    #[account(seeds = [tswap.key().as_ref()], bump = auth_bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(init, payer = creator, seeds = [
        tswap.key().as_ref(),
        creator.key().as_ref(),
        &root_hash,
        &[config.pool_type as u8],
        &[config.curve_type as u8],
        &config.starting_price.to_le_bytes(),
        &config.delta.to_le_bytes()
    ], bump, space = 8 + std::mem::size_of::<Pool>())]
    pub pool: Box<Account<'info, Pool>>,

    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for InitPool<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(
    ctx: Context<InitPool>,
    pool_bump: u8,
    root_hash: [u8; 32],
    config: PoolConfig,
) -> Result<()> {
    // todo make sure config passed in fee/fee vault only allowed for trade pools

    let pool = &mut ctx.accounts.pool;

    pool.version = CURRENT_POOL_VERSION;
    pool.pool_bump = [pool_bump];
    pool.tswap = ctx.accounts.tswap.key();
    pool.creator = ctx.accounts.creator.key();
    pool.collection = Collection::new(root_hash);
    pool.config = config;
    pool.trade_count = 0;
    pool.nfts_held = 0;
    pool.is_active = false;

    Ok(())
}

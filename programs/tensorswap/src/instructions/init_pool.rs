use anchor_lang::prelude::*;
use vipers::prelude::*;

#[derive(Accounts)]
pub struct InitPool<'info> {
    /// CHECK:
    #[account(mut)]
    pub hello_world: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<InitPool>) -> Result<()> {
    Ok(())
}

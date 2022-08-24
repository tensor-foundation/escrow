use anchor_lang::prelude::*;
use vipers::prelude::*;

#[derive(Accounts)]
pub struct InitPool<'info> {
    /// CHECK:
    #[account(mut)]
    pub hello_world: UncheckedAccount<'info>,
}

impl<'info> Validate<'info> for InitPool<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<InitPool>) -> Result<()> {
    Ok(())
}

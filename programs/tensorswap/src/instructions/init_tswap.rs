use crate::*;

#[derive(Accounts)]
pub struct InitTSwap<'info> {
    #[account(init, payer = payer, space = 8 + std::mem::size_of::<Tensorswap>())]
    pub tswap: Account<'info, Tensorswap>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTSwap>) -> Result<()> {
    ctx.accounts.tswap.hello = 123;

    Ok(())
}

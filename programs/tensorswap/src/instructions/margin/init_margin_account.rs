use crate::*;

#[derive(Accounts)]
#[instruction(margin_nr: u16)]
pub struct InitMarginAccount<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: if an account with this nr already exists, init will fail
    #[account(
        init, payer = owner,
        seeds = [
            b"margin".as_ref(),
            // TODO: remove tswap from seed in V2 (annoying to have to pass account eg in CPIs).
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_nr.to_le_bytes()
        ],
        bump,
        space = MARGIN_SIZE,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for InitMarginAccount<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<InitMarginAccount>, margin_nr: u16, name: [u8; 32]) -> Result<()> {
    let margin = &mut ctx.accounts.margin_account;

    margin.owner = ctx.accounts.owner.key();
    margin.name = name;
    margin.nr = margin_nr;
    margin.bump = [ctx.bumps.margin_account];

    Ok(())
}

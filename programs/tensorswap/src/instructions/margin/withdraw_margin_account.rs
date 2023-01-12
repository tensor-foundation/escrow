use crate::*;

#[derive(Accounts)]
pub struct WithdrawMarginAccount<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for WithdrawMarginAccount<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

impl<'info> WithdrawMarginAccount<'info> {
    fn transfer_lamports_to_owner(&self, lamports: u64) -> Result<()> {
        transfer_lamports_from_tswap(
            &self.margin_account.to_account_info(),
            &self.owner.to_account_info(),
            lamports,
        )
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<WithdrawMarginAccount>, lamports: u64) -> Result<()> {
    // do the transfer
    ctx.accounts.transfer_lamports_to_owner(lamports)?;

    Ok(())
}

use anchor_lang::prelude::*;
use tensor_toolbox::transfer_lamports_from_pda;

use crate::{MarginAccount, TSwap};

#[derive(Accounts)]
pub struct WithdrawMarginAccount<'info> {
    #[account(seeds = [], bump = tswap.bump[0])]
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

impl<'info> WithdrawMarginAccount<'info> {
    fn transfer_lamports_to_owner(&self, lamports: u64) -> Result<()> {
        transfer_lamports_from_pda(
            &self.margin_account.to_account_info(),
            &self.owner.to_account_info(),
            lamports,
        )
    }
}

pub fn process_withdraw_margin_account(
    ctx: Context<WithdrawMarginAccount>,
    lamports: u64,
) -> Result<()> {
    // do the transfer
    ctx.accounts.transfer_lamports_to_owner(lamports)?;

    Ok(())
}

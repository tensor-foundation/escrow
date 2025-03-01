use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::{MarginAccount, TSwap};

#[derive(Accounts)]
pub struct DepositMarginAccount<'info> {
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

impl<'info> DepositMarginAccount<'info> {
    fn transfer_lamports(&self, lamports: u64) -> Result<()> {
        invoke(
            &system_instruction::transfer(self.owner.key, &self.margin_account.key(), lamports),
            &[
                self.owner.to_account_info(),
                self.margin_account.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(Into::into)
    }
}

pub fn process_deposit_margin_account(
    ctx: Context<DepositMarginAccount>,
    lamports: u64,
) -> Result<()> {
    ctx.accounts.transfer_lamports(lamports)?;

    Ok(())
}

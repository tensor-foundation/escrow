use anchor_lang::prelude::*;

use crate::{MarginAccount, TSwap};

#[derive(Accounts)]
pub struct CloseMarginAccount<'info> {
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
        close = owner
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// Since we're storing all funds on the account itself, this will drain the funds to the owner
pub fn process_close_margin_account(_ctx: Context<CloseMarginAccount>) -> Result<()> {
    Ok(())
}

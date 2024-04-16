use anchor_lang::prelude::*;
use std::str::FromStr;
use tensor_toolbox::transfer_lamports_from_pda;

use crate::{MarginAccount, TSwap};

#[derive(Accounts)]
#[instruction(bump: u8, pool_id: [u8; 32])]
pub struct WithdrawMarginAccountCpiTAmm<'info> {
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

    // Use the pool account as the signing PDA for this instruction.
    // The seeds check ensures it is a valid Pool account from the TAMM program.
    #[account(
        seeds=[b"pool".as_ref(), owner.key().as_ref(), pool_id.as_ref()],
        seeds::program = Pubkey::from_str("TAMMqgJYcquwwj2tCdNUerh4C2bJjmghijVziSEf5tA").unwrap(),
        bump = bump,
    )]
    pub pool: Signer<'info>,

    /// CHECK: has_one on margin_account
    pub owner: UncheckedAccount<'info>,

    /// CHECK: can only be passed in by TAMM, since it has to sign off with Pool PDA.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_withdraw_margin_account_from_tamm(
    ctx: Context<WithdrawMarginAccountCpiTAmm>,
    lamports: u64,
) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

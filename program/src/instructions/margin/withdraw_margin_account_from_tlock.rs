use anchor_lang::prelude::*;
use std::str::FromStr;
use tensor_nft::transfer_lamports_from_pda;

use crate::{get_tswap_addr, MarginAccount};

#[derive(Accounts)]
#[instruction(bump: u8, order_id: [u8; 32])]
pub struct WithdrawMarginAccountCpiTLock<'info> {
    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            get_tswap_addr().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    // this order state can only be derived from TLOCK program for a given owner
    // and because it's a signer only TLOCK can call this
    // Don't want to import tlock package just because of the key, so hardcoding
    #[account(
        seeds=[b"order_state".as_ref(), owner.key().as_ref(), order_id.as_ref()],
        seeds::program = Pubkey::from_str("TLoCKic2wGJm7VhZKumih4Lc35fUhYqVMgA4j389Buk").unwrap(),
        bump = bump,
    )]
    pub order_state: Signer<'info>,

    /// CHECK: has_one on margin_account, seeds in order_state
    pub owner: UncheckedAccount<'info>,

    /// CHECK: can only be passed in by TLOCK, since it has to sign off with order pda
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_withdraw_margin_account_from_tlock(
    ctx: Context<WithdrawMarginAccountCpiTLock>,
    lamports: u64,
) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

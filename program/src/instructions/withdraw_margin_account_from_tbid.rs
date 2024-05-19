use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use std::str::FromStr;
use tensor_toolbox::transfer_lamports_from_pda;

use crate::{MarginAccount, TSwap};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct WithdrawMarginAccountCpi<'info> {
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

    // this bid state can only be derived from TBID program for a given mint and owner
    // and because it's a signer only TBID can call this
    // Don't want to import tensor_bid package just because of the key, so hardcoding
    #[account(
        seeds=[b"bid_state".as_ref(), owner.key().as_ref(), nft_mint.key().as_ref()],
        seeds::program = Pubkey::from_str("TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv").unwrap(),
        bump = bump,
    )]
    pub bid_state: Signer<'info>,

    /// CHECK: has_one on margin_account, seeds in bid_state
    pub owner: UncheckedAccount<'info>,

    /// CHECK: seeds in bid_state
    pub nft_mint: Box<InterfaceAccount<'info, Mint>>,

    /// CHECK: can only be passed in by TBID, since it has to sign off with bid pda
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_withdraw_margin_account_from_tbid(
    ctx: Context<WithdrawMarginAccountCpi>,
    lamports: u64,
) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

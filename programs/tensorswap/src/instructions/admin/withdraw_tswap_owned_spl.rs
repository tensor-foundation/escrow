//! Program owner (Tensor) withdrawing spl tokens
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

use crate::*;

#[derive(Accounts)]
pub struct WithdrawTswapOwnedSpl<'info> {
    #[account(mut, seeds = [], bump = tswap.bump[0], has_one = cosigner, has_one = owner)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: initialized once on init, requires owner sign-off later
    /// We ask also for a signature just to make sure this wallet can actually sign things
    pub cosigner: Signer<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut,
        token::mint = spl_mint,
        token::authority = tswap
    )]
    pub spl_source: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = spl_mint,
        associated_token::authority = owner,
    )]
    pub spl_dest: Box<InterfaceAccount<'info, TokenAccount>>,
    pub spl_mint: Box<InterfaceAccount<'info, Mint>>,

    //misc
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> WithdrawTswapOwnedSpl<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, TransferChecked<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            TransferChecked {
                from: self.spl_source.to_account_info(),
                to: self.spl_dest.to_account_info(),
                authority: self.tswap.to_account_info(),
                mint: self.spl_mint.to_account_info(),
            },
        )
    }
}

pub fn handler(ctx: Context<WithdrawTswapOwnedSpl>, amount: u64) -> Result<()> {
    token_interface::transfer_checked(
        ctx.accounts
            .transfer_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
        amount,
        // decimals
        0,
    )?;

    Ok(())
}

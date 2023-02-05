//! Program owner (Tensor) withdrawing accumulated tswap fees
use crate::*;

#[derive(Accounts)]
pub struct WithdrawTswapFees<'info> {
    #[account(mut, seeds = [], bump = tswap.bump[0], has_one = cosigner, has_one = owner)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: initialized once on init, requires owner sign-off later
    /// We ask also for a signature just to make sure this wallet can actually sign things
    pub cosigner: Signer<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: owner can decide to send anywhere
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawTswapFees>, lamports: u64) -> Result<()> {
    transfer_lamports_from_tswap(
        &ctx.accounts.tswap.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )?;

    Ok(())
}

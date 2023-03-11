use crate::*;

#[access_control(ctx.accounts.validate_mm_fee_transfer())]
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawSol<'info>>,
    lamports: u64,
) -> Result<()> {
    ctx.accounts
        .transfer_lamports(&ctx.accounts.pool.to_account_info(), lamports)
}

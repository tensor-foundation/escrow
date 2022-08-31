use crate::*;
#[cfg(not(feature = "testing"))]
use std::str::FromStr;

#[derive(Accounts)]
pub struct InitTSwap<'info> {
    // NB: we can call this multiple times (init_if_needed) eg to update fee BPS.
    #[account(init_if_needed, seeds = [], bump, payer = owner, space = 8 + TSwap::SIZE)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: initialized only once,
    #[cfg_attr(not(feature = "testing"), account(address = Pubkey::from_str(TSWAP_FEE_VAULT).unwrap()))]
    pub fee_vault: UncheckedAccount<'info>,

    #[cfg_attr(not(feature = "testing"), account(address = Pubkey::from_str(ROOT_AUTHORITY).unwrap()))]
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for InitTSwap<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<InitTSwap>) -> Result<()> {
    let tswap = &mut ctx.accounts.tswap;

    tswap.version = CURRENT_TSWAP_VERSION;
    tswap.bump = [unwrap_bump!(ctx, "tswap")];
    tswap.owner = ctx.accounts.owner.key();
    tswap.config = TSwapConfig {
        fee_bps: TSWAP_FEE_BPS,
    };
    tswap.fee_vault = ctx.accounts.fee_vault.key();

    Ok(())
}

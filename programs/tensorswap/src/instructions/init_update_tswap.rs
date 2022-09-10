//! Program owner (Tensor) creating the program authority + metadata (eg swap fees) PDA account (TSwap)
use vipers::throw_err;

use crate::*;
#[cfg(not(feature = "testing"))]
use std::str::FromStr;

#[derive(Accounts)]
pub struct InitUpdateTSwap<'info> {
    // NB: we can call this multiple times (init_if_needed) eg to update fee BPS.
    #[account(init_if_needed, seeds = [], bump, payer = owner, space = 8 + TSwap::SIZE)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: initialized once on init, requires owner sign-off later
    pub fee_vault: UncheckedAccount<'info>,

    /// CHECK: initialized once on init, requires owner sign-off later
    /// We ask also for a signature just to make sure this wallet can actually sign things
    pub cosigner: Signer<'info>,

    #[cfg_attr(not(feature = "testing"), account(address = Pubkey::from_str(ROOT_AUTHORITY).unwrap()))]
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for InitUpdateTSwap<'info> {
    fn validate(&self) -> Result<()> {
        let owner = self.tswap.owner;

        //if owner already present, make sure it's signing off on the update
        if owner != Pubkey::default() && owner != self.owner.key() {
            throw_err!(BadTSwapOwner);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<InitUpdateTSwap>, config: TSwapConfig) -> Result<()> {
    let tswap = &mut ctx.accounts.tswap;

    tswap.version = CURRENT_TSWAP_VERSION;
    tswap.bump = [unwrap_bump!(ctx, "tswap")];
    tswap.owner = ctx.accounts.owner.key();
    tswap.config = config;
    tswap.fee_vault = ctx.accounts.fee_vault.key();
    tswap.cosigner = ctx.accounts.cosigner.key();

    Ok(())
}

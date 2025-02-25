//! Program owner (Tensor) creating the program authority + metadata (eg swap fees) PDA account (TSwap)

use anchor_lang::prelude::*;
use tensor_vipers::{throw_err, Validate};

use crate::{constants::CURRENT_TSWAP_VERSION, error::ErrorCode, TSwap, TSwapConfig, TSWAP_SIZE};

#[derive(Accounts)]
pub struct InitUpdateTSwap<'info> {
    // NB: we can call this multiple times (init_if_needed) eg to update fee BPS.
    #[account(init_if_needed, seeds = [], bump, payer = owner, space = TSWAP_SIZE)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: initialized once on init, requires owner sign-off later
    pub fee_vault: UncheckedAccount<'info>,

    /// CHECK: initialized once on init, requires owner sign-off later
    /// We ask also for a signature just to make sure this wallet can actually sign things
    pub cosigner: Signer<'info>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,

    pub new_owner: Signer<'info>,
}

impl<'info> Validate<'info> for InitUpdateTSwap<'info> {
    fn validate(&self) -> Result<()> {
        let owner = self.tswap.owner;

        let tswap_info = self.tswap.to_account_info();
        let disc = &tswap_info.try_borrow_data()?[0..8];

        // Account must be uninitialized or owner must sign off on the update.
        if disc != [0u8; 8] && owner != self.owner.key() {
            throw_err!(ErrorCode::BadOwner);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn process_init_update_tswap(ctx: Context<InitUpdateTSwap>, config: TSwapConfig) -> Result<()> {
    let tswap = &mut ctx.accounts.tswap;

    tswap.version = CURRENT_TSWAP_VERSION;
    tswap.bump = [ctx.bumps.tswap];
    tswap.owner = ctx.accounts.new_owner.key();
    tswap.config = config;
    tswap.fee_vault = ctx.accounts.fee_vault.key();
    tswap.cosigner = ctx.accounts.cosigner.key();

    Ok(())
}

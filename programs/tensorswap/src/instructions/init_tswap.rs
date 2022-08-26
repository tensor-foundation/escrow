use crate::*;
use std::str::FromStr;

#[derive(Accounts)]
#[instruction(auth_bump: u8)]
pub struct InitTSwap<'info> {
    #[account(init, payer = owner, space = 8 + std::mem::size_of::<TSwap>())]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: via seed derivation macro below
    #[account(seeds = [tswap.key().as_ref()], bump = auth_bump)]
    pub authority: UncheckedAccount<'info>,

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
pub fn handler(ctx: Context<InitTSwap>, auth_bump: u8) -> Result<()> {
    let tswap = &mut ctx.accounts.tswap;

    tswap.version = CURRENT_TSWAP_VERSION;
    tswap.authority = ctx.accounts.authority.key();
    tswap.auth_seed = tswap.key();
    tswap.auth_bump = [auth_bump];
    tswap.owner = ctx.accounts.owner.key();
    tswap.config = TSwapConfig {
        fee_bps: TSWAP_FEE_BPS,
    };
    tswap.fee_vault = Pubkey::from_str(TSWAP_FEE_VAULT).unwrap();

    Ok(())
}

use crate::*;
use std::str::FromStr;

#[derive(Accounts)]
pub struct InitTSwap<'info> {
    #[account(init, seeds = [], bump, payer = owner, space = 8 + std::mem::size_of::<TSwap>())]
    pub tswap: Box<Account<'info, TSwap>>,

    // todo: anyone can call this: add address constraint to hardcoded account
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
    tswap.fee_vault = Pubkey::from_str(TSWAP_FEE_VAULT).unwrap();

    Ok(())
}

use crate::{get_tswap_addr, MarginAccount};
use anchor_lang::prelude::*;
use std::str::FromStr;
use tensor_toolbox::transfer_lamports_from_pda;
use tensor_vipers::Validate;

use super::{assert_discriminator, constants::TAMM_POOL_DISCRIMINATOR};

#[derive(Accounts)]
#[instruction(bump: u8, pool_id: [u8; 32])]
pub struct WithdrawMarginAccountCpiTAmm<'info> {
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

    // Use the pool account as the signing PDA for this instruction.
    // The seeds check ensures it is a valid Pool account from the TAMM program.
    #[account(
        seeds=[b"pool".as_ref(), owner.key().as_ref(), pool_id.as_ref()],
        seeds::program = Pubkey::from_str("TAMM6ub33ij1mbetoMyVBLeKY5iP41i4UPUJQGkhfsg").unwrap(),
        bump = bump,
    )]
    pub pool: Signer<'info>,

    /// CHECK: has_one on margin_account
    pub owner: UncheckedAccount<'info>,

    /// CHECK: can only be passed in by TAMM, since it has to sign off with Pool PDA.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for WithdrawMarginAccountCpiTAmm<'info> {
    fn validate(&self) -> Result<()> {
        assert_discriminator(&self.pool.to_account_info(), &TAMM_POOL_DISCRIMINATOR)?;

        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn process_withdraw_margin_account_from_tamm(
    ctx: Context<WithdrawMarginAccountCpiTAmm>,
    lamports: u64,
) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

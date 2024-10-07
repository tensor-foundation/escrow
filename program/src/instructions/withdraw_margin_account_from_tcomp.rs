use anchor_lang::prelude::*;
use std::str::FromStr;
use tensor_toolbox::transfer_lamports_from_pda;
use tensor_vipers::Validate;

use crate::{get_tswap_addr, MarginAccount};

use super::{assert_discriminator, constants::TCOMP_BID_STATE_DISCRIMINATOR};

#[derive(Accounts)]
#[instruction(bump: u8, bid_id: Pubkey)]
pub struct WithdrawMarginAccountCpiTcomp<'info> {
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

    // this bid state can only be derived from TCOMP program for a given owner
    // and because it's a signer only TCOMP can call this
    // Don't want to import tcomp package just because of the key, so hardcoding
    #[account(
        seeds=[b"bid_state".as_ref(), owner.key().as_ref(), bid_id.as_ref()],
        seeds::program = Pubkey::from_str("TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp").unwrap(),
        bump = bump,
    )]
    pub bid_state: Signer<'info>,

    /// CHECK: has_one on margin_account, seeds in bid_state
    pub owner: UncheckedAccount<'info>,

    /// CHECK: can only be passed in by TCOMP, since it has to sign off with bid pda
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for WithdrawMarginAccountCpiTcomp<'info> {
    fn validate(&self) -> Result<()> {
        assert_discriminator(
            &self.bid_state.to_account_info(),
            &TCOMP_BID_STATE_DISCRIMINATOR,
        )?;

        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn process_withdraw_margin_account_from_tcomp(
    ctx: Context<WithdrawMarginAccountCpiTcomp>,
    lamports: u64,
) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

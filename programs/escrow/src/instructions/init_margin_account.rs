use anchor_lang::prelude::*;

use crate::{MarginAccount, TSwap, MARGIN_SIZE};

#[derive(Accounts)]
#[instruction(margin_nr: u16)]
pub struct InitMarginAccount<'info> {
    #[account(seeds = [], bump = tswap.bump[0])]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        init,
        payer = owner,
        seeds = [
            b"margin".as_ref(),
            // TODO: remove tswap from seed in V2 (annoying to have to pass account eg in CPIs).
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_nr.to_le_bytes()
        ],
        bump,
        space = MARGIN_SIZE,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn process_init_margin_account(
    ctx: Context<InitMarginAccount>,
    margin_nr: u16,
    name: [u8; 32],
) -> Result<()> {
    let margin = &mut ctx.accounts.margin_account;

    margin.owner = ctx.accounts.owner.key();
    margin.name = name;
    margin.nr = margin_nr;
    margin.bump = [ctx.bumps.margin_account];

    Ok(())
}

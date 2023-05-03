use std::str::FromStr;

use anchor_spl::token::Mint;

use crate::*;

#[derive(Accounts)]
pub struct WithdrawMarginAccount<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for WithdrawMarginAccount<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

impl<'info> WithdrawMarginAccount<'info> {
    fn transfer_lamports_to_owner(&self, lamports: u64) -> Result<()> {
        transfer_lamports_from_pda(
            &self.margin_account.to_account_info(),
            &self.owner.to_account_info(),
            lamports,
        )
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<WithdrawMarginAccount>, lamports: u64) -> Result<()> {
    // do the transfer
    ctx.accounts.transfer_lamports_to_owner(lamports)?;

    Ok(())
}

// --------------------------------------- cpi (tbid)

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct WithdrawMarginAccountCpi<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    // this bid state can only be derived from TBID program for a given mint and owner
    // and because it's a signer only TBID can call this
    #[account(mut,
        seeds=[b"bid_state".as_ref(), owner.key().as_ref(), nft_mint.key().as_ref()],
        seeds::program = Pubkey::from_str("TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv").unwrap(),
        bump = bump,
    )]
    pub bid_state: Signer<'info>,

    /// CHECK: has_one on margin_account, seeds in bid_state
    pub owner: UncheckedAccount<'info>,

    /// CHECK: seeds in bid_state
    pub nft_mint: Box<Account<'info, Mint>>,

    /// CHECK: can only be passed in by TBID, since it has to sign off with bid pda
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler_cpi(ctx: Context<WithdrawMarginAccountCpi>, lamports: u64) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

// --------------------------------------- cpi (tcomp)

#[derive(Accounts)]
#[instruction(bump: u8, bid_id: Pubkey)]
pub struct WithdrawMarginAccountCpiTcomp<'info> {
    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            Pubkey::from_str(TSWAP_ADDR).unwrap().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    // this bid state can only be derived from TBID program for a given mint and owner
    // and because it's a signer only TBID can call this
    #[account(mut,
        seeds=[b"bid_state".as_ref(), owner.key().as_ref(), bid_id.as_ref()],
        seeds::program = Pubkey::from_str("TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp").unwrap(),
        bump = bump,
    )]
    pub bid_state: Signer<'info>,

    /// CHECK: has_one on margin_account, seeds in bid_state
    pub owner: UncheckedAccount<'info>,

    /// CHECK: can only be passed in by TBID, since it has to sign off with bid pda
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler_cpi_tcomp(ctx: Context<WithdrawMarginAccountCpiTcomp>, lamports: u64) -> Result<()> {
    transfer_lamports_from_pda(
        &ctx.accounts.margin_account.to_account_info(),
        &ctx.accounts.destination.to_account_info(),
        lamports,
    )
}

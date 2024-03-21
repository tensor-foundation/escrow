use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, CloseAccount, Mint, Token2022, TokenAccount, TransferChecked},
};
use tensor_toolbox::token_2022::wns::{wns_approve, wns_validate_mint, ApproveAccounts};

use crate::{error::ErrorCode, *};

#[derive(Accounts)]
pub struct WnsDelist<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = nft_mint,
        associated_token::authority = owner,
    )]
    pub nft_dest: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        constraint = nft_mint.key() == nft_escrow.mint @ ErrorCode::WrongMint,
        constraint = nft_mint.key() == single_listing.nft_mint @ ErrorCode::WrongMint,
        mint::token_program = anchor_spl::token_interface::spl_token_2022::id(),
    )]
    pub nft_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    /// This is closed below (dest = owner)
    #[account(
        mut,
        seeds=[
            b"nft_escrow".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint,
        token::authority = tswap,
    )]
    pub nft_escrow: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut,
        seeds=[
            b"single_listing".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump = single_listing.bump[0],
        has_one = nft_mint,
        has_one = owner,
        close = payer,
    )]
    pub single_listing: Box<Account<'info, SingleListing>>,

    /// CHECK: has_one = owner in single_listing
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token2022>,

    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    //separate payer so that a program can list with owner being a PDA
    #[account(mut)]
    pub payer: Signer<'info>,

    // ---- WNS royalty enforcement
    /// CHECK: checked on approve CPI
    #[account(mut)]
    pub approve_account: UncheckedAccount<'info>,

    /// CHECK: checked on approve CPI
    #[account(mut)]
    pub distribution: UncheckedAccount<'info>,

    /// CHECK: checked on approve CPI
    pub wns_program: UncheckedAccount<'info>,

    /// CHECK: checked on approve CPI
    pub distribution_program: UncheckedAccount<'info>,

    /// CHECK: checked on transfer CPI
    pub extra_metas: UncheckedAccount<'info>,
}

impl<'info> WnsDelist<'info> {
    fn close_nft_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.nft_escrow.to_account_info(),
                destination: self.payer.to_account_info(),
                authority: self.tswap.to_account_info(),
            },
        )
    }
}

pub fn wns_process_delist<'info>(ctx: Context<'_, '_, '_, 'info, WnsDelist<'info>>) -> Result<()> {
    // validate mint account

    wns_validate_mint(&ctx.accounts.nft_mint.to_account_info())?;

    let approve_accounts = ApproveAccounts {
        payer: ctx.accounts.payer.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
        mint: ctx.accounts.nft_mint.to_account_info(),
        approve_account: ctx.accounts.approve_account.to_account_info(),
        payment_mint: None,
        authority_token_account: ctx.accounts.payer.to_account_info(),
        distribution_account: ctx.accounts.distribution.to_account_info(),
        distribution_token_account: ctx.accounts.distribution.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        distribution_program: ctx.accounts.distribution_program.to_account_info(),
        wns_program: ctx.accounts.wns_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
    };
    // "simulate" royalty payment
    wns_approve(approve_accounts, 0, 0)?;

    // transfer the NFT

    let transfer_cpi = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked {
            from: ctx.accounts.nft_escrow.to_account_info(),
            to: ctx.accounts.nft_dest.to_account_info(),
            authority: ctx.accounts.tswap.to_account_info(),
            mint: ctx.accounts.nft_mint.to_account_info(),
        },
    );

    tensor_toolbox::token_2022::transfer::transfer_checked(
        transfer_cpi
            .with_remaining_accounts(vec![
                ctx.accounts.wns_program.to_account_info(),
                ctx.accounts.extra_metas.to_account_info(),
                ctx.accounts.approve_account.to_account_info(),
            ])
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
        1, // supply = 1
        0, // decimals = 0
    )?;

    // close nft escrow account

    token_interface::close_account(
        ctx.accounts
            .close_nft_escrow_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
    )?;

    emit!(DelistEvent {
        current_price: ctx.accounts.single_listing.price,
    });

    Ok(())
}

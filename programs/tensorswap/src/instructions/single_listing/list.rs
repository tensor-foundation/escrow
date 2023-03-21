use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use mpl_token_metadata::processor::AuthorizationData;

use crate::*;

#[derive(Accounts)]
pub struct List<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(mut, token::mint = nft_mint, token::authority = owner)]
    pub nft_source: Box<Account<'info, TokenAccount>>,

    /// CHECK: seed in nft_escrow & nft_receipt
    pub nft_mint: Box<Account<'info, Mint>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(
        init, //<-- this HAS to be init, not init_if_needed for safety (else single listings and pool listings can get mixed)
        payer = owner,
        seeds=[
            b"nft_escrow".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint, token::authority = tswap,
    )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        init, //<-- this HAS to be init, not init_if_needed for safety (else single listings and pool listings can get mixed)
        payer = owner,
        seeds=[
            b"single_listing".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        space = SINGLE_LISTING_SIZE,
    )]
    pub single_listing: Box<Account<'info, SingleListing>>,

    /// CHECK: the token transfer will fail if owner is wrong (signature error)
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    // --------------------------------------- pNft

    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: assert_decode_metadata + seeds below
    #[account(
        mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub nft_metadata: UncheckedAccount<'info>,

    //note that MASTER EDITION and EDITION share the same seeds, and so it's valid to check them here
    /// CHECK: seeds below
    #[account(
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
            mpl_token_metadata::state::EDITION.as_bytes(),
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub nft_edition: UncheckedAccount<'info>,

    /// CHECK: seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
            mpl_token_metadata::state::TOKEN_RECORD_SEED.as_bytes(),
            nft_source.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub owner_token_record: UncheckedAccount<'info>,

    /// CHECK: seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
            mpl_token_metadata::state::TOKEN_RECORD_SEED.as_bytes(),
            nft_escrow.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub dest_token_record: UncheckedAccount<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub pnft_shared: ProgNftShared<'info>,
    // remaining accounts:
    // CHECK: validate it's present on metadata in handler
    // 1. optional authorization_rules, only if present on metadata
}

pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, List<'info>>,
    price: u64,
    authorization_data: Option<AuthorizationDataLocal>,
) -> Result<()> {
    let rem_acc = &mut ctx.remaining_accounts.iter().peekable();
    let auth_rules = rem_acc.peek().copied();
    send_pnft(
        &ctx.accounts.owner.to_account_info(),
        &ctx.accounts.owner.to_account_info(),
        &ctx.accounts.nft_source,
        &ctx.accounts.nft_escrow,
        &ctx.accounts.tswap.to_account_info(),
        &ctx.accounts.nft_mint,
        &ctx.accounts.nft_metadata,
        &ctx.accounts.nft_edition,
        &ctx.accounts.system_program,
        &ctx.accounts.token_program,
        &ctx.accounts.associated_token_program,
        &ctx.accounts.pnft_shared.instructions,
        &ctx.accounts.owner_token_record,
        &ctx.accounts.dest_token_record,
        &ctx.accounts.pnft_shared.authorization_rules_program,
        auth_rules,
        authorization_data
            .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
        None,
        None,
    )?;

    //record listing state
    let listing = &mut ctx.accounts.single_listing;
    listing.owner = ctx.accounts.owner.key();
    listing.nft_mint = ctx.accounts.nft_mint.key();
    listing.price = price;
    listing.bump = [unwrap_bump!(ctx, "single_listing")];

    Ok(())
}

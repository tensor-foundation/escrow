//! User selling an NFT into a Trade pool
//! We separate this from Token pool since the NFT will go into an NFT escrow w/ a receipt.
//! (!) Keep common logic in sync with sell_nft_token_pool.rs.
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Token, TokenAccount},
};
use mpl_token_metadata::processor::AuthorizationData;
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
pub struct SellNftTradePool<'info> {
    shared: SellNftShared<'info>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(
        init_if_needed,
        payer = shared.seller,
        seeds=[
            b"nft_escrow".as_ref(),
            shared.nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = shared.nft_mint, token::authority = shared.tswap,
    )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = shared.seller,
        seeds=[
            b"nft_receipt".as_ref(),
            shared.nft_mint.key().as_ref(),
        ],
        bump,
        space = DEPOSIT_RECEIPT_SIZE,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    // --------------------------------------- pNft
    pub associated_token_program: Program<'info, AssociatedToken>,

    //note that MASTER EDITION and EDITION share the same seeds, and so it's valid to check them here
    /// CHECK: seeds below
    #[account(
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            shared.nft_mint.key().as_ref(),
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
            shared.nft_mint.key().as_ref(),
            mpl_token_metadata::state::TOKEN_RECORD_SEED.as_bytes(),
            shared.nft_seller_acc.key().as_ref()
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
            shared.nft_mint.key().as_ref(),
            mpl_token_metadata::state::TOKEN_RECORD_SEED.as_bytes(),
            nft_escrow.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub dest_token_record: UncheckedAccount<'info>,

    pub pnft_shared: ProgNftShared<'info>,

    /// CHECK: validated by mplex's pnft code
    pub auth_rules: UncheckedAccount<'info>,
    /// CHECK: optional, manually handled in handler: 1)seeds, 2)program owner, 3)normal owner, 4)margin acc stored on pool
    #[account(mut)]
    pub margin_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub taker_broker: UncheckedAccount<'info>,
    // remaining accounts:
    // 1. optional 0 to N creator accounts.
}

impl<'info> Validate<'info> for SellNftTradePool<'info> {
    fn validate(&self) -> Result<()> {
        match self.shared.pool.config.pool_type {
            PoolType::Trade => (),
            _ => {
                throw_err!(WrongPoolType);
            }
        }
        if self.shared.pool.version != CURRENT_POOL_VERSION {
            throw_err!(WrongPoolVersion);
        }
        if self.shared.pool.frozen.is_some() {
            throw_err!(PoolFrozen);
        }

        self.shared.pool.taker_allowed_to_sell()?;

        Ok(())
    }
}

#[access_control(ctx.accounts.shared.verify_whitelist(); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellNftTradePool<'info>>,
    // Min vs exact so we can add slippage later.
    min_price: u64,
    rules_acc_present: bool,
    authorization_data: Option<AuthorizationDataLocal>,
    optional_royalty_pct: Option<u16>,
) -> Result<()> {
    let pool = &ctx.accounts.shared.pool;

    // transfer nft to escrow
    // has to go before any transfer_lamports, o/w we get `sum of account balances before and after instruction do not match`
    let auth_rules_acc_info = &ctx.accounts.auth_rules.to_account_info();
    let auth_rules = if rules_acc_present {
        Some(auth_rules_acc_info)
    } else {
        None
    };

    send_pnft(
        &ctx.accounts.shared.seller.to_account_info(),
        &ctx.accounts.shared.seller.to_account_info(),
        &ctx.accounts.shared.nft_seller_acc,
        &ctx.accounts.nft_escrow,
        &ctx.accounts.shared.tswap.to_account_info(),
        &ctx.accounts.shared.nft_mint,
        &ctx.accounts.shared.nft_metadata,
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

    let metadata = &assert_decode_metadata(
        &ctx.accounts.shared.nft_mint,
        &ctx.accounts.shared.nft_metadata,
    )?;

    let current_price = pool.current_price(TakerSide::Sell)?;
    let Fees {
        tswap_fee,
        maker_rebate: _,
        broker_fee,
        taker_fee,
    } = calc_fees_rebates(current_price)?;
    let creators_fee = pool.calc_creators_fee(metadata, current_price, optional_royalty_pct)?;
    let mm_fee = pool.calc_mm_fee(current_price)?;

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price,
        tswap_fee: taker_fee,
        //record MM here instead of buy tx (when it's technically paid to the MMer)
        //this is because offchain we use the event to determine "true" price paid by taker, which in this case is current price - mm fee
        mm_fee,
        creators_fee,
    });

    // Need to include mm_fee to prevent someone editing the MM fee from rugging the seller.

    if unwrap_int!(current_price.checked_sub(mm_fee)) < min_price {
        throw_err!(PriceMismatch);
    }

    let mut left_for_seller = current_price;

    // --------------------------------------- SOL transfers

    //decide where we're sending the money from - margin (marginated pool) or escrow (normal pool)
    let from = match &pool.margin {
        Some(stored_margin_account) => {
            let margin_account_info = &ctx.accounts.margin_account.to_account_info();
            assert_decode_margin_account(
                margin_account_info,
                &ctx.accounts.shared.tswap.to_account_info(),
                &ctx.accounts.shared.owner.to_account_info(),
            )?;
            if *margin_account_info.key != *stored_margin_account {
                throw_err!(BadMargin);
            }
            margin_account_info.clone()
        }
        None => ctx.accounts.shared.sol_escrow.to_account_info(),
    };

    // transfer fees
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(taker_fee));
    transfer_lamports_from_pda(
        &from,
        &ctx.accounts.shared.fee_vault.to_account_info(),
        tswap_fee,
    )?;
    transfer_lamports_from_pda(
        &from,
        &ctx.accounts.taker_broker.to_account_info(),
        broker_fee,
    )?;

    // transfer royalties
    let remaining_accounts = &mut ctx.remaining_accounts.iter();
    let actual_creators_fee = transfer_creators_fee(
        Some(&from),
        None,
        metadata,
        remaining_accounts,
        creators_fee,
    )?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(actual_creators_fee));

    // subtract MM spread before wiring to seller
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(mm_fee));

    // transfer remainder to seller
    // (!) fees/royalties are paid by TAKER, which in this case is the SELLER
    // (!) maker rebate already taken out of this amount
    transfer_lamports_from_pda(
        &from,
        &ctx.accounts.shared.seller.to_account_info(),
        left_for_seller,
    )?;

    // --------------------------------------- accounting

    //create nft receipt for trade pool
    let receipt_state = &mut ctx.accounts.nft_receipt;
    receipt_state.bump = unwrap_bump!(ctx, "nft_receipt");
    receipt_state.nft_authority = pool.nft_authority;
    receipt_state.nft_mint = ctx.accounts.shared.nft_mint.key();
    receipt_state.nft_escrow = ctx.accounts.nft_escrow.key();

    //update pool accounting
    let pool = &mut ctx.accounts.shared.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_add(1));
    pool.taker_sell_count = unwrap_int!(pool.taker_sell_count.checked_add(1));
    pool.stats.taker_sell_count = unwrap_int!(pool.stats.taker_sell_count.checked_add(1));
    pool.last_transacted_seconds = Clock::get()?.unix_timestamp;

    //MM profit no longer recorded during taker sell txs, only taker buy txs

    Ok(())
}

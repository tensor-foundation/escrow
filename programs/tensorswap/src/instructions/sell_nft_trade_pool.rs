//! User selling an NFT into a Trade pool
//! We separate this from Token pool since the NFT will go into an NFT escrow w/ a receipt.
//! (!) Keep common logic in sync with sell_nft_token_pool.rs.
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
pub struct SellNftTradePool<'info> {
    shared: SellNft<'info>,

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
        space = 8 + NftDepositReceipt::SIZE,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    // remaining accounts:
    // 1. 0 to N creator accounts.
}

impl<'info> SellNftTradePool<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.shared.nft_seller_acc.to_account_info(),
                to: self.nft_escrow.to_account_info(),
                authority: self.shared.seller.to_account_info(),
            },
        )
    }
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

        Ok(())
    }
}

#[access_control(ctx.accounts.shared.verify_whitelist(); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellNftTradePool<'info>>,
    // Min vs exact so we can add slippage later.
    min_price: u64,
) -> Result<()> {
    let remaining_accounts_iter = &mut ctx.remaining_accounts.iter();

    let pool = &ctx.accounts.shared.pool;

    let metadata = &assert_decode_metadata(
        &ctx.accounts.shared.nft_mint,
        &ctx.accounts.shared.nft_metadata,
    )?;

    let current_price = pool.current_price(TakerSide::Sell)?;
    let tswap_fee = pool.calc_tswap_fee(current_price)?;
    let mm_fee = pool.calc_mm_fee(current_price)?;
    let creators_fee = pool.calc_creators_fee(TakerSide::Sell, metadata, current_price)?;

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price,
        tswap_fee,
        mm_fee,
        creators_fee,
    });

    // Need to include mm_fee to prevent someone editing the MM fee from rugging the seller.
    if unwrap_int!(current_price.checked_sub(mm_fee)) < min_price {
        throw_err!(PriceMismatch);
    }

    let mut left_for_seller = current_price;

    // transfer nft to escrow
    // This must go before any transfer_lamports
    // o/w we get `sum of account balances before and after instruction do not match`
    token::transfer(ctx.accounts.transfer_ctx(), 1)?;

    //create nft receipt for trade pool
    let receipt_state = &mut ctx.accounts.nft_receipt;
    receipt_state.bump = unwrap_bump!(ctx, "nft_receipt");
    receipt_state.nft_authority = pool.nft_authority;
    receipt_state.nft_mint = ctx.accounts.shared.nft_mint.key();
    receipt_state.nft_escrow = ctx.accounts.nft_escrow.key();

    //transfer fee to Tensorswap
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));
    ctx.accounts.shared.transfer_lamports_from_escrow(
        &ctx.accounts.shared.fee_vault.to_account_info(),
        tswap_fee,
    )?;

    // send royalties
    let actual_creators_fee = ctx.accounts.shared.transfer_creators_fee(
        &ctx.accounts.shared.sol_escrow.to_account_info(),
        metadata,
        remaining_accounts_iter,
        creators_fee,
    )?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(actual_creators_fee));

    // Owner/MM keeps some funds as their fee (no transfer necessary).
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(mm_fee));

    //send money directly to seller
    let destination = ctx.accounts.shared.seller.to_account_info();
    ctx.accounts
        .shared
        .transfer_lamports_from_escrow(&destination, left_for_seller)?;

    //update pool accounting
    let pool = &mut ctx.accounts.shared.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_add(1));
    pool.taker_sell_count = unwrap_int!(pool.taker_sell_count.checked_add(1));
    pool.stats.taker_sell_count = unwrap_int!(pool.stats.taker_sell_count.checked_add(1));
    //record a MM profit of 1/2 MM fee
    pool.stats.accumulated_mm_profit = unwrap_checked!({
        pool.stats
            .accumulated_mm_profit
            .checked_add(mm_fee.checked_div(2)?)
    });
    pool.last_transacted_seconds = Clock::get()?.unix_timestamp;

    Ok(())
}

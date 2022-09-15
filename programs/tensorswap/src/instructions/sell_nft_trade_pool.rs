//! User selling an NFT into a Trade pool
//! We separate this from Token pool since the NFT will go into an NFT escrow w/ a receipt.
//! (!) Keep common logic in sync with sell_nft_token_pool.rs.
use crate::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use vipers::throw_err;

#[derive(Accounts)]
// #[instruction(config: PoolConfig)]
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
    // Remaining accounts = 0 to N creator accounts.
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

        Ok(())
    }
}

#[access_control(ctx.accounts.shared.validate_proof(proof); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellNftTradePool<'info>>,
    proof: Vec<[u8; 32]>,
    // Min vs exact so we can add slippage later.
    min_price: u64,
) -> Result<()> {
    let pool = &ctx.accounts.shared.pool;

    let metadata = &assert_decode_metadata(
        &ctx.accounts.shared.nft_mint,
        &ctx.accounts.shared.nft_metadata,
    )?;

    let current_price = pool.current_price(TakerSide::Sell)?;
    let tswap_fee = pool.calc_tswap_fee(ctx.accounts.shared.tswap.config.fee_bps, current_price)?;
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

    if current_price < min_price {
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
    receipt_state.pool = pool.key();
    receipt_state.nft_mint = ctx.accounts.shared.nft_mint.key();
    receipt_state.nft_escrow = ctx.accounts.nft_escrow.key();

    //transfer fee to Tensorswap
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));
    ctx.accounts.shared.transfer_lamports_from_escrow(
        &ctx.accounts.shared.fee_vault.to_account_info(),
        tswap_fee,
    )?;

    // send royalties
    let actual_creators_fee = ctx.accounts.shared.transfer_creators_fee_from_escrow(
        metadata,
        ctx.remaining_accounts,
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

    Ok(())
}

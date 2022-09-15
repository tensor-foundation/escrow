//! User selling an NFT into a Token pool
//! We separate this from Trade pool since the owner will receive the NFT directly in their ATA.
//! (!) Keep common logic in sync with sell_nft_token_pool.rs.
use crate::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Token, TokenAccount, Transfer},
};
use vipers::throw_err;

#[derive(Accounts)]
pub struct SellNftTokenPool<'info> {
    shared: SellNft<'info>,

    #[account(
        init_if_needed,
        payer = shared.seller,
        associated_token::mint = shared.nft_mint,
        associated_token::authority = shared.owner,
    )]
    pub owner_ata_acc: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    // Remaining accounts = 0 to N creator accounts.
}

impl<'info> SellNftTokenPool<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.shared.nft_seller_acc.to_account_info(),
                to: self.owner_ata_acc.to_account_info(),
                authority: self.shared.seller.to_account_info(),
            },
        )
    }
}

impl<'info> Validate<'info> for SellNftTokenPool<'info> {
    fn validate(&self) -> Result<()> {
        match self.shared.pool.config.pool_type {
            PoolType::Token => (),
            _ => {
                throw_err!(WrongPoolType);
            }
        }

        Ok(())
    }
}

#[access_control(ctx.accounts.shared.validate_proof(proof); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellNftTokenPool<'info>>,
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
    let creators_fee = pool.calc_creators_fee(TakerSide::Sell, metadata, current_price)?;

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price,
        tswap_fee,
        mm_fee: 0, // no MM fee for token pool
        creators_fee,
    });

    if current_price < min_price {
        throw_err!(PriceMismatch);
    }

    let mut left_for_seller = current_price;

    // transfer nft directly to owner (ATA)
    // This must go before any transfer_lamports
    // o/w we get `sum of account balances before and after instruction do not match`
    token::transfer(ctx.accounts.transfer_ctx(), 1)?;

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

    //send money directly to seller
    let destination = ctx.accounts.shared.seller.to_account_info();
    ctx.accounts
        .shared
        .transfer_lamports_from_escrow(&destination, left_for_seller)?;

    //update pool accounting
    let pool = &mut ctx.accounts.shared.pool;
    pool.taker_sell_count = unwrap_int!(pool.taker_sell_count.checked_add(1));

    Ok(())
}

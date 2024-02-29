//! Similar to sell_nft_token_pool, but 1)cosigned by us, 2)doesn't pay royalties, 3)diff fee mechanics
use anchor_spl::associated_token::AssociatedToken;
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
//do NOT add a #[instruction(XXX)] macro here, since we're already using it in common.rs, else anchor will error
pub struct TakeSnipe<'info> {
    shared: SellNftShared<'info>,

    #[account(
        init_if_needed,
        payer = shared.seller,
        associated_token::mint = shared.nft_mint,
        associated_token::authority = shared.owner,
    )]
    pub owner_ata_acc: Box<Account<'info, TokenAccount>>,

    /// Snipes are always marginated, hence include as a fixed account
    /// CHECK: margin acc key = stored margin acc on pool
    /// CHECK: margin acc owner = passed in owner
    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            shared.tswap.key().as_ref(),
            shared.owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        constraint = margin_account.key() == shared.pool.margin.unwrap() @ crate::ErrorCode::BadMargin,
        constraint = margin_account.owner == shared.pool.owner @ crate::ErrorCode::BadMargin
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    /// We have to cosign because the ix skips royalties, hence include as a fixed account
    /// (!) this doesn't mean that the order itself is cosigned, it might not be, just the same kp
    /// CHECK: key = that stored on tswap
    #[account(
        constraint = cosigner.key() == shared.tswap.cosigner @ crate::ErrorCode::BadCosigner,
    )]
    pub cosigner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    // --------------------------------------- pNft

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
            owner_ata_acc.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub dest_token_record: UncheckedAccount<'info>,

    pub pnft_shared: ProgNftShared<'info>,
    // TODO if we ever re-instate this ix, get rid of optional accounts
    // remaining accounts:
    // CHECK: validate it's present on metadata in handler
    // 1. optional authorization_rules, only if present on metadata
}

impl<'info> Validate<'info> for TakeSnipe<'info> {
    fn validate(&self) -> Result<()> {
        //bids only for now
        match self.shared.pool.config.pool_type {
            PoolType::Token => (),
            _ => {
                throw_err!(WrongPoolType);
            }
        }
        if self.shared.pool.version != CURRENT_POOL_VERSION {
            throw_err!(WrongPoolVersion);
        }

        //additional checks for sniping orders
        //√ check if it's actually a sniping order
        if self.shared.pool.order_type != 1 {
            throw_err!(WrongOrderType);
        }
        //X not checking if frozen - doesn't matter, we can pull money from margin directly
        //X not checking if cosigned - doesn't matter, it could be a broad/narrow order

        //checks related to margin (can't do using anchor coz of shared)
        if self.shared.pool.margin.is_none() {
            throw_err!(PoolNotMarginated);
        }

        Ok(())
    }
}

#[access_control(ctx.accounts.shared.verify_whitelist(); ctx.accounts.validate())]
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, TakeSnipe<'info>>,
    actual_price: u64,
    authorization_data: Option<AuthorizationDataLocal>,
) -> Result<()> {
    let pool = &ctx.accounts.shared.pool;

    // TODO if we ever re-instate this ix, get rid of optional accounts
    let rem_acc = &mut ctx.remaining_accounts.iter().peekable();
    let auth_rules = rem_acc.peek().copied();

    // transfer nft directly to owner (ATA)
    // has to go before any transfer_lamports, o/w we get `sum of account balances before and after instruction do not match`
    // has to go before creators fee calc below, coz we need to drain 1 optional acc
    send_pnft(
        Some(&[&ctx.accounts.shared.tswap.seeds()]),
        PnftTransferArgs {
            authority_and_owner: &ctx.accounts.shared.seller.to_account_info(),
            payer: &ctx.accounts.shared.seller.to_account_info(),
            source_ata: &ctx.accounts.shared.nft_seller_acc,
            dest_ata: &ctx.accounts.owner_ata_acc,
            dest_owner: &ctx.accounts.shared.owner.to_account_info(),
            nft_mint: &ctx.accounts.shared.nft_mint,
            nft_metadata: &ctx.accounts.shared.nft_metadata,
            nft_edition: &ctx.accounts.nft_edition,
            system_program: &ctx.accounts.system_program,
            token_program: &ctx.accounts.token_program,
            ata_program: &ctx.accounts.associated_token_program,
            instructions: &ctx.accounts.pnft_shared.instructions,
            owner_token_record: &ctx.accounts.owner_token_record,
            dest_token_record: &ctx.accounts.dest_token_record,
            authorization_rules_program: &ctx.accounts.pnft_shared.authorization_rules_program,
            rules_acc: auth_rules,
            authorization_data: authorization_data,
            delegate: Some(&ctx.accounts.shared.tswap),
        },
    )?;

    let current_price = pool.current_price(TakerSide::Sell)?;
    let snipe_base_fee = pool.calc_tswap_fee(current_price)?;
    let snipe_profit_share = pool.calc_tswap_profit_share(current_price, actual_price)?;
    let total_snipe_fee = unwrap_int!(snipe_base_fee.checked_add(snipe_profit_share));

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price: actual_price,
        tswap_fee: total_snipe_fee,
        mm_fee: 0, // no MM fee for token pool
        creators_fee: 0,
    });

    //current price can't be lower than the price we actually sniped for
    if current_price < actual_price {
        throw_err!(PriceMismatch);
    }

    //decide where we're sending the money from - margin (marginated pool) or escrow (normal pool)
    let from = match pool.frozen {
        //if frozen, money has been moved into escrow, so we'll be using that
        Some(frozen) => {
            if frozen.amount != unwrap_int!(current_price.checked_add(snipe_base_fee)) {
                throw_err!(FrozenAmountMismatch);
            }
            ctx.accounts.shared.sol_escrow.to_account_info()
        }
        //else money still sitting in margin account
        None => ctx.accounts.margin_account.to_account_info(),
    };

    // 1. transfer fee to Tensorswap
    // (!) only subtract profit share, not the base fee, since we added it ON TOP
    transfer_lamports_from_tswap(
        &from,
        &ctx.accounts.shared.fee_vault.to_account_info(),
        total_snipe_fee,
    )?;

    // 2. transfer actual price back to sniping wallet
    let destination = ctx.accounts.shared.seller.to_account_info();
    transfer_lamports_from_tswap(&from, &destination, actual_price)?;

    // 3. transfer remainder back to margin account
    let left_for_owner = unwrap_checked!({
        current_price
            .checked_add(snipe_base_fee)?
            .checked_sub(actual_price)?
            .checked_sub(total_snipe_fee)
    });
    transfer_lamports_from_tswap(
        &from,
        &ctx.accounts.margin_account.to_account_info(),
        left_for_owner,
    )?;

    //update pool accounting
    let pool = &mut ctx.accounts.shared.pool;
    pool.taker_sell_count = unwrap_int!(pool.taker_sell_count.checked_add(1));
    pool.stats.taker_sell_count = unwrap_int!(pool.stats.taker_sell_count.checked_add(1));

    //unfreeze since it's now taken
    pool.frozen = None;

    Ok(())
}

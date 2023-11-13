//! User selling an NFT into a Token pool
//! We separate this from Trade pool since the owner will receive the NFT directly in their ATA.
//! (!) Keep common logic in sync with sell_nft_token_pool.rs.
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Token, TokenAccount},
};
use mpl_token_metadata::processor::AuthorizationData;
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
pub struct SellNftTokenPool<'info> {
    shared: SellNftShared<'info>,

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

    //using this as temporary escrow to avoid having to rely on delegate
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
    pub temp_escrow_token_record: UncheckedAccount<'info>,

    /// CHECK: validated by mplex's pnft code
    pub auth_rules: UncheckedAccount<'info>,
    /// CHECK: optional, manually handled in handler: 1)seeds, 2)program owner, 3)normal owner, 4)margin acc stored on pool
    #[account(mut)]
    pub margin_account: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub taker_broker: UncheckedAccount<'info>,
    // remaining accounts:
    // CHECK: 1)is signer, 2)cosigner stored on tswap
    // 1. optional co-signer (will be drawn first if necessary)
    // 2. optional 0 to N creator accounts.
}

impl<'info> Validate<'info> for SellNftTokenPool<'info> {
    fn validate(&self) -> Result<()> {
        match self.shared.pool.config.pool_type {
            PoolType::Token => (),
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

impl<'info> SellNftTokenPool<'info> {
    fn close_nft_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.nft_escrow.to_account_info(),
                destination: self.shared.seller.to_account_info(),
                authority: self.shared.tswap.to_account_info(),
            },
        )
    }
}

#[access_control(ctx.accounts.shared.verify_whitelist(); ctx.accounts.validate())]
pub fn handler<'info>(
    ctx: Context<'_, '_, '_, 'info, SellNftTokenPool<'info>>,
    // Min vs exact so we can add slippage later.
    min_price: u64,
    rules_acc_present: bool,
    authorization_data: Option<AuthorizationDataLocal>,
    optional_royalty_pct: Option<u16>,
) -> Result<()> {
    let pool = &ctx.accounts.shared.pool;

    // --------------------------------------- send pnft

    // transfer nft directly to owner (ATA)
    // has to go before any transfer_lamports, o/w we get `sum of account balances before and after instruction do not match`
    let auth_rules_acc_info = &ctx.accounts.auth_rules.to_account_info();
    let auth_rules = if rules_acc_present {
        Some(auth_rules_acc_info)
    } else {
        None
    };

    //STEP 1/2: SEND TO ESCROW
    send_pnft(
        None,
        PnftTransferArgs {
            authority_and_owner: &ctx.accounts.shared.seller.to_account_info(),
            payer: &ctx.accounts.shared.seller.to_account_info(),
            source_ata: &ctx.accounts.shared.nft_seller_acc,
            dest_ata: &ctx.accounts.nft_escrow, //<- send to escrow first
            dest_owner: &ctx.accounts.shared.tswap.to_account_info(),
            nft_mint: &ctx.accounts.shared.nft_mint,
            nft_metadata: &ctx.accounts.shared.nft_metadata,
            nft_edition: &ctx.accounts.nft_edition,
            system_program: &ctx.accounts.system_program,
            token_program: &ctx.accounts.token_program,
            ata_program: &ctx.accounts.associated_token_program,
            instructions: &ctx.accounts.pnft_shared.instructions,
            owner_token_record: &ctx.accounts.owner_token_record,
            dest_token_record: &ctx.accounts.temp_escrow_token_record,
            authorization_rules_program: &ctx.accounts.pnft_shared.authorization_rules_program,
            rules_acc: auth_rules,
            authorization_data: authorization_data
                .clone()
                .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
            delegate: None,
        },
    )?;

    //STEP 2/2: SEND FROM ESCROW
    send_pnft(
        Some(&[&ctx.accounts.shared.tswap.seeds()]),
        PnftTransferArgs {
            authority_and_owner: &ctx.accounts.shared.tswap.to_account_info(),
            payer: &ctx.accounts.shared.seller.to_account_info(),
            source_ata: &ctx.accounts.nft_escrow,
            dest_ata: &ctx.accounts.owner_ata_acc,
            dest_owner: &ctx.accounts.shared.owner.to_account_info(),
            nft_mint: &ctx.accounts.shared.nft_mint,
            nft_metadata: &ctx.accounts.shared.nft_metadata,
            nft_edition: &ctx.accounts.nft_edition,
            system_program: &ctx.accounts.system_program,
            token_program: &ctx.accounts.token_program,
            ata_program: &ctx.accounts.associated_token_program,
            instructions: &ctx.accounts.pnft_shared.instructions,
            owner_token_record: &ctx.accounts.temp_escrow_token_record,
            dest_token_record: &ctx.accounts.dest_token_record,
            authorization_rules_program: &ctx.accounts.pnft_shared.authorization_rules_program,
            rules_acc: auth_rules,
            authorization_data: authorization_data
                .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
            delegate: None,
        },
    )?;

    // close temp nft escrow account, so it's not dangling
    token::close_account(
        ctx.accounts
            .close_nft_escrow_ctx()
            .with_signer(&[&ctx.accounts.shared.tswap.seeds()]),
    )?;

    // USING DELEGATE (PAUSE TO NOT RELY ON DELEGATE RULE)
    // send_pnft(
    //     &ctx.accounts.shared.seller.to_account_info(),
    //     &ctx.accounts.shared.seller.to_account_info(),
    //     &ctx.accounts.shared.nft_seller_acc,
    //     &ctx.accounts.owner_ata_acc,
    //     &ctx.accounts.shared.owner.to_account_info(),
    //     &ctx.accounts.shared.nft_mint,
    //     &ctx.accounts.shared.nft_metadata,
    //     &ctx.accounts.nft_edition,
    //     &ctx.accounts.system_program,
    //     &ctx.accounts.token_program,
    //     &ctx.accounts.associated_token_program,
    //     &ctx.accounts.pnft_shared.instructions,
    //     &ctx.accounts.owner_token_record,
    //     &ctx.accounts.dest_token_record,
    //     &ctx.accounts.pnft_shared.authorization_rules_program,
    //     auth_rules,
    //     authorization_data
    //         .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
    //     Some(&ctx.accounts.shared.tswap),
    //     Some(&ctx.accounts.shared.tswap.to_account_info()),
    // )?;

    // --------------------------------------- end pnft

    let remaining_accounts = &mut ctx.remaining_accounts.iter();
    if pool.is_cosigned {
        let cosigner = next_account_info(remaining_accounts)?;
        if &ctx.accounts.shared.tswap.cosigner != cosigner.key {
            throw_err!(BadCosigner);
        }
        if !cosigner.is_signer {
            throw_err!(BadCosigner);
        }
    }

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

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price,
        tswap_fee: taker_fee,
        mm_fee: 0, // no MM fee for token pool
        creators_fee,
    });

    if current_price < min_price {
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
    let actual_creators_fee = transfer_creators_fee(
        &FromAcc::Pda(&from),
        &metadata
            .data
            .creators
            .clone()
            .unwrap_or(Vec::new())
            .into_iter()
            .map(Into::into)
            .collect(),
        remaining_accounts,
        creators_fee,
    )?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(actual_creators_fee));

    // transfer remainder to seller
    // (!) fees/royalties are paid by TAKER, which in this case is the SELLER
    // (!) maker rebate already taken out of this amount
    transfer_lamports_from_pda(
        &from,
        &ctx.accounts.shared.seller.to_account_info(),
        left_for_seller,
    )?;

    // --------------------------------------- accounting

    //update pool accounting
    let pool = &mut ctx.accounts.shared.pool;
    pool.taker_sell_count = unwrap_int!(pool.taker_sell_count.checked_add(1));
    pool.stats.taker_sell_count = unwrap_int!(pool.stats.taker_sell_count.checked_add(1));
    pool.last_transacted_seconds = Clock::get()?.unix_timestamp;

    Ok(())
}

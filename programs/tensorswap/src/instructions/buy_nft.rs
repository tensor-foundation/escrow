//! User buying an NFT from an NFT/Trade pool
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount},
};
use mpl_token_metadata::processor::AuthorizationData;
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct BuyNft<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        has_one = fee_vault,
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    //degenerate: fee_acc now === TSwap, keeping around to preserve backwards compatibility
    /// CHECK: has_one = fee_vault in tswap
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[config.pool_type as u8],
            &[config.curve_type as u8],
            &config.starting_price.to_le_bytes(),
            &config.delta.to_le_bytes()
        ],
        bump = pool.bump[0],
        has_one = tswap, has_one = owner, has_one = whitelist, has_one = sol_escrow,
        // can only buy from NFT/Trade pool
        constraint = config.pool_type == PoolType::NFT || config.pool_type == PoolType::Trade @ crate::ErrorCode::WrongPoolType,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, has_one = whitelist on pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
    )]
    pub nft_buyer_acc: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = nft_mint.key() == nft_escrow.mint @ crate::ErrorCode::WrongMint,
        constraint = nft_mint.key() == nft_receipt.nft_mint @ crate::ErrorCode::WrongMint,
    )]
    pub nft_mint: Box<Account<'info, Mint>>,

    /// CHECK: assert_decode_metadata + seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub nft_metadata: UncheckedAccount<'info>,

    /// Implicitly checked via transfer. Will fail if wrong account.
    /// This is closed below (dest = owner)
    #[account(
        mut,
        seeds=[
            b"nft_escrow".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint, token::authority = tswap
    )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds=[
            b"nft_receipt".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump = nft_receipt.bump,
        close = owner,
        //can't buy an NFT that's associated with a different pool
        constraint = nft_receipt.nft_authority == pool.nft_authority && pool.nft_authority != Pubkey::default()
        @ crate::ErrorCode::WrongPool,
        // redundant but extra safety
        constraint = nft_receipt.nft_escrow == nft_escrow.key() @ crate::ErrorCode::WrongMint,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
    )]
    pub sol_escrow: Box<Account<'info, SolEscrow>>,

    /// CHECK: has_one = owner in pool (owner is the seller)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

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
            nft_escrow.key().as_ref()
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
            nft_buyer_acc.key().as_ref()
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

impl<'info> BuyNft<'info> {
    fn close_nft_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.nft_escrow.to_account_info(),
                destination: self.owner.to_account_info(),
                authority: self.tswap.to_account_info(),
            },
        )
    }

    fn transfer_lamports(&self, to: &AccountInfo<'info>, lamports: u64) -> Result<()> {
        // Handle buyers that have non-zero data and cannot use system transfer.
        if !self.buyer.data_is_empty() {
            return transfer_lamports_from_pda(&self.buyer.to_account_info(), to, lamports);
        }

        invoke(
            &system_instruction::transfer(self.buyer.key, to.key, lamports),
            &[
                self.buyer.to_account_info(),
                to.clone(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(Into::into)
    }
}

impl<'info> Validate<'info> for BuyNft<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.version != CURRENT_POOL_VERSION {
            throw_err!(WrongPoolVersion);
        }
        if self.pool.frozen.is_some() {
            throw_err!(PoolFrozen);
        }
        Ok(())
    }
}

// TODO: Disable proofs for now until tx size limits increase. This is fine since we validate proof on deposit/sell.
#[access_control(ctx.accounts.validate())]
pub fn handler<'info, 'b>(
    ctx: Context<'_, 'b, '_, 'info, BuyNft<'info>>,
    // Max vs exact so we can add slippage later.
    max_price: u64,
    rules_acc_present: bool,
    authorization_data: Option<AuthorizationDataLocal>,
    optional_royalty_pct: Option<u16>,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    let metadata = &assert_decode_metadata(&ctx.accounts.nft_mint, &ctx.accounts.nft_metadata)?;

    let current_price = pool.current_price(TakerSide::Buy)?;
    let Fees {
        tswap_fee,
        maker_rebate,
        broker_fee,
        taker_fee,
    } = calc_fees_rebates(current_price)?;
    let creators_fee = pool.calc_creators_fee(metadata, current_price, optional_royalty_pct)?;

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price,
        tswap_fee: taker_fee,
        mm_fee: 0, //record in sell_trade ix for parsing
        creators_fee,
    });

    if current_price > max_price {
        throw_err!(PriceMismatch);
    }

    // transfer nft to buyer
    // has to go before any transfer_lamports, o/w we get `sum of account balances before and after instruction do not match`
    let auth_rules_acc_info = &ctx.accounts.auth_rules.to_account_info();
    let auth_rules = if rules_acc_present {
        Some(auth_rules_acc_info)
    } else {
        None
    };

    send_pnft(
        Some(&[&ctx.accounts.tswap.seeds()]),
        PnftTransferArgs {
            authority_and_owner: &ctx.accounts.tswap.to_account_info(),
            payer: &ctx.accounts.buyer.to_account_info(),
            source_ata: &ctx.accounts.nft_escrow,
            dest_ata: &ctx.accounts.nft_buyer_acc,
            dest_owner: &ctx.accounts.buyer,
            nft_mint: &ctx.accounts.nft_mint,
            nft_metadata: &ctx.accounts.nft_metadata,
            nft_edition: &ctx.accounts.nft_edition,
            system_program: &ctx.accounts.system_program,
            token_program: &ctx.accounts.token_program,
            ata_program: &ctx.accounts.associated_token_program,
            instructions: &ctx.accounts.pnft_shared.instructions,
            owner_token_record: &ctx.accounts.owner_token_record,
            dest_token_record: &ctx.accounts.dest_token_record,
            authorization_rules_program: &ctx.accounts.pnft_shared.authorization_rules_program,
            rules_acc: auth_rules,
            authorization_data: authorization_data
                .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
            delegate: None,
        },
    )?;

    // --------------------------------------- SOL transfers

    // transfer fees
    ctx.accounts
        .transfer_lamports(&ctx.accounts.fee_vault.to_account_info(), tswap_fee)?;
    ctx.accounts
        .transfer_lamports(&ctx.accounts.taker_broker.to_account_info(), broker_fee)?;

    //(!) this block has to come before royalties transfer due to remaining_accounts
    let destination = match pool.config.pool_type {
        //send money direct to seller/owner
        PoolType::NFT => ctx.accounts.owner.to_account_info(),
        //send money to the pool
        // NB: no explicit MM fees here: that's because it goes directly to the escrow anyways.
        PoolType::Trade => match &pool.margin {
            Some(stored_margin_account) => {
                let margin_account_info = &ctx.accounts.margin_account.to_account_info();
                assert_decode_margin_account(
                    margin_account_info,
                    &ctx.accounts.tswap.to_account_info(),
                    &ctx.accounts.owner.to_account_info(),
                )?;
                if *margin_account_info.key != *stored_margin_account {
                    throw_err!(BadMargin);
                }
                margin_account_info.clone()
            }
            None => ctx.accounts.sol_escrow.to_account_info(),
        },
        PoolType::Token => unreachable!(),
    };

    //rebate to destination (not necessarily owner)
    ctx.accounts.transfer_lamports(&destination, maker_rebate)?;

    // transfer royalties (on top of current price)
    let remaining_accounts = &mut ctx.remaining_accounts.iter();
    transfer_creators_fee(
        &FromAcc::External(&FromExternal {
            from: &ctx.accounts.buyer.to_account_info(),
            sys_prog: &ctx.accounts.system_program,
        }),
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

    // transfer current price + MM fee if !compounded (within current price)
    match pool.config.pool_type {
        PoolType::Trade if !pool.config.mm_compound_fees => {
            let mm_fee = pool.calc_mm_fee(current_price)?;
            let left_for_pool = unwrap_int!(current_price.checked_sub(mm_fee));
            ctx.accounts
                .transfer_lamports(&destination, left_for_pool)?;
            ctx.accounts
                .transfer_lamports(&ctx.accounts.pool.to_account_info(), mm_fee)?;
        }
        _ => ctx
            .accounts
            .transfer_lamports(&destination, current_price)?,
    }

    // --------------------------------------- accounting

    // close nft escrow account
    token::close_account(
        ctx.accounts
            .close_nft_escrow_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
    )?;

    //update pool accounting
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_sub(1));
    pool.taker_buy_count = unwrap_int!(pool.taker_buy_count.checked_add(1));
    pool.stats.taker_buy_count = unwrap_int!(pool.stats.taker_buy_count.checked_add(1));
    pool.last_transacted_seconds = Clock::get()?.unix_timestamp;

    //record the entirety of MM fee during the buy tx
    if pool.config.pool_type == PoolType::Trade {
        let mm_fee = pool.calc_mm_fee(current_price)?;
        pool.stats.accumulated_mm_profit =
            unwrap_checked!({ pool.stats.accumulated_mm_profit.checked_add(mm_fee) });
    }

    Ok(())
}

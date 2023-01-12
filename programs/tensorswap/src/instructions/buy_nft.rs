//! User buying an NFT from an NFT/Trade pool
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer},
};
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
    #[account(
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
    // remaining accounts:
    // 1. 0 to N creator accounts.
}

impl<'info> BuyNft<'info> {
    fn transfer_nft_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.nft_escrow.to_account_info(),
                to: self.nft_buyer_acc.to_account_info(),
                authority: self.tswap.to_account_info(),
            },
        )
    }

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
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, BuyNft<'info>>,
    // Max vs exact so we can add slippage later.
    max_price: u64,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    let metadata = &assert_decode_metadata(&ctx.accounts.nft_mint, &ctx.accounts.nft_metadata)?;

    let current_price = pool.current_price(TakerSide::Buy)?;
    let tswap_fee = pool.calc_tswap_fee(current_price)?;
    let creators_fee = pool.calc_creators_fee(TakerSide::Buy, metadata, current_price)?;

    // for keeping track of current price + fees charged (computed dynamically)
    // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
    emit!(BuySellEvent {
        current_price,
        tswap_fee,
        mm_fee: 0, // no MM fee for buying
        creators_fee,
    });

    if current_price > max_price {
        throw_err!(PriceMismatch);
    }

    // seller = owner
    let mut left_for_seller = current_price;

    // transfer fee to Tensorswap
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));
    ctx.accounts
        .transfer_lamports(&ctx.accounts.fee_vault.to_account_info(), tswap_fee)?;

    if creators_fee > 0 {
        // send royalties: taken from AH's calculation:
        // https://github.com/metaplex-foundation/metaplex-program-library/blob/2320b30ec91b729b153f0c0fe719f96d325b2358/auction-house/program/src/utils.rs#L366-L471
        let mut remaining_fee = creators_fee;
        let remaining_accounts = &mut ctx.remaining_accounts.iter();
        match &metadata.data.creators {
            Some(creators) => {
                for creator in creators {
                    let current_creator_info = next_account_info(remaining_accounts)?;
                    require!(
                        creator.address.eq(current_creator_info.key),
                        CreatorMismatch
                    );

                    let rent = Rent::get()?.minimum_balance(current_creator_info.data_len());

                    let pct = creator.share as u64;
                    let creator_fee =
                        unwrap_checked!({ pct.checked_mul(creators_fee)?.checked_div(100) });

                    //prevents InsufficientFundsForRent, where creator acc doesn't have enough fee
                    //https://explorer.solana.com/tx/vY5nYA95ELVrs9SU5u7sfU2ucHj4CRd3dMCi1gWrY7MSCBYQLiPqzABj9m8VuvTLGHb9vmhGaGY7mkqPa1NLAFE
                    if unwrap_int!(current_creator_info.lamports().checked_add(creator_fee)) < rent
                    {
                        //skip current creator, we can't pay them
                        continue;
                    }

                    remaining_fee = unwrap_int!(remaining_fee.checked_sub(creator_fee));
                    if creator_fee > 0 {
                        ctx.accounts
                            .transfer_lamports(current_creator_info, creator_fee)?;
                    }
                }
            }
            None => (),
        }
        // Return any dust to seller.
        let actual_creators_fee = unwrap_int!(creators_fee.checked_sub(remaining_fee));
        left_for_seller = unwrap_int!(left_for_seller.checked_sub(actual_creators_fee));
    }

    //transfer remainder to either seller/owner or the pool (if Trade pool)
    let destination = match pool.config.pool_type {
        //send money direct to seller/owner
        PoolType::NFT => ctx.accounts.owner.to_account_info(),
        //send money to the pool
        // NB: no explicit MM fees here: that's because it goes directly to the escrow anyways.
        PoolType::Trade => ctx.accounts.sol_escrow.to_account_info(),
        PoolType::Token => unreachable!(),
    };
    ctx.accounts
        .transfer_lamports(&destination, left_for_seller)?;

    // transfer nft to buyer
    token::transfer(
        ctx.accounts
            .transfer_nft_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
        1,
    )?;

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
    //record a MM profit of 1/2 MM fee
    if pool.config.pool_type == PoolType::Trade {
        let mm_fee = pool.calc_mm_fee(current_price)?;
        pool.stats.accumulated_mm_profit = unwrap_checked!({
            pool.stats
                .accumulated_mm_profit
                .checked_add(mm_fee.checked_div(2)?)
        });
    }
    pool.last_transacted_seconds = Clock::get()?.unix_timestamp;

    Ok(())
}

#![allow(unknown_lints)] //needed otherwise complains during github actions
#![allow(clippy::result_large_err)] //needed otherwise unhappy w/ anchor errors

pub mod pnft;
use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    },
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, CloseAccount, Mint, Token, TokenAccount},
};
use mpl_token_auth_rules::payload::{Payload, PayloadType, ProofInfo, SeedsVec};
use mpl_token_metadata::processor::AuthorizationData;
pub use pnft::*;
use tensorswap::{
    self, assert_decode_margin_account, assert_decode_metadata, calc_creators_fee,
    calc_fees_rebates, prep_pnft_transfer_ix, program::Tensorswap, transfer_creators_fee,
    transfer_lamports_from_pda, TSwap,
};
use vipers::{prelude::*, throw_err};

declare_id!("TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv");

// --------------------------------------- ixs

#[program]
pub mod tensor_bid {
    use tensorswap::Fees;

    use super::*;

    //can be called multiple times to re-bid
    pub fn bid<'info>(
        ctx: Context<'_, '_, '_, 'info, Bid<'info>>,
        lamports: u64,
        expire_in_sec: Option<u64>,
    ) -> Result<()> {
        //record state
        let bid_state = &mut ctx.accounts.bid_state;
        bid_state.version = CURRENT_TBID_VERSION;
        bid_state.bid_amount = lamports;
        //safe to assume mint and bidder won't change on successive calls since bid_state is derived using both
        bid_state.nft_mint = ctx.accounts.nft_mint.key();
        bid_state.bidder = ctx.accounts.bidder.key();
        bid_state.bump = [unwrap_bump!(ctx, "bid_state")];
        bid_state.margin = None; //overwritten below if margin present

        //grab current expiry in case they're editing a bid
        let current_expiry = bid_state.expiry;
        //figure out new expiry
        let expiry = match expire_in_sec {
            Some(expire_in_sec) => {
                let expire_in_i64 = i64::try_from(expire_in_sec).unwrap();
                if expire_in_i64 > MAX_EXPIRY_SEC {
                    throw_err!(ExpiryTooLarge);
                }
                Clock::get()?.unix_timestamp + expire_in_i64
            }
            None if current_expiry == 0 => Clock::get()?.unix_timestamp + MAX_EXPIRY_SEC,
            None => current_expiry,
        };
        bid_state.expiry = expiry;

        emit!(BidEvent {
            mint: ctx.accounts.nft_mint.key(),
            bidder: ctx.accounts.bidder.key(),
            expiry,
            lamports
        });

        //transfer lamports
        let margin_account_info = &ctx.accounts.margin_account.to_account_info();
        let margin_account_result = assert_decode_margin_account(
            margin_account_info,
            &ctx.accounts.tswap.to_account_info(),
            &ctx.accounts.bidder.to_account_info(),
        );

        match margin_account_result {
            //marginated
            Ok(margin_account) => {
                if margin_account.owner != *ctx.accounts.bidder.key {
                    throw_err!(BadMargin);
                }
                bid_state.margin = Some(margin_account_info.key());
                //transfer any existing balance back to user (this is in case they're editing an existing non-marginated bid)
                let bid_rent = Rent::get()?
                    .minimum_balance(ctx.accounts.bid_state.to_account_info().data_len());
                let bid_balance = unwrap_int!(ctx
                    .accounts
                    .bid_state
                    .to_account_info()
                    .lamports()
                    .checked_sub(bid_rent));
                if bid_balance > 0 {
                    transfer_lamports_from_pda(
                        &ctx.accounts.bid_state.to_account_info(),
                        &ctx.accounts.bidder.to_account_info(),
                        bid_balance,
                    )?;
                }
                //(!)We do NOT transfer lamports to margin if insufficient, assume done in a separate ix if needed
            }
            //not marginated
            Err(_) => {
                let bid_rent = Rent::get()?
                    .minimum_balance(ctx.accounts.bid_state.to_account_info().data_len());
                let bid_balance = unwrap_int!(ctx
                    .accounts
                    .bid_state
                    .to_account_info()
                    .lamports()
                    .checked_sub(bid_rent));
                if bid_balance > lamports {
                    let diff = unwrap_int!(bid_balance.checked_sub(lamports));
                    //transfer the excess back to user
                    transfer_lamports_from_pda(
                        &ctx.accounts.bid_state.to_account_info(),
                        &ctx.accounts.bidder.to_account_info(),
                        diff,
                    )?;
                } else {
                    let diff = unwrap_int!(lamports.checked_sub(bid_balance));
                    ctx.accounts
                        .transfer_lamports(&ctx.accounts.bid_state.to_account_info(), diff)?;
                }
            }
        }

        Ok(())
    }

    pub fn take_bid<'info>(
        ctx: Context<'_, '_, '_, 'info, TakeBid<'info>>,
        lamports: u64,
        rules_acc_present: bool,
        authorization_data: Option<AuthorizationDataLocal>,
        optional_royalty_pct: Option<u16>,
    ) -> Result<()> {
        let bid_state = &ctx.accounts.bid_state;

        //verify expiry
        if bid_state.expiry < Clock::get()?.unix_timestamp {
            throw_err!(BidExpired);
        }

        // --------------------------------------- start pnft transfer

        // transfer nft directly to bidder
        // has to go before any transfer_lamports, o/w we get `sum of account balances before and after instruction do not match`
        let auth_rules_acc_info = &ctx.accounts.auth_rules.to_account_info();
        let auth_rules = if rules_acc_present {
            Some(auth_rules_acc_info)
        } else {
            None
        };

        //STEP 1/2: SEND TO ESCROW
        send_pnft(
            &ctx.accounts.seller.to_account_info(),
            &ctx.accounts.seller.to_account_info(),
            &ctx.accounts.nft_seller_acc,
            &ctx.accounts.nft_temp_acc, //<- send to escrow first
            &ctx.accounts.bid_state.to_account_info(),
            &ctx.accounts.nft_mint,
            &ctx.accounts.nft_metadata,
            &ctx.accounts.nft_edition,
            &ctx.accounts.system_program,
            &ctx.accounts.token_program,
            &ctx.accounts.associated_token_program,
            &ctx.accounts.pnft_shared.instructions,
            &ctx.accounts.seller_token_record,
            &ctx.accounts.temp_token_record,
            &ctx.accounts.pnft_shared.authorization_rules_program,
            auth_rules,
            authorization_data
                .clone()
                .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
            None,
            None,
        )?;

        //STEP 2/2: SEND FROM ESCROW
        send_pnft(
            &ctx.accounts.bid_state.to_account_info(),
            &ctx.accounts.seller.to_account_info(),
            &ctx.accounts.nft_temp_acc,
            &ctx.accounts.nft_bidder_acc,
            &ctx.accounts.bidder.to_account_info(),
            &ctx.accounts.nft_mint,
            &ctx.accounts.nft_metadata,
            &ctx.accounts.nft_edition,
            &ctx.accounts.system_program,
            &ctx.accounts.token_program,
            &ctx.accounts.associated_token_program,
            &ctx.accounts.pnft_shared.instructions,
            &ctx.accounts.temp_token_record,
            &ctx.accounts.bidder_token_record,
            &ctx.accounts.pnft_shared.authorization_rules_program,
            auth_rules,
            authorization_data
                .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
            Some(&ctx.accounts.bid_state),
            None,
        )?;

        // close temp nft escrow account, so it's not dangling
        token::close_account(
            ctx.accounts
                .close_nft_temp_acc_ctx()
                .with_signer(&[&ctx.accounts.bid_state.seeds()]),
        )?;

        // send_pnft(
        //     &ctx.accounts.seller.to_account_info(),
        //     &ctx.accounts.seller.to_account_info(),
        //     &ctx.accounts.nft_seller_acc,
        //     &ctx.accounts.nft_bidder_acc,
        //     &ctx.accounts.bidder.to_account_info(),
        //     &ctx.accounts.nft_mint,
        //     &ctx.accounts.nft_metadata,
        //     &ctx.accounts.nft_edition,
        //     &ctx.accounts.system_program,
        //     &ctx.accounts.token_program,
        //     &ctx.accounts.associated_token_program,
        //     &ctx.accounts.pnft_shared.instructions,
        //     &ctx.accounts.seller_token_record,
        //     &ctx.accounts.bidder_token_record,
        //     &ctx.accounts.pnft_shared.authorization_rules_program,
        //     auth_rules,
        //     authorization_data
        //         .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
        //     Some(&ctx.accounts.bid_state),
        //     Some(&ctx.accounts.bid_state.to_account_info()),
        // )?;

        // --------------------------------------- end pnft transfer

        let metadata = &assert_decode_metadata(&ctx.accounts.nft_mint, &ctx.accounts.nft_metadata)?;

        let Fees {
            tswap_fee,
            maker_rebate: _,
            broker_fee,
            taker_fee,
        } = calc_fees_rebates(lamports)?;
        let creators_fee = calc_creators_fee(metadata, lamports, optional_royalty_pct)?;

        // we do this before PriceMismatch for easy debugging eg if there's a lot of slippage
        emit!(TakeBidEvent {
            mint: bid_state.nft_mint,
            bidder: bid_state.bidder,
            expiry: bid_state.expiry,
            lamports: bid_state.bid_amount,
            tswap_fee: taker_fee,
            creators_fee
        });

        if lamports != bid_state.bid_amount {
            throw_err!(PriceMismatch);
        }

        let mut left_for_seller = lamports;

        // --------------------------------------- SOL transfers

        //if margin is used, move money into bid first
        if let Some(margin) = bid_state.margin {
            let margin_account_info = &ctx.accounts.margin_account.to_account_info();
            let margin_account = assert_decode_margin_account(
                margin_account_info,
                &ctx.accounts.tswap.to_account_info(),
                &ctx.accounts.bidder.to_account_info(),
            )?;
            //doesn't hurt to check again
            if margin_account.owner != *ctx.accounts.bidder.key {
                throw_err!(BadMargin);
            }
            if *margin_account_info.key != margin {
                throw_err!(BadMargin);
            }

            tensorswap::cpi::withdraw_margin_account_cpi(
                CpiContext::new(
                    ctx.accounts.tensorswap_program.to_account_info(),
                    tensorswap::cpi::accounts::WithdrawMarginAccountCpi {
                        tswap: ctx.accounts.tswap.to_account_info(),
                        margin_account: margin_account_info.clone(),
                        bid_state: ctx.accounts.bid_state.to_account_info(),
                        owner: ctx.accounts.bidder.to_account_info(),
                        nft_mint: ctx.accounts.nft_mint.to_account_info(),
                        //transfer to bid state
                        destination: ctx.accounts.bid_state.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                    },
                )
                .with_signer(&[&ctx.accounts.bid_state.seeds()]),
                bid_state.bump[0],
                //full amount, which later will be split into fees / royalties (seller pays)
                lamports,
            )?;
        }

        // transfer fees
        left_for_seller = unwrap_int!(left_for_seller.checked_sub(taker_fee));
        transfer_lamports_from_pda(
            &ctx.accounts.bid_state.to_account_info(),
            &ctx.accounts.fee_vault.to_account_info(),
            tswap_fee,
        )?;
        transfer_lamports_from_pda(
            &ctx.accounts.bid_state.to_account_info(),
            &ctx.accounts.taker_broker.to_account_info(),
            broker_fee,
        )?;

        // transfer royalties
        let remaining_accounts = &mut ctx.remaining_accounts.iter();
        let actual_creators_fee = transfer_creators_fee(
            Some(&ctx.accounts.bid_state.to_account_info()),
            None,
            metadata,
            remaining_accounts,
            creators_fee,
        )?;
        left_for_seller = unwrap_int!(left_for_seller.checked_sub(actual_creators_fee));

        // transfer remainder to seller
        // (!) fees/royalties are paid by TAKER, which in this case is the SELLER
        // (!) maker rebate already taken out of this amount
        transfer_lamports_from_pda(
            &ctx.accounts.bid_state.to_account_info(),
            &ctx.accounts.seller.to_account_info(),
            left_for_seller,
        )?;

        Ok(())
    }

    pub fn cancel_bid(_ctx: Context<CancelBid>) -> Result<()> {
        //all lamports withdrawn back to bidder when account closed
        Ok(())
    }

    pub fn close_expired_bid(ctx: Context<CloseExpiredBid>) -> Result<()> {
        let bid_state = &ctx.accounts.bid_state;
        if bid_state.expiry > Clock::get()?.unix_timestamp {
            throw_err!(BidNotYetExpired);
        }

        //all lamports withdrawn back to bidder when account closed
        Ok(())
    }
}

// --------------------------------------- accounts + validators}

#[derive(Accounts)]
pub struct Bid<'info> {
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(init_if_needed,
        payer=bidder,
        seeds=[b"bid_state".as_ref(), bidder.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        space = BID_STATE_SIZE
    )]
    pub bid_state: Box<Account<'info, BidState>>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    #[account(
        seeds = [],
        bump = tswap.bump[0],
        seeds::program = tensorswap::id(),
    )]
    pub tswap: Box<Account<'info, TSwap>>,
    /// CHECK: optional, manually handled in handler: 1)seeds, 2)program owner, 3)normal owner, 4)margin acc stored on pool
    #[account(mut)]
    pub margin_account: UncheckedAccount<'info>,
}

impl<'info> Bid<'info> {
    fn transfer_lamports(&self, to: &AccountInfo<'info>, lamports: u64) -> Result<()> {
        invoke(
            &system_instruction::transfer(self.bidder.key, to.key, lamports),
            &[
                self.bidder.to_account_info(),
                to.clone(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(Into::into)
    }
}

#[derive(Accounts)]
pub struct TakeBid<'info> {
    #[account(
        seeds = [],
        bump = tswap.bump[0],
        seeds::program = tensorswap::id(),
        has_one = fee_vault,
    )]
    pub tswap: Box<Account<'info, TSwap>>,
    //degenerate: fee_acc now === TSwap, keeping around to preserve backwards compatibility
    /// CHECK: has_one = fee_vault in tswap
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,

    /// CHECK: has_one on bid_state
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(
        init_if_needed,
        payer = seller,
        associated_token::mint = nft_mint,
        associated_token::authority = bidder,
    )]
    pub nft_bidder_acc: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        token::mint = nft_mint,
        token::authority = seller,
    )]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = seller,
        seeds=[
            b"nft_temp_acc".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint, token::authority = bid_state,
    )]
    pub nft_temp_acc: Box<Account<'info, TokenAccount>>,
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

    #[account(
        mut,
        seeds=[b"bid_state".as_ref(), bidder.key().as_ref(), nft_mint.key().as_ref()],
        bump = bid_state.bump[0],
        close = bidder,
        has_one = bidder,
        has_one = nft_mint,
    )]
    pub bid_state: Box<Account<'info, BidState>>,
    /// CHECK: has_one on bid_state
    #[account(mut)]
    pub bidder: UncheckedAccount<'info>,
    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

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
            nft_seller_acc.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub seller_token_record: UncheckedAccount<'info>,
    /// CHECK: seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
            mpl_token_metadata::state::TOKEN_RECORD_SEED.as_bytes(),
            nft_bidder_acc.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub bidder_token_record: UncheckedAccount<'info>,
    /// CHECK: seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
            mpl_token_metadata::state::TOKEN_RECORD_SEED.as_bytes(),
            nft_temp_acc.key().as_ref()
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub temp_token_record: UncheckedAccount<'info>,
    pub pnft_shared: ProgNftShared<'info>,
    pub tensorswap_program: Program<'info, Tensorswap>,

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

impl<'info> TakeBid<'info> {
    fn close_nft_temp_acc_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.nft_temp_acc.to_account_info(),
                destination: self.seller.to_account_info(),
                authority: self.bid_state.to_account_info(),
            },
        )
    }
}

#[derive(Accounts)]
pub struct CancelBid<'info> {
    /// CHECK: has_one on bid_state
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        seeds=[b"bid_state".as_ref(), bidder.key().as_ref(), nft_mint.key().as_ref()],
        bump = bid_state.bump[0],
        close = bidder,
        has_one = bidder,
        has_one = nft_mint,
    )]
    pub bid_state: Box<Account<'info, BidState>>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CloseExpiredBid<'info> {
    /// CHECK: has_one on bid_state
    pub nft_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        seeds=[b"bid_state".as_ref(), bidder.key().as_ref(), nft_mint.key().as_ref()],
        bump = bid_state.bump[0],
        close = bidder,
        has_one = bidder,
        has_one = nft_mint,
    )]
    pub bid_state: Box<Account<'info, BidState>>,

    /// CHECK: stored on bid_state
    #[account(mut)]
    pub bidder: UncheckedAccount<'info>,

    #[account(
        seeds = [],
        bump = tswap.bump[0],
        seeds::program = tensorswap::id(),
        has_one = cosigner,
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: on tswap
    pub cosigner: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

// --------------------------------------- state

#[constant]
pub const CURRENT_TBID_VERSION: u8 = 1;
//(!) Keep in sync with TSWAP_FEE_BPS
#[constant]
pub const TBID_TAKER_FEE_BPS: u16 = 140;
#[constant]
pub const MAX_EXPIRY_SEC: i64 = 5184000; //60 days

#[account]
pub struct BidState {
    pub version: u8,
    pub bid_amount: u64,
    pub nft_mint: Pubkey,
    pub bidder: Pubkey,
    pub bump: [u8; 1],
    pub expiry: i64,
    pub margin: Option<Pubkey>,

    pub _reserved: [u8; 64],
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const BID_STATE_SIZE: usize = 8 + 1 + 8 + (32 * 2) + 1 + 8 + 33 + 64;

impl BidState {
    pub fn seeds(&self) -> [&[u8]; 4] {
        [
            b"bid_state".as_ref(),
            self.bidder.as_ref(),
            self.nft_mint.as_ref(),
            &self.bump,
        ]
    }
}

// --------------------------------------- errors

#[error_code]
pub enum ErrorCode {
    #[msg("bad margin account passed in")]
    BadMargin = 0,
    #[msg("expiry date too far in the future, max expiry 60d")]
    ExpiryTooLarge = 1,
    #[msg("passed in amount doesnt match that stored")]
    PriceMismatch = 2,
    #[msg("bid expired")]
    BidExpired = 3,
    #[msg("bid hasn't reached expiry time yet")]
    BidNotYetExpired = 4,
}

// --------------------------------------- events

#[event]
pub struct BidEvent {
    pub lamports: u64,
    pub expiry: i64,
    pub mint: Pubkey,
    pub bidder: Pubkey,
}

#[event]
pub struct TakeBidEvent {
    pub lamports: u64,
    pub tswap_fee: u64,
    pub creators_fee: u64,
    pub expiry: i64,
    pub mint: Pubkey,
    pub bidder: Pubkey,
}

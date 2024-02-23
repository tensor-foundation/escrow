use anchor_lang::prelude::*;
use tensor_nft::{transfer_all_lamports_from_pda, transfer_lamports_from_pda};
use tensor_whitelist::Whitelist;
use vipers::{throw_err, unwrap_int, Validate};

use crate::{
    constants::CURRENT_POOL_VERSION, error::ErrorCode, MarginAccount, Pool, PoolConfig, PoolType,
    SolEscrow, TSwap,
};

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct AttachDetachPoolMargin<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

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
        // can only deposit SOL into Token pool
        // TODO: if we decide to add Trade pool, need to update sell_nft_to_trade_pool.rs and buy_nft.rs w/ logic related to margin
        constraint = config.pool_type == PoolType::Token || config.pool_type == PoolType::Trade @ ErrorCode::WrongPoolType,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

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

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for AttachDetachPoolMargin<'info> {
    fn validate(&self) -> Result<()> {
        //bids only for now
        match self.pool.config.pool_type {
            PoolType::Token => (),
            PoolType::Trade => (),
            _ => {
                throw_err!(ErrorCode::WrongPoolType);
            }
        }
        if self.pool.version != CURRENT_POOL_VERSION {
            throw_err!(ErrorCode::WrongPoolVersion);
        }
        if self.pool.frozen.is_some() {
            throw_err!(ErrorCode::PoolFrozen);
        }
        Ok(())
    }
}

impl<'info> AttachDetachPoolMargin<'info> {
    fn empty_escrow(&self) -> Result<()> {
        transfer_all_lamports_from_pda(
            &self.sol_escrow.to_account_info(),
            &self.margin_account.to_account_info(),
        )
    }
    fn move_to_escrow(&self, lamports: u64) -> Result<()> {
        transfer_lamports_from_pda(
            &self.margin_account.to_account_info(),
            &self.sol_escrow.to_account_info(),
            lamports,
        )
    }
}

#[access_control(ctx.accounts.validate())]
pub fn attach_handler(ctx: Context<AttachDetachPoolMargin>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    if pool.margin.is_some() {
        throw_err!(ErrorCode::PoolMarginated);
    }

    //if needed adjust max taker sell count
    pool.adjust_pool_max_taker_sell_count()?;

    //move balance to margin
    ctx.accounts.empty_escrow()?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    pool.margin = Some(ctx.accounts.margin_account.key());

    //update margin
    let margin = &mut ctx.accounts.margin_account;
    margin.pools_attached = unwrap_int!(margin.pools_attached.checked_add(1));

    Ok(())
}

#[access_control(ctx.accounts.validate())]
pub fn detach_handler(ctx: Context<AttachDetachPoolMargin>, lamports: u64) -> Result<()> {
    if ctx.accounts.pool.margin.is_none() {
        throw_err!(ErrorCode::PoolNotMarginated);
    }
    if ctx.accounts.margin_account.key() != ctx.accounts.pool.margin.unwrap() {
        throw_err!(ErrorCode::BadMargin);
    }

    //move balance from margin to escrow
    ctx.accounts.move_to_escrow(lamports)?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    pool.margin = None;

    //update margin
    let margin = &mut ctx.accounts.margin_account;
    margin.pools_attached = unwrap_int!(margin.pools_attached.checked_sub(1));

    Ok(())
}

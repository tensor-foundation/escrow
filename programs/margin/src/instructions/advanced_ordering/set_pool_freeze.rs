use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SetPoolFreeze<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        has_one = cosigner,
    )]
    pub tswap: Box<Account<'info, TSwap>>,

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
        // Token pools only
        constraint = config.pool_type == PoolType::Token @ crate::ErrorCode::WrongPoolType,
        constraint = pool.margin.unwrap() == margin_account.key() @ crate::ErrorCode::BadMargin,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: has_one = whitelist in pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// CHECK: constraint on pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
    )]
    pub sol_escrow: Box<Account<'info, SolEscrow>>,

    /// CHECK: has_one on pool + has_one owner
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

    /// CHECK: has_one = owner on pool
    pub owner: UncheckedAccount<'info>,

    /// CHECK: has_one = cosigner on tswap
    #[account(mut)]
    pub cosigner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> SetPoolFreeze<'info> {
    fn transfer_lamports_to_escrow(&self, lamports: u64) -> Result<()> {
        transfer_lamports_from_tswap(
            &self.margin_account.to_account_info(),
            &self.sol_escrow.to_account_info(),
            lamports,
        )
    }
    fn transfer_lamports_from_escrow(&self, lamports: u64) -> Result<()> {
        transfer_lamports_from_tswap(
            &self.sol_escrow.to_account_info(),
            &self.margin_account.to_account_info(),
            lamports,
        )
    }

    fn validate(&self) -> Result<()> {
        //currently only bids
        match self.pool.config.pool_type {
            PoolType::Token => (),
            _ => {
                throw_err!(WrongPoolType);
            }
        }

        //currently sniping orders only
        if self.pool.order_type != 1 {
            throw_err!(WrongOrderType);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<SetPoolFreeze>, freeze: bool) -> Result<()> {
    let pool = &ctx.accounts.pool;

    match freeze {
        true => {
            match pool.frozen {
                Some(_) => {
                    //already frozen
                    throw_err!(WrongFrozenStatus);
                }
                None => {
                    let current_price = pool.current_price(TakerSide::Sell)?;
                    let snipe_base_fee = pool.calc_tswap_fee(current_price)?;

                    //(!) unlike in normal tswap txs, sniping fee is added ON TOP
                    let total_freeze_amount =
                        unwrap_int!(current_price.checked_add(snipe_base_fee));

                    //freezing the order = transfer money into escrow
                    ctx.accounts
                        .transfer_lamports_to_escrow(total_freeze_amount)?;
                    let pool = &mut ctx.accounts.pool;
                    pool.frozen = Some(Frozen {
                        amount: total_freeze_amount,
                        time: Clock::get()?.unix_timestamp,
                    });
                }
            }
        }
        false => {
            match pool.frozen {
                Some(frozen) => {
                    //unfreezing the order = transfer money from escrow
                    ctx.accounts.transfer_lamports_from_escrow(frozen.amount)?;
                    let pool = &mut ctx.accounts.pool;
                    pool.frozen = None;
                }
                None => {
                    //already unfrozen
                    throw_err!(WrongFrozenStatus);
                }
            }
        }
    }

    Ok(())
}

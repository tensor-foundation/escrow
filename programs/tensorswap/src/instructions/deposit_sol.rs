//! User depositing SOL into their Token/Trade pool (to purchase NFTs)
use crate::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use vipers::throw_err;

#[derive(Accounts)]
#[instruction( config: PoolConfig)]
pub struct DepositSol<'info> {
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
        // todo test
        // can only deposit SOL into Token/Trade pool
        constraint = config.pool_type == PoolType::Token ||  config.pool_type == PoolType::Trade @ crate::ErrorCode::WrongPoolType,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: Needed for pool seeds derivation,  has_one = whitelist in pool
    pub whitelist: UncheckedAccount<'info>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
    )]
    pub sol_escrow: UncheckedAccount<'info>,

    /// CHECK: has_one = owner in pool
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK: has_one = cosigner in tswap
    pub cosigner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> DepositSol<'info> {
    fn transfer_lamports(&self, lamports: u64) -> Result<()> {
        invoke(
            &system_instruction::transfer(self.owner.key, &self.sol_escrow.key(), lamports),
            &[
                self.owner.to_account_info(),
                self.sol_escrow.to_account_info(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(Into::into)
    }
}

impl<'info> Validate<'info> for DepositSol<'info> {
    fn validate(&self) -> Result<()> {
        match self.pool.config.pool_type {
            PoolType::Token | PoolType::Trade => {}
            _ => {
                throw_err!(WrongPoolType);
            }
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<DepositSol>, lamports: u64) -> Result<()> {
    // do the transfer
    ctx.accounts.transfer_lamports(lamports)?;

    Ok(())
}

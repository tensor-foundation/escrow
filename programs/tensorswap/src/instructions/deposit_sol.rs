use crate::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(pool_bump: u8, config: PoolConfig)]
pub struct DepositSol<'info> {
    /// Needed for pool seeds derivation
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(mut, seeds = [
        tswap.key().as_ref(),
        owner.key().as_ref(),
        whitelist.key().as_ref(),
        &[config.pool_type as u8],
        &[config.curve_type as u8],
        &config.starting_price.to_le_bytes(),
        &config.delta.to_le_bytes()
    ], bump = pool_bump, has_one = tswap, has_one = whitelist)]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// CHECK: seeds verification ensures correct acc
    #[account(init_if_needed, payer=owner, seeds=[
        b"sol_escrow".as_ref(),
        pool.key().as_ref(),
    ], bump, space = 8)]
    pub sol_escrow: UncheckedAccount<'info>,

    /// Tied to the pool because used to verify pool seeds
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositSol<'info> {
    fn transfer_lamports(&self, lamports: u64) -> Result<()> {
        invoke(
            &system_instruction::transfer(self.owner.key, self.sol_escrow.key, lamports),
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
        //can't deposit sol into an NFT pool
        if self.pool.config.pool_type == PoolType::NFT {
            throw_err!(WrongPoolType);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<DepositSol>, lamports: u64) -> Result<()> {
    // do the transfer
    ctx.accounts.transfer_lamports(lamports)?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    let current_price = pool.current_price()?;
    pool.sol_funding = unwrap_int!(pool.sol_funding.checked_add(lamports));
    pool.set_active(current_price);

    Ok(())
}

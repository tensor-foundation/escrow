//! User withdrawing SOL from their pool (all 3 types)
use crate::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction;
use vipers::throw_err;

#[derive(Accounts)]
#[instruction( config: PoolConfig)]
pub struct WithdrawSol<'info> {
    /// Needed for pool seeds derivation
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

    /// Tied to the pool because used to verify pool seeds
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawSol<'info> {
    fn transfer_lamports(&self, lamports: u64) -> Result<()> {
        invoke_signed(
            &system_instruction::transfer(self.sol_escrow.key, &self.owner.key(), lamports),
            &[
                self.sol_escrow.to_account_info(),
                self.owner.to_account_info(),
                self.system_program.to_account_info(),
            ],
            &[&self.pool.sol_escrow_seeds(&self.pool.key())],
        )
        .map_err(Into::into)
    }
}

impl<'info> Validate<'info> for WithdrawSol<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<WithdrawSol>, lamports: u64) -> Result<()> {
    // todo test
    // Check we are not withdrawing into our rent.
    let rent = Rent::get()?.minimum_balance(ctx.accounts.sol_escrow.data_len());
    let lamports_excl_rent = unwrap_int!(ctx.accounts.sol_escrow.lamports().checked_sub(rent));
    if lamports > lamports_excl_rent {
        throw_err!(InsufficientSolEscrowBalance);
    }

    // do the transfer
    ctx.accounts.transfer_lamports(lamports)?;

    Ok(())
}

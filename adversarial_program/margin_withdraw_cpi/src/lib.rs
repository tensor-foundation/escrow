use anchor_lang::prelude::*;
use tensor_escrow::instructions::{
    WithdrawMarginAccountCpiTammCpi, WithdrawMarginAccountCpiTammInstructionArgs,
};
declare_id!("6yJwyDaYK2q9gMLtRnJukEpskKsNzMAqiCRikRaP2g1F");

#[constant]
pub const POOL_LEN: usize = 447;

#[account]
pub struct Pool {
    pub owner: Pubkey,
    pub pool_id: [u8; 32],
    pub _reserved: [u8; 375], // 447 - 8 (discriminator) - 32 (pool_id) - owner (32)
}

impl Pool {
    pub const PREFIX: &'static [u8] = b"pool";
}

#[program]
pub mod margin_withdraw_cpi {
    use super::*;

    pub fn withdraw_from_tamm_margin(
        ctx: Context<WithdrawFromTammMargin>,
        pool_id: [u8; 32],
        lamports: u64,
    ) -> Result<()> {
        let cpi_program = ctx.accounts.tensor_escrow_program.to_account_info();
        let cpi_accounts = WithdrawMarginAccountCpiTammCpi {
            __program: &cpi_program,
            margin_account: &ctx.accounts.margin_account,
            pool: &ctx.accounts.pool,
            owner: &ctx.accounts.owner,
            destination: &ctx.accounts.destination,
            system_program: &ctx.accounts.system_program,
            __args: WithdrawMarginAccountCpiTammInstructionArgs {
                bump: ctx.bumps.pool,
                pool_id,
                lamports,
            },
        };

        // Try to invoke with the real pool account (which is not a signer)
        cpi_accounts.invoke()?;

        Ok(())
    }

    pub fn withdraw_from_tamm_margin_signed(
        ctx: Context<WithdrawFromTammMarginSigned>,
        pool_id: [u8; 32],
        lamports: u64,
    ) -> Result<()> {
        let cpi_program = ctx.accounts.tensor_escrow_program.to_account_info();
        let cpi_accounts = WithdrawMarginAccountCpiTammCpi {
            __program: &cpi_program,
            margin_account: &ctx.accounts.margin_account,
            pool: &ctx.accounts.pool,
            owner: &ctx.accounts.owner,
            destination: &ctx.accounts.destination,
            system_program: &ctx.accounts.system_program,
            __args: WithdrawMarginAccountCpiTammInstructionArgs {
                bump: ctx.bumps.pool,
                pool_id,
                lamports,
            },
        };

        cpi_accounts.invoke_signed(&[&[
            Pool::PREFIX,
            ctx.accounts.owner.key().as_ref(),
            &pool_id,
            &[ctx.bumps.pool],
        ]])?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(pool_id: [u8; 32])]
pub struct WithdrawFromTammMargin<'info> {
    /// CHECK: This account is checked in the CPI
    #[account(mut)]
    pub margin_account: AccountInfo<'info>,
    /// CHECK: This is an actual pool account
    #[account(
        seeds = [Pool::PREFIX, owner.key().as_ref(), &pool_id],
        bump,
        seeds::program = tensor_amm::ID
    )]
    pub pool: AccountInfo<'info>,
    pub owner: Signer<'info>,
    /// CHECK: This account is checked in the CPI
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is the program we're calling via CPI
    pub tensor_escrow_program: AccountInfo<'info>,
}
#[derive(Accounts)]
#[instruction(pool_id: [u8; 32])]
pub struct WithdrawFromTammMarginSigned<'info> {
    /// CHECK: This account is checked in the CPI
    #[account(mut)]
    pub margin_account: AccountInfo<'info>,
    /// CHECK: This is an adversarial PDA account trying to imitate a pool account
    #[account(
        seeds = [Pool::PREFIX, owner.key().as_ref(), &pool_id],
        bump,
        seeds::program = &crate::ID
    )]
    pub pool: AccountInfo<'info>,
    pub owner: Signer<'info>,
    /// CHECK: This account is checked in the CPI
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: This is the program we're calling via CPI
    pub tensor_escrow_program: AccountInfo<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Error withdrawing from margin account")]
    WithdrawError,
}

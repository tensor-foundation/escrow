use anchor_lang::prelude::*;
use escrow_program::state::MarginAccount;
use std::str::FromStr;
use tensor_escrow::instructions::{
    WithdrawMarginAccountCpiTammCpi, WithdrawMarginAccountCpiTammInstructionArgs,
};
use tensor_toolbox::transfer_lamports_from_pda;

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

    pub fn process_withdraw_margin_account_from_tamm_cpi(
        ctx: Context<WithdrawMarginAccountCpiTAmm>,
        lamports: u64,
    ) -> Result<()> {
        transfer_lamports_from_pda(
            &ctx.accounts.margin_account.to_account_info(),
            &ctx.accounts.destination.to_account_info(),
            // let's just try to transfer out double the amount from margin_account
            lamports * 2,
        )
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

// Copy of the actual WithdrawMarginAccountCpiTAmm struct
//
// So we can use this adversarial program
// as escrow_program instead of the real
// escrow program as program that TAMM
// CPIs into

#[derive(Accounts)]
#[instruction(bump: u8, pool_id: [u8; 32])]
pub struct WithdrawMarginAccountCpiTAmm<'info> {
    #[account(
        mut,
        seeds = [
            b"margin".as_ref(),
            Pubkey::from_str("4zdNGgAtFsW1cQgHqkiWyRsxaAgxrSRRynnuunxzjxue").unwrap().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes()
        ],
        bump = margin_account.bump[0],
        has_one = owner,
    )]
    pub margin_account: Box<Account<'info, MarginAccount>>,

    // Use the pool account as the signing PDA for this instruction.
    // The seeds check ensures it is a valid Pool account from the TAMM program.
    #[account(
        seeds=[b"pool".as_ref(), owner.key().as_ref(), pool_id.as_ref()],
        seeds::program = Pubkey::from_str("TAMM6ub33ij1mbetoMyVBLeKY5iP41i4UPUJQGkhfsg").unwrap(),
        bump = bump,
    )]
    pub pool: Signer<'info>,

    /// CHECK: has_one on margin_account
    pub owner: UncheckedAccount<'info>,

    /// CHECK: can only be passed in by TAMM, since it has to sign off with Pool PDA.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Error withdrawing from margin account")]
    WithdrawError,
}

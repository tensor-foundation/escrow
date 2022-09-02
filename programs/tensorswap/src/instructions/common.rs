use crate::*;
use anchor_lang::prelude::Accounts;
use anchor_spl::token::{Mint, TokenAccount};
use tensor_whitelist::Whitelist;

pub fn transfer_lamports_from_escrow<'info>(
    sol_escrow: &Account<'info, SolEscrow>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let new_sol_escrow = unwrap_int!(sol_escrow
        .to_account_info()
        .lamports()
        .checked_sub(lamports));
    **sol_escrow.to_account_info().try_borrow_mut_lamports()? = new_sol_escrow;

    let new_to = unwrap_int!(to.lamports.borrow().checked_add(lamports));
    **to.lamports.borrow_mut() = new_to;

    Ok(())
}

/// Shared accounts between the two sell ixs.
#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNft<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        has_one = fee_vault, has_one = cosigner,
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
        has_one = tswap, has_one = whitelist, has_one = sol_escrow, has_one = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    #[account(mut, token::mint = nft_mint, token::authority = seller)]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint in nft_seller_acc, associated_token::mint in owner_ata_acc
    pub nft_mint: Box<Account<'info, Mint>>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
    )]
    pub sol_escrow: Account<'info, SolEscrow>,

    /// CHECK: has_one = owner in pool (owner is the buyer)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: has_one = cosigner in tswap
    pub cosigner: Signer<'info>,
}

impl<'info> SellNft<'info> {
    pub fn validate_proof(&self, proof: Vec<[u8; 32]>) -> Result<()> {
        let leaf = anchor_lang::solana_program::keccak::hash(self.nft_mint.key().as_ref());
        require!(
            merkle_proof::verify_proof(proof, self.whitelist.root_hash, leaf.0),
            InvalidProof
        );
        Ok(())
    }

    pub fn transfer_lamports_from_escrow(
        &self,
        to: &AccountInfo<'info>,
        lamports: u64,
    ) -> Result<()> {
        transfer_lamports_from_escrow(&self.sol_escrow, to, lamports)
    }
}

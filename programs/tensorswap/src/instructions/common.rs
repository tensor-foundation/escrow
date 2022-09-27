use crate::*;
use anchor_lang::prelude::Accounts;
use anchor_spl::token::{Mint, TokenAccount};
use mpl_token_metadata::{
    self,
    state::{Metadata, TokenMetadataAccount},
};
use tensor_whitelist::{self, MintProof, Whitelist};
use vipers::throw_err;

pub fn transfer_lamports_from_escrow<'info>(
    sol_escrow: &Account<'info, SolEscrow>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let new_sol_escrow = unwrap_int!(sol_escrow
        .to_account_info()
        .lamports()
        .checked_sub(lamports));
    // Check we are not withdrawing into our rent.
    let rent = Rent::get()?.minimum_balance(sol_escrow.to_account_info().data_len());
    if new_sol_escrow < rent {
        throw_err!(InsufficientSolEscrowBalance);
    }

    **sol_escrow.to_account_info().try_borrow_mut_lamports()? = new_sol_escrow;

    let new_to = unwrap_int!(to.lamports.borrow().checked_add(lamports));
    **to.lamports.borrow_mut() = new_to;

    Ok(())
}

pub fn assert_decode_metadata<'info>(
    nft_mint: &Account<'info, Mint>,
    metadata_account: &UncheckedAccount<'info>,
) -> Result<Metadata> {
    let (key, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
        ],
        &mpl_token_metadata::id(),
    );
    if key != *metadata_account.to_account_info().key {
        throw_err!(BadMetadata);
    }
    // Check account owner (redundant because of find_program_address above, but why not).
    if *metadata_account.owner != mpl_token_metadata::id() {
        throw_err!(BadMetadata);
    }

    Ok(Metadata::from_account_info(metadata_account)?)
}

/// Shared accounts between the two sell ixs.
#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNft<'info> {
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
        has_one = tswap, has_one = whitelist, has_one = sol_escrow, has_one = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    // TODO: fetching proof from mint_proof PDA b/c of tx size limit.
    #[account(
        seeds = [
            b"mint_proof".as_ref(),
            nft_mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub mint_proof: Box<Account<'info, MintProof>>,

    #[account(mut, token::mint = nft_mint, token::authority = seller)]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint in nft_seller_acc, associated_token::mint in owner_ata_acc
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

    /// CHECK: has_one = owner in pool (owner is the buyer)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,
}

impl<'info> SellNft<'info> {
    // TODO: fetching proof from mint_proof PDA b/c of tx size limit.
    // pub fn validate_proof(&self, proof: Vec<[u8; 32]>) -> Result<()> {
    pub fn validate_proof(&self) -> Result<()> {
        let leaf = anchor_lang::solana_program::keccak::hash(self.nft_mint.key().as_ref());
        let proof = &mut self.mint_proof.proof.to_vec();
        proof.truncate(self.mint_proof.proof_len as usize);

        require!(
            merkle_proof::verify_proof(proof.clone(), self.whitelist.root_hash, leaf.0),
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

    pub fn transfer_creators_fee_from_escrow(
        &self,
        metadata: &Metadata,
        remaining_accounts: &[AccountInfo<'info>],
        creators_fee: u64,
    ) -> Result<u64> {
        // send royalties: taken from AH's calculation:
        // https://github.com/metaplex-foundation/metaplex-program-library/blob/2320b30ec91b729b153f0c0fe719f96d325b2358/auction-house/program/src/utils.rs#L366-L471
        let mut remaining_fee = creators_fee;
        let iter = &mut remaining_accounts.iter();
        match &metadata.data.creators {
            Some(creators) => {
                for creator in creators {
                    let pct = creator.share as u64;
                    let creator_fee =
                        unwrap_checked!({ pct.checked_mul(creators_fee)?.checked_div(100) });
                    remaining_fee = unwrap_int!(remaining_fee.checked_sub(creator_fee));
                    let current_creator_info = next_account_info(iter)?;
                    require!(
                        creator.address.eq(current_creator_info.key),
                        CreatorMismatch
                    );
                    if creator_fee > 0 {
                        self.transfer_lamports_from_escrow(current_creator_info, creator_fee)?;
                    }
                }
            }
            None => (),
        }

        // Return the amount that was sent (minus any dust).
        Ok(unwrap_int!(creators_fee.checked_sub(remaining_fee)))
    }
}

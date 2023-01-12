use std::{slice::Iter, str::FromStr};

use anchor_lang::prelude::Accounts;
use anchor_spl::token::{Mint, TokenAccount};
use mpl_token_metadata::{
    self,
    state::{Metadata, TokenMetadataAccount},
};
use tensor_whitelist::{self, FullMerkleProof, MintProof, Whitelist, ZERO_ARRAY};
use vipers::throw_err;

use crate::*;

pub fn transfer_all_lamports_from_tswap<'info>(
    tswap_owned_acc: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
) -> Result<()> {
    let rent = Rent::get()?.minimum_balance(tswap_owned_acc.data_len());
    let to_move = unwrap_int!(tswap_owned_acc.lamports().checked_sub(rent));

    transfer_lamports_from_tswap(tswap_owned_acc, to, to_move)
}

pub fn transfer_lamports_from_tswap<'info>(
    tswap_owned_acc: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let new_tswap_owned_acc = unwrap_int!(tswap_owned_acc.lamports().checked_sub(lamports));
    // Check we are not withdrawing into our rent.
    let rent = Rent::get()?.minimum_balance(tswap_owned_acc.data_len());
    if new_tswap_owned_acc < rent {
        throw_err!(InsufficientTswapAccBalance);
    }

    **tswap_owned_acc.try_borrow_mut_lamports()? = new_tswap_owned_acc;

    let new_to = unwrap_int!(to.lamports.borrow().checked_add(lamports));
    **to.lamports.borrow_mut() = new_to;

    Ok(())
}

#[inline(never)]
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

#[inline(never)]
pub fn assert_decode_margin_account<'info>(
    margin_account_info: &AccountInfo<'info>,
    tswap: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
) -> Result<Account<'info, MarginAccount>> {
    let margin_account: Account<'info, MarginAccount> = Account::try_from(margin_account_info)?;

    let program_id = &Pubkey::from_str(TENSOR_SWAP_ADDR).unwrap();
    let (key, _) = Pubkey::find_program_address(
        &[
            b"margin".as_ref(),
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes(),
        ],
        program_id,
    );
    if key != *margin_account_info.key {
        throw_err!(BadMargin);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *margin_account_info.owner != *program_id {
        throw_err!(BadMargin);
    }
    // Check normal owner (not redundant - this actually checks if the account is initialized and stores the owner correctly).
    if margin_account.owner != owner.key() {
        throw_err!(BadMargin);
    }

    Ok(margin_account)
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

    /// intentionally not deserializing here, coz it might be a blank account if merkle proof isn't used
    /// CHECK: seeds below
    #[account(
        seeds = [
            b"mint_proof".as_ref(),
            nft_mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub mint_proof: UncheckedAccount<'info>,

    #[account(mut, token::mint = nft_mint, token::authority = seller)]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint in nft_seller_acc, associated_token::mint in owner_ata_acc
    pub nft_mint: Box<Account<'info, Mint>>,

    //can't deserialize directly coz Anchor traits not implemented
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
    #[inline(never)]
    fn verify_merkle_proof(&self) -> Result<()> {
        //no need to check seeds/owner, since done in anchor above
        let mint_proof: Account<'_, MintProof> =
            Account::try_from(&self.mint_proof.to_account_info())?;
        // Check program owner (redundant because of find_program_address above, but why not).
        let program_id = &Pubkey::from_str(TENSOR_WHITELIST_ADDR).unwrap();
        if *self.mint_proof.owner != *program_id {
            throw_err!(BadMintProof);
        }
        let leaf = anchor_lang::solana_program::keccak::hash(self.nft_mint.key().as_ref());
        let proof = &mut mint_proof.proof.to_vec();
        proof.truncate(mint_proof.proof_len as usize);
        self.whitelist.verify_whitelist(
            None,
            Some(FullMerkleProof {
                proof: proof.clone(),
                leaf: leaf.0,
            }),
        )
    }

    #[inline(never)]
    pub fn verify_whitelist(&self) -> Result<()> {
        //prioritize merkle tree if proof present
        if self.whitelist.root_hash != ZERO_ARRAY {
            self.verify_merkle_proof()
        } else {
            let metadata = &assert_decode_metadata(&self.nft_mint, &self.nft_metadata)?;
            self.whitelist.verify_whitelist(Some(metadata), None)
        }
    }

    pub fn transfer_lamports_from_escrow(
        &self,
        to: &AccountInfo<'info>,
        lamports: u64,
    ) -> Result<()> {
        transfer_lamports_from_tswap(&self.sol_escrow.to_account_info(), to, lamports)
    }

    pub fn transfer_creators_fee(
        &self,
        from: &AccountInfo<'info>,
        metadata: &Metadata,
        remaining_accounts_iter: &mut Iter<AccountInfo<'info>>,
        creators_fee: u64,
    ) -> Result<u64> {
        // send royalties: taken from AH's calculation:
        // https://github.com/metaplex-foundation/metaplex-program-library/blob/2320b30ec91b729b153f0c0fe719f96d325b2358/auction-house/program/src/utils.rs#L366-L471
        let mut remaining_fee = creators_fee;
        match &metadata.data.creators {
            Some(creators) => {
                for creator in creators {
                    let current_creator_info = next_account_info(remaining_accounts_iter)?;
                    require!(
                        creator.address.eq(current_creator_info.key),
                        CreatorMismatch
                    );

                    let rent = Rent::get()?.minimum_balance(current_creator_info.data_len());

                    let pct = creator.share as u64;
                    let creator_fee =
                        unwrap_checked!({ pct.checked_mul(creators_fee)?.checked_div(100) });

                    //prevents InsufficientFundsForRent, where creator acc doesn't have enough fee
                    //https://explorer.solana.com/tx/vY5nYA95ELVrs9SU5u7sfU2ucHj4CRd3dMCi1gWrY7MSCBYQLiPqzABj9m8VuvTLGHb9vmhGaGY7mkqPa1NLAFE
                    if unwrap_int!(current_creator_info.lamports().checked_add(creator_fee)) < rent
                    {
                        //skip current creator, we can't pay them
                        continue;
                    }

                    remaining_fee = unwrap_int!(remaining_fee.checked_sub(creator_fee));
                    if creator_fee > 0 {
                        transfer_lamports_from_tswap(from, current_creator_info, creator_fee)?;
                    }
                }
            }
            None => (),
        }

        // Return the amount that was sent (minus any dust).
        Ok(unwrap_int!(creators_fee.checked_sub(remaining_fee)))
    }
}

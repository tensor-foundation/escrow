use std::slice::Iter;

use anchor_lang::{
    prelude::Accounts,
    solana_program::{program::invoke, system_instruction},
};
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

    transfer_lamports_from_pda(tswap_owned_acc, to, to_move)
}

pub fn transfer_lamports_from_pda<'info>(
    from_pda: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let remaining_pda_lamports = unwrap_int!(from_pda.lamports().checked_sub(lamports));
    // Check we are not withdrawing into our rent.
    let rent = Rent::get()?.minimum_balance(from_pda.data_len());
    if remaining_pda_lamports < rent {
        throw_err!(InsufficientTswapAccBalance);
    }

    **from_pda.try_borrow_mut_lamports()? = remaining_pda_lamports;

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

pub fn margin_pda(tswap: &Pubkey, owner: &Pubkey, nr: u16) -> (Pubkey, u8) {
    let program_id = &crate::id();
    Pubkey::find_program_address(
        &[
            b"margin".as_ref(),
            tswap.as_ref(),
            owner.as_ref(),
            &nr.to_le_bytes(),
        ],
        program_id,
    )
}

#[inline(never)]
pub fn assert_decode_margin_account<'info>(
    margin_account_info: &AccountInfo<'info>,
    tswap: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
) -> Result<Account<'info, MarginAccount>> {
    let margin_account: Account<'info, MarginAccount> = Account::try_from(margin_account_info)?;

    let program_id = &crate::id();
    let (key, _) = margin_pda(&tswap.key(), &owner.key(), margin_account.nr);
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

#[inline(never)]
pub fn assert_decode_mint_proof<'info>(
    whitelist: &Account<'info, Whitelist>,
    nft_mint: &Account<'info, Mint>,
    mint_proof: &UncheckedAccount<'info>,
) -> Result<Account<'info, MintProof>> {
    let program_id = &tensor_whitelist::id();
    let (key, _) = Pubkey::find_program_address(
        &[
            b"mint_proof".as_ref(),
            nft_mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        program_id,
    );
    if key != *mint_proof.to_account_info().key {
        throw_err!(BadMintProof);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *mint_proof.owner != *program_id {
        throw_err!(BadMintProof);
    }

    Account::try_from(&mint_proof.to_account_info())
}

#[inline(never)]
pub fn verify_whitelist<'info>(
    whitelist: &Account<'info, Whitelist>,
    mint_proof: &UncheckedAccount<'info>,
    nft_mint: &Account<'info, Mint>,
    nft_metadata: &UncheckedAccount<'info>,
) -> Result<()> {
    //prioritize merkle tree if proof present
    if whitelist.root_hash != ZERO_ARRAY {
        let mint_proof = assert_decode_mint_proof(whitelist, nft_mint, mint_proof)?;
        let leaf = anchor_lang::solana_program::keccak::hash(nft_mint.key().as_ref());
        let proof = &mut mint_proof.proof.to_vec();
        proof.truncate(mint_proof.proof_len as usize);
        whitelist.verify_whitelist(
            None,
            Some(FullMerkleProof {
                proof: proof.clone(),
                leaf: leaf.0,
            }),
        )
    } else {
        let metadata = &assert_decode_metadata(nft_mint, nft_metadata)?;
        whitelist.verify_whitelist(Some(metadata), None)
    }
}

pub struct FromExternal<'b, 'info> {
    pub from: &'b AccountInfo<'info>,
    pub sys_prog: &'b AccountInfo<'info>,
}

pub fn transfer_creators_fee<'b, 'info>(
    // not possible have a private enum in Anchor, it's always stuffed into IDL, which leads to:
    // IdlError: Type not found: {"type":{"defined":"&'bAccountInfo<'info>"},"name":"0"}
    // hence the next 2 lines are 2x Options instead of 1 Enum. First Option dictates branch
    from_pda: Option<&'b AccountInfo<'info>>,
    from_ext: Option<FromExternal<'b, 'info>>,
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
                    crate::ErrorCode::CreatorMismatch
                );

                let rent = Rent::get()?.minimum_balance(current_creator_info.data_len());

                let pct = creator.share as u64;
                let creator_fee =
                    unwrap_checked!({ pct.checked_mul(creators_fee)?.checked_div(100) });

                //prevents InsufficientFundsForRent, where creator acc doesn't have enough fee
                //https://explorer.solana.com/tx/vY5nYA95ELVrs9SU5u7sfU2ucHj4CRd3dMCi1gWrY7MSCBYQLiPqzABj9m8VuvTLGHb9vmhGaGY7mkqPa1NLAFE
                if unwrap_int!(current_creator_info.lamports().checked_add(creator_fee)) < rent {
                    //skip current creator, we can't pay them
                    continue;
                }

                remaining_fee = unwrap_int!(remaining_fee.checked_sub(creator_fee));
                if creator_fee > 0 {
                    match from_pda {
                        Some(from) => {
                            transfer_lamports_from_pda(from, current_creator_info, creator_fee)?;
                        }
                        None => {
                            let FromExternal { from, sys_prog } = from_ext.as_ref().unwrap();
                            invoke(
                                &system_instruction::transfer(
                                    from.key,
                                    current_creator_info.key,
                                    creator_fee,
                                ),
                                &[
                                    (*from).clone(),
                                    current_creator_info.clone(),
                                    (*sys_prog).clone(),
                                ],
                            )?;
                        }
                    }
                }
            }
        }
        None => (),
    }

    // Return the amount that was sent (minus any dust).
    Ok(unwrap_int!(creators_fee.checked_sub(remaining_fee)))
}

/// Shared accounts between the two sell ixs.
#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNftShared<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        has_one = fee_vault,
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    //degenerate: fee_acc now === TSwap, keeping around to preserve backwards compatibility
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

    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    /// CHECK: seeds below + assert_decode_mint_proof
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
    #[account(mut,
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

impl<'info> SellNftShared<'info> {
    pub fn verify_whitelist(&self) -> Result<()> {
        verify_whitelist(
            &self.whitelist,
            &self.mint_proof,
            &self.nft_mint,
            &self.nft_metadata,
        )
    }
}

#[derive(Accounts)]
pub struct ProgNftShared<'info> {
    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: address below
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,

    //sysvar ixs don't deserialize in anchor
    /// CHECK: address below
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,

    /// CHECK: address below
    #[account(address = mpl_token_auth_rules::id())]
    pub authorization_rules_program: UncheckedAccount<'info>,
}

pub struct Fees {
    pub tswap_fee: u64,
    pub maker_rebate: u64,
    pub broker_fee: u64,
    pub taker_fee: u64,
}

pub fn calc_fees_rebates(amount: u64) -> Result<Fees> {
    let taker_fee = unwrap_checked!({
        (TSWAP_TAKER_FEE_BPS as u64)
            .checked_mul(amount)?
            .checked_div(HUNDRED_PCT_BPS as u64)
    });

    let maker_rebate = unwrap_checked!({
        (MAKER_REBATE_BPS as u64)
            .checked_mul(amount)?
            .checked_div(HUNDRED_PCT_BPS as u64)
    });

    let rem_fee = unwrap_checked!({ taker_fee.checked_sub(maker_rebate) });
    let broker_fee = unwrap_checked!({ rem_fee.checked_mul(TAKER_BROKER_PCT)?.checked_div(100) });
    let tswap_fee = unwrap_checked!({ rem_fee.checked_sub(broker_fee) });

    Ok(Fees {
        tswap_fee,
        maker_rebate,
        broker_fee,
        taker_fee,
    })
}

pub fn get_tswap_addr() -> Pubkey {
    let (pda, _) = Pubkey::find_program_address(&[], &crate::id());
    pda
}

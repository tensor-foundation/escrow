use anchor_lang::prelude::Accounts;
use anchor_spl::token_interface::{Mint, TokenAccount};
use mpl_token_metadata::{self};
use tensor_nft::assert_decode_metadata;
use tensor_whitelist::{self, FullMerkleProof, MintProof, Whitelist, ZERO_ARRAY};
use vipers::{throw_err, unwrap_checked};

use crate::constants::{HUNDRED_PCT_BPS, MAKER_REBATE_BPS, TAKER_BROKER_PCT, TSWAP_TAKER_FEE_BPS};
use crate::{error::ErrorCode, *};

// Private module to define Metaplex Token Auth Rules Program ID
mod mpl_token_auth_rules {
    anchor_lang::declare_id!("auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg");
}

pub static MPL_TOKEN_AUTH_RULES_ID: Pubkey = mpl_token_auth_rules::ID;

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
    owner: &AccountInfo<'info>,
) -> Result<Box<MarginAccount>> {
    let mut data: &[u8] = &margin_account_info.try_borrow_data()?;
    let margin_account: Box<MarginAccount> =
        Box::new(AccountDeserialize::try_deserialize(&mut data)?);

    let program_id = &crate::id();
    let (key, _) = margin_pda(&get_tswap_addr(), &owner.key(), margin_account.nr);
    if key != *margin_account_info.key {
        throw_err!(ErrorCode::BadMargin);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *margin_account_info.owner != *program_id {
        throw_err!(ErrorCode::BadMargin);
    }
    // Check normal owner (not redundant - this actually checks if the account is initialized and stores the owner correctly).
    if margin_account.owner != owner.key() {
        throw_err!(ErrorCode::BadMargin);
    }

    Ok(margin_account)
}

#[inline(never)]
pub fn assert_decode_mint_proof(
    whitelist: &Account<Whitelist>,
    nft_mint: &InterfaceAccount<Mint>,
    mint_proof: &UncheckedAccount,
) -> Result<Box<MintProof>> {
    let (key, _) = Pubkey::find_program_address(
        &[
            b"mint_proof".as_ref(),
            nft_mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        &tensor_whitelist::ID,
    );
    if key != *mint_proof.key {
        throw_err!(ErrorCode::BadMintProof);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *mint_proof.owner != tensor_whitelist::ID {
        throw_err!(ErrorCode::BadMintProof);
    }

    let mut data: &[u8] = &mint_proof.try_borrow_data()?;
    let mint_proof: Box<MintProof> = Box::new(AccountDeserialize::try_deserialize(&mut data)?);
    Ok(mint_proof)
}

#[inline(never)]
pub fn verify_whitelist(
    whitelist: &Account<Whitelist>,
    mint_proof: &UncheckedAccount,
    nft_mint: &InterfaceAccount<Mint>,
    nft_metadata: Option<&UncheckedAccount>,
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
    } else if let Some(nft_metadata) = nft_metadata {
        let metadata = &assert_decode_metadata(&nft_mint.key(), nft_metadata)?;
        whitelist.verify_whitelist(Some(metadata), None)
    } else {
        throw_err!(ErrorCode::BadMintProof);
    }
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
    pub nft_seller_acc: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint in nft_seller_acc, associated_token::mint in owner_ata_acc
    pub nft_mint: Box<InterfaceAccount<'info, Mint>>,

    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: assert_decode_metadata + seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::accounts::Metadata::PREFIX,
            mpl_token_metadata::ID.as_ref(),
            nft_mint.key().as_ref(),
        ],
        seeds::program = mpl_token_metadata::ID,
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
            Some(&self.nft_metadata),
        )
    }
}

/// Shared accounts between the two sell T22 ixs.
#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNftSharedT22<'info> {
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
    pub nft_seller_acc: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint in nft_seller_acc, associated_token::mint in owner_ata_acc
    pub nft_mint: Box<InterfaceAccount<'info, Mint>>,

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

impl<'info> SellNftSharedT22<'info> {
    pub fn verify_whitelist(&self) -> Result<()> {
        verify_whitelist(&self.whitelist, &self.mint_proof, &self.nft_mint, None)
    }
}

#[derive(Accounts)]
pub struct ProgNftShared<'info> {
    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: address below
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: UncheckedAccount<'info>,

    //sysvar ixs don't deserialize in anchor
    /// CHECK: address below
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,

    /// CHECK: address below
    #[account(address = MPL_TOKEN_AUTH_RULES_ID)]
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

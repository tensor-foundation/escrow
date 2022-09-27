use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use vipers::throw_err;
use vipers::unwrap_int;

declare_id!("TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW");

pub const CURRENT_WHITELIST_VERSION: u8 = 1;
// 28-length padded merkle proof -> 2^28 mints supported.
// 28 is max length b/c of tx size limits.
pub const MAX_PROOF_LEN: usize = 28;

// ----------------------------------- Instructions

#[program]
pub mod tensor_whitelist {
    use super::*;

    pub fn init_update_authority(
        ctx: Context<InitUpdateAuthority>,
        new_owner: Pubkey,
    ) -> Result<()> {
        let authority = &mut ctx.accounts.whitelist_authority;

        //if authority already present, make sure it's signing off on the update
        if authority.owner != Pubkey::default() && authority.owner != ctx.accounts.owner.key() {
            throw_err!(BadOwner);
        }

        authority.bump = *ctx.bumps.get("whitelist_authority").unwrap();
        authority.owner = new_owner;

        Ok(())
    }

    pub fn init_update_whitelist(
        ctx: Context<InitUpdateWhitelist>,
        uuid: [u8; 32],
        root_hash: Option<[u8; 32]>,
        name: Option<[u8; 32]>,
    ) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;

        whitelist.version = CURRENT_WHITELIST_VERSION;
        whitelist.bump = *ctx.bumps.get("whitelist").unwrap();
        // TODO: temp feature since for now we're keeping WL permissioned
        whitelist.verified = true;
        // set uuid (won't change after initialization)
        whitelist.uuid = uuid;

        // set root hash (can't be empty if we're initializing it for the first time)
        match root_hash {
            Some(root_hash) => {
                whitelist.root_hash = root_hash;
            }
            None => {
                msg!("root hash is {:?}", whitelist.root_hash);
                if whitelist.root_hash == [0; 32] {
                    throw_err!(MissingRootHash);
                }
            }
        }

        // set name (can't be empty if we're initializing it for the first time)
        match name {
            Some(name) => {
                whitelist.name = name;
            }
            None => {
                if whitelist.name == [0; 32] {
                    throw_err!(MissingName);
                }
            }
        }

        Ok(())
    }

    pub fn init_update_mint_proof(
        ctx: Context<InitUpdateMintProof>,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        let mint_proof = &mut ctx.accounts.mint_proof;
        let leaf = anchor_lang::solana_program::keccak::hash(ctx.accounts.mint.key().as_ref());

        // This won't happen currently b/c transaction size is hit before we can run into this.
        // TODO: revisit + test.
        if proof.len() > MAX_PROOF_LEN {
            throw_err!(ProofTooLong);
        }

        require!(
            merkle_proof::verify_proof(proof.to_vec(), ctx.accounts.whitelist.root_hash, leaf.0),
            InvalidProof,
        );

        // Upsert proof into the MintProof account.
        mint_proof.proof_len = unwrap_int!(u8::try_from(proof.len()).ok());
        // let padded_proof = &mut proof.to_vec();
        // padded_proof.resize(MAX_PROOF_LEN, [0; 32]);

        // Zero out array.
        for elem in mint_proof.proof.iter_mut() {
            *elem = [0; 32];
        }

        mint_proof.proof[0..proof.len()].copy_from_slice(proof.as_slice());

        Ok(())
    }
}

// ----------------------------------- Instr Accounts

#[derive(Accounts)]
pub struct InitUpdateAuthority<'info> {
    #[account(init_if_needed, payer = owner, seeds = [], bump, space = 8 + Authority::SIZE)]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(uuid: [u8; 32])]
pub struct InitUpdateWhitelist<'info> {
    #[account(
        init_if_needed,
        payer = owner,
        seeds = [&uuid],
        bump,
        space = 8 + Whitelist::SIZE
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct owner is present on it, and 2)is a signer
    #[account(
        seeds = [],
        bump = whitelist_authority.bump,
        has_one = owner
    )]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitUpdateMintProof<'info> {
    #[account(
        seeds = [&whitelist.uuid],
        bump = whitelist.bump
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    pub mint: Box<Account<'info, Mint>>,

    // Seed derived from mint + whitelist addresses.
    #[account(
        init_if_needed,
        payer = user,
        seeds = [
            b"mint_proof".as_ref(),
            mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        bump,
        space = 8 + MintProof::SIZE
    )]
    pub mint_proof: Box<Account<'info, MintProof>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ----------------------------------- Account structs

#[account]
pub struct Authority {
    pub bump: u8,
    // TODO: naive - move to current/pending authority later
    pub owner: Pubkey,
}

impl Authority {
    pub const SIZE: usize = 1 + 32;
}

#[account]
pub struct Whitelist {
    pub version: u8,
    pub bump: u8,
    pub verified: bool,
    pub root_hash: [u8; 32],
    pub uuid: [u8; 32],
    pub name: [u8; 32],
}

impl Whitelist {
    pub const SIZE: usize = 1 + 1 + 1 + (32 * 3);
}

#[account]
pub struct MintProof {
    // Length of proof (w/o padding).
    pub proof_len: u8,
    pub proof: [[u8; 32]; MAX_PROOF_LEN],
}

impl MintProof {
    pub const SIZE: usize = (32 * MAX_PROOF_LEN) + 1;
}

// ----------------------------------- Error codes

#[error_code]
pub enum ErrorCode {
    #[msg("passed in owner doesnt have the rights to do this")]
    BadOwner,
    #[msg("missing root hash")]
    MissingRootHash,
    #[msg("missing name")]
    MissingName,
    #[msg("invalid merkle proof, token not whitelisted")]
    InvalidProof,
    #[msg("proof provided exceeds the limit of 32 hashes")]
    ProofTooLong,
}

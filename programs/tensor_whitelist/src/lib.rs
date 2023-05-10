#![allow(unknown_lints)] //needed otherwise complains during github actions
#![allow(clippy::result_large_err)] //needed otherwise unhappy w/ anchor errors

use anchor_lang::prelude::{borsh::BorshDeserialize, *};
use anchor_spl::token::Mint;
use mpl_token_metadata::state::{Collection, Creator, Metadata};
use vipers::{throw_err, unwrap_int, Validate};

declare_id!("TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW");

//version history:
// v2 = added cosigner and 3 different verification methods
pub const CURRENT_WHITELIST_VERSION: u8 = 2;

pub const ZERO_ARRAY: [u8; 32] = [0; 32];

// ----------------------------------- Instructions

#[program]
pub mod tensor_whitelist {
    use super::*;

    // TODO: naive - move to current/pending authority later
    pub fn init_update_authority(
        ctx: Context<InitUpdateAuthority>,
        new_cosigner: Option<Pubkey>,
        new_owner: Option<Pubkey>,
    ) -> Result<()> {
        let authority = &mut ctx.accounts.whitelist_authority;

        //if cosigner already present, make sure it's signing off on the update
        //1. isSigner checked by anchor
        //2. check it's the correct one
        if authority.cosigner != Pubkey::default()
            && authority.cosigner != ctx.accounts.cosigner.key()
        {
            throw_err!(BadCosigner);
        }
        //if owner already present, make sure it's signing off on the update
        //1. isSigner checked by anchor
        //2. check it's the correct one
        if authority.owner != Pubkey::default() && authority.owner != ctx.accounts.owner.key() {
            throw_err!(BadOwner);
        }

        authority.bump = *ctx.bumps.get("whitelist_authority").unwrap();

        if let Some(new_cosigner) = new_cosigner {
            authority.cosigner = new_cosigner;
        }
        if let Some(new_owner) = new_owner {
            authority.owner = new_owner;
        }

        Ok(())
    }

    /// Store min 1, max 3, check in priority order
    pub fn init_update_whitelist(
        ctx: Context<InitUpdateWhitelist>,
        uuid: [u8; 32],
        root_hash: Option<[u8; 32]>,
        name: Option<[u8; 32]>,
        voc: Option<Pubkey>,
        fvc: Option<Pubkey>,
    ) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        let auth = &ctx.accounts.whitelist_authority;
        let iter = &mut ctx.remaining_accounts.iter();

        //handle frozen whitelists - only updatable if owner signs off
        if whitelist.frozen {
            //will fail if extra acc not passed
            let owner = next_account_info(iter).map_err(|_| ErrorCode::BadOwner)?;
            //since passed in as optional acc, verify both 1)is signer and 2)is correct auth
            if !owner.is_signer || auth.owner != *owner.key {
                throw_err!(BadOwner);
            }
        }

        whitelist.version = CURRENT_WHITELIST_VERSION;
        whitelist.bump = *ctx.bumps.get("whitelist").unwrap();
        // TODO: temp feature since for now we're keeping WL permissioned
        whitelist.verified = true;
        // set uuid (won't change after initialization)
        whitelist.uuid = uuid;
        whitelist.voc = voc;
        whitelist.fvc = fvc;

        //at least one of 3 verification methods must be present
        if (voc.is_none() || voc.unwrap() == Pubkey::default())
            && (fvc.is_none() || fvc.unwrap() == Pubkey::default())
            && (root_hash.is_none() || root_hash.unwrap() == ZERO_ARRAY)
        {
            throw_err!(MissingVerification);
        }

        // set root hash (can be empty as long as at least one other verification method present)
        if let Some(root_hash) = root_hash {
            whitelist.root_hash = root_hash;
        }

        // set name (can't be empty if we're initializing it for the first time)
        match name {
            Some(name) => {
                whitelist.name = name;
            }
            None => {
                if whitelist.name == ZERO_ARRAY {
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
            ErrorCode::FailedMerkleProofVerification,
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

    //incr space on authority
    pub fn realloc_authority(_ctx: Context<ReallocAuthority>) -> Result<()> {
        Ok(())
    }

    //incr space on whitelist
    #[access_control(ctx.accounts.validate())]
    pub fn realloc_whitelist(ctx: Context<ReallocWhitelist>) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.version = CURRENT_WHITELIST_VERSION;

        Ok(())
    }

    pub fn freeze_whitelist(ctx: Context<FreezeWhitelist>) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.frozen = true;

        Ok(())
    }

    //separate ix coz requires different signer
    pub fn unfreeze_whitelist(ctx: Context<UnfreezeWhitelist>) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.frozen = false;

        Ok(())
    }
}

// ----------------------------------- Instr Accounts

#[derive(Accounts)]
pub struct InitUpdateAuthority<'info> {
    #[account(init_if_needed, payer = cosigner, seeds = [], bump, space = AUTHORITY_SIZE)]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    /// both have to sign on any updates
    #[account(mut)]
    pub cosigner: Signer<'info>,
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(uuid: [u8; 32])]
pub struct InitUpdateWhitelist<'info> {
    #[account(
        init_if_needed,
        payer = cosigner,
        seeds = [&uuid],
        bump,
        space = WHITELIST_SIZE
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct cosigner is present on it, and 2)is a signer
    #[account(
        seeds = [],
        bump = whitelist_authority.bump,
        has_one = cosigner,
    )]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    /// only cosigner has to sign for unfrozen, for frozen owner also has to sign
    #[account(mut)]
    pub cosigner: Signer<'info>,
    pub system_program: Program<'info, System>,
    //remainingAccounts:
    //1. owner (signer, non-mut)
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
        space = MINT_PROOF_SIZE
    )]
    pub mint_proof: Box<Account<'info, MintProof>>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReallocAuthority<'info> {
    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct cosigner is present on it, and 2)is a signer
    #[account(mut,
        seeds = [],
        bump = whitelist_authority.bump,
        has_one = cosigner,
        realloc = AUTHORITY_SIZE,
        realloc::payer = cosigner,
        realloc::zero = false
    )]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    #[account(mut)]
    pub cosigner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReallocWhitelist<'info> {
    #[account(mut,
        seeds = [&whitelist.uuid],
        bump = whitelist.bump,
        realloc = WHITELIST_SIZE,
        realloc::payer = cosigner,
        realloc::zero = false
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct cosigner is present on it, and 2)is a signer
    #[account(
        seeds = [],
        bump = whitelist_authority.bump,
        has_one = cosigner,
    )]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    #[account(mut)]
    pub cosigner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for ReallocWhitelist<'info> {
    fn validate(&self) -> Result<()> {
        //can only migrate those with old version, intentionally keeping hardcorded to avoid errors
        if self.whitelist.version != 1 {
            throw_err!(BadWhitelist);
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct FreezeWhitelist<'info> {
    #[account(
        mut,
        seeds = [&whitelist.uuid],
        bump = whitelist.bump
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct cosigner is present on it, and 2)is a signer
    #[account(
        seeds = [],
        bump = whitelist_authority.bump,
        has_one = cosigner,
    )]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    /// freezing only requires cosigner
    #[account(mut)]
    pub cosigner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnfreezeWhitelist<'info> {
    #[account(
        mut,
        seeds = [&whitelist.uuid],
        bump = whitelist.bump
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct cosigner is present on it, and 2)is a signer
    #[account(
        seeds = [],
        bump = whitelist_authority.bump,
        has_one = owner
    )]
    pub whitelist_authority: Box<Account<'info, Authority>>,

    /// unfreezing requires owner
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ----------------------------------- Account structs

#[account]
pub struct Authority {
    pub bump: u8,
    /// cosigner of the whitelist - has rights to update it if unfrozen
    pub cosigner: Pubkey,
    /// owner of the whitelist (stricter, should be handled more carefully)
    /// has rights to 1)freeze, 2)unfreeze, 3)update frozen whitelists
    pub owner: Pubkey,
    pub _reserved: [u8; 64],
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const AUTHORITY_SIZE: usize = 8 + 1 + (32 * 2) + 64;

#[account]
pub struct Whitelist {
    pub version: u8,
    pub bump: u8,
    /// DEPRECATED, doesn't do anything
    pub verified: bool,
    /// in the case when not present will be [u8; 32]
    pub root_hash: [u8; 32],
    pub uuid: [u8; 32],
    pub name: [u8; 32],
    pub frozen: bool,
    pub voc: Option<Pubkey>,
    pub fvc: Option<Pubkey>,
    pub _reserved: [u8; 64],
}

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const WHITELIST_SIZE: usize = 8 + 1 + 1 + 1 + (32 * 3) + 1 + (33 * 2) + 64;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct FullMerkleProof {
    pub proof: Vec<[u8; 32]>,
    pub leaf: [u8; 32],
}

impl Whitelist {
    /// Passed in verification method has to match the verification method stored on the whitelist
    /// Passing neither of the 3 will result in failure
    pub fn verify_whitelist(
        &self,
        // It is the job of upstream caller to verify that Metadata account passed in is actually correct
        // decided to draw the boundary there coz 1)want to keep mcc/fvc access code here for deduplication, but
        // 2)don't want to be opinionated on how Metadata is verified (anchor / manually / etc)
        metadata: Option<&'_ Metadata>,
        proof: Option<FullMerkleProof>,
    ) -> Result<()> {
        //Priority 1: Merkle proof (because we manually control this = highest priority)
        if self.root_hash != ZERO_ARRAY {
            match proof {
                Some(proof) => {
                    //bad proof verification? fail
                    if !merkle_proof::verify_proof(proof.proof, self.root_hash, proof.leaf) {
                        throw_err!(FailedMerkleProofVerification);
                    }
                }
                //didn't pass in merkle proof? fail
                None => {
                    throw_err!(FailedMerkleProofVerification);
                }
            }

            return Ok(());
        }

        //Priority 2: VOC
        if self.voc.is_some() {
            match metadata {
                Some(metadata) => {
                    match &metadata.collection {
                        Some(collection) => {
                            //collection not verified? fail
                            if !collection.verified {
                                throw_err!(FailedVocVerification);
                            }
                            //collection key doesn't match? fail
                            if collection.key != self.voc.unwrap() {
                                throw_err!(FailedVocVerification);
                            }
                        }
                        //collection not recorded in metadata? fail
                        None => {
                            throw_err!(FailedVocVerification);
                        }
                    }
                }
                //didn't pass in metadata? fail
                None => {
                    throw_err!(FailedVocVerification);
                }
            }

            return Ok(());
        }

        //Priority 3: FVC
        if self.fvc.is_some() {
            match metadata {
                Some(metadata) => {
                    match &metadata.data.creators {
                        Some(creators) => {
                            let mut fvc: Option<Pubkey> = None;
                            for creator in creators {
                                if !creator.verified {
                                    continue;
                                }
                                fvc = Some(creator.address);
                                break;
                            }
                            match fvc {
                                Some(fvc) => {
                                    //fvc doesn't match? fail
                                    if self.fvc.unwrap() != fvc {
                                        throw_err!(FailedFvcVerification);
                                    }
                                }
                                //failed to find an FVC? fail
                                None => {
                                    throw_err!(FailedFvcVerification);
                                }
                            }
                        }
                        //no creators array? fail
                        None => {
                            throw_err!(FailedFvcVerification);
                        }
                    }
                }
                //didn't pass in metadata? fail
                None => {
                    throw_err!(FailedFvcVerification);
                }
            }

            return Ok(());
        }

        //should never be getting to here
        throw_err!(BadWhitelist);
    }

    pub fn verify_whitelist_tcomp(
        &self,
        collection: Option<Collection>,
        creators: Option<Vec<Creator>>,
    ) -> Result<()> {
        //Priority 1: Merkle proof (because we manually control this = highest priority)
        if self.root_hash != ZERO_ARRAY {
            // TODO: currently unsupported for tcomp
            throw_err!(FailedMerkleProofVerification);
        }

        //Priority 2: VOC
        if self.voc.is_some() {
            match collection {
                Some(collection) => {
                    //collection not verified? fail
                    if !collection.verified {
                        throw_err!(FailedVocVerification);
                    }
                    //collection key doesn't match? fail
                    if collection.key != self.voc.unwrap() {
                        throw_err!(FailedVocVerification);
                    }
                }
                //didn't pass in metadata? fail
                None => {
                    throw_err!(FailedVocVerification);
                }
            }
            return Ok(());
        }

        //Priority 3: FVC
        if self.fvc.is_some() {
            match creators {
                Some(creators) => {
                    let fvc = creators.iter().find(|c| c.verified);
                    match fvc {
                        Some(fvc) => {
                            //fvc doesn't match? fail
                            if self.fvc.unwrap() != fvc.address {
                                throw_err!(FailedFvcVerification);
                            }
                        }
                        //failed to find an FVC? fail
                        None => {
                            throw_err!(FailedFvcVerification);
                        }
                    }
                }
                //no creators array? fail
                None => {
                    throw_err!(FailedFvcVerification);
                }
            }
            return Ok(());
        }

        //should never be getting to here
        throw_err!(BadWhitelist);
    }
}

#[account]
pub struct MintProof {
    // Length of proof (w/o padding).
    pub proof_len: u8,
    pub proof: [[u8; 32]; MAX_PROOF_LEN],
}

// 28-length padded merkle proof -> 2^28 mints supported.
// 28 is max length b/c of tx size limits.
pub const MAX_PROOF_LEN: usize = 28;
// (!) INCLUSIVE of discriminator (8 bytes)
// (!) Sync with MAX_PROOF_LEN (can't ref teh constant or wont show up in IDL)
#[constant]
#[allow(clippy::identity_op)]
pub const MINT_PROOF_SIZE: usize = 8 + (32 * 28) + 1;

// ----------------------------------- Error codes

#[error_code]
pub enum ErrorCode {
    #[msg("passed in cosigner doesnt have the rights to do this")]
    BadCosigner = 0,
    #[msg("missing all 3 verification methods: at least one must be present")]
    MissingVerification = 1,
    #[msg("missing name")]
    MissingName = 2,
    #[msg("bad whitelist")]
    BadWhitelist = 3,
    #[msg("proof provided exceeds the limit of 32 hashes")]
    ProofTooLong = 4,
    #[msg("passed in owner doesnt have the rights to do this")]
    BadOwner = 5,
    #[msg("failed voc verification")]
    FailedVocVerification = 6,
    #[msg("failed fvc verification")]
    FailedFvcVerification = 7,
    #[msg("failed merkle proof verification")]
    FailedMerkleProofVerification = 8,
}

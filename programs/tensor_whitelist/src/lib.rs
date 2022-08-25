use anchor_lang::prelude::*;
use vipers::throw_err;

declare_id!("CyrMiKJphasn4kZLzMFG7cR9bZJ1rifGF37uSpJRxVi6");

pub const CURRENT_WHITELIST_VERSION: u8 = 1;

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

        authority.owner = new_owner;

        Ok(())
    }

    pub fn init_update_wl(
        ctx: Context<InitUpdateWhitelist>,
        _bump_auth: u8,
        uuid: [u8; 32],
        root_hash: Option<[u8; 32]>,
        name: Option<[u8; 32]>,
    ) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;

        whitelist.version = CURRENT_WHITELIST_VERSION;

        //todo temp feature since for now we're keeping WL permissioned
        whitelist.verified = true;

        // set uuid (won't change after initialization)
        whitelist.uuid = uuid;

        // set root hash (can't be empty)
        match root_hash {
            Some(root_hash) => {
                whitelist.root_hash = root_hash;
            }
            None => {
                if whitelist.root_hash == [0; 32] {
                    throw_err!(MissingRootHash);
                }
            }
        }

        // set name (can't be empty)
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
}

#[derive(Accounts)]
pub struct InitUpdateAuthority<'info> {
    #[account(init_if_needed, payer = owner, seeds = [], bump, space = 8 + WhitelistAuthority::SIZE)]
    pub whitelist_authority: Box<Account<'info, WhitelistAuthority>>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bump_auth: u8, uuid: [u8; 32])]
pub struct InitUpdateWhitelist<'info> {
    #[account(init_if_needed, payer = owner, seeds = [&uuid], bump, space = 8 + CollectionWhitelist::SIZE)]
    pub whitelist: Box<Account<'info, CollectionWhitelist>>,

    /// there can only be 1 whitelist authority (due to seeds),
    /// and we're checking that 1)the correct owner is present on it, and 2)is a signer
    #[account(seeds = [], bump = bump_auth, has_one=owner)]
    pub whitelist_authority: Box<Account<'info, WhitelistAuthority>>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct WhitelistAuthority {
    //naive - todo move to current/pending authority later
    pub owner: Pubkey,
}

impl WhitelistAuthority {
    pub const SIZE: usize = 32;
}

#[account]
pub struct CollectionWhitelist {
    pub version: u8,
    pub verified: bool,
    pub root_hash: [u8; 32],
    pub uuid: [u8; 32],
    pub name: [u8; 32],
}

impl CollectionWhitelist {
    pub const SIZE: usize = 1 + 1 + (32 * 3);
}

#[error_code]
pub enum ErrorCode {
    #[msg("passed in owner doesnt have the rights to do this")]
    BadOwner,
    #[msg("missing root hash")]
    MissingRootHash,
    #[msg("missing name")]
    MissingName,
}

use anchor_lang::prelude::*;

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const NFT_AUTHORITY_SIZE: usize = 8 + 1 + 32 + 32;

/// Connector between a pool and all the NFTs in it, to be able to re-attach them
/// to a different pool if needed.
#[account]
pub struct NftAuthority {
    pub random_seed: [u8; 32],
    pub bump: [u8; 1],
    pub pool: Pubkey,
}

use anchor_lang::prelude::*;
use vipers::prelude::*;

pub mod instructions;
pub mod merkle_proof;
pub mod state;

pub use instructions::*;
pub use merkle_proof::*;
pub use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod tensorswap {
    use super::*;

    pub fn init_tswap(ctx: Context<InitTSwap>, auth_bump: u8) -> Result<()> {
        instructions::init_tswap::handler(ctx, auth_bump)
    }

    pub fn init_pool(
        ctx: Context<InitPool>,
        _auth_bump: u8,
        pool_bump: u8,
        root_hash: [u8; 32],
        config: PoolConfig,
    ) -> Result<()> {
        instructions::init_pool::handler(ctx, pool_bump, root_hash, config)
    }

    pub fn add_nft(
        ctx: Context<AddNft>,
        _auth_bump: u8,
        _pool_bump: u8,
        _root_hash: [u8; 32],
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::add_nft::handler(ctx, proof)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("invalid merkle proof, token not whitelisted")]
    InvalidProof,

    #[msg("pool not verified -- currently only verified pools supported")]
    PoolNotVerified,
}

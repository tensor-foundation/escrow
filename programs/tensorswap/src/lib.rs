use anchor_lang::prelude::*;
use vipers::prelude::*;

pub mod instructions;
pub mod merkle_proof;
pub mod state;

pub use instructions::*;
pub use merkle_proof::*;
pub use state::*;

declare_id!("EcBj1yGnNmya7uGjkrroX8jupyoJn29uTGEk5jv21WPA");

#[program]
pub mod tensorswap {
    use super::*;

    pub fn init_tswap(ctx: Context<InitTSwap>, auth_bump: u8) -> Result<()> {
        instructions::init_tswap::handler(ctx, auth_bump)
    }

    pub fn init_pool(ctx: Context<InitPool>, pool_bump: u8, config: PoolConfig) -> Result<()> {
        instructions::init_pool::handler(ctx, pool_bump, config)
    }

    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        _auth_bump: u8,
        _pool_bump: u8,
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::deposit_nft::handler(ctx, proof)
    }

    pub fn deposit_sol(
        ctx: Context<DepositSol>,
        _pool_bump: u8,
        _config: PoolConfig,
        lamports: u64,
    ) -> Result<()> {
        instructions::deposit_sol::handler(ctx, lamports)
    }

    pub fn buy_nft<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BuyNft<'info>>,
        _auth_bump: u8,
        _pool_bump: u8,
        _receipt_bump: u8,
        _escrow_bump: u8,
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::buy_nft::handler(ctx, proof)
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("invalid merkle proof, token not whitelisted")]
    InvalidProof = 0,
    #[msg("whitelist not verified -- currently only verified pools supported")]
    WhitelistNotVerified = 1,
    #[msg("unexpected whitelist address")]
    BadWhitelist = 2,
    #[msg("operation not permitted on this pool type")]
    WrongPoolType = 3,
    #[msg("fee account doesn't match that stored on pool")]
    BadFeeAccount = 4,
    #[msg("escrow account doesn't match that stored on pool")]
    BadEscrowAccount = 5,
    #[msg("when setting up a Trade pool, must provide fee bps & fee vault")]
    MissingFees = 6,
    #[msg("fees entered above allowed threshold")]
    FeesTooHigh = 7,
    #[msg("delta too large")]
    DeltaTooLarge = 8,
    #[msg("arithmetic error")]
    ArithmeticError = 9,
}

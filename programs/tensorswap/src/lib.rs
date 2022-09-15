use anchor_lang::prelude::*;
use vipers::prelude::*;

pub mod instructions;
pub mod merkle_proof;
pub mod state;

pub use instructions::*;
pub use merkle_proof::*;
pub use state::*;

declare_id!("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN");

static TENSOR_WHITELIST_ADDR: &str = "TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW";

#[program]
pub mod tensorswap {
    use super::*;

    pub fn init_update_tswap(
        ctx: Context<InitUpdateTSwap>,
        new_owner: Pubkey,
        config: TSwapConfig,
    ) -> Result<()> {
        instructions::init_update_tswap::handler(ctx, new_owner, config)
    }

    pub fn init_pool(ctx: Context<InitPool>, config: PoolConfig) -> Result<()> {
        instructions::init_pool::handler(ctx, config)
    }

    pub fn close_pool(ctx: Context<ClosePool>, _config: PoolConfig) -> Result<()> {
        instructions::close_pool::handler(ctx)
    }

    pub fn deposit_nft(
        ctx: Context<DepositNft>,
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
    ) -> Result<()> {
        instructions::deposit_nft::handler(ctx, proof)
    }

    pub fn withdraw_nft(ctx: Context<WithdrawNft>, _config: PoolConfig) -> Result<()> {
        instructions::withdraw_nft::handler(ctx)
    }

    pub fn deposit_sol(ctx: Context<DepositSol>, _config: PoolConfig, lamports: u64) -> Result<()> {
        instructions::deposit_sol::handler(ctx, lamports)
    }

    pub fn withdraw_sol(
        ctx: Context<WithdrawSol>,
        _config: PoolConfig,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_sol::handler(ctx, lamports)
    }

    pub fn buy_nft<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BuyNft<'info>>,
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
        max_price: u64,
    ) -> Result<()> {
        instructions::buy_nft::handler(ctx, proof, max_price)
    }

    pub fn sell_nft_token_pool<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SellNftTokenPool<'info>>,
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_nft_token_pool::handler(ctx, proof, min_price)
    }

    pub fn sell_nft_trade_pool<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SellNftTradePool<'info>>,
        _config: PoolConfig,
        proof: Vec<[u8; 32]>,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_nft_trade_pool::handler(ctx, proof, min_price)
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
    #[msg("this nft doesnt belong to this pool")]
    WrongPool = 10,
    #[msg("royalties are enabled always")]
    RoyaltiesEnabled = 11,
    #[msg("specified price not within current price")]
    PriceMismatch = 12,
    #[msg("cannot close pool with nfts in escrow -- withdraw all before closing")]
    ExistingNfts = 13,
    #[msg("wrong mint passed for provided accounts")]
    WrongMint = 14,
    #[msg("insufficient SOL escrow balance")]
    InsufficientSolEscrowBalance = 15,
    #[msg("bad tswap owner")]
    BadTSwapOwner = 16,
    #[msg("fees not allowed for non-trade pools")]
    FeesNotAllowed = 17,
    #[msg("metadata account does not match mint")]
    BadMetadata = 18,
    #[msg("provided creator address does not match metadata creator")]
    CreatorMismatch = 19,
}

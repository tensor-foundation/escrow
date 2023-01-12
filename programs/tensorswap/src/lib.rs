use anchor_lang::prelude::*;
use vipers::prelude::*;

pub mod instructions;
pub mod state;

pub use instructions::*;
pub use state::*;

declare_id!("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN");

static TENSOR_SWAP_ADDR: &str = "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN";
static TENSOR_WHITELIST_ADDR: &str = "TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW";

// TODO: future account optimizations:
//  1. get rid of tswap (have single instance of program with hardcoded variables)
//  2. combine pool state acc + pool escrow balance (there's 1 per pool anyway)
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

    pub fn init_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, InitPool<'info>>,
        config: PoolConfig,
        auth_seeds: [u8; 32],
        is_cosigned: bool,
        order_type: u8,
    ) -> Result<()> {
        instructions::init_pool::handler(ctx, config, auth_seeds, is_cosigned, order_type)
    }

    pub fn close_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, ClosePool<'info>>,
        _config: PoolConfig,
    ) -> Result<()> {
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

    pub fn deposit_sol<'info>(
        ctx: Context<'_, '_, '_, 'info, DepositSol<'info>>,
        _config: PoolConfig,
        lamports: u64,
    ) -> Result<()> {
        instructions::deposit_sol::handler(ctx, lamports)
    }

    pub fn withdraw_sol<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawSol<'info>>,
        _config: PoolConfig,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_sol::handler(ctx, lamports)
    }

    pub fn buy_nft<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, BuyNft<'info>>,
        _config: PoolConfig,
        max_price: u64,
    ) -> Result<()> {
        instructions::buy_nft::handler(ctx, max_price)
    }

    pub fn sell_nft_token_pool<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SellNftTokenPool<'info>>,
        _config: PoolConfig,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_nft_token_pool::handler(ctx, min_price)
    }

    pub fn sell_nft_trade_pool<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, SellNftTradePool<'info>>,
        _config: PoolConfig,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_nft_trade_pool::handler(ctx, min_price)
    }

    pub fn edit_pool(
        ctx: Context<EditPool>,
        _old_config: PoolConfig,
        new_config: PoolConfig,
        is_cosigned: Option<bool>,
    ) -> Result<()> {
        instructions::edit_pool::handler(ctx, new_config, is_cosigned)
    }

    pub fn realloc_pool(ctx: Context<ReallocPool>, _config: PoolConfig) -> Result<()> {
        instructions::realloc_pool::handler(ctx)
    }

    pub fn init_margin_account(
        ctx: Context<InitMarginAccount>,
        margin_nr: u16,
        name: [u8; 32],
    ) -> Result<()> {
        instructions::init_margin_account::handler(ctx, margin_nr, name)
    }

    pub fn close_margin_account(ctx: Context<CloseMarginAccount>) -> Result<()> {
        instructions::close_margin_account::handler(ctx)
    }

    pub fn deposit_margin_account(ctx: Context<DepositMarginAccount>, lamports: u64) -> Result<()> {
        instructions::deposit_margin_account::handler(ctx, lamports)
    }

    pub fn withdraw_margin_account(
        ctx: Context<WithdrawMarginAccount>,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account::handler(ctx, lamports)
    }

    pub fn attach_pool_to_margin(
        ctx: Context<AttachDetachPoolMargin>,
        _config: PoolConfig,
    ) -> Result<()> {
        instructions::attach_detach_pool_margin::attach_handler(ctx)
    }

    pub fn detach_pool_from_margin(
        ctx: Context<AttachDetachPoolMargin>,
        _config: PoolConfig,
        lamports: u64,
    ) -> Result<()> {
        instructions::attach_detach_pool_margin::detach_handler(ctx, lamports)
    }

    pub fn set_pool_freeze(
        ctx: Context<SetPoolFreeze>,
        _config: PoolConfig,
        freeze: bool,
    ) -> Result<()> {
        instructions::set_pool_freeze::handler(ctx, freeze)
    }

    pub fn take_snipe<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, TakeSnipe<'info>>,
        _config: PoolConfig,
        actual_price: u64,
    ) -> Result<()> {
        instructions::take_snipe::handler(ctx, actual_price)
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
    #[msg("insufficient Tswap account balance")]
    InsufficientTswapAccBalance = 15,
    #[msg("bad tswap owner")]
    BadTSwapOwner = 16,
    #[msg("fees not allowed for non-trade pools")]
    FeesNotAllowed = 17,
    #[msg("metadata account does not match")]
    BadMetadata = 18,
    #[msg("provided creator address does not match metadata creator")]
    CreatorMismatch = 19,
    #[msg("wrong pool version provided")]
    WrongPoolVersion = 20,
    #[msg("new pool should not match old pool")]
    PoolsAreTheSame = 21,
    #[msg("wrong nft authority account provided")]
    WrongAuthority = 22,
    #[msg("amount frozen doesnt match current price")]
    FrozenAmountMismatch = 23,
    #[msg("mint proof account does not match")]
    BadMintProof = 24,
    #[msg("bad cosigner passed - either wrong key or no signature")]
    BadCosigner = 25,
    #[msg("pool is frozen and cannot execute normal operations")]
    PoolFrozen = 26,
    #[msg("bad margin account passed")]
    BadMargin = 27,
    #[msg("expected a marginated pool to be passed in")]
    PoolNotMarginated = 28,
    #[msg("expected a non-marginated pool to be passed in")]
    PoolMarginated = 29,
    //note this is different to pool type - order type = standard/sniping/etc
    #[msg("wrong order type")]
    WrongOrderType = 30,
    #[msg("wrong frozen status")]
    WrongFrozenStatus = 31,
    #[msg("margin account has pools open and is in use")]
    MarginInUse = 32,
}

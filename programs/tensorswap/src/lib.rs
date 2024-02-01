#![allow(unknown_lints)] //needed otherwise complains during github actions
#![allow(clippy::result_large_err)] //needed otherwise unhappy w/ anchor errors

pub use anchor_lang::prelude::*;
pub use vipers::prelude::*;

pub mod instructions;
pub mod state;
pub mod token2022;

pub use instructions::*;
pub use state::*;
pub use tensor_nft::{
    assert_decode_metadata, calc_creators_fee, send_pnft, transfer_all_lamports_from_pda,
    transfer_creators_fee, transfer_lamports_from_pda, CreatorFeeMode, FromAcc, FromExternal,
    PnftTransferArgs,
};
pub use token2022::*;

declare_id!("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN");

// TODO: future account optimizations:
//  1. get rid of tswap (have single instance of program with hardcoded variables)
//  2. combine pool state acc + pool escrow balance (there's 1 per pool anyway)
#[program]
pub mod tensorswap {
    use super::*;

    pub fn init_update_tswap(ctx: Context<InitUpdateTSwap>, config: TSwapConfig) -> Result<()> {
        instructions::admin::init_update_tswap::handler(ctx, config)
    }

    pub fn init_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, InitPool<'info>>,
        config: PoolConfig,
        auth_seeds: [u8; 32],
        is_cosigned: bool,
        order_type: u8,
        max_taker_sell_count: Option<u32>,
    ) -> Result<()> {
        instructions::init_pool::handler(
            ctx,
            config,
            auth_seeds,
            is_cosigned,
            order_type,
            max_taker_sell_count,
        )
    }

    pub fn close_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, ClosePool<'info>>,
        _config: PoolConfig,
    ) -> Result<()> {
        instructions::close_pool::handler(ctx)
    }

    pub fn deposit_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, DepositNft<'info>>,
        _config: PoolConfig,
        authorization_data: Option<AuthorizationDataLocal>,
        rules_acc_present: bool,
    ) -> Result<()> {
        instructions::deposit_nft::handler(ctx, authorization_data, rules_acc_present)
    }

    pub fn withdraw_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawNft<'info>>,
        _config: PoolConfig,
        authorization_data: Option<AuthorizationDataLocal>,
        rules_acc_present: bool,
    ) -> Result<()> {
        instructions::withdraw_nft::handler(ctx, authorization_data, rules_acc_present)
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

    pub fn buy_nft<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyNft<'info>>,
        _config: PoolConfig,
        max_price: u64,
        rules_acc_present: bool,
        authorization_data: Option<AuthorizationDataLocal>,
        optional_royalty_pct: Option<u16>,
    ) -> Result<()> {
        instructions::buy_nft::handler(
            ctx,
            max_price,
            rules_acc_present,
            authorization_data,
            optional_royalty_pct,
        )
    }

    pub fn sell_nft_token_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, SellNftTokenPool<'info>>,
        _config: PoolConfig,
        min_price: u64,
        rules_acc_present: bool,
        authorization_data: Option<AuthorizationDataLocal>,
        optional_royalty_pct: Option<u16>,
    ) -> Result<()> {
        instructions::sell_nft_token_pool::handler(
            ctx,
            min_price,
            rules_acc_present,
            authorization_data,
            optional_royalty_pct,
        )
    }

    pub fn sell_nft_trade_pool<'info>(
        ctx: Context<'_, '_, '_, 'info, SellNftTradePool<'info>>,
        _config: PoolConfig,
        min_price: u64,
        rules_acc_present: bool,
        authorization_data: Option<AuthorizationDataLocal>,
        optional_royalty_pct: Option<u16>,
    ) -> Result<()> {
        instructions::sell_nft_trade_pool::handler(
            ctx,
            min_price,
            rules_acc_present,
            authorization_data,
            optional_royalty_pct,
        )
    }

    pub fn edit_pool(
        ctx: Context<EditPool>,
        _old_config: PoolConfig,
        new_config: PoolConfig,
        is_cosigned: Option<bool>,
        max_taker_sell_count: Option<u32>,
    ) -> Result<()> {
        instructions::edit_pool::handler(ctx, new_config, is_cosigned, max_taker_sell_count)
    }

    pub fn realloc_pool(ctx: Context<ReallocPool>, _config: PoolConfig) -> Result<()> {
        instructions::admin::realloc_pool::handler(ctx)
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
        // ctx: Context<SetPoolFreeze>,
        _ctx: Context<DummyCtx>, //changed this ctx so it compiles // TODO temp while size issues
        _config: PoolConfig,
        _freeze: bool,
    ) -> Result<()> {
        // TODO temp while size issues
        // instructions::set_pool_freeze::handler(ctx, freeze)
        Ok(())
    }

    pub fn take_snipe(
        // ctx: Context<'_, '_, '_, 'info, TakeSnipe<'info>>,
        _ctx: Context<DummyCtx>, //changed this ctx so it compiles // TODO temp while size issues
        _config: PoolConfig,
        _actual_price: u64,
        _authorization_data: Option<AuthorizationDataLocal>,
    ) -> Result<()> {
        // TODO temp while size issues
        // instructions::take_snipe::handler(ctx, actual_price, authorization_data)
        Ok(())
    }

    pub fn edit_pool_in_place(
        ctx: Context<EditPoolInPlace>,
        _config: PoolConfig,
        is_cosigned: Option<bool>,
        max_taker_sell_count: Option<u32>,
        mm_compound_fees: Option<bool>,
    ) -> Result<()> {
        instructions::edit_pool_in_place::handler(
            ctx,
            is_cosigned,
            max_taker_sell_count,
            mm_compound_fees,
        )
    }

    pub fn withdraw_tswap_fees(ctx: Context<WithdrawTswapFees>, amount: u64) -> Result<()> {
        instructions::admin::withdraw_tswap_fees::handler(ctx, amount)
    }

    pub fn list<'info>(
        ctx: Context<'_, '_, '_, 'info, List<'info>>,
        price: u64,
        authorization_data: Option<AuthorizationDataLocal>,
        rules_acc_present: bool,
    ) -> Result<()> {
        instructions::list::process_list(ctx, price, authorization_data, rules_acc_present)
    }

    pub fn delist<'info>(
        ctx: Context<'_, '_, '_, 'info, Delist<'info>>,
        authorization_data: Option<AuthorizationDataLocal>,
        rules_acc_present: bool,
    ) -> Result<()> {
        instructions::delist::process_delist(ctx, authorization_data, rules_acc_present)
    }

    pub fn buy_single_listing<'info>(
        ctx: Context<'_, '_, '_, 'info, BuySingleListing<'info>>,
        max_price: u64,
        rules_acc_present: bool,
        authorization_data: Option<AuthorizationDataLocal>,
        optional_royalty_pct: Option<u16>,
    ) -> Result<()> {
        instructions::buy_single_listing::process_buy_single_listing(
            ctx,
            max_price,
            rules_acc_present,
            authorization_data,
            optional_royalty_pct,
        )
    }

    pub fn edit_single_listing<'info>(
        ctx: Context<'_, '_, '_, 'info, EditSingleListing<'info>>,
        price: u64,
    ) -> Result<()> {
        instructions::edit_single_listing::process_edit_single_listing(ctx, price)
    }

    pub fn withdraw_mm_fee<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawSol<'info>>,
        _config: PoolConfig,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_mm_fees::handler(ctx, lamports)
    }

    pub fn withdraw_margin_account_cpi(
        ctx: Context<WithdrawMarginAccountCpi>,
        _bump: u8,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account::handler_cpi(ctx, lamports)
    }

    pub fn withdraw_margin_account_cpi_tcomp(
        ctx: Context<WithdrawMarginAccountCpiTcomp>,
        _bump: u8,
        _bid_id: Pubkey,
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account::handler_cpi_tcomp(ctx, lamports)
    }

    pub fn withdraw_margin_account_cpi_tlock(
        ctx: Context<WithdrawMarginAccountCpiTLock>,
        _bump: u8,
        _order_id: [u8; 32],
        lamports: u64,
    ) -> Result<()> {
        instructions::withdraw_margin_account::handler_cpi_tlock(ctx, lamports)
    }

    // OFFLINE BY DEFAULT
    // pub fn withdraw_tswap_owned_spl(
    //     ctx: Context<WithdrawTswapOwnedSpl>,
    //     amount: u64,
    // ) -> Result<()> {
    //     instructions::admin::withdraw_tswap_owned_spl::handler(ctx, amount)
    // }

    // SPL Token 2022 metadata support

    pub fn buy_nft_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, BuyNftT22<'info>>,
        _config: PoolConfig,
        max_price: u64,
    ) -> Result<()> {
        instructions::buy_nft_t22::handler(ctx, max_price)
    }

    pub fn deposit_nft_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, DepositNftT22<'info>>,
        _config: PoolConfig,
    ) -> Result<()> {
        instructions::deposit_nft_t22::handler(ctx)
    }

    pub fn sell_nft_token_pool_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, SellNftTokenPoolT22<'info>>,
        _config: PoolConfig,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_nft_token_pool_t22::handler(ctx, min_price)
    }

    pub fn sell_nft_trade_pool_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, SellNftTradePoolT22<'info>>,
        _config: PoolConfig,
        min_price: u64,
    ) -> Result<()> {
        instructions::sell_nft_trade_pool_t22::handler(ctx, min_price)
    }

    pub fn withdraw_nft_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawNftT22<'info>>,
        _config: PoolConfig,
    ) -> Result<()> {
        instructions::withdraw_nft_t22::handler(ctx)
    }

    pub fn buy_single_listing_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, BuySingleListingT22<'info>>,
        max_price: u64,
    ) -> Result<()> {
        instructions::buy_single_listing_t22::process_buy_single_listing_t22(ctx, max_price)
    }

    pub fn list_t22<'info>(
        ctx: Context<'_, '_, '_, 'info, ListT22<'info>>,
        price: u64,
    ) -> Result<()> {
        instructions::list_t22::process_list_t22(ctx, price)
    }

    pub fn delist_t22<'info>(ctx: Context<'_, '_, '_, 'info, DelistT22<'info>>) -> Result<()> {
        instructions::delist_t22::process_delist_t22(ctx)
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
    //@DEPRECATED
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
    #[msg("bad owner")]
    BadOwner = 16,
    #[msg("fees not allowed for non-trade pools")]
    FeesNotAllowed = 17,
    #[msg("metadata account does not match")]
    BadMetadata = 18,
    //error copied from metaplex
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
    #[msg("max taker sell count exceeded, pool cannot buy anymore NFTs")]
    MaxTakerSellCountExceeded = 33,
    #[msg("max taker sell count is too small")]
    MaxTakerSellCountTooSmall = 34,
    #[msg("rule set for programmable nft does not match")]
    BadRuleSet = 35,
    #[msg("this pool compounds fees and they cannot be withdrawn separately")]
    PoolFeesCompounded = 36,
    #[msg("royalties percentage passed in must be between 0 and 100")]
    BadRoyaltiesPct = 37,
    #[msg("starting price can't be smaller than 1 lamport")]
    StartingPriceTooSmall,
}

#[derive(Accounts)]
pub struct DummyCtx<'info> {
    //have to have 1 entry in order for lifetime arg to be used (else complains during CPI into tensorswap)
    pub system_program: Program<'info, System>,
}

use anchor_lang::prelude::*;

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

use crate::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct WithdrawNft<'info> {
    /// Needed for pool seeds derivation
    #[account(seeds = [], bump = tswap.bump[0])]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(
        mut, 
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[config.pool_type as u8],
            &[config.curve_type as u8],
            &config.starting_price.to_le_bytes(),
            &config.delta.to_le_bytes()
        ],
        bump = pool.bump[0],
        has_one = tswap, has_one = whitelist, has_one = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: UncheckedAccount<'info>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(mut)]
    pub nft_dest: Box<Account<'info, TokenAccount>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    /// This is closed below (dest = owner)
    #[account(
        mut,
        seeds=[
            b"nft_escrow".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
    )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = nft_mint.key() == nft_escrow.mint @ crate::ErrorCode::WrongMint,
        constraint = nft_mint.key() == nft_receipt.nft_mint @ crate::ErrorCode::WrongMint,
    )]
    pub nft_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds=[
            b"nft_receipt".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump = nft_receipt.bump,
        close = owner,
        //can't buy an NFT that's associated with a different pool
        constraint = nft_receipt.pool == pool.key() @ crate::ErrorCode::WrongPool,
        // redundant but extra safety
        constraint = nft_receipt.nft_escrow == nft_escrow.key() @ crate::ErrorCode::WrongMint,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// Tied to the pool because used to verify pool seeds
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawNft<'info> {
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.nft_escrow.to_account_info(),
                to: self.nft_dest.to_account_info(),
                authority: self.tswap.to_account_info(),
            },
        )
    }

    fn close_nft_escrow_ctx(&self) -> CpiContext<'_, '_, '_, 'info, CloseAccount<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            CloseAccount {
                account: self.nft_escrow.to_account_info(),
                destination: self.owner.to_account_info(),
                authority: self.tswap.to_account_info(),
            },
        )
    }
}

impl<'info> Validate<'info> for WithdrawNft<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<WithdrawNft>) -> Result<()> {
    // do the transfer
    token::transfer(
        ctx.accounts
            .transfer_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
        1,
    )?;

    // close nft escrow account
    token::close_account(
        ctx.accounts
            .close_nft_escrow_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
    )?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_sub(1));

    Ok(())
}

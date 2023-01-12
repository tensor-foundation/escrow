//! User (owner) closing their pool and reclaims rent (+ SOL escrow)
use tensor_whitelist::Whitelist;
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct ClosePool<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(mut,
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
        has_one = tswap, has_one = owner, has_one = whitelist, has_one = sol_escrow,
        has_one = nft_authority @ crate::ErrorCode::WrongAuthority,
        close = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: has_one = escrow in pool
    /// (!) if the order is marginated this won't return any funds to the user, since margin isn't auto-closed
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
        close = owner,
    )]
    pub sol_escrow: Box<Account<'info, SolEscrow>>,

    /// CHECK: has_one = whitelist in pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// CHECK: has_one = owner in pool
    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(
        mut,
        seeds = [b"nft_auth".as_ref(), &nft_authority.random_seed],
        bump = nft_authority.bump[0],
        has_one = pool @ crate::ErrorCode::WrongAuthority,
        close = owner,
    )]
    pub nft_authority: Box<Account<'info, NftAuthority>>,
}

impl<'info> Validate<'info> for ClosePool<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.nfts_held > 0 {
            throw_err!(ExistingNfts);
        }
        if self.pool.frozen.is_some() {
            throw_err!(PoolFrozen);
        }
        //can't close a marginated pool, need to detach first
        //this is needed because we need to reduce the counter on the margin acc to be able to close it later
        if self.pool.margin.is_some() {
            throw_err!(PoolMarginated);
        }
        Ok(())
    }
}

#[access_control(_ctx.accounts.validate())]
pub fn handler<'info>(_ctx: Context<'_, '_, '_, 'info, ClosePool<'info>>) -> Result<()> {
    Ok(())
}

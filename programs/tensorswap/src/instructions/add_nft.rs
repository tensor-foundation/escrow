use crate::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, CollectionWhitelist};

#[derive(Accounts)]
#[instruction(auth_bump: u8, pool_bump: u8, config: PoolConfig)]
pub struct AddNft<'info> {
    #[account(has_one = authority)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: via seed derivation macro below
    #[account(seeds = [tswap.key().as_ref()], bump = auth_bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(seeds = [
        tswap.key().as_ref(),
        creator.key().as_ref(),
        whitelist.key().as_ref(),
        &[config.pool_type as u8],
        &[config.curve_type as u8],
        &config.starting_price.to_le_bytes(),
        &config.delta.to_le_bytes()
    ], bump = pool_bump, has_one = creator, has_one = tswap, has_one = whitelist)]
    pub pool: Box<Account<'info, Pool>>,

    /// CHECK: ensure this is listed on the pool using has_one
    pub whitelist: Box<Account<'info, CollectionWhitelist>>,

    /// CHECK: via has_one on pool
    pub creator: UncheckedAccount<'info>,

    /// CHECK: temp
    pub nft_mint: UncheckedAccount<'info>,
    // pub nft_mint: Box<Account<'info, Mint>>,
}

impl<'info> Validate<'info> for AddNft<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<AddNft>, proof: Vec<[u8; 32]>) -> Result<()> {
    // todo ideally move into validate
    let leaf = anchor_lang::solana_program::keccak::hash(ctx.accounts.nft_mint.key().as_ref());
    require!(
        merkle_proof::verify_proof(proof, ctx.accounts.whitelist.root_hash, leaf.0),
        InvalidProof
    );

    Ok(())
}

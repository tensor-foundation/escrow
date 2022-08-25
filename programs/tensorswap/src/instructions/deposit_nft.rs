use crate::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(auth_bump: u8, pool_bump: u8, config: PoolConfig)]
pub struct DepositNft<'info> {
    /// Needed for pool seeds derivation
    #[account(has_one = authority)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// Needed to be set as authority on token escrows
    /// CHECK: via seed derivation macro below / via has one_one above.
    #[account(seeds = [tswap.key().as_ref()], bump = auth_bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(seeds = [
        tswap.key().as_ref(),
        owner.key().as_ref(),
        whitelist.key().as_ref(),
        &[config.pool_type as u8],
        &[config.curve_type as u8],
        &config.starting_price.to_le_bytes(),
        &config.delta.to_le_bytes()
    ], bump = pool_bump, has_one = tswap, has_one = whitelist)]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    pub nft_mint: Box<Account<'info, Mint>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(mut)]
    pub nft_source: Box<Account<'info, TokenAccount>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(init_if_needed, payer=owner, seeds=[
        b"nft_escrow".as_ref(),
        nft_mint.key().as_ref(),
    ], bump, token::mint = nft_mint, token::authority = authority )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(init, payer=owner, seeds=[
        b"nft_receipt".as_ref(),
        nft_mint.key().as_ref(),
    ], bump, space = 8 + std::mem::size_of::<NftDepositReceipt>())]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// Tied to the pool because used to verify pool seeds
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> DepositNft<'info> {
    fn validate_proof(&self, proof: Vec<[u8; 32]>) -> Result<()> {
        let leaf = anchor_lang::solana_program::keccak::hash(self.nft_mint.key().as_ref());
        require!(
            merkle_proof::verify_proof(proof, self.whitelist.root_hash, leaf.0),
            InvalidProof
        );
        Ok(())
    }

    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.nft_source.to_account_info(),
                to: self.nft_escrow.to_account_info(),
                authority: self.owner.to_account_info(),
            },
        )
    }
}

impl<'info> Validate<'info> for DepositNft<'info> {
    fn validate(&self) -> Result<()> {
        //can't deposit an NFT into a token pool
        if self.pool.config.pool_type == PoolType::Token {
            throw_err!(WrongPoolType);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate_proof(proof); ctx.accounts.validate())]
pub fn handler(ctx: Context<DepositNft>, proof: Vec<[u8; 32]>) -> Result<()> {
    let pool = &ctx.accounts.pool;

    // do the transfer
    token::transfer(
        ctx.accounts.transfer_ctx().with_signer(&[&[
            pool.tswap.as_ref(),
            pool.creator.as_ref(),
            pool.whitelist.as_ref(),
            &[pool.config.pool_type as u8],
            &[pool.config.curve_type as u8],
            &pool.config.starting_price.to_le_bytes(),
            &pool.config.delta.to_le_bytes(),
        ]]),
        1,
    )?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_add(1));
    pool.set_active();

    //create nft receipt
    let receipt = &mut ctx.accounts.nft_receipt;
    receipt.pool = pool.key();
    receipt.nft_mint = ctx.accounts.nft_mint.key();
    receipt.nft_escrow = ctx.accounts.nft_escrow.key();

    Ok(())
}

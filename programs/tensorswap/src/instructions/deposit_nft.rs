//! User depositing NFTs into their NFT/Trade pool (to sell NFTs)
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, FullMerkleProof, Whitelist, ZERO_ARRAY};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct DepositNft<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
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
        // can only deposit to NFT/Trade pool
        constraint = config.pool_type == PoolType::NFT || config.pool_type == PoolType::Trade @ crate::ErrorCode::WrongPoolType,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    #[account(mut, token::mint = nft_mint, token::authority = owner)]
    pub nft_source: Box<Account<'info, TokenAccount>>,

    /// CHECK: seed in nft_escrow & nft_receipt
    pub nft_mint: Box<Account<'info, Mint>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(
        init_if_needed,
        payer = owner,
        seeds=[
            b"nft_escrow".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint, token::authority = tswap,
    )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = owner,
        seeds=[
            b"nft_receipt".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        space = 8 + NftDepositReceipt::SIZE,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// CHECK: has_one = owner in pool
    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,

    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: assert_decode_metadata + seeds below
    #[account(
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub nft_metadata: UncheckedAccount<'info>,
}

impl<'info> DepositNft<'info> {
    fn verify_whitelist(&self, proof: Vec<[u8; 32]>) -> Result<()> {
        //prioritize merkle tree if proof present
        if self.whitelist.root_hash != ZERO_ARRAY {
            let leaf = anchor_lang::solana_program::keccak::hash(self.nft_mint.key().as_ref());
            self.whitelist.verify_whitelist(
                None,
                Some(FullMerkleProof {
                    proof,
                    leaf: leaf.0,
                }),
            )
        } else {
            let metadata = &assert_decode_metadata(&self.nft_mint, &self.nft_metadata)?;
            self.whitelist.verify_whitelist(Some(metadata), None)
        }
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
        if self.pool.version != CURRENT_POOL_VERSION {
            throw_err!(WrongPoolVersion);
        }
        if self.pool.frozen.is_some() {
            throw_err!(PoolFrozen);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.verify_whitelist(proof); ctx.accounts.validate())]
pub fn handler(ctx: Context<DepositNft>, proof: Vec<[u8; 32]>) -> Result<()> {
    // do the transfer
    token::transfer(ctx.accounts.transfer_ctx(), 1)?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_add(1));

    //create nft receipt
    let receipt = &mut ctx.accounts.nft_receipt;
    receipt.bump = *ctx.bumps.get("nft_receipt").unwrap();
    receipt.nft_authority = pool.nft_authority;
    receipt.nft_mint = ctx.accounts.nft_mint.key();
    receipt.nft_escrow = ctx.accounts.nft_escrow.key();

    Ok(())
}

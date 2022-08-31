//! User buying an NFT from the pool / pool selling an NFT to the user
use crate::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct BuyNft<'info> {
    /// Needed for pool seeds derivation
    #[account(seeds = [], bump = tswap.bump[0], has_one = fee_vault)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: checked above via has_one
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,

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
        has_one = tswap, has_one = owner, has_one = whitelist, has_one = sol_escrow,
        // can only buy from NFT/Trade pool
        constraint = config.pool_type == PoolType::NFT || config.pool_type == PoolType::Trade @ crate::ErrorCode::WrongPoolType,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, has_one = whitelist on pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(mut)]
    pub nft_buyer_acc: Box<Account<'info, TokenAccount>>,

    /// Implicitly checked via transfer. Will fail if wrong account.
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

    /// CHECK: seed in nft_mint
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
        // todo test
        //can't buy an NFT that's associated with a different pool
        constraint = nft_receipt.pool == pool.key() @ crate::ErrorCode::WrongPool,
    )]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
    )]
    pub sol_escrow: UncheckedAccount<'info>,

    /// CHECK: has_one = owner in pool (owner is the seller)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

impl<'info> BuyNft<'info> {
    fn validate_proof(&self, proof: Vec<[u8; 32]>) -> Result<()> {
        let leaf = anchor_lang::solana_program::keccak::hash(self.nft_mint.key().as_ref());
        require!(
            merkle_proof::verify_proof(proof, self.whitelist.root_hash, leaf.0),
            InvalidProof
        );
        Ok(())
    }

    fn transfer_nft_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.nft_escrow.to_account_info(),
                to: self.nft_buyer_acc.to_account_info(),
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

    fn transfer_lamports(&self, to: &AccountInfo<'info>, lamports: u64) -> Result<()> {
        invoke(
            &system_instruction::transfer(self.buyer.key, to.key, lamports),
            &[
                self.buyer.to_account_info(),
                to.clone(),
                self.system_program.to_account_info(),
            ],
        )
        .map_err(Into::into)
    }
}

// todo write tests
impl<'info> Validate<'info> for BuyNft<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

//todo need to see how many of these can fit into a single tx,
//todo need to think about sending price / max price
#[access_control(ctx.accounts.validate_proof(proof); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, BuyNft<'info>>,
    proof: Vec<[u8; 32]>,
    // Max vs exact so we can add slippage later.
    max_price: u64,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    let current_price = pool.current_price(TakerSide::Buy)?;
    if current_price > max_price {
        throw_err!(PriceMismatch);
    }

    let mut left_for_seller = current_price;

    //transfer fee to Tensorswap
    let tswap_fee = pool.calc_tswap_fee(ctx.accounts.tswap.config.fee_bps, current_price)?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));
    ctx.accounts
        .transfer_lamports(&ctx.accounts.fee_vault.to_account_info(), tswap_fee)?;

    //transfer remainder to either seller/owner or the pool (if Trade pool)
    let destination = match pool.config.pool_type {
        //send money direct to seller/owner
        PoolType::NFT => ctx.accounts.owner.to_account_info(),
        //send money to the pool
        // NB: no explicit MM fees here: that's because it goes directly to the escrow anyways.
        PoolType::Trade => ctx.accounts.sol_escrow.to_account_info(),
        PoolType::Token => unreachable!(),
    };
    ctx.accounts
        .transfer_lamports(&destination, left_for_seller)?;

    // transfer nft to buyer
    token::transfer(
        ctx.accounts
            .transfer_nft_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
        1,
    )?;

    // close nft escrow account
    token::close_account(
        ctx.accounts
            .close_nft_escrow_ctx()
            .with_signer(&[&ctx.accounts.tswap.seeds()]),
    )?;

    //update pool accounting
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_sub(1));
    pool.taker_buy_count = unwrap_int!(pool.taker_buy_count.checked_add(1));

    Ok(())
}

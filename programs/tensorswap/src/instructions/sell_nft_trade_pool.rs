//! User selling an NFT into a Trade pool
//! We separate this from Token pool since the NFT will go into an NFT escrow w/ a receipt.
//! (!) Keep common logic in sync with sell_nft_token_pool.rs.
use crate::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNftTradePool<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0], 
        has_one = fee_vault, has_one = cosigner,
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: has_one = fee_vault in tswap
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
        has_one = tswap, has_one = whitelist, has_one = sol_escrow, has_one = owner,
        // sell into a Token pool
        constraint = config.pool_type == PoolType::Trade @ crate::ErrorCode::WrongPoolType,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    // todo: test if we can pass a WL mint here w/ non-WL mint account.
    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(mut, token::mint = nft_mint, token::authority = seller)]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(
        init_if_needed, 
        payer = seller,
        seeds=[
            b"nft_escrow".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint, token::authority = tswap,
    )]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint + seed in nft_escrow, token::mint in nft_seller_acc
    pub nft_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = seller,
        seeds=[
            b"nft_receipt".as_ref(),
            nft_mint.key().as_ref(),
        ],
        bump,
        space = 8 + NftDepositReceipt::SIZE,
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

    /// CHECK: has_one = owner in pool (owner is the buyer)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,
    /// CHECK: has_one = cosigner in tswap
    pub cosigner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> SellNftTradePool<'info> {
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
                from: self.nft_seller_acc.to_account_info(),
                to: self.nft_escrow.to_account_info(),
                authority: self.seller.to_account_info(),
            },
        )
    }

    fn transfer_lamports_from_escrow(&self, to: &AccountInfo<'info>, lamports: u64) -> Result<()> {
        transfer_lamports_from_escrow(&self.sol_escrow, to, lamports)
    }
}

// todo write tests
impl<'info> Validate<'info> for SellNftTradePool<'info> {
    fn validate(&self) -> Result<()> {
        Ok(())
    }
}

//todo need to see how many of these can fit into a single tx,
//todo need to think about sending price / max price
#[access_control(ctx.accounts.validate_proof(proof); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellNftTradePool<'info>>,
    proof: Vec<[u8; 32]>,
    // Min vs exact so we can add slippage later.
    min_price: u64,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    let current_price = pool.current_price(TakerSide::Sell)?;
    if current_price < min_price {
        throw_err!(PriceMismatch);
    }

    let mut left_for_seller = current_price;

    // transfer nft to escrow
    // This must go before any transfer_lamports
    // o/w we get `sum of account balances before and after instruction do not match`
    token::transfer(ctx.accounts.transfer_ctx(), 1)?;

    //create nft receipt for trade pool
    let receipt_state = &mut ctx.accounts.nft_receipt;
    receipt_state.bump = unwrap_bump!(ctx, "nft_receipt");
    receipt_state.pool = pool.key();
    receipt_state.nft_mint = ctx.accounts.nft_mint.key();
    receipt_state.nft_escrow = ctx.accounts.nft_escrow.key();

    //transfer fee to Tensorswap
    let tswap_fee = ctx
        .accounts
        .pool
        .calc_tswap_fee(ctx.accounts.tswap.config.fee_bps, current_price)?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));

    ctx.accounts
        .transfer_lamports_from_escrow(&ctx.accounts.fee_vault.to_account_info(), tswap_fee)?;

    //todo write tests
    // Owner/MM keeps some funds as their fee (no transfer necessary).
    let mm_fee = pool.calc_mm_fee(current_price)?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(mm_fee));

    //send money directly to seller
    let destination = match pool.config.pool_type {
        PoolType::Token | PoolType::Trade => ctx.accounts.seller.to_account_info(),
        PoolType::NFT => unreachable!(),
    };
    ctx.accounts
        .transfer_lamports_from_escrow(&destination, left_for_seller)?;

    //update pool accounting
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_add(1));
    pool.taker_sell_count = unwrap_int!(pool.taker_sell_count.checked_add(1));

    Ok(())
}

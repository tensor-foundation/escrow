//! User buying an NFT from the pool / pool selling an NFT to the user
use crate::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(auth_bump: u8, pool_bump: u8, receipt_bump: u8, escrow_bump: u8, config: PoolConfig)]
pub struct BuyNft<'info> {
    /// Needed for pool seeds derivation
    #[account(has_one = authority, has_one = fee_vault)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: checked above via has_one
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,

    /// Needed to be set as authority on token escrows
    /// CHECK: via seed derivation macro below / via has one_one above.
    #[account(seeds = [tswap.key().as_ref()], bump = auth_bump)]
    pub authority: UncheckedAccount<'info>,

    #[account(mut, seeds = [
        tswap.key().as_ref(),
        seller.key().as_ref(),
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
    pub nft_buyer_acc: Box<Account<'info, TokenAccount>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(mut, seeds=[
        b"nft_escrow".as_ref(),
        nft_mint.key().as_ref(),
    ], bump = escrow_bump)]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds=[
        b"nft_receipt".as_ref(),
        nft_mint.key().as_ref(),
    ], bump = receipt_bump, close = fee_vault)]
    pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// CHECK: used to derive pool seeds
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,

    /// Tied to the pool because used to verify pool seeds
    #[account(mut)]
    pub buyer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    //
    //todo write tests
    // Optional accounts: only for Trade pool
    // Optional account 1: mm_fee_vault
    // Optional account 2: sol_escrow
}

impl<'info> BuyNft<'info> {
    // todo open question if we want to be doing this on the buy side - DISCUSS
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
                from: self.nft_escrow.to_account_info(),
                to: self.nft_buyer_acc.to_account_info(),
                authority: self.authority.to_account_info(),
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
        //can't buy an NFT from a token pool
        if self.pool.config.pool_type == PoolType::Token {
            throw_err!(WrongPoolType);
        }
        //can't buy an NFT that's associated with a different pool
        if self.pool.key() != self.nft_receipt.pool {
            throw_err!(WrongPool);
        }
        //can't buy from pool if not active
        if self.pool.is_active {
            throw_err!(PoolNotActive);
        }
        Ok(())
    }
}

//todo need to see how many of these can fit into a single tx,
//todo need to think about sending price / max price
#[access_control(ctx.accounts.validate_proof(proof); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, BuyNft<'info>>,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    let current_price = pool.current_price()?;
    let mut left_for_seller = current_price;

    //transfer fee to Tensorswap
    let tswap_fee = pool.calc_tswap_fee(ctx.accounts.tswap.config.fee_bps, current_price)?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));
    ctx.accounts
        .transfer_lamports(&ctx.accounts.fee_vault.to_account_info(), tswap_fee)?;

    let remaining_accs = &mut ctx.remaining_accounts.iter();

    //todo write tests
    //transfer fee to market maker
    if pool.config.pool_type == PoolType::Trade {
        let passed_mm_fee_vault = next_account_info(remaining_accs)?;
        if *passed_mm_fee_vault.key != pool.config.mm_fee_vault.unwrap() {
            throw_err!(BadFeeAccount);
        }

        let mm_fee = pool.calc_mm_fee(current_price)?;
        left_for_seller = unwrap_int!(left_for_seller.checked_sub(mm_fee));

        ctx.accounts
            .transfer_lamports(&passed_mm_fee_vault, mm_fee)?;
    }

    //transfer remainder to either user or the pool (if Trade pool)
    let destination = match pool.config.pool_type {
        //send money direct to user
        PoolType::NFT => ctx.accounts.seller.to_account_info(),
        //send money to the pool
        PoolType::Trade => {
            let passed_sol_escrow = next_account_info(remaining_accs)?;
            if *passed_sol_escrow.key != pool.sol_escrow.unwrap() {
                throw_err!(BadEscrowAccount);
            }
            passed_sol_escrow.clone()
        }
        PoolType::Token => unreachable!(),
    };
    ctx.accounts
        .transfer_lamports(&destination, left_for_seller)?;

    // transfer nft to buyer
    token::transfer(
        ctx.accounts
            .transfer_ctx()
            .with_signer(&[&ctx.accounts.tswap.sign()]),
        1,
    )?;

    //update pool
    let pool = &mut ctx.accounts.pool;
    pool.nfts_held = unwrap_int!(pool.nfts_held.checked_sub(1));
    pool.pool_nft_sale_count = unwrap_int!(pool.pool_nft_sale_count.checked_add(1));
    pool.set_active(current_price);

    Ok(())
}

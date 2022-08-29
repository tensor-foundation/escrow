//! User selling an NFT to the pool / pool buying an NFT from the user
use crate::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use tensor_whitelist::{self, Whitelist};
use anchor_lang::Discriminator;
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNft<'info> {
    /// Needed for pool seeds derivation
    #[account(seeds = [], bump = tswap.bump[0], has_one = fee_vault)]
    pub tswap: Box<Account<'info, TSwap>>,

    /// CHECK: checked above via has_one
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,

    #[account(mut, seeds = [
        tswap.key().as_ref(),
        owner.key().as_ref(),
        whitelist.key().as_ref(),
        &[config.pool_type as u8],
        &[config.curve_type as u8],
        &config.starting_price.to_le_bytes(),
        &config.delta.to_le_bytes()
    ], bump = pool.bump[0], has_one = tswap, has_one = whitelist, 
    has_one = sol_escrow, has_one = owner)]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: Box<Account<'info, Whitelist>>,

    // todo we can get rid of this to save accounts - simply take it from seller_acc
    pub nft_mint: Box<Account<'info, Mint>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(mut)]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,

    /// Implicitly checked via transfer. Will fail if wrong account
    #[account(init_if_needed, payer=seller, seeds=[
        b"nft_escrow".as_ref(),
        nft_mint.key().as_ref(),
    ], bump, token::mint = nft_mint, token::authority = tswap)]
    pub nft_escrow: Box<Account<'info, TokenAccount>>,

    // #[account(init_if_needed, payer=seller, seeds=[
    //     b"nft_receipt".as_ref(),
    //     nft_mint.key().as_ref(),
    //     // TODO: hardcode size.
    // ], bump, space = 8 + std::mem::size_of::<NftDepositReceipt>())]
    // pub nft_receipt: Box<Account<'info, NftDepositReceipt>>,

    /// CHECK: init'ed below only for Trade pools
    #[account(mut)]
    pub nft_receipt: UncheckedAccount<'info>,

    /// CHECK: has_one escrow in pool
    #[account(mut, seeds=[
        b"sol_escrow".as_ref(),
        pool.key().as_ref(),
    ], bump = pool.sol_escrow_bump[0])]
    pub sol_escrow: UncheckedAccount<'info>,

    /// CHECK: has_one = owner in pool (owner is the buyer)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> SellNft<'info> {
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
        let new_sol_escrow = unwrap_int!(self.sol_escrow.lamports.borrow().checked_sub(lamports));
        **self.sol_escrow.try_borrow_mut_lamports()? = new_sol_escrow;

        let new_to = unwrap_int!(to.lamports.borrow().checked_add(lamports));
        **to.lamports.borrow_mut() =  new_to;

        Ok(())
    }
}

// todo write tests
impl<'info> Validate<'info> for SellNft<'info> {
    fn validate(&self) -> Result<()> {
        // can only sell to Token/Trade pool
        match self.pool.config.pool_type {
            PoolType::Token | PoolType::Trade => {}
            _ => {
                throw_err!(WrongPoolType);
            }
        }
        Ok(())
    }
}

//todo need to see how many of these can fit into a single tx,
//todo need to think about sending price / max price
#[access_control(ctx.accounts.validate_proof(proof); ctx.accounts.validate())]
pub fn handler<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, SellNft<'info>>,
    proof: Vec<[u8; 32]>,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    // todo: send nft directly to owner's account for Token pool?
    // transfer nft to escrow
    // This must go before any transfer_lamports
    // o/w we get `sum of account balances before and after instruction do not match`
    token::transfer(ctx.accounts.transfer_ctx(), 1)?;

    // This must go before any transfer_lamports
    //create nft receipt for trade pool
    if pool.config.pool_type == PoolType::Trade {
        let receipt = &ctx.accounts.nft_receipt;
        let mint_key = ctx.accounts.nft_mint.key();
            let (expected, bump) = Pubkey::find_program_address(&[b"nft_receipt", mint_key.as_ref()], ctx.program_id);
        if receipt.key() != expected {
            return Err(ProgramError::InvalidAccountData.into());
        }

        let space =  8 + std::mem::size_of::<NftDepositReceipt>();
        let cpi_seeds: &[&[&[u8]]] = &[&[b"nft_receipt",  mint_key.as_ref(), &[bump]]];
        let cpi_accounts = anchor_lang::system_program::CreateAccount {
            from: ctx.accounts.seller.to_account_info(),
            to: receipt.to_account_info(),
        };
        let cpi_context = anchor_lang::context::CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), cpi_accounts, cpi_seeds);
        anchor_lang::system_program::create_account(
            cpi_context,
            Rent::get()?.minimum_balance(space),
             space as u64,
              ctx.program_id)?;

        let mut receipt_state = NftDepositReceipt::try_from_slice(&receipt.data.borrow()[8..])?;
        receipt_state.bump = bump;
        receipt_state.pool = pool.key();
        receipt_state.nft_mint = ctx.accounts.nft_mint.key();
        receipt_state.nft_escrow = ctx.accounts.nft_escrow.key();

        {
            let mut receipt_data = receipt.data.try_borrow_mut().map_err(|_| ProgramError::InvalidAccountData)?;
             (*receipt_data)[0..8].copy_from_slice(&NftDepositReceipt::discriminator());
             (*receipt_data)[8..].copy_from_slice(&receipt_state.try_to_vec().map_err(|_| ProgramError::InvalidAccountData)?);
        }
    }


    let current_price = pool.current_price(TradeAction::Sell)?;
    let mut left_for_seller = current_price;

    //transfer fee to Tensorswap
    let tswap_fee = pool.calc_tswap_fee(ctx.accounts.tswap.config.fee_bps, current_price)?;
    left_for_seller = unwrap_int!(left_for_seller.checked_sub(tswap_fee));
    ctx.accounts
        .transfer_lamports_from_escrow(&ctx.accounts.fee_vault.to_account_info(), tswap_fee)?;

    //todo write tests
    // Owner/MM keeps some funds as their fee (no transfer necessary).
    if pool.config.pool_type == PoolType::Trade {
        let mm_fee = pool.calc_mm_fee(current_price)?;
        left_for_seller = unwrap_int!(left_for_seller.checked_sub(mm_fee));
    }

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
    pool.pool_nft_purchase_count = unwrap_int!(pool.pool_nft_purchase_count.checked_add(1));

    Ok(())
}

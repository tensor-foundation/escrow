//! User editing a pool, which actually 1)closes old one, 2)inits new one, 3)shifts nft authority
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

use crate::*;

#[derive(Accounts)]
#[instruction(old_config: PoolConfig, new_config: PoolConfig)]
pub struct EditPool<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    #[account(mut,
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[old_config.pool_type as u8],
            &[old_config.curve_type as u8],
            &old_config.starting_price.to_le_bytes(),
            &old_config.delta.to_le_bytes()
        ],
        bump = old_pool.bump[0],
        has_one = tswap, has_one = owner, has_one = whitelist,
        has_one = nft_authority @ crate::ErrorCode::WrongAuthority,
        constraint = old_pool.sol_escrow == old_sol_escrow.key() @ crate::ErrorCode::BadEscrowAccount,
        constraint = old_pool.key() != new_pool.key() @ crate::ErrorCode::PoolsAreTheSame,
        close = owner,
    )]
    pub old_pool: Box<Account<'info, Pool>>,

    #[account(
        init, payer = owner,
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[new_config.pool_type as u8],
            &[new_config.curve_type as u8],
            &new_config.starting_price.to_le_bytes(),
            &new_config.delta.to_le_bytes()
        ],
        bump,
        space = POOL_SIZE,
    )]
    pub new_pool: Box<Account<'info, Pool>>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            old_pool.key().as_ref(),
        ],
        bump = old_pool.sol_escrow_bump[0],
        close = owner,
    )]
    pub old_sol_escrow: Box<Account<'info, SolEscrow>>,

    #[account(
        init, payer = owner,
        seeds = [
            b"sol_escrow".as_ref(),
            new_pool.key().as_ref(),
        ],
        bump,
        space = 8
    )]
    pub new_sol_escrow: Box<Account<'info, SolEscrow>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    #[account(
        mut,
        seeds = [b"nft_auth".as_ref(), &nft_authority.random_seed],
        bump = nft_authority.bump[0],
        constraint = old_pool.key() == nft_authority.pool @ crate::ErrorCode::WrongAuthority,
    )]
    pub nft_authority: Box<Account<'info, NftAuthority>>,

    /// CHECK: used in seed derivation
    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for EditPool<'info> {
    fn validate(&self) -> Result<()> {
        //editing is only enabled for v2 pools (can't check new_pool since it's 0)
        if self.old_pool.version != CURRENT_POOL_VERSION {
            throw_err!(WrongPoolVersion);
        }
        if self.old_pool.frozen.is_some() {
            throw_err!(PoolFrozen);
        }
        Ok(())
    }
}

impl<'info> EditPool<'info> {
    fn validate_pool_type(&self, new_config: PoolConfig) -> Result<()> {
        //cannot change pool type
        if self.old_pool.config.pool_type != new_config.pool_type {
            throw_err!(WrongPoolType);
        }
        Ok(())
    }

    fn transfer_lamports_from_old_to_new_pool(&self) -> Result<()> {
        let current_lamports = self.old_sol_escrow.to_account_info().lamports();
        let rent = Rent::get()?.minimum_balance(self.old_sol_escrow.to_account_info().data_len());
        let lamports_to_move = current_lamports.checked_sub(rent).unwrap();

        transfer_lamports_from_pda(
            &self.old_sol_escrow.to_account_info(),
            &self.new_sol_escrow.to_account_info(),
            lamports_to_move,
        )
    }

    fn transfer_mm_fees_from_old_to_new_pool(&self) -> Result<()> {
        let current_lamports = self.old_pool.to_account_info().lamports();
        let rent = Rent::get()?.minimum_balance(self.old_pool.to_account_info().data_len());
        let lamports_to_move = current_lamports.checked_sub(rent).unwrap();

        if lamports_to_move > 0 {
            transfer_lamports_from_pda(
                &self.old_pool.to_account_info(),
                &self.new_pool.to_account_info(),
                lamports_to_move,
            )?;
        }

        Ok(())
    }
}

#[access_control(ctx.accounts.validate(); ctx.accounts.validate_pool_type(new_config))]
pub fn handler(
    ctx: Context<EditPool>,
    new_config: PoolConfig,
    is_cosigned: Option<bool>,
    max_taker_sell_count: Option<u32>,
) -> Result<()> {
    let new_pool = &mut ctx.accounts.new_pool;
    let old_pool = &ctx.accounts.old_pool;

    new_pool.version = CURRENT_POOL_VERSION;
    new_pool.bump = [unwrap_bump!(ctx, "new_pool")];
    new_pool.sol_escrow_bump = [unwrap_bump!(ctx, "new_sol_escrow")];
    new_pool.created_unix_seconds = old_pool.created_unix_seconds;
    new_pool.config = new_config;

    new_pool.tswap = ctx.accounts.tswap.key();
    new_pool.owner = ctx.accounts.owner.key();
    new_pool.whitelist = ctx.accounts.whitelist.key();
    new_pool.sol_escrow = ctx.accounts.new_sol_escrow.key();

    new_pool.taker_buy_count = 0;
    new_pool.taker_sell_count = 0;
    new_pool.nfts_held = old_pool.nfts_held;

    //move over stats from old pool to new pool
    new_pool.stats = old_pool.stats;

    //2-way link between the authority and the pool
    new_pool.nft_authority = ctx.accounts.nft_authority.key();

    new_pool.order_type = old_pool.order_type;
    //technically you can't edit frozen pools, but won't hurt
    new_pool.frozen = old_pool.frozen;
    new_pool.margin = old_pool.margin;

    // --------------------------------------- (!!!) SYNC WITH EDIT POOL IN PLACE

    //need to be able to adjust this boolean when broad order <--> narrow (trait specific)
    match is_cosigned {
        Some(is_cosigned) => {
            //require that both old and new pools are Bids
            if new_pool.config.pool_type != PoolType::Token
                || old_pool.config.pool_type != PoolType::Token
            {
                throw_err!(WrongPoolType);
            }
            new_pool.is_cosigned = is_cosigned;
        }
        None => {
            new_pool.is_cosigned = old_pool.is_cosigned;
        }
    }

    match max_taker_sell_count {
        Some(max_taker_sell_count) => {
            new_pool.valid_max_sell_count(max_taker_sell_count)?;
            new_pool.max_taker_sell_count = max_taker_sell_count;
        }
        None => {
            new_pool.max_taker_sell_count = old_pool.max_taker_sell_count;
        }
    }

    // --------------------------------------- (!!!) SYNC WITH EDIT POOL END IN PLACE

    let auth = &mut ctx.accounts.nft_authority;

    //2-way link between the authority and the pool
    auth.pool = ctx.accounts.new_pool.key();

    //move lamports from old to new pool
    ctx.accounts.transfer_lamports_from_old_to_new_pool()?;
    ctx.accounts.transfer_mm_fees_from_old_to_new_pool()?;

    Ok(())
}

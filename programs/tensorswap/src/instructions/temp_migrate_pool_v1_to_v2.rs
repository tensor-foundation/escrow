use crate::*;
use tensor_whitelist::{self, Whitelist};
use vipers::throw_err;

#[derive(Accounts)]
#[instruction(config: PoolConfig, auth_seeds: [u8; 32])]
pub struct MigratePoolV1ToV2<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        constraint = tswap_owner.key() == tswap.owner
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
        has_one = tswap, has_one = owner, has_one = whitelist,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation / will be stored inside pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    #[account(
        init, payer = tswap_owner,
        seeds = [b"nft_auth".as_ref(), &auth_seeds],
        bump,
        space = 8 + NftAuthority::SIZE
    )]
    pub nft_authority: Box<Account<'info, NftAuthority>>,

    /// CHECK: used in seed derivation - NOT A SIGNER, COZ WE'RE MIGRATING ON THEIR BEHALF
    pub owner: AccountInfo<'info>,

    #[account(mut)]
    pub tswap_owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for MigratePoolV1ToV2<'info> {
    fn validate(&self) -> Result<()> {
        if self.pool.version != 1 {
            throw_err!(WrongPoolVersion);
        }
        Ok(())
    }
}

#[access_control(ctx.accounts.validate())]
pub fn handler(ctx: Context<MigratePoolV1ToV2>, auth_seeds: [u8; 32]) -> Result<()> {
    // --------------------------------------- update pool

    let pool = &mut ctx.accounts.pool;

    //update pool version
    pool.version = CURRENT_POOL_VERSION;

    let approx_mm_profit: u64 = match pool.config.pool_type {
        PoolType::Trade => {
            let total_trades =
                unwrap_int!(pool.taker_buy_count.checked_add(pool.taker_sell_count)) as u64;
            //taking starting price as my wild guess is that most MM pools are not too far away from it
            //this won't be perfect, but is a good enough heuristic. Worst case we tell someone to re-create their pool
            let profit_at_sp = pool.calc_mm_fee(pool.config.starting_price)?;
            unwrap_checked!({ total_trades.checked_mul(profit_at_sp.checked_div(2)?) })
        }
        _ => 0,
    };

    //update stats
    pool.stats = PoolStats {
        taker_sell_count: pool.taker_sell_count,
        taker_buy_count: pool.taker_buy_count,
        accumulated_mm_profit: approx_mm_profit,
    };

    //2-way link between the authority and the pool
    pool.nft_authority = ctx.accounts.nft_authority.key();

    // --------------------------------------- update authority

    let auth = &mut ctx.accounts.nft_authority;

    auth.random_seed = auth_seeds;
    auth.bump = [unwrap_bump!(ctx, "nft_authority")];

    //2-way link between the authority and the pool
    auth.pool = ctx.accounts.pool.key();

    Ok(())
}

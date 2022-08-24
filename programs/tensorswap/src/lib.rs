use anchor_lang::prelude::*;
use vipers::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

pub use errors::*;
pub use instructions::*;
pub use state::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod tensorswap {
    use super::*;

    pub fn init_tswap(ctx: Context<InitTSwap>, auth_bump: u8) -> Result<()> {
        instructions::init_tswap::handler(ctx, auth_bump)
    }

    pub fn init_pool(
        ctx: Context<InitPool>,
        root_hash: [u8; 32],
        config: PoolConfig,
    ) -> Result<()> {
        instructions::init_pool::handler(ctx, root_hash, config)
    }
}

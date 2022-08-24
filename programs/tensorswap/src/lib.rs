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

    pub fn init_pool(ctx: Context<InitPool>) -> Result<()> {
        instructions::init_pool::handler(ctx)
    }

    pub fn init_tswap(ctx: Context<InitTSwap>) -> Result<()> {
        instructions::init_tswap::handler(ctx)
    }
}

//! A brick.
//! Deploy in case of emergency.

use anchor_lang::prelude::*;

// TODO: change this to appropriate program's ID
declare_id!("TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN");

#[program]
pub mod brick {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

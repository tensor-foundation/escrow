use anchor_lang::prelude::*;

#[account]
pub struct Tensorswap {
    pub hello: u64,
}

#[account]
pub struct Pool {
    pub hello: u64,
}

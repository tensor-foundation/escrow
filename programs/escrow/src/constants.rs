use anchor_lang::prelude::*;

// (!) DONT USE UNDERSCORES (3_000) OR WONT BE ABLE TO READ JS-SIDE
#[constant]
pub const CURRENT_TSWAP_VERSION: u8 = 1;

pub const TCOMP_BID_STATE_DISCRIMINATOR: [u8; 8] = [155, 197, 5, 97, 189, 60, 8, 183];
pub const TAMM_POOL_DISCRIMINATOR: [u8; 8] = [241, 154, 109, 4, 17, 177, 109, 188];

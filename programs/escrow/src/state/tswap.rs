use anchor_lang::prelude::*;

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const TSWAP_SIZE: usize = 8 + 1 + 1 + 2 + 32 * 3;

#[account]
pub struct TSwap {
    pub version: u8,
    pub bump: [u8; 1],
    /// @DEPRECATED, use constant above instead
    pub config: TSwapConfig,

    //More security sensitive than cosigner
    pub owner: Pubkey,
    pub fee_vault: Pubkey,
    pub cosigner: Pubkey,
}

impl TSwap {
    pub fn seeds(&self) -> [&[u8]; 1] {
        [&self.bump]
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone, Copy)]
pub struct TSwapConfig {
    pub fee_bps: u16,
}

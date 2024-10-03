use anchor_lang::prelude::*;

// (!) INCLUSIVE of discriminator (8 bytes)
#[constant]
#[allow(clippy::identity_op)]
pub const MARGIN_SIZE: usize = 8 + 32 + 32 + 2 + 1 + 4 + 64;

// TODO: if size ever changes, be sure to update APPROX_SOL_MARGIN_RENT in tensor-infra
#[account]
pub struct MarginAccount {
    pub owner: Pubkey,
    pub name: [u8; 32],
    pub nr: u16,
    pub bump: [u8; 1],
    #[deprecated(note = "This field is no longer in sync")]
    pub pools_attached: u32,
    // TODO: we forgot to track bids attached.
    // Revisit this maybe for margin account V2.
    //(!) this is important - otherwise rent will be miscalculated by anchor client-side
    pub _reserved: [u8; 64],
}

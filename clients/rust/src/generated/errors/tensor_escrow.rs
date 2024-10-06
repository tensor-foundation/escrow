//! This code was AUTOGENERATED using the kinobi library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun kinobi to update it.
//!
//! <https://github.com/kinobi-so/kinobi>
//!

use num_derive::FromPrimitive;
use thiserror::Error;

#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum TensorEscrowError {
    /// 6016 - bad owner
    #[error("bad owner")]
    BadOwner = 0x1780,
    /// 6027 - bad margin account passed
    #[error("bad margin account passed")]
    BadMargin = 0x178B,
}

impl solana_program::program_error::PrintProgramError for TensorEscrowError {
    fn print<E>(&self) {
        solana_program::msg!(&self.to_string());
    }
}

use anchor_lang::prelude::*;

/// Errors that can be returned by the Escrow program.
///
/// The errors maintain the same numeric value for compatibility with the
/// the previous version of the program.
#[error_code]
pub enum ErrorCode {
    #[msg("bad margin account passed")]
    BadMargin = 27,
    #[msg("margin account has pools open and is in use")]
    MarginInUse = 32,
}

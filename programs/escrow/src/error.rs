use anchor_lang::prelude::*;

/// Errors that can be returned by the Escrow program.
///
/// The errors maintain the same numeric value for compatibility with the
/// the previous version of the program.
#[error_code]
pub enum ErrorCode {
    #[msg("bad owner")]
    BadOwner = 16,
    #[msg("bad margin account passed")]
    BadMargin = 27,
}

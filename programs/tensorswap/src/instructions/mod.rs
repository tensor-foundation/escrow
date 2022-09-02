pub mod buy_nft;
pub mod close_pool;
pub mod deposit_nft;
pub mod deposit_sol;
pub mod init_pool;
pub mod init_update_tswap;
pub mod sell_nft_token_pool;
pub mod sell_nft_trade_pool;
pub mod withdraw_nft;
pub mod withdraw_sol;

pub use buy_nft::*;
pub use close_pool::*;
pub use deposit_nft::*;
pub use deposit_sol::*;
pub use init_pool::*;
pub use init_update_tswap::*;
pub use sell_nft_token_pool::*;
pub use sell_nft_trade_pool::*;
pub use withdraw_nft::*;
pub use withdraw_sol::*;

use crate::*;
use anchor_lang::prelude::{AccountInfo, UncheckedAccount};

pub fn transfer_lamports_from_escrow<'info>(
    sol_escrow: &UncheckedAccount<'info>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let new_sol_escrow = unwrap_int!(sol_escrow.lamports.borrow().checked_sub(lamports));
    **sol_escrow.try_borrow_mut_lamports()? = new_sol_escrow;

    let new_to = unwrap_int!(to.lamports.borrow().checked_add(lamports));
    **to.lamports.borrow_mut() = new_to;

    Ok(())
}

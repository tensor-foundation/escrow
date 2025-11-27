pub mod close_margin_account;
pub mod deposit_margin_account;
pub mod init_margin_account;
pub mod init_update_tswap;
pub mod withdraw_margin_account;
pub mod withdraw_margin_account_from_tamm;
pub mod withdraw_margin_account_from_tcomp;

pub use close_margin_account::*;
pub use deposit_margin_account::*;
pub use init_margin_account::*;
pub use init_update_tswap::*;
pub use withdraw_margin_account::*;
pub use withdraw_margin_account_from_tamm::*;
pub use withdraw_margin_account_from_tcomp::*;

use tensor_vipers::throw_err;

use crate::{error::ErrorCode, *};

pub fn margin_pda(tswap: &Pubkey, owner: &Pubkey, nr: u16) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            b"margin".as_ref(),
            tswap.as_ref(),
            owner.as_ref(),
            &nr.to_le_bytes(),
        ],
        &crate::id(),
    )
}

pub fn get_tswap_addr() -> Pubkey {
    let (pda, _) = Pubkey::find_program_address(&[], &crate::id());
    pda
}

#[inline(never)]
pub fn assert_decode_margin_account<'info>(
    margin_account_info: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
) -> Result<Box<MarginAccount>> {
    let mut data: &[u8] = &margin_account_info.try_borrow_data()?;
    let margin_account: Box<MarginAccount> =
        Box::new(AccountDeserialize::try_deserialize(&mut data)?);

    let program_id = &crate::id();
    let (key, _) = margin_pda(&get_tswap_addr(), &owner.key(), margin_account.nr);
    if key != *margin_account_info.key {
        throw_err!(ErrorCode::BadMargin);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *margin_account_info.owner != *program_id {
        throw_err!(ErrorCode::BadMargin);
    }
    // Check normal owner (not redundant - this actually checks if the account is
    // initialized and stores the owner correctly).
    if margin_account.owner != owner.key() {
        throw_err!(ErrorCode::BadMargin);
    }

    Ok(margin_account)
}

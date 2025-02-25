use anchor_lang::prelude::*;

// Anchor discriminator length.
const DISCRIMINATOR_LEN: usize = 8;

pub(crate) fn assert_discriminator(account_info: &AccountInfo, expected: &[u8; 8]) -> Result<()> {
    let data = &(account_info.data).borrow();
    // the account must not be empty
    if data.len() < DISCRIMINATOR_LEN
        || u64::from_le_bytes(
            data[..DISCRIMINATOR_LEN]
                .try_into()
                .map_err(|_error| ErrorCode::AccountDiscriminatorNotFound)?,
        ) == 0
    {
        return Err(ErrorCode::AccountDiscriminatorNotFound.into());
    }

    // the discriminator must match
    if data[0..DISCRIMINATOR_LEN] != *expected {
        return Err(ErrorCode::AccountDiscriminatorMismatch.into());
    }

    Ok(())
}

//! This code was AUTOGENERATED using the codama library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun codama to update it.
//!
//! <https://github.com/codama-idl/codama>
//!

use borsh::BorshDeserialize;
use borsh::BorshSerialize;
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct MarginAccount {
    pub discriminator: [u8; 8],
    #[cfg_attr(
        feature = "serde",
        serde(with = "serde_with::As::<serde_with::DisplayFromStr>")
    )]
    pub owner: Pubkey,
    pub name: [u8; 32],
    pub nr: u16,
    pub bump: [u8; 1],
    pub pools_attached: u32,
    #[cfg_attr(feature = "serde", serde(with = "serde_with::As::<serde_with::Bytes>"))]
    pub reserved: [u8; 64],
}

impl MarginAccount {
    pub const LEN: usize = 143;

    /// Prefix values used to generate a PDA for this account.
    ///
    /// Values are positional and appear in the following order:
    ///
    ///   0. `MarginAccount::PREFIX`
    ///   1. tswap (`Pubkey`)
    ///   2. owner (`Pubkey`)
    ///   3. margin_nr (`u16`)
    pub const PREFIX: &'static [u8] = "margin".as_bytes();

    pub fn create_pda(
        tswap: Pubkey,
        owner: Pubkey,
        margin_nr: u16,
        bump: u8,
    ) -> Result<solana_program::pubkey::Pubkey, solana_program::pubkey::PubkeyError> {
        solana_program::pubkey::Pubkey::create_program_address(
            &[
                "margin".as_bytes(),
                tswap.as_ref(),
                owner.as_ref(),
                margin_nr.to_string().as_ref(),
                &[bump],
            ],
            &crate::TENSOR_ESCROW_ID,
        )
    }

    pub fn find_pda(
        tswap: &Pubkey,
        owner: &Pubkey,
        margin_nr: u16,
    ) -> (solana_program::pubkey::Pubkey, u8) {
        solana_program::pubkey::Pubkey::find_program_address(
            &[
                "margin".as_bytes(),
                tswap.as_ref(),
                owner.as_ref(),
                margin_nr.to_string().as_ref(),
            ],
            &crate::TENSOR_ESCROW_ID,
        )
    }

    #[inline(always)]
    pub fn from_bytes(data: &[u8]) -> Result<Self, std::io::Error> {
        let mut data = data;
        Self::deserialize(&mut data)
    }
}

impl<'a> TryFrom<&solana_program::account_info::AccountInfo<'a>> for MarginAccount {
    type Error = std::io::Error;

    fn try_from(
        account_info: &solana_program::account_info::AccountInfo<'a>,
    ) -> Result<Self, Self::Error> {
        let mut data: &[u8] = &(*account_info.data).borrow();
        Self::deserialize(&mut data)
    }
}

#[cfg(feature = "fetch")]
pub fn fetch_margin_account(
    rpc: &solana_client::rpc_client::RpcClient,
    address: &Pubkey,
) -> Result<crate::shared::DecodedAccount<MarginAccount>, std::io::Error> {
    let accounts = fetch_all_margin_account(rpc, &[*address])?;
    Ok(accounts[0].clone())
}

#[cfg(feature = "fetch")]
pub fn fetch_all_margin_account(
    rpc: &solana_client::rpc_client::RpcClient,
    addresses: &[Pubkey],
) -> Result<Vec<crate::shared::DecodedAccount<MarginAccount>>, std::io::Error> {
    let accounts = rpc
        .get_multiple_accounts(&addresses)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    let mut decoded_accounts: Vec<crate::shared::DecodedAccount<MarginAccount>> = Vec::new();
    for i in 0..addresses.len() {
        let address = addresses[i];
        let account = accounts[i].as_ref().ok_or(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Account not found: {}", address),
        ))?;
        let data = MarginAccount::from_bytes(&account.data)?;
        decoded_accounts.push(crate::shared::DecodedAccount {
            address,
            account: account.clone(),
            data,
        });
    }
    Ok(decoded_accounts)
}

#[cfg(feature = "fetch")]
pub fn fetch_maybe_margin_account(
    rpc: &solana_client::rpc_client::RpcClient,
    address: &Pubkey,
) -> Result<crate::shared::MaybeAccount<MarginAccount>, std::io::Error> {
    let accounts = fetch_all_maybe_margin_account(rpc, &[*address])?;
    Ok(accounts[0].clone())
}

#[cfg(feature = "fetch")]
pub fn fetch_all_maybe_margin_account(
    rpc: &solana_client::rpc_client::RpcClient,
    addresses: &[Pubkey],
) -> Result<Vec<crate::shared::MaybeAccount<MarginAccount>>, std::io::Error> {
    let accounts = rpc
        .get_multiple_accounts(&addresses)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    let mut decoded_accounts: Vec<crate::shared::MaybeAccount<MarginAccount>> = Vec::new();
    for i in 0..addresses.len() {
        let address = addresses[i];
        if let Some(account) = accounts[i].as_ref() {
            let data = MarginAccount::from_bytes(&account.data)?;
            decoded_accounts.push(crate::shared::MaybeAccount::Exists(
                crate::shared::DecodedAccount {
                    address,
                    account: account.clone(),
                    data,
                },
            ));
        } else {
            decoded_accounts.push(crate::shared::MaybeAccount::NotFound(address));
        }
    }
    Ok(decoded_accounts)
}

#[cfg(feature = "anchor")]
impl anchor_lang::AccountDeserialize for MarginAccount {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        Ok(Self::deserialize(buf)?)
    }
}

#[cfg(feature = "anchor")]
impl anchor_lang::AccountSerialize for MarginAccount {}

#[cfg(feature = "anchor")]
impl anchor_lang::Owner for MarginAccount {
    fn owner() -> Pubkey {
        crate::TENSOR_ESCROW_ID
    }
}

#[cfg(feature = "anchor-idl-build")]
impl anchor_lang::IdlBuild for MarginAccount {}

#[cfg(feature = "anchor-idl-build")]
impl anchor_lang::Discriminator for MarginAccount {
    const DISCRIMINATOR: [u8; 8] = [0; 8];
}

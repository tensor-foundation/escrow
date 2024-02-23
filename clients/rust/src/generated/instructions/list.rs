//! This code was AUTOGENERATED using the kinobi library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun kinobi to update it.
//!
//! [https://github.com/metaplex-foundation/kinobi]
//!

use crate::generated::types::AuthorizationDataLocal;
use borsh::BorshDeserialize;
use borsh::BorshSerialize;

/// Accounts.
pub struct List {
    pub tswap: solana_program::pubkey::Pubkey,

    pub nft_source: solana_program::pubkey::Pubkey,

    pub nft_mint: solana_program::pubkey::Pubkey,
    /// Implicitly checked via transfer. Will fail if wrong account
    pub nft_escrow: solana_program::pubkey::Pubkey,

    pub single_listing: solana_program::pubkey::Pubkey,

    pub owner: solana_program::pubkey::Pubkey,

    pub token_program: solana_program::pubkey::Pubkey,

    pub system_program: solana_program::pubkey::Pubkey,

    pub rent: solana_program::pubkey::Pubkey,

    pub nft_metadata: solana_program::pubkey::Pubkey,

    pub nft_edition: solana_program::pubkey::Pubkey,

    pub owner_token_record: solana_program::pubkey::Pubkey,

    pub dest_token_record: solana_program::pubkey::Pubkey,

    pub associated_token_program: solana_program::pubkey::Pubkey,

    pub pnft_shared: solana_program::pubkey::Pubkey,

    pub auth_rules: solana_program::pubkey::Pubkey,

    pub payer: solana_program::pubkey::Pubkey,
}

impl List {
    pub fn instruction(
        &self,
        args: ListInstructionArgs,
    ) -> solana_program::instruction::Instruction {
        self.instruction_with_remaining_accounts(args, &[])
    }
    #[allow(clippy::vec_init_then_push)]
    pub fn instruction_with_remaining_accounts(
        &self,
        args: ListInstructionArgs,
        remaining_accounts: &[solana_program::instruction::AccountMeta],
    ) -> solana_program::instruction::Instruction {
        let mut accounts = Vec::with_capacity(17 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.tswap, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.nft_source,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.nft_mint,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.nft_escrow,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.single_listing,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.owner, true,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.token_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.system_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.rent, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.nft_metadata,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.nft_edition,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.owner_token_record,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.dest_token_record,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.associated_token_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.pnft_shared,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.auth_rules,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.payer, true,
        ));
        accounts.extend_from_slice(remaining_accounts);
        let mut data = ListInstructionData::new().try_to_vec().unwrap();
        let mut args = args.try_to_vec().unwrap();
        data.append(&mut args);

        solana_program::instruction::Instruction {
            program_id: crate::TENSOR_MARGIN_ID,
            accounts,
            data,
        }
    }
}

#[derive(BorshDeserialize, BorshSerialize)]
struct ListInstructionData {
    discriminator: [u8; 8],
}

impl ListInstructionData {
    fn new() -> Self {
        Self {
            discriminator: [54, 174, 193, 67, 17, 41, 132, 38],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct ListInstructionArgs {
    pub price: u64,
    pub authorization_data: Option<AuthorizationDataLocal>,
    pub rules_acc_present: bool,
}

/// Instruction builder for `List`.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` nft_source
///   2. `[]` nft_mint
///   3. `[writable]` nft_escrow
///   4. `[writable]` single_listing
///   5. `[writable, signer]` owner
///   6. `[optional]` token_program (default to `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
///   7. `[optional]` system_program (default to `11111111111111111111111111111111`)
///   8. `[optional]` rent (default to `SysvarRent111111111111111111111111111111111`)
///   9. `[writable]` nft_metadata
///   10. `[]` nft_edition
///   11. `[writable]` owner_token_record
///   12. `[writable]` dest_token_record
///   13. `[]` associated_token_program
///   14. `[]` pnft_shared
///   15. `[]` auth_rules
///   16. `[writable, signer]` payer
#[derive(Default)]
pub struct ListBuilder {
    tswap: Option<solana_program::pubkey::Pubkey>,
    nft_source: Option<solana_program::pubkey::Pubkey>,
    nft_mint: Option<solana_program::pubkey::Pubkey>,
    nft_escrow: Option<solana_program::pubkey::Pubkey>,
    single_listing: Option<solana_program::pubkey::Pubkey>,
    owner: Option<solana_program::pubkey::Pubkey>,
    token_program: Option<solana_program::pubkey::Pubkey>,
    system_program: Option<solana_program::pubkey::Pubkey>,
    rent: Option<solana_program::pubkey::Pubkey>,
    nft_metadata: Option<solana_program::pubkey::Pubkey>,
    nft_edition: Option<solana_program::pubkey::Pubkey>,
    owner_token_record: Option<solana_program::pubkey::Pubkey>,
    dest_token_record: Option<solana_program::pubkey::Pubkey>,
    associated_token_program: Option<solana_program::pubkey::Pubkey>,
    pnft_shared: Option<solana_program::pubkey::Pubkey>,
    auth_rules: Option<solana_program::pubkey::Pubkey>,
    payer: Option<solana_program::pubkey::Pubkey>,
    price: Option<u64>,
    authorization_data: Option<AuthorizationDataLocal>,
    rules_acc_present: Option<bool>,
    __remaining_accounts: Vec<solana_program::instruction::AccountMeta>,
}

impl ListBuilder {
    pub fn new() -> Self {
        Self::default()
    }
    #[inline(always)]
    pub fn tswap(&mut self, tswap: solana_program::pubkey::Pubkey) -> &mut Self {
        self.tswap = Some(tswap);
        self
    }
    #[inline(always)]
    pub fn nft_source(&mut self, nft_source: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_source = Some(nft_source);
        self
    }
    #[inline(always)]
    pub fn nft_mint(&mut self, nft_mint: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_mint = Some(nft_mint);
        self
    }
    /// Implicitly checked via transfer. Will fail if wrong account
    #[inline(always)]
    pub fn nft_escrow(&mut self, nft_escrow: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_escrow = Some(nft_escrow);
        self
    }
    #[inline(always)]
    pub fn single_listing(&mut self, single_listing: solana_program::pubkey::Pubkey) -> &mut Self {
        self.single_listing = Some(single_listing);
        self
    }
    #[inline(always)]
    pub fn owner(&mut self, owner: solana_program::pubkey::Pubkey) -> &mut Self {
        self.owner = Some(owner);
        self
    }
    /// `[optional account, default to 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA']`
    #[inline(always)]
    pub fn token_program(&mut self, token_program: solana_program::pubkey::Pubkey) -> &mut Self {
        self.token_program = Some(token_program);
        self
    }
    /// `[optional account, default to '11111111111111111111111111111111']`
    #[inline(always)]
    pub fn system_program(&mut self, system_program: solana_program::pubkey::Pubkey) -> &mut Self {
        self.system_program = Some(system_program);
        self
    }
    /// `[optional account, default to 'SysvarRent111111111111111111111111111111111']`
    #[inline(always)]
    pub fn rent(&mut self, rent: solana_program::pubkey::Pubkey) -> &mut Self {
        self.rent = Some(rent);
        self
    }
    #[inline(always)]
    pub fn nft_metadata(&mut self, nft_metadata: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_metadata = Some(nft_metadata);
        self
    }
    #[inline(always)]
    pub fn nft_edition(&mut self, nft_edition: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_edition = Some(nft_edition);
        self
    }
    #[inline(always)]
    pub fn owner_token_record(
        &mut self,
        owner_token_record: solana_program::pubkey::Pubkey,
    ) -> &mut Self {
        self.owner_token_record = Some(owner_token_record);
        self
    }
    #[inline(always)]
    pub fn dest_token_record(
        &mut self,
        dest_token_record: solana_program::pubkey::Pubkey,
    ) -> &mut Self {
        self.dest_token_record = Some(dest_token_record);
        self
    }
    #[inline(always)]
    pub fn associated_token_program(
        &mut self,
        associated_token_program: solana_program::pubkey::Pubkey,
    ) -> &mut Self {
        self.associated_token_program = Some(associated_token_program);
        self
    }
    #[inline(always)]
    pub fn pnft_shared(&mut self, pnft_shared: solana_program::pubkey::Pubkey) -> &mut Self {
        self.pnft_shared = Some(pnft_shared);
        self
    }
    #[inline(always)]
    pub fn auth_rules(&mut self, auth_rules: solana_program::pubkey::Pubkey) -> &mut Self {
        self.auth_rules = Some(auth_rules);
        self
    }
    #[inline(always)]
    pub fn payer(&mut self, payer: solana_program::pubkey::Pubkey) -> &mut Self {
        self.payer = Some(payer);
        self
    }
    #[inline(always)]
    pub fn price(&mut self, price: u64) -> &mut Self {
        self.price = Some(price);
        self
    }
    /// `[optional argument]`
    #[inline(always)]
    pub fn authorization_data(&mut self, authorization_data: AuthorizationDataLocal) -> &mut Self {
        self.authorization_data = Some(authorization_data);
        self
    }
    #[inline(always)]
    pub fn rules_acc_present(&mut self, rules_acc_present: bool) -> &mut Self {
        self.rules_acc_present = Some(rules_acc_present);
        self
    }
    /// Add an aditional account to the instruction.
    #[inline(always)]
    pub fn add_remaining_account(
        &mut self,
        account: solana_program::instruction::AccountMeta,
    ) -> &mut Self {
        self.__remaining_accounts.push(account);
        self
    }
    /// Add additional accounts to the instruction.
    #[inline(always)]
    pub fn add_remaining_accounts(
        &mut self,
        accounts: &[solana_program::instruction::AccountMeta],
    ) -> &mut Self {
        self.__remaining_accounts.extend_from_slice(accounts);
        self
    }
    #[allow(clippy::clone_on_copy)]
    pub fn instruction(&self) -> solana_program::instruction::Instruction {
        let accounts = List {
            tswap: self.tswap.expect("tswap is not set"),
            nft_source: self.nft_source.expect("nft_source is not set"),
            nft_mint: self.nft_mint.expect("nft_mint is not set"),
            nft_escrow: self.nft_escrow.expect("nft_escrow is not set"),
            single_listing: self.single_listing.expect("single_listing is not set"),
            owner: self.owner.expect("owner is not set"),
            token_program: self.token_program.unwrap_or(solana_program::pubkey!(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            )),
            system_program: self
                .system_program
                .unwrap_or(solana_program::pubkey!("11111111111111111111111111111111")),
            rent: self.rent.unwrap_or(solana_program::pubkey!(
                "SysvarRent111111111111111111111111111111111"
            )),
            nft_metadata: self.nft_metadata.expect("nft_metadata is not set"),
            nft_edition: self.nft_edition.expect("nft_edition is not set"),
            owner_token_record: self
                .owner_token_record
                .expect("owner_token_record is not set"),
            dest_token_record: self
                .dest_token_record
                .expect("dest_token_record is not set"),
            associated_token_program: self
                .associated_token_program
                .expect("associated_token_program is not set"),
            pnft_shared: self.pnft_shared.expect("pnft_shared is not set"),
            auth_rules: self.auth_rules.expect("auth_rules is not set"),
            payer: self.payer.expect("payer is not set"),
        };
        let args = ListInstructionArgs {
            price: self.price.clone().expect("price is not set"),
            authorization_data: self.authorization_data.clone(),
            rules_acc_present: self
                .rules_acc_present
                .clone()
                .expect("rules_acc_present is not set"),
        };

        accounts.instruction_with_remaining_accounts(args, &self.__remaining_accounts)
    }
}

/// `list` CPI accounts.
pub struct ListCpiAccounts<'a, 'b> {
    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_source: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,
    /// Implicitly checked via transfer. Will fail if wrong account
    pub nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub single_listing: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub rent: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_metadata: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_edition: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub dest_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub pnft_shared: &'b solana_program::account_info::AccountInfo<'a>,

    pub auth_rules: &'b solana_program::account_info::AccountInfo<'a>,

    pub payer: &'b solana_program::account_info::AccountInfo<'a>,
}

/// `list` CPI instruction.
pub struct ListCpi<'a, 'b> {
    /// The program to invoke.
    pub __program: &'b solana_program::account_info::AccountInfo<'a>,

    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_source: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,
    /// Implicitly checked via transfer. Will fail if wrong account
    pub nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub single_listing: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub rent: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_metadata: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_edition: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub dest_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub pnft_shared: &'b solana_program::account_info::AccountInfo<'a>,

    pub auth_rules: &'b solana_program::account_info::AccountInfo<'a>,

    pub payer: &'b solana_program::account_info::AccountInfo<'a>,
    /// The arguments for the instruction.
    pub __args: ListInstructionArgs,
}

impl<'a, 'b> ListCpi<'a, 'b> {
    pub fn new(
        program: &'b solana_program::account_info::AccountInfo<'a>,
        accounts: ListCpiAccounts<'a, 'b>,
        args: ListInstructionArgs,
    ) -> Self {
        Self {
            __program: program,
            tswap: accounts.tswap,
            nft_source: accounts.nft_source,
            nft_mint: accounts.nft_mint,
            nft_escrow: accounts.nft_escrow,
            single_listing: accounts.single_listing,
            owner: accounts.owner,
            token_program: accounts.token_program,
            system_program: accounts.system_program,
            rent: accounts.rent,
            nft_metadata: accounts.nft_metadata,
            nft_edition: accounts.nft_edition,
            owner_token_record: accounts.owner_token_record,
            dest_token_record: accounts.dest_token_record,
            associated_token_program: accounts.associated_token_program,
            pnft_shared: accounts.pnft_shared,
            auth_rules: accounts.auth_rules,
            payer: accounts.payer,
            __args: args,
        }
    }
    #[inline(always)]
    pub fn invoke(&self) -> solana_program::entrypoint::ProgramResult {
        self.invoke_signed_with_remaining_accounts(&[], &[])
    }
    #[inline(always)]
    pub fn invoke_with_remaining_accounts(
        &self,
        remaining_accounts: &[(
            &'b solana_program::account_info::AccountInfo<'a>,
            bool,
            bool,
        )],
    ) -> solana_program::entrypoint::ProgramResult {
        self.invoke_signed_with_remaining_accounts(&[], remaining_accounts)
    }
    #[inline(always)]
    pub fn invoke_signed(
        &self,
        signers_seeds: &[&[&[u8]]],
    ) -> solana_program::entrypoint::ProgramResult {
        self.invoke_signed_with_remaining_accounts(signers_seeds, &[])
    }
    #[allow(clippy::clone_on_copy)]
    #[allow(clippy::vec_init_then_push)]
    pub fn invoke_signed_with_remaining_accounts(
        &self,
        signers_seeds: &[&[&[u8]]],
        remaining_accounts: &[(
            &'b solana_program::account_info::AccountInfo<'a>,
            bool,
            bool,
        )],
    ) -> solana_program::entrypoint::ProgramResult {
        let mut accounts = Vec::with_capacity(17 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.tswap.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.nft_source.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.nft_mint.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.nft_escrow.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.single_listing.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.owner.key,
            true,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.token_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.system_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.rent.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.nft_metadata.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.nft_edition.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.owner_token_record.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.dest_token_record.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.associated_token_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.pnft_shared.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.auth_rules.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.payer.key,
            true,
        ));
        remaining_accounts.iter().for_each(|remaining_account| {
            accounts.push(solana_program::instruction::AccountMeta {
                pubkey: *remaining_account.0.key,
                is_signer: remaining_account.1,
                is_writable: remaining_account.2,
            })
        });
        let mut data = ListInstructionData::new().try_to_vec().unwrap();
        let mut args = self.__args.try_to_vec().unwrap();
        data.append(&mut args);

        let instruction = solana_program::instruction::Instruction {
            program_id: crate::TENSOR_MARGIN_ID,
            accounts,
            data,
        };
        let mut account_infos = Vec::with_capacity(17 + 1 + remaining_accounts.len());
        account_infos.push(self.__program.clone());
        account_infos.push(self.tswap.clone());
        account_infos.push(self.nft_source.clone());
        account_infos.push(self.nft_mint.clone());
        account_infos.push(self.nft_escrow.clone());
        account_infos.push(self.single_listing.clone());
        account_infos.push(self.owner.clone());
        account_infos.push(self.token_program.clone());
        account_infos.push(self.system_program.clone());
        account_infos.push(self.rent.clone());
        account_infos.push(self.nft_metadata.clone());
        account_infos.push(self.nft_edition.clone());
        account_infos.push(self.owner_token_record.clone());
        account_infos.push(self.dest_token_record.clone());
        account_infos.push(self.associated_token_program.clone());
        account_infos.push(self.pnft_shared.clone());
        account_infos.push(self.auth_rules.clone());
        account_infos.push(self.payer.clone());
        remaining_accounts
            .iter()
            .for_each(|remaining_account| account_infos.push(remaining_account.0.clone()));

        if signers_seeds.is_empty() {
            solana_program::program::invoke(&instruction, &account_infos)
        } else {
            solana_program::program::invoke_signed(&instruction, &account_infos, signers_seeds)
        }
    }
}

/// Instruction builder for `List` via CPI.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` nft_source
///   2. `[]` nft_mint
///   3. `[writable]` nft_escrow
///   4. `[writable]` single_listing
///   5. `[writable, signer]` owner
///   6. `[]` token_program
///   7. `[]` system_program
///   8. `[]` rent
///   9. `[writable]` nft_metadata
///   10. `[]` nft_edition
///   11. `[writable]` owner_token_record
///   12. `[writable]` dest_token_record
///   13. `[]` associated_token_program
///   14. `[]` pnft_shared
///   15. `[]` auth_rules
///   16. `[writable, signer]` payer
pub struct ListCpiBuilder<'a, 'b> {
    instruction: Box<ListCpiBuilderInstruction<'a, 'b>>,
}

impl<'a, 'b> ListCpiBuilder<'a, 'b> {
    pub fn new(program: &'b solana_program::account_info::AccountInfo<'a>) -> Self {
        let instruction = Box::new(ListCpiBuilderInstruction {
            __program: program,
            tswap: None,
            nft_source: None,
            nft_mint: None,
            nft_escrow: None,
            single_listing: None,
            owner: None,
            token_program: None,
            system_program: None,
            rent: None,
            nft_metadata: None,
            nft_edition: None,
            owner_token_record: None,
            dest_token_record: None,
            associated_token_program: None,
            pnft_shared: None,
            auth_rules: None,
            payer: None,
            price: None,
            authorization_data: None,
            rules_acc_present: None,
            __remaining_accounts: Vec::new(),
        });
        Self { instruction }
    }
    #[inline(always)]
    pub fn tswap(&mut self, tswap: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.tswap = Some(tswap);
        self
    }
    #[inline(always)]
    pub fn nft_source(
        &mut self,
        nft_source: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_source = Some(nft_source);
        self
    }
    #[inline(always)]
    pub fn nft_mint(
        &mut self,
        nft_mint: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_mint = Some(nft_mint);
        self
    }
    /// Implicitly checked via transfer. Will fail if wrong account
    #[inline(always)]
    pub fn nft_escrow(
        &mut self,
        nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_escrow = Some(nft_escrow);
        self
    }
    #[inline(always)]
    pub fn single_listing(
        &mut self,
        single_listing: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.single_listing = Some(single_listing);
        self
    }
    #[inline(always)]
    pub fn owner(&mut self, owner: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.owner = Some(owner);
        self
    }
    #[inline(always)]
    pub fn token_program(
        &mut self,
        token_program: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.token_program = Some(token_program);
        self
    }
    #[inline(always)]
    pub fn system_program(
        &mut self,
        system_program: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.system_program = Some(system_program);
        self
    }
    #[inline(always)]
    pub fn rent(&mut self, rent: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.rent = Some(rent);
        self
    }
    #[inline(always)]
    pub fn nft_metadata(
        &mut self,
        nft_metadata: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_metadata = Some(nft_metadata);
        self
    }
    #[inline(always)]
    pub fn nft_edition(
        &mut self,
        nft_edition: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_edition = Some(nft_edition);
        self
    }
    #[inline(always)]
    pub fn owner_token_record(
        &mut self,
        owner_token_record: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.owner_token_record = Some(owner_token_record);
        self
    }
    #[inline(always)]
    pub fn dest_token_record(
        &mut self,
        dest_token_record: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.dest_token_record = Some(dest_token_record);
        self
    }
    #[inline(always)]
    pub fn associated_token_program(
        &mut self,
        associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.associated_token_program = Some(associated_token_program);
        self
    }
    #[inline(always)]
    pub fn pnft_shared(
        &mut self,
        pnft_shared: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.pnft_shared = Some(pnft_shared);
        self
    }
    #[inline(always)]
    pub fn auth_rules(
        &mut self,
        auth_rules: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.auth_rules = Some(auth_rules);
        self
    }
    #[inline(always)]
    pub fn payer(&mut self, payer: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.payer = Some(payer);
        self
    }
    #[inline(always)]
    pub fn price(&mut self, price: u64) -> &mut Self {
        self.instruction.price = Some(price);
        self
    }
    /// `[optional argument]`
    #[inline(always)]
    pub fn authorization_data(&mut self, authorization_data: AuthorizationDataLocal) -> &mut Self {
        self.instruction.authorization_data = Some(authorization_data);
        self
    }
    #[inline(always)]
    pub fn rules_acc_present(&mut self, rules_acc_present: bool) -> &mut Self {
        self.instruction.rules_acc_present = Some(rules_acc_present);
        self
    }
    /// Add an additional account to the instruction.
    #[inline(always)]
    pub fn add_remaining_account(
        &mut self,
        account: &'b solana_program::account_info::AccountInfo<'a>,
        is_writable: bool,
        is_signer: bool,
    ) -> &mut Self {
        self.instruction
            .__remaining_accounts
            .push((account, is_writable, is_signer));
        self
    }
    /// Add additional accounts to the instruction.
    ///
    /// Each account is represented by a tuple of the `AccountInfo`, a `bool` indicating whether the account is writable or not,
    /// and a `bool` indicating whether the account is a signer or not.
    #[inline(always)]
    pub fn add_remaining_accounts(
        &mut self,
        accounts: &[(
            &'b solana_program::account_info::AccountInfo<'a>,
            bool,
            bool,
        )],
    ) -> &mut Self {
        self.instruction
            .__remaining_accounts
            .extend_from_slice(accounts);
        self
    }
    #[inline(always)]
    pub fn invoke(&self) -> solana_program::entrypoint::ProgramResult {
        self.invoke_signed(&[])
    }
    #[allow(clippy::clone_on_copy)]
    #[allow(clippy::vec_init_then_push)]
    pub fn invoke_signed(
        &self,
        signers_seeds: &[&[&[u8]]],
    ) -> solana_program::entrypoint::ProgramResult {
        let args = ListInstructionArgs {
            price: self.instruction.price.clone().expect("price is not set"),
            authorization_data: self.instruction.authorization_data.clone(),
            rules_acc_present: self
                .instruction
                .rules_acc_present
                .clone()
                .expect("rules_acc_present is not set"),
        };
        let instruction = ListCpi {
            __program: self.instruction.__program,

            tswap: self.instruction.tswap.expect("tswap is not set"),

            nft_source: self.instruction.nft_source.expect("nft_source is not set"),

            nft_mint: self.instruction.nft_mint.expect("nft_mint is not set"),

            nft_escrow: self.instruction.nft_escrow.expect("nft_escrow is not set"),

            single_listing: self
                .instruction
                .single_listing
                .expect("single_listing is not set"),

            owner: self.instruction.owner.expect("owner is not set"),

            token_program: self
                .instruction
                .token_program
                .expect("token_program is not set"),

            system_program: self
                .instruction
                .system_program
                .expect("system_program is not set"),

            rent: self.instruction.rent.expect("rent is not set"),

            nft_metadata: self
                .instruction
                .nft_metadata
                .expect("nft_metadata is not set"),

            nft_edition: self
                .instruction
                .nft_edition
                .expect("nft_edition is not set"),

            owner_token_record: self
                .instruction
                .owner_token_record
                .expect("owner_token_record is not set"),

            dest_token_record: self
                .instruction
                .dest_token_record
                .expect("dest_token_record is not set"),

            associated_token_program: self
                .instruction
                .associated_token_program
                .expect("associated_token_program is not set"),

            pnft_shared: self
                .instruction
                .pnft_shared
                .expect("pnft_shared is not set"),

            auth_rules: self.instruction.auth_rules.expect("auth_rules is not set"),

            payer: self.instruction.payer.expect("payer is not set"),
            __args: args,
        };
        instruction.invoke_signed_with_remaining_accounts(
            signers_seeds,
            &self.instruction.__remaining_accounts,
        )
    }
}

struct ListCpiBuilderInstruction<'a, 'b> {
    __program: &'b solana_program::account_info::AccountInfo<'a>,
    tswap: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_source: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_mint: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_escrow: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    single_listing: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    system_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    rent: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_metadata: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_edition: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner_token_record: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    dest_token_record: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    associated_token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    pnft_shared: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    auth_rules: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    payer: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    price: Option<u64>,
    authorization_data: Option<AuthorizationDataLocal>,
    rules_acc_present: Option<bool>,
    /// Additional instruction accounts `(AccountInfo, is_writable, is_signer)`.
    __remaining_accounts: Vec<(
        &'b solana_program::account_info::AccountInfo<'a>,
        bool,
        bool,
    )>,
}

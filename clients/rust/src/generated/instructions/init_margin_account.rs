//! This code was AUTOGENERATED using the kinobi library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun kinobi to update it.
//!
//! [https://github.com/metaplex-foundation/kinobi]
//!

use borsh::BorshDeserialize;
use borsh::BorshSerialize;

/// Accounts.
pub struct InitMarginAccount {
    pub tswap: solana_program::pubkey::Pubkey,

    pub margin_account: solana_program::pubkey::Pubkey,

    pub owner: solana_program::pubkey::Pubkey,

    pub system_program: solana_program::pubkey::Pubkey,
}

impl InitMarginAccount {
    pub fn instruction(
        &self,
        args: InitMarginAccountInstructionArgs,
    ) -> solana_program::instruction::Instruction {
        self.instruction_with_remaining_accounts(args, &[])
    }
    #[allow(clippy::vec_init_then_push)]
    pub fn instruction_with_remaining_accounts(
        &self,
        args: InitMarginAccountInstructionArgs,
        remaining_accounts: &[solana_program::instruction::AccountMeta],
    ) -> solana_program::instruction::Instruction {
        let mut accounts = Vec::with_capacity(4 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.tswap, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.margin_account,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.owner, true,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.system_program,
            false,
        ));
        accounts.extend_from_slice(remaining_accounts);
        let mut data = InitMarginAccountInstructionData::new()
            .try_to_vec()
            .unwrap();
        let mut args = args.try_to_vec().unwrap();
        data.append(&mut args);

        solana_program::instruction::Instruction {
            program_id: crate::TENSOR_ESCROW_ID,
            accounts,
            data,
        }
    }
}

#[derive(BorshDeserialize, BorshSerialize)]
pub struct InitMarginAccountInstructionData {
    discriminator: [u8; 8],
}

impl InitMarginAccountInstructionData {
    pub fn new() -> Self {
        Self {
            discriminator: [10, 54, 68, 252, 130, 97, 39, 52],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct InitMarginAccountInstructionArgs {
    pub margin_nr: u16,
    pub name: [u8; 32],
}

/// Instruction builder for `InitMarginAccount`.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` margin_account
///   2. `[writable, signer]` owner
///   3. `[optional]` system_program (default to `11111111111111111111111111111111`)
#[derive(Default)]
pub struct InitMarginAccountBuilder {
    tswap: Option<solana_program::pubkey::Pubkey>,
    margin_account: Option<solana_program::pubkey::Pubkey>,
    owner: Option<solana_program::pubkey::Pubkey>,
    system_program: Option<solana_program::pubkey::Pubkey>,
    margin_nr: Option<u16>,
    name: Option<[u8; 32]>,
    __remaining_accounts: Vec<solana_program::instruction::AccountMeta>,
}

impl InitMarginAccountBuilder {
    pub fn new() -> Self {
        Self::default()
    }
    #[inline(always)]
    pub fn tswap(&mut self, tswap: solana_program::pubkey::Pubkey) -> &mut Self {
        self.tswap = Some(tswap);
        self
    }
    #[inline(always)]
    pub fn margin_account(&mut self, margin_account: solana_program::pubkey::Pubkey) -> &mut Self {
        self.margin_account = Some(margin_account);
        self
    }
    #[inline(always)]
    pub fn owner(&mut self, owner: solana_program::pubkey::Pubkey) -> &mut Self {
        self.owner = Some(owner);
        self
    }
    /// `[optional account, default to '11111111111111111111111111111111']`
    #[inline(always)]
    pub fn system_program(&mut self, system_program: solana_program::pubkey::Pubkey) -> &mut Self {
        self.system_program = Some(system_program);
        self
    }
    /// `[optional argument, defaults to '0']`
    #[inline(always)]
    pub fn margin_nr(&mut self, margin_nr: u16) -> &mut Self {
        self.margin_nr = Some(margin_nr);
        self
    }
    #[inline(always)]
    pub fn name(&mut self, name: [u8; 32]) -> &mut Self {
        self.name = Some(name);
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
        let accounts = InitMarginAccount {
            tswap: self.tswap.expect("tswap is not set"),
            margin_account: self.margin_account.expect("margin_account is not set"),
            owner: self.owner.expect("owner is not set"),
            system_program: self
                .system_program
                .unwrap_or(solana_program::pubkey!("11111111111111111111111111111111")),
        };
        let args = InitMarginAccountInstructionArgs {
            margin_nr: self.margin_nr.clone().unwrap_or(0),
            name: self.name.clone().expect("name is not set"),
        };

        accounts.instruction_with_remaining_accounts(args, &self.__remaining_accounts)
    }
}

/// `init_margin_account` CPI accounts.
pub struct InitMarginAccountCpiAccounts<'a, 'b> {
    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub margin_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,
}

/// `init_margin_account` CPI instruction.
pub struct InitMarginAccountCpi<'a, 'b> {
    /// The program to invoke.
    pub __program: &'b solana_program::account_info::AccountInfo<'a>,

    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub margin_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,
    /// The arguments for the instruction.
    pub __args: InitMarginAccountInstructionArgs,
}

impl<'a, 'b> InitMarginAccountCpi<'a, 'b> {
    pub fn new(
        program: &'b solana_program::account_info::AccountInfo<'a>,
        accounts: InitMarginAccountCpiAccounts<'a, 'b>,
        args: InitMarginAccountInstructionArgs,
    ) -> Self {
        Self {
            __program: program,
            tswap: accounts.tswap,
            margin_account: accounts.margin_account,
            owner: accounts.owner,
            system_program: accounts.system_program,
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
        let mut accounts = Vec::with_capacity(4 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.tswap.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.margin_account.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.owner.key,
            true,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.system_program.key,
            false,
        ));
        remaining_accounts.iter().for_each(|remaining_account| {
            accounts.push(solana_program::instruction::AccountMeta {
                pubkey: *remaining_account.0.key,
                is_signer: remaining_account.1,
                is_writable: remaining_account.2,
            })
        });
        let mut data = InitMarginAccountInstructionData::new()
            .try_to_vec()
            .unwrap();
        let mut args = self.__args.try_to_vec().unwrap();
        data.append(&mut args);

        let instruction = solana_program::instruction::Instruction {
            program_id: crate::TENSOR_ESCROW_ID,
            accounts,
            data,
        };
        let mut account_infos = Vec::with_capacity(4 + 1 + remaining_accounts.len());
        account_infos.push(self.__program.clone());
        account_infos.push(self.tswap.clone());
        account_infos.push(self.margin_account.clone());
        account_infos.push(self.owner.clone());
        account_infos.push(self.system_program.clone());
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

/// Instruction builder for `InitMarginAccount` via CPI.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` margin_account
///   2. `[writable, signer]` owner
///   3. `[]` system_program
pub struct InitMarginAccountCpiBuilder<'a, 'b> {
    instruction: Box<InitMarginAccountCpiBuilderInstruction<'a, 'b>>,
}

impl<'a, 'b> InitMarginAccountCpiBuilder<'a, 'b> {
    pub fn new(program: &'b solana_program::account_info::AccountInfo<'a>) -> Self {
        let instruction = Box::new(InitMarginAccountCpiBuilderInstruction {
            __program: program,
            tswap: None,
            margin_account: None,
            owner: None,
            system_program: None,
            margin_nr: None,
            name: None,
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
    pub fn margin_account(
        &mut self,
        margin_account: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.margin_account = Some(margin_account);
        self
    }
    #[inline(always)]
    pub fn owner(&mut self, owner: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.owner = Some(owner);
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
    /// `[optional argument, defaults to '0']`
    #[inline(always)]
    pub fn margin_nr(&mut self, margin_nr: u16) -> &mut Self {
        self.instruction.margin_nr = Some(margin_nr);
        self
    }
    #[inline(always)]
    pub fn name(&mut self, name: [u8; 32]) -> &mut Self {
        self.instruction.name = Some(name);
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
        let args = InitMarginAccountInstructionArgs {
            margin_nr: self.instruction.margin_nr.clone().unwrap_or(0),
            name: self.instruction.name.clone().expect("name is not set"),
        };
        let instruction = InitMarginAccountCpi {
            __program: self.instruction.__program,

            tswap: self.instruction.tswap.expect("tswap is not set"),

            margin_account: self
                .instruction
                .margin_account
                .expect("margin_account is not set"),

            owner: self.instruction.owner.expect("owner is not set"),

            system_program: self
                .instruction
                .system_program
                .expect("system_program is not set"),
            __args: args,
        };
        instruction.invoke_signed_with_remaining_accounts(
            signers_seeds,
            &self.instruction.__remaining_accounts,
        )
    }
}

struct InitMarginAccountCpiBuilderInstruction<'a, 'b> {
    __program: &'b solana_program::account_info::AccountInfo<'a>,
    tswap: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    margin_account: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    system_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    margin_nr: Option<u16>,
    name: Option<[u8; 32]>,
    /// Additional instruction accounts `(AccountInfo, is_writable, is_signer)`.
    __remaining_accounts: Vec<(
        &'b solana_program::account_info::AccountInfo<'a>,
        bool,
        bool,
    )>,
}

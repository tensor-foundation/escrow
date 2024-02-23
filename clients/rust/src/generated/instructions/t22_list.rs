//! This code was AUTOGENERATED using the kinobi library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun kinobi to update it.
//!
//! [https://github.com/metaplex-foundation/kinobi]
//!

use borsh::BorshDeserialize;
use borsh::BorshSerialize;

/// Accounts.
pub struct T22List {
    pub tswap: solana_program::pubkey::Pubkey,

    pub nft_source: solana_program::pubkey::Pubkey,

    pub nft_mint: solana_program::pubkey::Pubkey,

    pub nft_escrow: solana_program::pubkey::Pubkey,

    pub single_listing: solana_program::pubkey::Pubkey,

    pub owner: solana_program::pubkey::Pubkey,

    pub token_program: solana_program::pubkey::Pubkey,

    pub system_program: solana_program::pubkey::Pubkey,

    pub payer: solana_program::pubkey::Pubkey,
}

impl T22List {
    pub fn instruction(
        &self,
        args: T22ListInstructionArgs,
    ) -> solana_program::instruction::Instruction {
        self.instruction_with_remaining_accounts(args, &[])
    }
    #[allow(clippy::vec_init_then_push)]
    pub fn instruction_with_remaining_accounts(
        &self,
        args: T22ListInstructionArgs,
        remaining_accounts: &[solana_program::instruction::AccountMeta],
    ) -> solana_program::instruction::Instruction {
        let mut accounts = Vec::with_capacity(9 + remaining_accounts.len());
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
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.payer, true,
        ));
        accounts.extend_from_slice(remaining_accounts);
        let mut data = T22ListInstructionData::new().try_to_vec().unwrap();
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
struct T22ListInstructionData {
    discriminator: [u8; 8],
}

impl T22ListInstructionData {
    fn new() -> Self {
        Self {
            discriminator: [9, 117, 93, 230, 221, 4, 199, 212],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct T22ListInstructionArgs {
    pub price: u64,
}

/// Instruction builder for `T22List`.
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
///   8. `[writable, signer]` payer
#[derive(Default)]
pub struct T22ListBuilder {
    tswap: Option<solana_program::pubkey::Pubkey>,
    nft_source: Option<solana_program::pubkey::Pubkey>,
    nft_mint: Option<solana_program::pubkey::Pubkey>,
    nft_escrow: Option<solana_program::pubkey::Pubkey>,
    single_listing: Option<solana_program::pubkey::Pubkey>,
    owner: Option<solana_program::pubkey::Pubkey>,
    token_program: Option<solana_program::pubkey::Pubkey>,
    system_program: Option<solana_program::pubkey::Pubkey>,
    payer: Option<solana_program::pubkey::Pubkey>,
    price: Option<u64>,
    __remaining_accounts: Vec<solana_program::instruction::AccountMeta>,
}

impl T22ListBuilder {
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
        let accounts = T22List {
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
            payer: self.payer.expect("payer is not set"),
        };
        let args = T22ListInstructionArgs {
            price: self.price.clone().expect("price is not set"),
        };

        accounts.instruction_with_remaining_accounts(args, &self.__remaining_accounts)
    }
}

/// `t22_list` CPI accounts.
pub struct T22ListCpiAccounts<'a, 'b> {
    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_source: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub single_listing: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub payer: &'b solana_program::account_info::AccountInfo<'a>,
}

/// `t22_list` CPI instruction.
pub struct T22ListCpi<'a, 'b> {
    /// The program to invoke.
    pub __program: &'b solana_program::account_info::AccountInfo<'a>,

    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_source: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub single_listing: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub payer: &'b solana_program::account_info::AccountInfo<'a>,
    /// The arguments for the instruction.
    pub __args: T22ListInstructionArgs,
}

impl<'a, 'b> T22ListCpi<'a, 'b> {
    pub fn new(
        program: &'b solana_program::account_info::AccountInfo<'a>,
        accounts: T22ListCpiAccounts<'a, 'b>,
        args: T22ListInstructionArgs,
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
        let mut accounts = Vec::with_capacity(9 + remaining_accounts.len());
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
        let mut data = T22ListInstructionData::new().try_to_vec().unwrap();
        let mut args = self.__args.try_to_vec().unwrap();
        data.append(&mut args);

        let instruction = solana_program::instruction::Instruction {
            program_id: crate::TENSOR_MARGIN_ID,
            accounts,
            data,
        };
        let mut account_infos = Vec::with_capacity(9 + 1 + remaining_accounts.len());
        account_infos.push(self.__program.clone());
        account_infos.push(self.tswap.clone());
        account_infos.push(self.nft_source.clone());
        account_infos.push(self.nft_mint.clone());
        account_infos.push(self.nft_escrow.clone());
        account_infos.push(self.single_listing.clone());
        account_infos.push(self.owner.clone());
        account_infos.push(self.token_program.clone());
        account_infos.push(self.system_program.clone());
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

/// Instruction builder for `T22List` via CPI.
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
///   8. `[writable, signer]` payer
pub struct T22ListCpiBuilder<'a, 'b> {
    instruction: Box<T22ListCpiBuilderInstruction<'a, 'b>>,
}

impl<'a, 'b> T22ListCpiBuilder<'a, 'b> {
    pub fn new(program: &'b solana_program::account_info::AccountInfo<'a>) -> Self {
        let instruction = Box::new(T22ListCpiBuilderInstruction {
            __program: program,
            tswap: None,
            nft_source: None,
            nft_mint: None,
            nft_escrow: None,
            single_listing: None,
            owner: None,
            token_program: None,
            system_program: None,
            payer: None,
            price: None,
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
    pub fn payer(&mut self, payer: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.payer = Some(payer);
        self
    }
    #[inline(always)]
    pub fn price(&mut self, price: u64) -> &mut Self {
        self.instruction.price = Some(price);
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
        let args = T22ListInstructionArgs {
            price: self.instruction.price.clone().expect("price is not set"),
        };
        let instruction = T22ListCpi {
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

            payer: self.instruction.payer.expect("payer is not set"),
            __args: args,
        };
        instruction.invoke_signed_with_remaining_accounts(
            signers_seeds,
            &self.instruction.__remaining_accounts,
        )
    }
}

struct T22ListCpiBuilderInstruction<'a, 'b> {
    __program: &'b solana_program::account_info::AccountInfo<'a>,
    tswap: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_source: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_mint: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_escrow: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    single_listing: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    system_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    payer: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    price: Option<u64>,
    /// Additional instruction accounts `(AccountInfo, is_writable, is_signer)`.
    __remaining_accounts: Vec<(
        &'b solana_program::account_info::AccountInfo<'a>,
        bool,
        bool,
    )>,
}

//! This code was AUTOGENERATED using the kinobi library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun kinobi to update it.
//!
//! [https://github.com/metaplex-foundation/kinobi]
//!

use crate::generated::types::PoolConfig;
use borsh::BorshDeserialize;
use borsh::BorshSerialize;

/// Accounts.
pub struct WnsSellNftTokenPool {
    pub shared: solana_program::pubkey::Pubkey,

    pub owner_ata_acc: solana_program::pubkey::Pubkey,

    pub token_program: solana_program::pubkey::Pubkey,

    pub associated_token_program: solana_program::pubkey::Pubkey,

    pub system_program: solana_program::pubkey::Pubkey,

    pub margin_account: solana_program::pubkey::Pubkey,

    pub taker_broker: solana_program::pubkey::Pubkey,

    pub approve_account: solana_program::pubkey::Pubkey,

    pub distribution: solana_program::pubkey::Pubkey,

    pub wns_program: solana_program::pubkey::Pubkey,

    pub distribution_program: solana_program::pubkey::Pubkey,

    pub extra_metas: solana_program::pubkey::Pubkey,
}

impl WnsSellNftTokenPool {
    pub fn instruction(
        &self,
        args: WnsSellNftTokenPoolInstructionArgs,
    ) -> solana_program::instruction::Instruction {
        self.instruction_with_remaining_accounts(args, &[])
    }
    #[allow(clippy::vec_init_then_push)]
    pub fn instruction_with_remaining_accounts(
        &self,
        args: WnsSellNftTokenPoolInstructionArgs,
        remaining_accounts: &[solana_program::instruction::AccountMeta],
    ) -> solana_program::instruction::Instruction {
        let mut accounts = Vec::with_capacity(12 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.shared,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.owner_ata_acc,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.token_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.associated_token_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.system_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.margin_account,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.taker_broker,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.approve_account,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.distribution,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.wns_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.distribution_program,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.extra_metas,
            false,
        ));
        accounts.extend_from_slice(remaining_accounts);
        let mut data = WnsSellNftTokenPoolInstructionData::new()
            .try_to_vec()
            .unwrap();
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
struct WnsSellNftTokenPoolInstructionData {
    discriminator: [u8; 8],
}

impl WnsSellNftTokenPoolInstructionData {
    fn new() -> Self {
        Self {
            discriminator: [40, 78, 241, 78, 204, 238, 46, 143],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct WnsSellNftTokenPoolInstructionArgs {
    pub config: PoolConfig,
    pub min_price: u64,
}

/// Instruction builder for `WnsSellNftTokenPool`.
///
/// ### Accounts:
///
///   0. `[]` shared
///   1. `[writable]` owner_ata_acc
///   2. `[optional]` token_program (default to `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
///   3. `[]` associated_token_program
///   4. `[optional]` system_program (default to `11111111111111111111111111111111`)
///   5. `[writable]` margin_account
///   6. `[writable]` taker_broker
///   7. `[writable]` approve_account
///   8. `[writable]` distribution
///   9. `[]` wns_program
///   10. `[]` distribution_program
///   11. `[]` extra_metas
#[derive(Default)]
pub struct WnsSellNftTokenPoolBuilder {
    shared: Option<solana_program::pubkey::Pubkey>,
    owner_ata_acc: Option<solana_program::pubkey::Pubkey>,
    token_program: Option<solana_program::pubkey::Pubkey>,
    associated_token_program: Option<solana_program::pubkey::Pubkey>,
    system_program: Option<solana_program::pubkey::Pubkey>,
    margin_account: Option<solana_program::pubkey::Pubkey>,
    taker_broker: Option<solana_program::pubkey::Pubkey>,
    approve_account: Option<solana_program::pubkey::Pubkey>,
    distribution: Option<solana_program::pubkey::Pubkey>,
    wns_program: Option<solana_program::pubkey::Pubkey>,
    distribution_program: Option<solana_program::pubkey::Pubkey>,
    extra_metas: Option<solana_program::pubkey::Pubkey>,
    config: Option<PoolConfig>,
    min_price: Option<u64>,
    __remaining_accounts: Vec<solana_program::instruction::AccountMeta>,
}

impl WnsSellNftTokenPoolBuilder {
    pub fn new() -> Self {
        Self::default()
    }
    #[inline(always)]
    pub fn shared(&mut self, shared: solana_program::pubkey::Pubkey) -> &mut Self {
        self.shared = Some(shared);
        self
    }
    #[inline(always)]
    pub fn owner_ata_acc(&mut self, owner_ata_acc: solana_program::pubkey::Pubkey) -> &mut Self {
        self.owner_ata_acc = Some(owner_ata_acc);
        self
    }
    /// `[optional account, default to 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA']`
    #[inline(always)]
    pub fn token_program(&mut self, token_program: solana_program::pubkey::Pubkey) -> &mut Self {
        self.token_program = Some(token_program);
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
    /// `[optional account, default to '11111111111111111111111111111111']`
    #[inline(always)]
    pub fn system_program(&mut self, system_program: solana_program::pubkey::Pubkey) -> &mut Self {
        self.system_program = Some(system_program);
        self
    }
    #[inline(always)]
    pub fn margin_account(&mut self, margin_account: solana_program::pubkey::Pubkey) -> &mut Self {
        self.margin_account = Some(margin_account);
        self
    }
    #[inline(always)]
    pub fn taker_broker(&mut self, taker_broker: solana_program::pubkey::Pubkey) -> &mut Self {
        self.taker_broker = Some(taker_broker);
        self
    }
    #[inline(always)]
    pub fn approve_account(
        &mut self,
        approve_account: solana_program::pubkey::Pubkey,
    ) -> &mut Self {
        self.approve_account = Some(approve_account);
        self
    }
    #[inline(always)]
    pub fn distribution(&mut self, distribution: solana_program::pubkey::Pubkey) -> &mut Self {
        self.distribution = Some(distribution);
        self
    }
    #[inline(always)]
    pub fn wns_program(&mut self, wns_program: solana_program::pubkey::Pubkey) -> &mut Self {
        self.wns_program = Some(wns_program);
        self
    }
    #[inline(always)]
    pub fn distribution_program(
        &mut self,
        distribution_program: solana_program::pubkey::Pubkey,
    ) -> &mut Self {
        self.distribution_program = Some(distribution_program);
        self
    }
    #[inline(always)]
    pub fn extra_metas(&mut self, extra_metas: solana_program::pubkey::Pubkey) -> &mut Self {
        self.extra_metas = Some(extra_metas);
        self
    }
    #[inline(always)]
    pub fn config(&mut self, config: PoolConfig) -> &mut Self {
        self.config = Some(config);
        self
    }
    #[inline(always)]
    pub fn min_price(&mut self, min_price: u64) -> &mut Self {
        self.min_price = Some(min_price);
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
        let accounts = WnsSellNftTokenPool {
            shared: self.shared.expect("shared is not set"),
            owner_ata_acc: self.owner_ata_acc.expect("owner_ata_acc is not set"),
            token_program: self.token_program.unwrap_or(solana_program::pubkey!(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            )),
            associated_token_program: self
                .associated_token_program
                .expect("associated_token_program is not set"),
            system_program: self
                .system_program
                .unwrap_or(solana_program::pubkey!("11111111111111111111111111111111")),
            margin_account: self.margin_account.expect("margin_account is not set"),
            taker_broker: self.taker_broker.expect("taker_broker is not set"),
            approve_account: self.approve_account.expect("approve_account is not set"),
            distribution: self.distribution.expect("distribution is not set"),
            wns_program: self.wns_program.expect("wns_program is not set"),
            distribution_program: self
                .distribution_program
                .expect("distribution_program is not set"),
            extra_metas: self.extra_metas.expect("extra_metas is not set"),
        };
        let args = WnsSellNftTokenPoolInstructionArgs {
            config: self.config.clone().expect("config is not set"),
            min_price: self.min_price.clone().expect("min_price is not set"),
        };

        accounts.instruction_with_remaining_accounts(args, &self.__remaining_accounts)
    }
}

/// `wns_sell_nft_token_pool` CPI accounts.
pub struct WnsSellNftTokenPoolCpiAccounts<'a, 'b> {
    pub shared: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_ata_acc: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub margin_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub taker_broker: &'b solana_program::account_info::AccountInfo<'a>,

    pub approve_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub distribution: &'b solana_program::account_info::AccountInfo<'a>,

    pub wns_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub distribution_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub extra_metas: &'b solana_program::account_info::AccountInfo<'a>,
}

/// `wns_sell_nft_token_pool` CPI instruction.
pub struct WnsSellNftTokenPoolCpi<'a, 'b> {
    /// The program to invoke.
    pub __program: &'b solana_program::account_info::AccountInfo<'a>,

    pub shared: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_ata_acc: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub margin_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub taker_broker: &'b solana_program::account_info::AccountInfo<'a>,

    pub approve_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub distribution: &'b solana_program::account_info::AccountInfo<'a>,

    pub wns_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub distribution_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub extra_metas: &'b solana_program::account_info::AccountInfo<'a>,
    /// The arguments for the instruction.
    pub __args: WnsSellNftTokenPoolInstructionArgs,
}

impl<'a, 'b> WnsSellNftTokenPoolCpi<'a, 'b> {
    pub fn new(
        program: &'b solana_program::account_info::AccountInfo<'a>,
        accounts: WnsSellNftTokenPoolCpiAccounts<'a, 'b>,
        args: WnsSellNftTokenPoolInstructionArgs,
    ) -> Self {
        Self {
            __program: program,
            shared: accounts.shared,
            owner_ata_acc: accounts.owner_ata_acc,
            token_program: accounts.token_program,
            associated_token_program: accounts.associated_token_program,
            system_program: accounts.system_program,
            margin_account: accounts.margin_account,
            taker_broker: accounts.taker_broker,
            approve_account: accounts.approve_account,
            distribution: accounts.distribution,
            wns_program: accounts.wns_program,
            distribution_program: accounts.distribution_program,
            extra_metas: accounts.extra_metas,
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
        let mut accounts = Vec::with_capacity(12 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.shared.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.owner_ata_acc.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.token_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.associated_token_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.system_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.margin_account.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.taker_broker.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.approve_account.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.distribution.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.wns_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.distribution_program.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.extra_metas.key,
            false,
        ));
        remaining_accounts.iter().for_each(|remaining_account| {
            accounts.push(solana_program::instruction::AccountMeta {
                pubkey: *remaining_account.0.key,
                is_signer: remaining_account.1,
                is_writable: remaining_account.2,
            })
        });
        let mut data = WnsSellNftTokenPoolInstructionData::new()
            .try_to_vec()
            .unwrap();
        let mut args = self.__args.try_to_vec().unwrap();
        data.append(&mut args);

        let instruction = solana_program::instruction::Instruction {
            program_id: crate::TENSOR_MARGIN_ID,
            accounts,
            data,
        };
        let mut account_infos = Vec::with_capacity(12 + 1 + remaining_accounts.len());
        account_infos.push(self.__program.clone());
        account_infos.push(self.shared.clone());
        account_infos.push(self.owner_ata_acc.clone());
        account_infos.push(self.token_program.clone());
        account_infos.push(self.associated_token_program.clone());
        account_infos.push(self.system_program.clone());
        account_infos.push(self.margin_account.clone());
        account_infos.push(self.taker_broker.clone());
        account_infos.push(self.approve_account.clone());
        account_infos.push(self.distribution.clone());
        account_infos.push(self.wns_program.clone());
        account_infos.push(self.distribution_program.clone());
        account_infos.push(self.extra_metas.clone());
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

/// Instruction builder for `WnsSellNftTokenPool` via CPI.
///
/// ### Accounts:
///
///   0. `[]` shared
///   1. `[writable]` owner_ata_acc
///   2. `[]` token_program
///   3. `[]` associated_token_program
///   4. `[]` system_program
///   5. `[writable]` margin_account
///   6. `[writable]` taker_broker
///   7. `[writable]` approve_account
///   8. `[writable]` distribution
///   9. `[]` wns_program
///   10. `[]` distribution_program
///   11. `[]` extra_metas
pub struct WnsSellNftTokenPoolCpiBuilder<'a, 'b> {
    instruction: Box<WnsSellNftTokenPoolCpiBuilderInstruction<'a, 'b>>,
}

impl<'a, 'b> WnsSellNftTokenPoolCpiBuilder<'a, 'b> {
    pub fn new(program: &'b solana_program::account_info::AccountInfo<'a>) -> Self {
        let instruction = Box::new(WnsSellNftTokenPoolCpiBuilderInstruction {
            __program: program,
            shared: None,
            owner_ata_acc: None,
            token_program: None,
            associated_token_program: None,
            system_program: None,
            margin_account: None,
            taker_broker: None,
            approve_account: None,
            distribution: None,
            wns_program: None,
            distribution_program: None,
            extra_metas: None,
            config: None,
            min_price: None,
            __remaining_accounts: Vec::new(),
        });
        Self { instruction }
    }
    #[inline(always)]
    pub fn shared(
        &mut self,
        shared: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.shared = Some(shared);
        self
    }
    #[inline(always)]
    pub fn owner_ata_acc(
        &mut self,
        owner_ata_acc: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.owner_ata_acc = Some(owner_ata_acc);
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
    pub fn associated_token_program(
        &mut self,
        associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.associated_token_program = Some(associated_token_program);
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
    pub fn margin_account(
        &mut self,
        margin_account: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.margin_account = Some(margin_account);
        self
    }
    #[inline(always)]
    pub fn taker_broker(
        &mut self,
        taker_broker: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.taker_broker = Some(taker_broker);
        self
    }
    #[inline(always)]
    pub fn approve_account(
        &mut self,
        approve_account: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.approve_account = Some(approve_account);
        self
    }
    #[inline(always)]
    pub fn distribution(
        &mut self,
        distribution: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.distribution = Some(distribution);
        self
    }
    #[inline(always)]
    pub fn wns_program(
        &mut self,
        wns_program: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.wns_program = Some(wns_program);
        self
    }
    #[inline(always)]
    pub fn distribution_program(
        &mut self,
        distribution_program: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.distribution_program = Some(distribution_program);
        self
    }
    #[inline(always)]
    pub fn extra_metas(
        &mut self,
        extra_metas: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.extra_metas = Some(extra_metas);
        self
    }
    #[inline(always)]
    pub fn config(&mut self, config: PoolConfig) -> &mut Self {
        self.instruction.config = Some(config);
        self
    }
    #[inline(always)]
    pub fn min_price(&mut self, min_price: u64) -> &mut Self {
        self.instruction.min_price = Some(min_price);
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
        let args = WnsSellNftTokenPoolInstructionArgs {
            config: self.instruction.config.clone().expect("config is not set"),
            min_price: self
                .instruction
                .min_price
                .clone()
                .expect("min_price is not set"),
        };
        let instruction = WnsSellNftTokenPoolCpi {
            __program: self.instruction.__program,

            shared: self.instruction.shared.expect("shared is not set"),

            owner_ata_acc: self
                .instruction
                .owner_ata_acc
                .expect("owner_ata_acc is not set"),

            token_program: self
                .instruction
                .token_program
                .expect("token_program is not set"),

            associated_token_program: self
                .instruction
                .associated_token_program
                .expect("associated_token_program is not set"),

            system_program: self
                .instruction
                .system_program
                .expect("system_program is not set"),

            margin_account: self
                .instruction
                .margin_account
                .expect("margin_account is not set"),

            taker_broker: self
                .instruction
                .taker_broker
                .expect("taker_broker is not set"),

            approve_account: self
                .instruction
                .approve_account
                .expect("approve_account is not set"),

            distribution: self
                .instruction
                .distribution
                .expect("distribution is not set"),

            wns_program: self
                .instruction
                .wns_program
                .expect("wns_program is not set"),

            distribution_program: self
                .instruction
                .distribution_program
                .expect("distribution_program is not set"),

            extra_metas: self
                .instruction
                .extra_metas
                .expect("extra_metas is not set"),
            __args: args,
        };
        instruction.invoke_signed_with_remaining_accounts(
            signers_seeds,
            &self.instruction.__remaining_accounts,
        )
    }
}

struct WnsSellNftTokenPoolCpiBuilderInstruction<'a, 'b> {
    __program: &'b solana_program::account_info::AccountInfo<'a>,
    shared: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner_ata_acc: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    associated_token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    system_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    margin_account: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    taker_broker: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    approve_account: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    distribution: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    wns_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    distribution_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    extra_metas: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    config: Option<PoolConfig>,
    min_price: Option<u64>,
    /// Additional instruction accounts `(AccountInfo, is_writable, is_signer)`.
    __remaining_accounts: Vec<(
        &'b solana_program::account_info::AccountInfo<'a>,
        bool,
        bool,
    )>,
}

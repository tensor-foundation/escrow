//! This code was AUTOGENERATED using the kinobi library.
//! Please DO NOT EDIT THIS FILE, instead use visitors
//! to add features, then rerun kinobi to update it.
//!
//! [https://github.com/metaplex-foundation/kinobi]
//!

use crate::generated::types::AuthorizationDataLocal;
use crate::generated::types::PoolConfig;
use borsh::BorshDeserialize;
use borsh::BorshSerialize;

/// Accounts.
pub struct WithdrawNft {
    pub tswap: solana_program::pubkey::Pubkey,

    pub pool: solana_program::pubkey::Pubkey,

    pub whitelist: solana_program::pubkey::Pubkey,

    pub nft_dest: solana_program::pubkey::Pubkey,

    pub nft_mint: solana_program::pubkey::Pubkey,
    /// Implicitly checked via transfer. Will fail if wrong account
    /// This is closed below (dest = owner)
    pub nft_escrow: solana_program::pubkey::Pubkey,

    pub nft_receipt: solana_program::pubkey::Pubkey,
    /// Tied to the pool because used to verify pool seeds
    pub owner: solana_program::pubkey::Pubkey,

    pub token_program: solana_program::pubkey::Pubkey,

    pub associated_token_program: solana_program::pubkey::Pubkey,

    pub system_program: solana_program::pubkey::Pubkey,

    pub rent: solana_program::pubkey::Pubkey,

    pub nft_metadata: solana_program::pubkey::Pubkey,

    pub nft_edition: solana_program::pubkey::Pubkey,

    pub owner_token_record: solana_program::pubkey::Pubkey,

    pub dest_token_record: solana_program::pubkey::Pubkey,

    pub pnft_shared: solana_program::pubkey::Pubkey,

    pub auth_rules: solana_program::pubkey::Pubkey,
}

impl WithdrawNft {
    pub fn instruction(
        &self,
        args: WithdrawNftInstructionArgs,
    ) -> solana_program::instruction::Instruction {
        self.instruction_with_remaining_accounts(args, &[])
    }
    #[allow(clippy::vec_init_then_push)]
    pub fn instruction_with_remaining_accounts(
        &self,
        args: WithdrawNftInstructionArgs,
        remaining_accounts: &[solana_program::instruction::AccountMeta],
    ) -> solana_program::instruction::Instruction {
        let mut accounts = Vec::with_capacity(18 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.tswap, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.pool, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.whitelist,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.nft_dest,
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
            self.nft_receipt,
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
            self.associated_token_program,
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
            self.pnft_shared,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.auth_rules,
            false,
        ));
        accounts.extend_from_slice(remaining_accounts);
        let mut data = WithdrawNftInstructionData::new().try_to_vec().unwrap();
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
struct WithdrawNftInstructionData {
    discriminator: [u8; 8],
}

impl WithdrawNftInstructionData {
    fn new() -> Self {
        Self {
            discriminator: [142, 181, 191, 149, 82, 175, 216, 100],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct WithdrawNftInstructionArgs {
    pub config: PoolConfig,
    pub authorization_data: Option<AuthorizationDataLocal>,
    pub rules_acc_present: bool,
}

/// Instruction builder for `WithdrawNft`.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` pool
///   2. `[]` whitelist
///   3. `[writable]` nft_dest
///   4. `[]` nft_mint
///   5. `[writable]` nft_escrow
///   6. `[writable]` nft_receipt
///   7. `[writable, signer]` owner
///   8. `[optional]` token_program (default to `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
///   9. `[]` associated_token_program
///   10. `[optional]` system_program (default to `11111111111111111111111111111111`)
///   11. `[optional]` rent (default to `SysvarRent111111111111111111111111111111111`)
///   12. `[writable]` nft_metadata
///   13. `[]` nft_edition
///   14. `[writable]` owner_token_record
///   15. `[writable]` dest_token_record
///   16. `[]` pnft_shared
///   17. `[]` auth_rules
#[derive(Default)]
pub struct WithdrawNftBuilder {
    tswap: Option<solana_program::pubkey::Pubkey>,
    pool: Option<solana_program::pubkey::Pubkey>,
    whitelist: Option<solana_program::pubkey::Pubkey>,
    nft_dest: Option<solana_program::pubkey::Pubkey>,
    nft_mint: Option<solana_program::pubkey::Pubkey>,
    nft_escrow: Option<solana_program::pubkey::Pubkey>,
    nft_receipt: Option<solana_program::pubkey::Pubkey>,
    owner: Option<solana_program::pubkey::Pubkey>,
    token_program: Option<solana_program::pubkey::Pubkey>,
    associated_token_program: Option<solana_program::pubkey::Pubkey>,
    system_program: Option<solana_program::pubkey::Pubkey>,
    rent: Option<solana_program::pubkey::Pubkey>,
    nft_metadata: Option<solana_program::pubkey::Pubkey>,
    nft_edition: Option<solana_program::pubkey::Pubkey>,
    owner_token_record: Option<solana_program::pubkey::Pubkey>,
    dest_token_record: Option<solana_program::pubkey::Pubkey>,
    pnft_shared: Option<solana_program::pubkey::Pubkey>,
    auth_rules: Option<solana_program::pubkey::Pubkey>,
    config: Option<PoolConfig>,
    authorization_data: Option<AuthorizationDataLocal>,
    rules_acc_present: Option<bool>,
    __remaining_accounts: Vec<solana_program::instruction::AccountMeta>,
}

impl WithdrawNftBuilder {
    pub fn new() -> Self {
        Self::default()
    }
    #[inline(always)]
    pub fn tswap(&mut self, tswap: solana_program::pubkey::Pubkey) -> &mut Self {
        self.tswap = Some(tswap);
        self
    }
    #[inline(always)]
    pub fn pool(&mut self, pool: solana_program::pubkey::Pubkey) -> &mut Self {
        self.pool = Some(pool);
        self
    }
    #[inline(always)]
    pub fn whitelist(&mut self, whitelist: solana_program::pubkey::Pubkey) -> &mut Self {
        self.whitelist = Some(whitelist);
        self
    }
    #[inline(always)]
    pub fn nft_dest(&mut self, nft_dest: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_dest = Some(nft_dest);
        self
    }
    #[inline(always)]
    pub fn nft_mint(&mut self, nft_mint: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_mint = Some(nft_mint);
        self
    }
    /// Implicitly checked via transfer. Will fail if wrong account
    /// This is closed below (dest = owner)
    #[inline(always)]
    pub fn nft_escrow(&mut self, nft_escrow: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_escrow = Some(nft_escrow);
        self
    }
    #[inline(always)]
    pub fn nft_receipt(&mut self, nft_receipt: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_receipt = Some(nft_receipt);
        self
    }
    /// Tied to the pool because used to verify pool seeds
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
    pub fn config(&mut self, config: PoolConfig) -> &mut Self {
        self.config = Some(config);
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
        let accounts = WithdrawNft {
            tswap: self.tswap.expect("tswap is not set"),
            pool: self.pool.expect("pool is not set"),
            whitelist: self.whitelist.expect("whitelist is not set"),
            nft_dest: self.nft_dest.expect("nft_dest is not set"),
            nft_mint: self.nft_mint.expect("nft_mint is not set"),
            nft_escrow: self.nft_escrow.expect("nft_escrow is not set"),
            nft_receipt: self.nft_receipt.expect("nft_receipt is not set"),
            owner: self.owner.expect("owner is not set"),
            token_program: self.token_program.unwrap_or(solana_program::pubkey!(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
            )),
            associated_token_program: self
                .associated_token_program
                .expect("associated_token_program is not set"),
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
            pnft_shared: self.pnft_shared.expect("pnft_shared is not set"),
            auth_rules: self.auth_rules.expect("auth_rules is not set"),
        };
        let args = WithdrawNftInstructionArgs {
            config: self.config.clone().expect("config is not set"),
            authorization_data: self.authorization_data.clone(),
            rules_acc_present: self
                .rules_acc_present
                .clone()
                .expect("rules_acc_present is not set"),
        };

        accounts.instruction_with_remaining_accounts(args, &self.__remaining_accounts)
    }
}

/// `withdraw_nft` CPI accounts.
pub struct WithdrawNftCpiAccounts<'a, 'b> {
    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub pool: &'b solana_program::account_info::AccountInfo<'a>,

    pub whitelist: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_dest: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,
    /// Implicitly checked via transfer. Will fail if wrong account
    /// This is closed below (dest = owner)
    pub nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_receipt: &'b solana_program::account_info::AccountInfo<'a>,
    /// Tied to the pool because used to verify pool seeds
    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub rent: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_metadata: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_edition: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub dest_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub pnft_shared: &'b solana_program::account_info::AccountInfo<'a>,

    pub auth_rules: &'b solana_program::account_info::AccountInfo<'a>,
}

/// `withdraw_nft` CPI instruction.
pub struct WithdrawNftCpi<'a, 'b> {
    /// The program to invoke.
    pub __program: &'b solana_program::account_info::AccountInfo<'a>,

    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub pool: &'b solana_program::account_info::AccountInfo<'a>,

    pub whitelist: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_dest: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,
    /// Implicitly checked via transfer. Will fail if wrong account
    /// This is closed below (dest = owner)
    pub nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_receipt: &'b solana_program::account_info::AccountInfo<'a>,
    /// Tied to the pool because used to verify pool seeds
    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub rent: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_metadata: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_edition: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub dest_token_record: &'b solana_program::account_info::AccountInfo<'a>,

    pub pnft_shared: &'b solana_program::account_info::AccountInfo<'a>,

    pub auth_rules: &'b solana_program::account_info::AccountInfo<'a>,
    /// The arguments for the instruction.
    pub __args: WithdrawNftInstructionArgs,
}

impl<'a, 'b> WithdrawNftCpi<'a, 'b> {
    pub fn new(
        program: &'b solana_program::account_info::AccountInfo<'a>,
        accounts: WithdrawNftCpiAccounts<'a, 'b>,
        args: WithdrawNftInstructionArgs,
    ) -> Self {
        Self {
            __program: program,
            tswap: accounts.tswap,
            pool: accounts.pool,
            whitelist: accounts.whitelist,
            nft_dest: accounts.nft_dest,
            nft_mint: accounts.nft_mint,
            nft_escrow: accounts.nft_escrow,
            nft_receipt: accounts.nft_receipt,
            owner: accounts.owner,
            token_program: accounts.token_program,
            associated_token_program: accounts.associated_token_program,
            system_program: accounts.system_program,
            rent: accounts.rent,
            nft_metadata: accounts.nft_metadata,
            nft_edition: accounts.nft_edition,
            owner_token_record: accounts.owner_token_record,
            dest_token_record: accounts.dest_token_record,
            pnft_shared: accounts.pnft_shared,
            auth_rules: accounts.auth_rules,
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
        let mut accounts = Vec::with_capacity(18 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.tswap.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.pool.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.whitelist.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.nft_dest.key,
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
            *self.nft_receipt.key,
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
            *self.associated_token_program.key,
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
            *self.pnft_shared.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.auth_rules.key,
            false,
        ));
        remaining_accounts.iter().for_each(|remaining_account| {
            accounts.push(solana_program::instruction::AccountMeta {
                pubkey: *remaining_account.0.key,
                is_signer: remaining_account.1,
                is_writable: remaining_account.2,
            })
        });
        let mut data = WithdrawNftInstructionData::new().try_to_vec().unwrap();
        let mut args = self.__args.try_to_vec().unwrap();
        data.append(&mut args);

        let instruction = solana_program::instruction::Instruction {
            program_id: crate::TENSOR_ESCROW_ID,
            accounts,
            data,
        };
        let mut account_infos = Vec::with_capacity(18 + 1 + remaining_accounts.len());
        account_infos.push(self.__program.clone());
        account_infos.push(self.tswap.clone());
        account_infos.push(self.pool.clone());
        account_infos.push(self.whitelist.clone());
        account_infos.push(self.nft_dest.clone());
        account_infos.push(self.nft_mint.clone());
        account_infos.push(self.nft_escrow.clone());
        account_infos.push(self.nft_receipt.clone());
        account_infos.push(self.owner.clone());
        account_infos.push(self.token_program.clone());
        account_infos.push(self.associated_token_program.clone());
        account_infos.push(self.system_program.clone());
        account_infos.push(self.rent.clone());
        account_infos.push(self.nft_metadata.clone());
        account_infos.push(self.nft_edition.clone());
        account_infos.push(self.owner_token_record.clone());
        account_infos.push(self.dest_token_record.clone());
        account_infos.push(self.pnft_shared.clone());
        account_infos.push(self.auth_rules.clone());
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

/// Instruction builder for `WithdrawNft` via CPI.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` pool
///   2. `[]` whitelist
///   3. `[writable]` nft_dest
///   4. `[]` nft_mint
///   5. `[writable]` nft_escrow
///   6. `[writable]` nft_receipt
///   7. `[writable, signer]` owner
///   8. `[]` token_program
///   9. `[]` associated_token_program
///   10. `[]` system_program
///   11. `[]` rent
///   12. `[writable]` nft_metadata
///   13. `[]` nft_edition
///   14. `[writable]` owner_token_record
///   15. `[writable]` dest_token_record
///   16. `[]` pnft_shared
///   17. `[]` auth_rules
pub struct WithdrawNftCpiBuilder<'a, 'b> {
    instruction: Box<WithdrawNftCpiBuilderInstruction<'a, 'b>>,
}

impl<'a, 'b> WithdrawNftCpiBuilder<'a, 'b> {
    pub fn new(program: &'b solana_program::account_info::AccountInfo<'a>) -> Self {
        let instruction = Box::new(WithdrawNftCpiBuilderInstruction {
            __program: program,
            tswap: None,
            pool: None,
            whitelist: None,
            nft_dest: None,
            nft_mint: None,
            nft_escrow: None,
            nft_receipt: None,
            owner: None,
            token_program: None,
            associated_token_program: None,
            system_program: None,
            rent: None,
            nft_metadata: None,
            nft_edition: None,
            owner_token_record: None,
            dest_token_record: None,
            pnft_shared: None,
            auth_rules: None,
            config: None,
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
    pub fn pool(&mut self, pool: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.pool = Some(pool);
        self
    }
    #[inline(always)]
    pub fn whitelist(
        &mut self,
        whitelist: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.whitelist = Some(whitelist);
        self
    }
    #[inline(always)]
    pub fn nft_dest(
        &mut self,
        nft_dest: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_dest = Some(nft_dest);
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
    /// This is closed below (dest = owner)
    #[inline(always)]
    pub fn nft_escrow(
        &mut self,
        nft_escrow: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_escrow = Some(nft_escrow);
        self
    }
    #[inline(always)]
    pub fn nft_receipt(
        &mut self,
        nft_receipt: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_receipt = Some(nft_receipt);
        self
    }
    /// Tied to the pool because used to verify pool seeds
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
    pub fn config(&mut self, config: PoolConfig) -> &mut Self {
        self.instruction.config = Some(config);
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
        let args = WithdrawNftInstructionArgs {
            config: self.instruction.config.clone().expect("config is not set"),
            authorization_data: self.instruction.authorization_data.clone(),
            rules_acc_present: self
                .instruction
                .rules_acc_present
                .clone()
                .expect("rules_acc_present is not set"),
        };
        let instruction = WithdrawNftCpi {
            __program: self.instruction.__program,

            tswap: self.instruction.tswap.expect("tswap is not set"),

            pool: self.instruction.pool.expect("pool is not set"),

            whitelist: self.instruction.whitelist.expect("whitelist is not set"),

            nft_dest: self.instruction.nft_dest.expect("nft_dest is not set"),

            nft_mint: self.instruction.nft_mint.expect("nft_mint is not set"),

            nft_escrow: self.instruction.nft_escrow.expect("nft_escrow is not set"),

            nft_receipt: self
                .instruction
                .nft_receipt
                .expect("nft_receipt is not set"),

            owner: self.instruction.owner.expect("owner is not set"),

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

            pnft_shared: self
                .instruction
                .pnft_shared
                .expect("pnft_shared is not set"),

            auth_rules: self.instruction.auth_rules.expect("auth_rules is not set"),
            __args: args,
        };
        instruction.invoke_signed_with_remaining_accounts(
            signers_seeds,
            &self.instruction.__remaining_accounts,
        )
    }
}

struct WithdrawNftCpiBuilderInstruction<'a, 'b> {
    __program: &'b solana_program::account_info::AccountInfo<'a>,
    tswap: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    pool: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    whitelist: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_dest: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_mint: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_escrow: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_receipt: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    associated_token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    system_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    rent: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_metadata: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_edition: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner_token_record: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    dest_token_record: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    pnft_shared: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    auth_rules: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    config: Option<PoolConfig>,
    authorization_data: Option<AuthorizationDataLocal>,
    rules_acc_present: Option<bool>,
    /// Additional instruction accounts `(AccountInfo, is_writable, is_signer)`.
    __remaining_accounts: Vec<(
        &'b solana_program::account_info::AccountInfo<'a>,
        bool,
        bool,
    )>,
}

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
pub struct SellNftTokenPoolT22 {
    pub tswap: solana_program::pubkey::Pubkey,

    pub fee_vault: solana_program::pubkey::Pubkey,

    pub pool: solana_program::pubkey::Pubkey,
    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: solana_program::pubkey::Pubkey,
    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    pub mint_proof: solana_program::pubkey::Pubkey,

    pub nft_seller_acc: solana_program::pubkey::Pubkey,

    pub nft_mint: solana_program::pubkey::Pubkey,

    pub sol_escrow: solana_program::pubkey::Pubkey,

    pub owner: solana_program::pubkey::Pubkey,

    pub seller: solana_program::pubkey::Pubkey,

    pub owner_ata_acc: solana_program::pubkey::Pubkey,

    pub token_program: solana_program::pubkey::Pubkey,

    pub associated_token_program: solana_program::pubkey::Pubkey,

    pub system_program: solana_program::pubkey::Pubkey,

    pub margin_account: solana_program::pubkey::Pubkey,

    pub taker_broker: solana_program::pubkey::Pubkey,
}

impl SellNftTokenPoolT22 {
    pub fn instruction(
        &self,
        args: SellNftTokenPoolT22InstructionArgs,
    ) -> solana_program::instruction::Instruction {
        self.instruction_with_remaining_accounts(args, &[])
    }
    #[allow(clippy::vec_init_then_push)]
    pub fn instruction_with_remaining_accounts(
        &self,
        args: SellNftTokenPoolT22InstructionArgs,
        remaining_accounts: &[solana_program::instruction::AccountMeta],
    ) -> solana_program::instruction::Instruction {
        let mut accounts = Vec::with_capacity(16 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.tswap, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.fee_vault,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.pool, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.whitelist,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.mint_proof,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.nft_seller_acc,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            self.nft_mint,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.sol_escrow,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.owner, false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            self.seller,
            true,
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
        accounts.extend_from_slice(remaining_accounts);
        let mut data = SellNftTokenPoolT22InstructionData::new()
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
pub struct SellNftTokenPoolT22InstructionData {
    discriminator: [u8; 8],
}

impl SellNftTokenPoolT22InstructionData {
    pub fn new() -> Self {
        Self {
            discriminator: [149, 234, 31, 103, 26, 36, 166, 49],
        }
    }
}

#[derive(BorshSerialize, BorshDeserialize, Clone, Debug, Eq, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct SellNftTokenPoolT22InstructionArgs {
    pub config: PoolConfig,
    pub min_price: u64,
}

/// Instruction builder for `SellNftTokenPoolT22`.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` fee_vault
///   2. `[writable]` pool
///   3. `[]` whitelist
///   4. `[]` mint_proof
///   5. `[writable]` nft_seller_acc
///   6. `[]` nft_mint
///   7. `[writable]` sol_escrow
///   8. `[writable]` owner
///   9. `[writable, signer]` seller
///   10. `[writable]` owner_ata_acc
///   11. `[optional]` token_program (default to `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`)
///   12. `[]` associated_token_program
///   13. `[optional]` system_program (default to `11111111111111111111111111111111`)
///   14. `[writable]` margin_account
///   15. `[writable]` taker_broker
#[derive(Default)]
pub struct SellNftTokenPoolT22Builder {
    tswap: Option<solana_program::pubkey::Pubkey>,
    fee_vault: Option<solana_program::pubkey::Pubkey>,
    pool: Option<solana_program::pubkey::Pubkey>,
    whitelist: Option<solana_program::pubkey::Pubkey>,
    mint_proof: Option<solana_program::pubkey::Pubkey>,
    nft_seller_acc: Option<solana_program::pubkey::Pubkey>,
    nft_mint: Option<solana_program::pubkey::Pubkey>,
    sol_escrow: Option<solana_program::pubkey::Pubkey>,
    owner: Option<solana_program::pubkey::Pubkey>,
    seller: Option<solana_program::pubkey::Pubkey>,
    owner_ata_acc: Option<solana_program::pubkey::Pubkey>,
    token_program: Option<solana_program::pubkey::Pubkey>,
    associated_token_program: Option<solana_program::pubkey::Pubkey>,
    system_program: Option<solana_program::pubkey::Pubkey>,
    margin_account: Option<solana_program::pubkey::Pubkey>,
    taker_broker: Option<solana_program::pubkey::Pubkey>,
    config: Option<PoolConfig>,
    min_price: Option<u64>,
    __remaining_accounts: Vec<solana_program::instruction::AccountMeta>,
}

impl SellNftTokenPoolT22Builder {
    pub fn new() -> Self {
        Self::default()
    }
    #[inline(always)]
    pub fn tswap(&mut self, tswap: solana_program::pubkey::Pubkey) -> &mut Self {
        self.tswap = Some(tswap);
        self
    }
    #[inline(always)]
    pub fn fee_vault(&mut self, fee_vault: solana_program::pubkey::Pubkey) -> &mut Self {
        self.fee_vault = Some(fee_vault);
        self
    }
    #[inline(always)]
    pub fn pool(&mut self, pool: solana_program::pubkey::Pubkey) -> &mut Self {
        self.pool = Some(pool);
        self
    }
    /// Needed for pool seeds derivation, also checked via has_one on pool
    #[inline(always)]
    pub fn whitelist(&mut self, whitelist: solana_program::pubkey::Pubkey) -> &mut Self {
        self.whitelist = Some(whitelist);
        self
    }
    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    #[inline(always)]
    pub fn mint_proof(&mut self, mint_proof: solana_program::pubkey::Pubkey) -> &mut Self {
        self.mint_proof = Some(mint_proof);
        self
    }
    #[inline(always)]
    pub fn nft_seller_acc(&mut self, nft_seller_acc: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_seller_acc = Some(nft_seller_acc);
        self
    }
    #[inline(always)]
    pub fn nft_mint(&mut self, nft_mint: solana_program::pubkey::Pubkey) -> &mut Self {
        self.nft_mint = Some(nft_mint);
        self
    }
    #[inline(always)]
    pub fn sol_escrow(&mut self, sol_escrow: solana_program::pubkey::Pubkey) -> &mut Self {
        self.sol_escrow = Some(sol_escrow);
        self
    }
    #[inline(always)]
    pub fn owner(&mut self, owner: solana_program::pubkey::Pubkey) -> &mut Self {
        self.owner = Some(owner);
        self
    }
    #[inline(always)]
    pub fn seller(&mut self, seller: solana_program::pubkey::Pubkey) -> &mut Self {
        self.seller = Some(seller);
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
        let accounts = SellNftTokenPoolT22 {
            tswap: self.tswap.expect("tswap is not set"),
            fee_vault: self.fee_vault.expect("fee_vault is not set"),
            pool: self.pool.expect("pool is not set"),
            whitelist: self.whitelist.expect("whitelist is not set"),
            mint_proof: self.mint_proof.expect("mint_proof is not set"),
            nft_seller_acc: self.nft_seller_acc.expect("nft_seller_acc is not set"),
            nft_mint: self.nft_mint.expect("nft_mint is not set"),
            sol_escrow: self.sol_escrow.expect("sol_escrow is not set"),
            owner: self.owner.expect("owner is not set"),
            seller: self.seller.expect("seller is not set"),
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
        };
        let args = SellNftTokenPoolT22InstructionArgs {
            config: self.config.clone().expect("config is not set"),
            min_price: self.min_price.clone().expect("min_price is not set"),
        };

        accounts.instruction_with_remaining_accounts(args, &self.__remaining_accounts)
    }
}

/// `sell_nft_token_pool_t22` CPI accounts.
pub struct SellNftTokenPoolT22CpiAccounts<'a, 'b> {
    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub fee_vault: &'b solana_program::account_info::AccountInfo<'a>,

    pub pool: &'b solana_program::account_info::AccountInfo<'a>,
    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: &'b solana_program::account_info::AccountInfo<'a>,
    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    pub mint_proof: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_seller_acc: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,

    pub sol_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub seller: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_ata_acc: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub margin_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub taker_broker: &'b solana_program::account_info::AccountInfo<'a>,
}

/// `sell_nft_token_pool_t22` CPI instruction.
pub struct SellNftTokenPoolT22Cpi<'a, 'b> {
    /// The program to invoke.
    pub __program: &'b solana_program::account_info::AccountInfo<'a>,

    pub tswap: &'b solana_program::account_info::AccountInfo<'a>,

    pub fee_vault: &'b solana_program::account_info::AccountInfo<'a>,

    pub pool: &'b solana_program::account_info::AccountInfo<'a>,
    /// Needed for pool seeds derivation, also checked via has_one on pool
    pub whitelist: &'b solana_program::account_info::AccountInfo<'a>,
    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    pub mint_proof: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_seller_acc: &'b solana_program::account_info::AccountInfo<'a>,

    pub nft_mint: &'b solana_program::account_info::AccountInfo<'a>,

    pub sol_escrow: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner: &'b solana_program::account_info::AccountInfo<'a>,

    pub seller: &'b solana_program::account_info::AccountInfo<'a>,

    pub owner_ata_acc: &'b solana_program::account_info::AccountInfo<'a>,

    pub token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub associated_token_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub system_program: &'b solana_program::account_info::AccountInfo<'a>,

    pub margin_account: &'b solana_program::account_info::AccountInfo<'a>,

    pub taker_broker: &'b solana_program::account_info::AccountInfo<'a>,
    /// The arguments for the instruction.
    pub __args: SellNftTokenPoolT22InstructionArgs,
}

impl<'a, 'b> SellNftTokenPoolT22Cpi<'a, 'b> {
    pub fn new(
        program: &'b solana_program::account_info::AccountInfo<'a>,
        accounts: SellNftTokenPoolT22CpiAccounts<'a, 'b>,
        args: SellNftTokenPoolT22InstructionArgs,
    ) -> Self {
        Self {
            __program: program,
            tswap: accounts.tswap,
            fee_vault: accounts.fee_vault,
            pool: accounts.pool,
            whitelist: accounts.whitelist,
            mint_proof: accounts.mint_proof,
            nft_seller_acc: accounts.nft_seller_acc,
            nft_mint: accounts.nft_mint,
            sol_escrow: accounts.sol_escrow,
            owner: accounts.owner,
            seller: accounts.seller,
            owner_ata_acc: accounts.owner_ata_acc,
            token_program: accounts.token_program,
            associated_token_program: accounts.associated_token_program,
            system_program: accounts.system_program,
            margin_account: accounts.margin_account,
            taker_broker: accounts.taker_broker,
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
        let mut accounts = Vec::with_capacity(16 + remaining_accounts.len());
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.tswap.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.fee_vault.key,
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
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.mint_proof.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.nft_seller_acc.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new_readonly(
            *self.nft_mint.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.sol_escrow.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.owner.key,
            false,
        ));
        accounts.push(solana_program::instruction::AccountMeta::new(
            *self.seller.key,
            true,
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
        remaining_accounts.iter().for_each(|remaining_account| {
            accounts.push(solana_program::instruction::AccountMeta {
                pubkey: *remaining_account.0.key,
                is_signer: remaining_account.1,
                is_writable: remaining_account.2,
            })
        });
        let mut data = SellNftTokenPoolT22InstructionData::new()
            .try_to_vec()
            .unwrap();
        let mut args = self.__args.try_to_vec().unwrap();
        data.append(&mut args);

        let instruction = solana_program::instruction::Instruction {
            program_id: crate::TENSOR_ESCROW_ID,
            accounts,
            data,
        };
        let mut account_infos = Vec::with_capacity(16 + 1 + remaining_accounts.len());
        account_infos.push(self.__program.clone());
        account_infos.push(self.tswap.clone());
        account_infos.push(self.fee_vault.clone());
        account_infos.push(self.pool.clone());
        account_infos.push(self.whitelist.clone());
        account_infos.push(self.mint_proof.clone());
        account_infos.push(self.nft_seller_acc.clone());
        account_infos.push(self.nft_mint.clone());
        account_infos.push(self.sol_escrow.clone());
        account_infos.push(self.owner.clone());
        account_infos.push(self.seller.clone());
        account_infos.push(self.owner_ata_acc.clone());
        account_infos.push(self.token_program.clone());
        account_infos.push(self.associated_token_program.clone());
        account_infos.push(self.system_program.clone());
        account_infos.push(self.margin_account.clone());
        account_infos.push(self.taker_broker.clone());
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

/// Instruction builder for `SellNftTokenPoolT22` via CPI.
///
/// ### Accounts:
///
///   0. `[]` tswap
///   1. `[writable]` fee_vault
///   2. `[writable]` pool
///   3. `[]` whitelist
///   4. `[]` mint_proof
///   5. `[writable]` nft_seller_acc
///   6. `[]` nft_mint
///   7. `[writable]` sol_escrow
///   8. `[writable]` owner
///   9. `[writable, signer]` seller
///   10. `[writable]` owner_ata_acc
///   11. `[]` token_program
///   12. `[]` associated_token_program
///   13. `[]` system_program
///   14. `[writable]` margin_account
///   15. `[writable]` taker_broker
pub struct SellNftTokenPoolT22CpiBuilder<'a, 'b> {
    instruction: Box<SellNftTokenPoolT22CpiBuilderInstruction<'a, 'b>>,
}

impl<'a, 'b> SellNftTokenPoolT22CpiBuilder<'a, 'b> {
    pub fn new(program: &'b solana_program::account_info::AccountInfo<'a>) -> Self {
        let instruction = Box::new(SellNftTokenPoolT22CpiBuilderInstruction {
            __program: program,
            tswap: None,
            fee_vault: None,
            pool: None,
            whitelist: None,
            mint_proof: None,
            nft_seller_acc: None,
            nft_mint: None,
            sol_escrow: None,
            owner: None,
            seller: None,
            owner_ata_acc: None,
            token_program: None,
            associated_token_program: None,
            system_program: None,
            margin_account: None,
            taker_broker: None,
            config: None,
            min_price: None,
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
    pub fn fee_vault(
        &mut self,
        fee_vault: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.fee_vault = Some(fee_vault);
        self
    }
    #[inline(always)]
    pub fn pool(&mut self, pool: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.pool = Some(pool);
        self
    }
    /// Needed for pool seeds derivation, also checked via has_one on pool
    #[inline(always)]
    pub fn whitelist(
        &mut self,
        whitelist: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.whitelist = Some(whitelist);
        self
    }
    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    #[inline(always)]
    pub fn mint_proof(
        &mut self,
        mint_proof: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.mint_proof = Some(mint_proof);
        self
    }
    #[inline(always)]
    pub fn nft_seller_acc(
        &mut self,
        nft_seller_acc: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.nft_seller_acc = Some(nft_seller_acc);
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
    pub fn sol_escrow(
        &mut self,
        sol_escrow: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.sol_escrow = Some(sol_escrow);
        self
    }
    #[inline(always)]
    pub fn owner(&mut self, owner: &'b solana_program::account_info::AccountInfo<'a>) -> &mut Self {
        self.instruction.owner = Some(owner);
        self
    }
    #[inline(always)]
    pub fn seller(
        &mut self,
        seller: &'b solana_program::account_info::AccountInfo<'a>,
    ) -> &mut Self {
        self.instruction.seller = Some(seller);
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
        let args = SellNftTokenPoolT22InstructionArgs {
            config: self.instruction.config.clone().expect("config is not set"),
            min_price: self
                .instruction
                .min_price
                .clone()
                .expect("min_price is not set"),
        };
        let instruction = SellNftTokenPoolT22Cpi {
            __program: self.instruction.__program,

            tswap: self.instruction.tswap.expect("tswap is not set"),

            fee_vault: self.instruction.fee_vault.expect("fee_vault is not set"),

            pool: self.instruction.pool.expect("pool is not set"),

            whitelist: self.instruction.whitelist.expect("whitelist is not set"),

            mint_proof: self.instruction.mint_proof.expect("mint_proof is not set"),

            nft_seller_acc: self
                .instruction
                .nft_seller_acc
                .expect("nft_seller_acc is not set"),

            nft_mint: self.instruction.nft_mint.expect("nft_mint is not set"),

            sol_escrow: self.instruction.sol_escrow.expect("sol_escrow is not set"),

            owner: self.instruction.owner.expect("owner is not set"),

            seller: self.instruction.seller.expect("seller is not set"),

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
            __args: args,
        };
        instruction.invoke_signed_with_remaining_accounts(
            signers_seeds,
            &self.instruction.__remaining_accounts,
        )
    }
}

struct SellNftTokenPoolT22CpiBuilderInstruction<'a, 'b> {
    __program: &'b solana_program::account_info::AccountInfo<'a>,
    tswap: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    fee_vault: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    pool: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    whitelist: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    mint_proof: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_seller_acc: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    nft_mint: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    sol_escrow: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    seller: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    owner_ata_acc: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    associated_token_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    system_program: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    margin_account: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    taker_broker: Option<&'b solana_program::account_info::AccountInfo<'a>>,
    config: Option<PoolConfig>,
    min_price: Option<u64>,
    /// Additional instruction accounts `(AccountInfo, is_writable, is_signer)`.
    __remaining_accounts: Vec<(
        &'b solana_program::account_info::AccountInfo<'a>,
        bool,
        bool,
    )>,
}

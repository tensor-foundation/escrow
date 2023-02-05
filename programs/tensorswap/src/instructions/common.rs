use std::{slice::Iter, str::FromStr};

use anchor_lang::{
    prelude::Accounts,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    },
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
use mpl_token_metadata::{
    self,
    instruction::{
        builders::{DelegateBuilder, TransferBuilder},
        DelegateArgs, InstructionBuilder, TransferArgs,
    },
    processor::AuthorizationData,
    state::{Metadata, ProgrammableConfig::V1, TokenMetadataAccount, TokenStandard},
};
use tensor_whitelist::{self, FullMerkleProof, MintProof, Whitelist, ZERO_ARRAY};
use vipers::throw_err;

use crate::*;

pub fn transfer_all_lamports_from_tswap<'info>(
    tswap_owned_acc: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
) -> Result<()> {
    let rent = Rent::get()?.minimum_balance(tswap_owned_acc.data_len());
    let to_move = unwrap_int!(tswap_owned_acc.lamports().checked_sub(rent));

    transfer_lamports_from_tswap(tswap_owned_acc, to, to_move)
}

pub fn transfer_lamports_from_tswap<'info>(
    tswap_owned_acc: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    let new_tswap_owned_acc = unwrap_int!(tswap_owned_acc.lamports().checked_sub(lamports));
    // Check we are not withdrawing into our rent.
    let rent = Rent::get()?.minimum_balance(tswap_owned_acc.data_len());
    if new_tswap_owned_acc < rent {
        throw_err!(InsufficientTswapAccBalance);
    }

    **tswap_owned_acc.try_borrow_mut_lamports()? = new_tswap_owned_acc;

    let new_to = unwrap_int!(to.lamports.borrow().checked_add(lamports));
    **to.lamports.borrow_mut() = new_to;

    Ok(())
}

#[inline(never)]
pub fn assert_decode_metadata<'info>(
    nft_mint: &Account<'info, Mint>,
    metadata_account: &UncheckedAccount<'info>,
) -> Result<Metadata> {
    let (key, _) = Pubkey::find_program_address(
        &[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
        ],
        &mpl_token_metadata::id(),
    );
    if key != *metadata_account.to_account_info().key {
        throw_err!(BadMetadata);
    }
    // Check account owner (redundant because of find_program_address above, but why not).
    if *metadata_account.owner != mpl_token_metadata::id() {
        throw_err!(BadMetadata);
    }

    Ok(Metadata::from_account_info(metadata_account)?)
}

#[inline(never)]
pub fn assert_decode_margin_account<'info>(
    margin_account_info: &AccountInfo<'info>,
    tswap: &AccountInfo<'info>,
    owner: &AccountInfo<'info>,
) -> Result<Account<'info, MarginAccount>> {
    let margin_account: Account<'info, MarginAccount> = Account::try_from(margin_account_info)?;

    let program_id = &Pubkey::from_str(TENSOR_SWAP_ADDR).unwrap();
    let (key, _) = Pubkey::find_program_address(
        &[
            b"margin".as_ref(),
            tswap.key().as_ref(),
            owner.key().as_ref(),
            &margin_account.nr.to_le_bytes(),
        ],
        program_id,
    );
    if key != *margin_account_info.key {
        throw_err!(BadMargin);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *margin_account_info.owner != *program_id {
        throw_err!(BadMargin);
    }
    // Check normal owner (not redundant - this actually checks if the account is initialized and stores the owner correctly).
    if margin_account.owner != owner.key() {
        throw_err!(BadMargin);
    }

    Ok(margin_account)
}

#[inline(never)]
pub fn assert_decode_mint_proof<'info>(
    whitelist: &Account<'info, Whitelist>,
    nft_mint: &Account<'info, Mint>,
    mint_proof: &UncheckedAccount<'info>,
) -> Result<Account<'info, MintProof>> {
    let program_id = &Pubkey::from_str(TENSOR_WHITELIST_ADDR).unwrap();
    let (key, _) = Pubkey::find_program_address(
        &[
            b"mint_proof".as_ref(),
            nft_mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        program_id,
    );
    if key != *mint_proof.to_account_info().key {
        throw_err!(BadMintProof);
    }
    // Check program owner (redundant because of find_program_address above, but why not).
    if *mint_proof.owner != *program_id {
        throw_err!(BadMintProof);
    }

    Account::try_from(&mint_proof.to_account_info())
}

#[inline(never)]
pub fn verify_whitelist<'info>(
    whitelist: &Account<'info, Whitelist>,
    mint_proof: &UncheckedAccount<'info>,
    nft_mint: &Account<'info, Mint>,
    nft_metadata: &UncheckedAccount<'info>,
) -> Result<()> {
    //prioritize merkle tree if proof present
    if whitelist.root_hash != ZERO_ARRAY {
        let mint_proof = assert_decode_mint_proof(whitelist, nft_mint, mint_proof)?;
        let leaf = anchor_lang::solana_program::keccak::hash(nft_mint.key().as_ref());
        let proof = &mut mint_proof.proof.to_vec();
        proof.truncate(mint_proof.proof_len as usize);
        whitelist.verify_whitelist(
            None,
            Some(FullMerkleProof {
                proof: proof.clone(),
                leaf: leaf.0,
            }),
        )
    } else {
        let metadata = &assert_decode_metadata(nft_mint, nft_metadata)?;
        whitelist.verify_whitelist(Some(metadata), None)
    }
}

pub struct FromExternal<'b, 'info> {
    pub from: &'b AccountInfo<'info>,
    pub sys_prog: &'b AccountInfo<'info>,
}

pub fn transfer_creators_fee<'b, 'info>(
    // not possible have a private enum in Anchor, it's always stuffed into IDL, which leads to:
    // IdlError: Type not found: {"type":{"defined":"&'bAccountInfo<'info>"},"name":"0"}
    // hence the next 2 lines are 2x Options instead of 1 Enum. First Option dictates branch
    from_tswap: Option<&'b AccountInfo<'info>>,
    from_ext: Option<FromExternal<'b, 'info>>,
    metadata: &Metadata,
    remaining_accounts_iter: &mut Iter<AccountInfo<'info>>,
    creators_fee: u64,
) -> Result<u64> {
    // send royalties: taken from AH's calculation:
    // https://github.com/metaplex-foundation/metaplex-program-library/blob/2320b30ec91b729b153f0c0fe719f96d325b2358/auction-house/program/src/utils.rs#L366-L471
    let mut remaining_fee = creators_fee;
    match &metadata.data.creators {
        Some(creators) => {
            for creator in creators {
                let current_creator_info = next_account_info(remaining_accounts_iter)?;
                require!(
                    creator.address.eq(current_creator_info.key),
                    crate::ErrorCode::CreatorMismatch
                );

                let rent = Rent::get()?.minimum_balance(current_creator_info.data_len());

                let pct = creator.share as u64;
                let creator_fee =
                    unwrap_checked!({ pct.checked_mul(creators_fee)?.checked_div(100) });

                //prevents InsufficientFundsForRent, where creator acc doesn't have enough fee
                //https://explorer.solana.com/tx/vY5nYA95ELVrs9SU5u7sfU2ucHj4CRd3dMCi1gWrY7MSCBYQLiPqzABj9m8VuvTLGHb9vmhGaGY7mkqPa1NLAFE
                if unwrap_int!(current_creator_info.lamports().checked_add(creator_fee)) < rent {
                    //skip current creator, we can't pay them
                    continue;
                }

                remaining_fee = unwrap_int!(remaining_fee.checked_sub(creator_fee));
                if creator_fee > 0 {
                    match from_tswap {
                        Some(from) => {
                            transfer_lamports_from_tswap(from, current_creator_info, creator_fee)?;
                        }
                        None => {
                            let FromExternal { from, sys_prog } = from_ext.as_ref().unwrap();
                            invoke(
                                &system_instruction::transfer(
                                    from.key,
                                    current_creator_info.key,
                                    creator_fee,
                                ),
                                &[
                                    (*from).clone(),
                                    current_creator_info.clone(),
                                    (*sys_prog).clone(),
                                ],
                            )?;
                        }
                    }
                }
            }
        }
        None => (),
    }

    // Return the amount that was sent (minus any dust).
    Ok(unwrap_int!(creators_fee.checked_sub(remaining_fee)))
}

/// Shared accounts between the two sell ixs.
#[derive(Accounts)]
#[instruction(config: PoolConfig)]
pub struct SellNftShared<'info> {
    #[account(
        seeds = [], bump = tswap.bump[0],
        has_one = fee_vault,
    )]
    pub tswap: Box<Account<'info, TSwap>>,

    //degenerate: fee_acc now === TSwap, keeping around to preserve backwards compatibility
    /// CHECK: has_one = fee_vault in tswap
    #[account(mut)]
    pub fee_vault: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            tswap.key().as_ref(),
            owner.key().as_ref(),
            whitelist.key().as_ref(),
            &[config.pool_type as u8],
            &[config.curve_type as u8],
            &config.starting_price.to_le_bytes(),
            &config.delta.to_le_bytes()
        ],
        bump = pool.bump[0],
        has_one = tswap, has_one = whitelist, has_one = sol_escrow, has_one = owner,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Needed for pool seeds derivation, also checked via has_one on pool
    #[account(
        seeds = [&whitelist.uuid],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub whitelist: Box<Account<'info, Whitelist>>,

    /// intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification
    /// CHECK: seeds below + assert_decode_mint_proof
    #[account(
        seeds = [
            b"mint_proof".as_ref(),
            nft_mint.key().as_ref(),
            whitelist.key().as_ref(),
        ],
        bump,
        seeds::program = tensor_whitelist::ID
    )]
    pub mint_proof: UncheckedAccount<'info>,

    #[account(mut, token::mint = nft_mint, token::authority = seller)]
    pub nft_seller_acc: Box<Account<'info, TokenAccount>>,

    /// CHECK: whitelist, token::mint in nft_seller_acc, associated_token::mint in owner_ata_acc
    pub nft_mint: Box<Account<'info, Mint>>,

    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: assert_decode_metadata + seeds below
    #[account(mut,
        seeds=[
            mpl_token_metadata::state::PREFIX.as_bytes(),
            mpl_token_metadata::id().as_ref(),
            nft_mint.key().as_ref(),
        ],
        seeds::program = mpl_token_metadata::id(),
        bump
    )]
    pub nft_metadata: UncheckedAccount<'info>,

    /// CHECK: has_one = escrow in pool
    #[account(
        mut,
        seeds=[
            b"sol_escrow".as_ref(),
            pool.key().as_ref(),
        ],
        bump = pool.sol_escrow_bump[0],
    )]
    pub sol_escrow: Box<Account<'info, SolEscrow>>,

    /// CHECK: has_one = owner in pool (owner is the buyer)
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,

    #[account(mut)]
    pub seller: Signer<'info>,
}

impl<'info> SellNftShared<'info> {
    pub fn verify_whitelist(&self) -> Result<()> {
        verify_whitelist(
            &self.whitelist,
            &self.mint_proof,
            &self.nft_mint,
            &self.nft_metadata,
        )
    }

    pub fn transfer_lamports_from_escrow(
        &self,
        to: &AccountInfo<'info>,
        lamports: u64,
    ) -> Result<()> {
        transfer_lamports_from_tswap(&self.sol_escrow.to_account_info(), to, lamports)
    }
}

#[allow(clippy::too_many_arguments)]
pub fn send_pnft<'info>(
    //for escrow accounts authority always === owner, for token accs can be diff but our protocol doesn't yet support that
    authority_and_owner: &AccountInfo<'info>,
    //(!) payer can't carry data, has to be a normal KP:
    // https://github.com/solana-labs/solana/blob/bda0c606a19ce1cc44b5ab638ff0b993f612e76c/runtime/src/system_instruction_processor.rs#L197
    payer: &AccountInfo<'info>,
    source_ata: &Account<'info, TokenAccount>,
    dest_ata: &Account<'info, TokenAccount>,
    dest_owner: &AccountInfo<'info>,
    nft_mint: &Account<'info, Mint>,
    nft_metadata: &UncheckedAccount<'info>,
    nft_edition: &UncheckedAccount<'info>,
    system_program: &Program<'info, System>,
    token_program: &Program<'info, Token>,
    ata_program: &Program<'info, AssociatedToken>,
    instructions: &UncheckedAccount<'info>,
    owner_token_record: &UncheckedAccount<'info>,
    dest_token_record: &UncheckedAccount<'info>,
    authorization_rules_program: &UncheckedAccount<'info>,
    rules_acc: Option<&AccountInfo<'info>>,
    authorization_data: Option<AuthorizationDataLocal>,
    //if passed, use signed_invoke() instead of invoke()
    tswap: Option<&Account<'info, TSwap>>,
    //if passed, we assign a delegate first, and the call signed_invoke() instead of invoke()
    delegate: Option<&Account<'info, TSwap>>,
) -> Result<()> {
    // --------------------------------------- transfer

    let mut builder = TransferBuilder::new();
    builder
        .authority(*authority_and_owner.key)
        .token_owner(*authority_and_owner.key)
        .token(source_ata.key())
        .destination_owner(*dest_owner.key)
        .destination(dest_ata.key())
        .mint(nft_mint.key())
        .metadata(nft_metadata.key())
        .edition(nft_edition.key())
        .payer(*payer.key);

    let mut account_infos = vec![
        //   0. `[writable]` Token account
        source_ata.to_account_info(),
        //   1. `[]` Token account owner
        authority_and_owner.to_account_info(),
        //   2. `[writable]` Destination token account
        dest_ata.to_account_info(),
        //   3. `[]` Destination token account owner
        dest_owner.to_account_info(),
        //   4. `[]` Mint of token asset
        nft_mint.to_account_info(),
        //   5. `[writable]` Metadata account
        nft_metadata.to_account_info(),
        //   6. `[optional]` Edition of token asset
        nft_edition.to_account_info(),
        //   7. `[signer] Transfer authority (token or delegate owner)
        authority_and_owner.to_account_info(),
        //   8. `[optional, writable]` Owner record PDA
        //passed in below, if needed
        //   9. `[optional, writable]` Destination record PDA
        //passed in below, if needed
        //   10. `[signer, writable]` Payer
        payer.to_account_info(),
        //   11. `[]` System Program
        system_program.to_account_info(),
        //   12. `[]` Instructions sysvar account
        instructions.to_account_info(),
        //   13. `[]` SPL Token Program
        token_program.to_account_info(),
        //   14. `[]` SPL Associated Token Account program
        ata_program.to_account_info(),
        //   15. `[optional]` Token Authorization Rules Program
        //passed in below, if needed
        //   16. `[optional]` Token Authorization Rules account
        //passed in below, if needed
    ];

    let metadata = assert_decode_metadata(nft_mint, nft_metadata)?;

    if let Some(standard) = metadata.token_standard {
        if standard == TokenStandard::ProgrammableNonFungible {
            msg!("programmable standard triggered");
            //1. add to builder
            builder
                .owner_token_record(owner_token_record.key())
                .destination_token_record(dest_token_record.key());

            //2. add to accounts (if try to pass these for non-pNFT, will get owner errors, since they don't exist)
            account_infos.push(owner_token_record.to_account_info());
            account_infos.push(dest_token_record.to_account_info());
        }
    }

    //if auth rules passed in, validate & include it in CPI call
    if let Some(config) = metadata.programmable_config {
        match config {
            V1 { rule_set } => {
                if let Some(rule_set) = rule_set {
                    msg!("ruleset triggered");
                    //safe to unwrap here, it's expected
                    let rules_acc = rules_acc.unwrap();

                    //1. validate
                    if rule_set != *rules_acc.key {
                        throw_err!(BadRuleSet);
                    }

                    //2. add to builder
                    builder.authorization_rules_program(*authorization_rules_program.key);
                    builder.authorization_rules(*rules_acc.key);

                    //3. add to accounts
                    account_infos.push(authorization_rules_program.to_account_info());
                    account_infos.push(rules_acc.to_account_info());

                    //4. invoke delegate if necessary
                    if let Some(delegate) = delegate {
                        let delegate_ix = DelegateBuilder::new()
                            .authority(*authority_and_owner.key)
                            .delegate(delegate.key())
                            .token(source_ata.key())
                            .mint(nft_mint.key())
                            .metadata(nft_metadata.key())
                            .master_edition(nft_edition.key())
                            .payer(*payer.key)
                            .spl_token_program(token_program.key())
                            .token_record(owner_token_record.key())
                            .authorization_rules(rules_acc.key())
                            .authorization_rules_program(authorization_rules_program.key())
                            .build(DelegateArgs::TransferV1 {
                                amount: 1,
                                authorization_data: authorization_data.clone().map(
                                    |authorization_data| {
                                        AuthorizationData::try_from(authorization_data).unwrap()
                                    },
                                ),
                            })
                            .unwrap()
                            .instruction();

                        let delegate_account_infos = vec![
                            //   0. `[optional, writable]` Delegate record account
                            // NO NEED
                            //   1. `[]` Delegated owner
                            delegate.to_account_info(),
                            //   2. `[writable]` Metadata account
                            nft_metadata.to_account_info(),
                            //   3. `[optional]` Master Edition account
                            nft_edition.to_account_info(),
                            //   4. `[optional, writable]` Token record account
                            owner_token_record.to_account_info(),
                            //   5. `[]` Mint account
                            nft_mint.to_account_info(),
                            //   6. `[optional, writable]` Token account
                            source_ata.to_account_info(),
                            //   7. `[signer]` Update authority or token owner
                            authority_and_owner.to_account_info(),
                            //   8. `[signer, writable]` Payer
                            payer.to_account_info(),
                            //   9. `[]` System Program
                            system_program.to_account_info(),
                            //   10. `[]` Instructions sysvar account
                            instructions.to_account_info(),
                            //   11. `[optional]` SPL Token Program
                            token_program.to_account_info(),
                            // ata_program.to_account_info(),
                            //   12. `[optional]` Token Authorization Rules program
                            authorization_rules_program.to_account_info(),
                            //   13. `[optional]` Token Authorization Rules account
                            rules_acc.to_account_info(),
                        ];

                        msg!("invoking delegate");
                        //always invoked normally
                        invoke(&delegate_ix, &delegate_account_infos)?;

                        //replace authority on the builder with the newly assigned delegate
                        builder.authority(delegate.key());
                        account_infos.push(delegate.to_account_info());
                    }
                }
            }
        }
    }

    let transfer_ix = builder
        .build(TransferArgs::V1 {
            amount: 1, //currently 1 only
            authorization_data: authorization_data
                .map(|authorization_data| AuthorizationData::try_from(authorization_data).unwrap()),
        })
        .unwrap()
        .instruction();

    if let Some(tswap) = tswap {
        invoke_signed(&transfer_ix, &account_infos, &[&tswap.seeds()])?;
    } else {
        invoke(&transfer_ix, &account_infos)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct ProgNftShared<'info> {
    //can't deserialize directly coz Anchor traits not implemented
    /// CHECK: address below
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: UncheckedAccount<'info>,

    //sysvar ixs don't deserialize in anchor
    /// CHECK: address below
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions: UncheckedAccount<'info>,

    /// CHECK: address below
    #[account(address = mpl_token_auth_rules::id())]
    pub authorization_rules_program: UncheckedAccount<'info>,
}

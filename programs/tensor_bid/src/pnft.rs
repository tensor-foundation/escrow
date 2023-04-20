//! importing all of this from Tensorswap doesn't fly, have to copy pasta

use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::{self, processor::AuthorizationData, state::TokenStandard};

use crate::*;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct AuthorizationDataLocal {
    pub payload: Vec<TaggedPayload>,
}
impl From<AuthorizationDataLocal> for AuthorizationData {
    fn from(val: AuthorizationDataLocal) -> Self {
        let mut p = Payload::new();
        val.payload.into_iter().for_each(|tp| {
            p.insert(tp.name, PayloadType::try_from(tp.payload).unwrap());
        });
        AuthorizationData { payload: p }
    }
}

//Unfortunately anchor doesn't like HashMaps, nor Tuples, so you can't pass in:
// HashMap<String, PayloadType>, nor
// Vec<(String, PayloadTypeLocal)>
// so have to create this stupid temp struct for IDL to serialize correctly
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct TaggedPayload {
    name: String,
    payload: PayloadTypeLocal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub enum PayloadTypeLocal {
    /// A plain `Pubkey`.
    Pubkey(Pubkey),
    /// PDA derivation seeds.
    Seeds(SeedsVecLocal),
    /// A merkle proof.
    MerkleProof(ProofInfoLocal),
    /// A plain `u64` used for `Amount`.
    Number(u64),
}
impl From<PayloadTypeLocal> for PayloadType {
    fn from(val: PayloadTypeLocal) -> Self {
        match val {
            PayloadTypeLocal::Pubkey(pubkey) => PayloadType::Pubkey(pubkey),
            PayloadTypeLocal::Seeds(seeds) => {
                PayloadType::Seeds(SeedsVec::try_from(seeds).unwrap())
            }
            PayloadTypeLocal::MerkleProof(proof) => {
                PayloadType::MerkleProof(ProofInfo::try_from(proof).unwrap())
            }
            PayloadTypeLocal::Number(number) => PayloadType::Number(number),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct SeedsVecLocal {
    /// The vector of derivation seeds.
    pub seeds: Vec<Vec<u8>>,
}
impl From<SeedsVecLocal> for SeedsVec {
    fn from(val: SeedsVecLocal) -> Self {
        SeedsVec { seeds: val.seeds }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct ProofInfoLocal {
    /// The merkle proof.
    pub proof: Vec<[u8; 32]>,
}
impl From<ProofInfoLocal> for ProofInfo {
    fn from(val: ProofInfoLocal) -> Self {
        ProofInfo { proof: val.proof }
    }
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

//have to duplicate this one because of signer seeds, but abstracted core logic into prep_pnft_transfer_ix
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
    authorization_data: Option<AuthorizationData>,
    //if passed, use signed_invoke() instead of invoke()
    bid_state: Option<&Account<'info, BidState>>,
    //if passed, we assign a delegate first, and the call signed_invoke() instead of invoke()
    delegate: Option<&AccountInfo<'info>>,
) -> Result<()> {
    // TODO temp for non-pNFTs, do a normal transfer, while metaplex fixes their stuff
    // else we get this error https://solscan.io/tx/5iZSYkpccN1X49vEtHwh5CoRU2TbaCN5Ebf3BPUGmbjnFevS12hAeaqpxwRbabqhao1og7rV1sg7w1ofNxZvM58m

    let metadata = assert_decode_metadata(nft_mint, nft_metadata)?;

    if metadata.token_standard.is_none()
        || metadata.token_standard.unwrap() != TokenStandard::ProgrammableNonFungible
    {
        // msg!("non-pnft / no token std, normal transfer");

        let ctx = CpiContext::new(
            token_program.to_account_info(),
            Transfer {
                from: source_ata.to_account_info(),
                to: dest_ata.to_account_info(),
                authority: authority_and_owner.to_account_info(),
            },
        );

        if let Some(bid_state) = bid_state {
            token::transfer(ctx.with_signer(&[&bid_state.seeds()]), 1)?;
        } else {
            token::transfer(ctx, 1)?;
        }

        return Ok(());
    }

    // --------------------------------------- pnft transfer

    let (transfer_ix, account_infos) = prep_pnft_transfer_ix(
        authority_and_owner,
        payer,
        source_ata,
        dest_ata,
        dest_owner,
        nft_mint,
        nft_metadata,
        nft_edition,
        system_program,
        token_program,
        ata_program,
        instructions,
        owner_token_record,
        dest_token_record,
        authorization_rules_program,
        rules_acc,
        authorization_data,
        delegate,
    )?;

    if let Some(bid_state) = bid_state {
        invoke_signed(&transfer_ix, &account_infos, &[&bid_state.seeds()])?;
    } else {
        invoke(&transfer_ix, &account_infos)?;
    }

    Ok(())
}

/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { Address } from '@solana/addresses';
import {
  Codec,
  Decoder,
  Encoder,
  combineCodec,
  mapEncoder,
} from '@solana/codecs-core';
import {
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import { getU8Decoder, getU8Encoder } from '@solana/codecs-numbers';
import {
  AccountRole,
  IAccountMeta,
  IInstruction,
  IInstructionWithAccounts,
  IInstructionWithData,
  ReadonlyAccount,
  ReadonlySignerAccount,
  WritableAccount,
  WritableSignerAccount,
} from '@solana/instructions';
import {
  Option,
  OptionOrNullable,
  getOptionDecoder,
  getOptionEncoder,
  none,
} from '@solana/options';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import { findMetadataDelegateRecordPda, findMetadataPda } from '../pdas';
import {
  ResolvedAccount,
  accountMetaWithDefault,
  expectAddress,
  expectSome,
  getAccountMetasWithSigners,
} from '../shared';
import {
  AuthorizationData,
  AuthorizationDataArgs,
  CollectionToggle,
  CollectionToggleArgs,
  MetadataDelegateRole,
  collectionToggle,
  getAuthorizationDataDecoder,
  getAuthorizationDataEncoder,
  getCollectionToggleDecoder,
  getCollectionToggleEncoder,
} from '../types';

export type UpdateAsCollectionItemDelegateV2Instruction<
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  TAccountAuthority extends string | IAccountMeta<string> = string,
  TAccountDelegateRecord extends string | IAccountMeta<string> = string,
  TAccountToken extends string | IAccountMeta<string> = string,
  TAccountMint extends string | IAccountMeta<string> = string,
  TAccountMetadata extends string | IAccountMeta<string> = string,
  TAccountEdition extends string | IAccountMeta<string> = string,
  TAccountPayer extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountSysvarInstructions extends
    | string
    | IAccountMeta<string> = 'Sysvar1nstructions1111111111111111111111111',
  TAccountAuthorizationRulesProgram extends
    | string
    | IAccountMeta<string> = string,
  TAccountAuthorizationRules extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountAuthority extends string
        ? ReadonlySignerAccount<TAccountAuthority>
        : TAccountAuthority,
      TAccountDelegateRecord extends string
        ? ReadonlyAccount<TAccountDelegateRecord>
        : TAccountDelegateRecord,
      TAccountToken extends string
        ? ReadonlyAccount<TAccountToken>
        : TAccountToken,
      TAccountMint extends string
        ? ReadonlyAccount<TAccountMint>
        : TAccountMint,
      TAccountMetadata extends string
        ? WritableAccount<TAccountMetadata>
        : TAccountMetadata,
      TAccountEdition extends string
        ? ReadonlyAccount<TAccountEdition>
        : TAccountEdition,
      TAccountPayer extends string
        ? WritableSignerAccount<TAccountPayer>
        : TAccountPayer,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountSysvarInstructions extends string
        ? ReadonlyAccount<TAccountSysvarInstructions>
        : TAccountSysvarInstructions,
      TAccountAuthorizationRulesProgram extends string
        ? ReadonlyAccount<TAccountAuthorizationRulesProgram>
        : TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules extends string
        ? ReadonlyAccount<TAccountAuthorizationRules>
        : TAccountAuthorizationRules,
      ...TRemainingAccounts
    ]
  >;

export type UpdateAsCollectionItemDelegateV2InstructionWithSigners<
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  TAccountAuthority extends string | IAccountMeta<string> = string,
  TAccountDelegateRecord extends string | IAccountMeta<string> = string,
  TAccountToken extends string | IAccountMeta<string> = string,
  TAccountMint extends string | IAccountMeta<string> = string,
  TAccountMetadata extends string | IAccountMeta<string> = string,
  TAccountEdition extends string | IAccountMeta<string> = string,
  TAccountPayer extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountSysvarInstructions extends
    | string
    | IAccountMeta<string> = 'Sysvar1nstructions1111111111111111111111111',
  TAccountAuthorizationRulesProgram extends
    | string
    | IAccountMeta<string> = string,
  TAccountAuthorizationRules extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountAuthority extends string
        ? ReadonlySignerAccount<TAccountAuthority> &
            IAccountSignerMeta<TAccountAuthority>
        : TAccountAuthority,
      TAccountDelegateRecord extends string
        ? ReadonlyAccount<TAccountDelegateRecord>
        : TAccountDelegateRecord,
      TAccountToken extends string
        ? ReadonlyAccount<TAccountToken>
        : TAccountToken,
      TAccountMint extends string
        ? ReadonlyAccount<TAccountMint>
        : TAccountMint,
      TAccountMetadata extends string
        ? WritableAccount<TAccountMetadata>
        : TAccountMetadata,
      TAccountEdition extends string
        ? ReadonlyAccount<TAccountEdition>
        : TAccountEdition,
      TAccountPayer extends string
        ? WritableSignerAccount<TAccountPayer> &
            IAccountSignerMeta<TAccountPayer>
        : TAccountPayer,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountSysvarInstructions extends string
        ? ReadonlyAccount<TAccountSysvarInstructions>
        : TAccountSysvarInstructions,
      TAccountAuthorizationRulesProgram extends string
        ? ReadonlyAccount<TAccountAuthorizationRulesProgram>
        : TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules extends string
        ? ReadonlyAccount<TAccountAuthorizationRules>
        : TAccountAuthorizationRules,
      ...TRemainingAccounts
    ]
  >;

export type UpdateAsCollectionItemDelegateV2InstructionData = {
  discriminator: number;
  updateAsCollectionItemDelegateV2Discriminator: number;
  collection: CollectionToggle;
  authorizationData: Option<AuthorizationData>;
};

export type UpdateAsCollectionItemDelegateV2InstructionDataArgs = {
  collection?: CollectionToggleArgs;
  authorizationData?: OptionOrNullable<AuthorizationDataArgs>;
};

export function getUpdateAsCollectionItemDelegateV2InstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: number;
      updateAsCollectionItemDelegateV2Discriminator: number;
      collection: CollectionToggleArgs;
      authorizationData: OptionOrNullable<AuthorizationDataArgs>;
    }>([
      ['discriminator', getU8Encoder()],
      ['updateAsCollectionItemDelegateV2Discriminator', getU8Encoder()],
      ['collection', getCollectionToggleEncoder()],
      ['authorizationData', getOptionEncoder(getAuthorizationDataEncoder())],
    ]),
    (value) => ({
      ...value,
      discriminator: 50,
      updateAsCollectionItemDelegateV2Discriminator: 7,
      collection: value.collection ?? collectionToggle('None'),
      authorizationData: value.authorizationData ?? none(),
    })
  ) satisfies Encoder<UpdateAsCollectionItemDelegateV2InstructionDataArgs>;
}

export function getUpdateAsCollectionItemDelegateV2InstructionDataDecoder() {
  return getStructDecoder<UpdateAsCollectionItemDelegateV2InstructionData>([
    ['discriminator', getU8Decoder()],
    ['updateAsCollectionItemDelegateV2Discriminator', getU8Decoder()],
    ['collection', getCollectionToggleDecoder()],
    ['authorizationData', getOptionDecoder(getAuthorizationDataDecoder())],
  ]) satisfies Decoder<UpdateAsCollectionItemDelegateV2InstructionData>;
}

export function getUpdateAsCollectionItemDelegateV2InstructionDataCodec(): Codec<
  UpdateAsCollectionItemDelegateV2InstructionDataArgs,
  UpdateAsCollectionItemDelegateV2InstructionData
> {
  return combineCodec(
    getUpdateAsCollectionItemDelegateV2InstructionDataEncoder(),
    getUpdateAsCollectionItemDelegateV2InstructionDataDecoder()
  );
}

export type UpdateAsCollectionItemDelegateV2InstructionExtraArgs = {
  updateAuthority: Address;
};

export type UpdateAsCollectionItemDelegateV2AsyncInput<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Update authority or delegate */
  authority: Address<TAccountAuthority>;
  /** Delegate record PDA */
  delegateRecord?: Address<TAccountDelegateRecord>;
  /** Token account */
  token?: Address<TAccountToken>;
  /** Mint account */
  mint: Address<TAccountMint>;
  /** Metadata account */
  metadata?: Address<TAccountMetadata>;
  /** Edition account */
  edition?: Address<TAccountEdition>;
  /** Payer */
  payer: Address<TAccountPayer>;
  /** System program */
  systemProgram?: Address<TAccountSystemProgram>;
  /** Instructions sysvar account */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  collection?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['collection'];
  authorizationData?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['authorizationData'];
  updateAuthority?: UpdateAsCollectionItemDelegateV2InstructionExtraArgs['updateAuthority'];
};

export type UpdateAsCollectionItemDelegateV2AsyncInputWithSigners<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Update authority or delegate */
  authority: TransactionSigner<TAccountAuthority>;
  /** Delegate record PDA */
  delegateRecord?: Address<TAccountDelegateRecord>;
  /** Token account */
  token?: Address<TAccountToken>;
  /** Mint account */
  mint: Address<TAccountMint>;
  /** Metadata account */
  metadata?: Address<TAccountMetadata>;
  /** Edition account */
  edition?: Address<TAccountEdition>;
  /** Payer */
  payer: TransactionSigner<TAccountPayer>;
  /** System program */
  systemProgram?: Address<TAccountSystemProgram>;
  /** Instructions sysvar account */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  collection?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['collection'];
  authorizationData?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['authorizationData'];
  updateAuthority?: UpdateAsCollectionItemDelegateV2InstructionExtraArgs['updateAuthority'];
};

export async function getUpdateAsCollectionItemDelegateV2InstructionAsync<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UpdateAsCollectionItemDelegateV2AsyncInputWithSigners<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): Promise<
  UpdateAsCollectionItemDelegateV2InstructionWithSigners<
    TProgram,
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
>;
export async function getUpdateAsCollectionItemDelegateV2InstructionAsync<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UpdateAsCollectionItemDelegateV2AsyncInput<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): Promise<
  UpdateAsCollectionItemDelegateV2Instruction<
    TProgram,
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
>;
export async function getUpdateAsCollectionItemDelegateV2InstructionAsync<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UpdateAsCollectionItemDelegateV2AsyncInput<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): Promise<IInstruction> {
  // Program address.
  const programAddress =
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getUpdateAsCollectionItemDelegateV2InstructionRaw<
      TProgram,
      TAccountAuthority,
      TAccountDelegateRecord,
      TAccountToken,
      TAccountMint,
      TAccountMetadata,
      TAccountEdition,
      TAccountPayer,
      TAccountSystemProgram,
      TAccountSysvarInstructions,
      TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    authority: { value: input.authority ?? null, isWritable: false },
    delegateRecord: { value: input.delegateRecord ?? null, isWritable: false },
    token: { value: input.token ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: false },
    metadata: { value: input.metadata ?? null, isWritable: true },
    edition: { value: input.edition ?? null, isWritable: false },
    payer: { value: input.payer ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    sysvarInstructions: {
      value: input.sysvarInstructions ?? null,
      isWritable: false,
    },
    authorizationRulesProgram: {
      value: input.authorizationRulesProgram ?? null,
      isWritable: false,
    },
    authorizationRules: {
      value: input.authorizationRules ?? null,
      isWritable: false,
    },
  };

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.delegateRecord.value) {
    accounts.delegateRecord.value = await findMetadataDelegateRecordPda({
      delegateRole: MetadataDelegateRole.CollectionItem,
      updateAuthority: expectSome(args.updateAuthority),
      delegate: expectAddress(accounts.authority.value),
    });
  }
  if (!accounts.metadata.value) {
    accounts.metadata.value = await findMetadataPda({
      mint: expectAddress(accounts.mint.value),
    });
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }
  if (!accounts.sysvarInstructions.value) {
    accounts.sysvarInstructions.value =
      'Sysvar1nstructions1111111111111111111111111' as Address<'Sysvar1nstructions1111111111111111111111111'>;
  }
  if (!accounts.authorizationRulesProgram.value) {
    if (accounts.authorizationRules.value) {
      accounts.authorizationRulesProgram.value =
        'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg' as Address<'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'>;
    }
  }

  // Get account metas and signers.
  const accountMetas = getAccountMetasWithSigners(
    accounts,
    'programId',
    programAddress
  );

  const instruction = getUpdateAsCollectionItemDelegateV2InstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as UpdateAsCollectionItemDelegateV2InstructionDataArgs,
    programAddress
  );

  return instruction;
}

export type UpdateAsCollectionItemDelegateV2Input<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Update authority or delegate */
  authority: Address<TAccountAuthority>;
  /** Delegate record PDA */
  delegateRecord?: Address<TAccountDelegateRecord>;
  /** Token account */
  token?: Address<TAccountToken>;
  /** Mint account */
  mint: Address<TAccountMint>;
  /** Metadata account */
  metadata: Address<TAccountMetadata>;
  /** Edition account */
  edition?: Address<TAccountEdition>;
  /** Payer */
  payer: Address<TAccountPayer>;
  /** System program */
  systemProgram?: Address<TAccountSystemProgram>;
  /** Instructions sysvar account */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  collection?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['collection'];
  authorizationData?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['authorizationData'];
  updateAuthority?: UpdateAsCollectionItemDelegateV2InstructionExtraArgs['updateAuthority'];
};

export type UpdateAsCollectionItemDelegateV2InputWithSigners<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Update authority or delegate */
  authority: TransactionSigner<TAccountAuthority>;
  /** Delegate record PDA */
  delegateRecord?: Address<TAccountDelegateRecord>;
  /** Token account */
  token?: Address<TAccountToken>;
  /** Mint account */
  mint: Address<TAccountMint>;
  /** Metadata account */
  metadata: Address<TAccountMetadata>;
  /** Edition account */
  edition?: Address<TAccountEdition>;
  /** Payer */
  payer: TransactionSigner<TAccountPayer>;
  /** System program */
  systemProgram?: Address<TAccountSystemProgram>;
  /** Instructions sysvar account */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  collection?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['collection'];
  authorizationData?: UpdateAsCollectionItemDelegateV2InstructionDataArgs['authorizationData'];
  updateAuthority?: UpdateAsCollectionItemDelegateV2InstructionExtraArgs['updateAuthority'];
};

export function getUpdateAsCollectionItemDelegateV2Instruction<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UpdateAsCollectionItemDelegateV2InputWithSigners<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): UpdateAsCollectionItemDelegateV2InstructionWithSigners<
  TProgram,
  TAccountAuthority,
  TAccountDelegateRecord,
  TAccountToken,
  TAccountMint,
  TAccountMetadata,
  TAccountEdition,
  TAccountPayer,
  TAccountSystemProgram,
  TAccountSysvarInstructions,
  TAccountAuthorizationRulesProgram,
  TAccountAuthorizationRules
>;
export function getUpdateAsCollectionItemDelegateV2Instruction<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UpdateAsCollectionItemDelegateV2Input<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): UpdateAsCollectionItemDelegateV2Instruction<
  TProgram,
  TAccountAuthority,
  TAccountDelegateRecord,
  TAccountToken,
  TAccountMint,
  TAccountMetadata,
  TAccountEdition,
  TAccountPayer,
  TAccountSystemProgram,
  TAccountSysvarInstructions,
  TAccountAuthorizationRulesProgram,
  TAccountAuthorizationRules
>;
export function getUpdateAsCollectionItemDelegateV2Instruction<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UpdateAsCollectionItemDelegateV2Input<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): IInstruction {
  // Program address.
  const programAddress =
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getUpdateAsCollectionItemDelegateV2InstructionRaw<
      TProgram,
      TAccountAuthority,
      TAccountDelegateRecord,
      TAccountToken,
      TAccountMint,
      TAccountMetadata,
      TAccountEdition,
      TAccountPayer,
      TAccountSystemProgram,
      TAccountSysvarInstructions,
      TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    authority: { value: input.authority ?? null, isWritable: false },
    delegateRecord: { value: input.delegateRecord ?? null, isWritable: false },
    token: { value: input.token ?? null, isWritable: false },
    mint: { value: input.mint ?? null, isWritable: false },
    metadata: { value: input.metadata ?? null, isWritable: true },
    edition: { value: input.edition ?? null, isWritable: false },
    payer: { value: input.payer ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    sysvarInstructions: {
      value: input.sysvarInstructions ?? null,
      isWritable: false,
    },
    authorizationRulesProgram: {
      value: input.authorizationRulesProgram ?? null,
      isWritable: false,
    },
    authorizationRules: {
      value: input.authorizationRules ?? null,
      isWritable: false,
    },
  };

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }
  if (!accounts.sysvarInstructions.value) {
    accounts.sysvarInstructions.value =
      'Sysvar1nstructions1111111111111111111111111' as Address<'Sysvar1nstructions1111111111111111111111111'>;
  }
  if (!accounts.authorizationRulesProgram.value) {
    if (accounts.authorizationRules.value) {
      accounts.authorizationRulesProgram.value =
        'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg' as Address<'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'>;
    }
  }

  // Get account metas and signers.
  const accountMetas = getAccountMetasWithSigners(
    accounts,
    'programId',
    programAddress
  );

  const instruction = getUpdateAsCollectionItemDelegateV2InstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as UpdateAsCollectionItemDelegateV2InstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getUpdateAsCollectionItemDelegateV2InstructionRaw<
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  TAccountAuthority extends string | IAccountMeta<string> = string,
  TAccountDelegateRecord extends string | IAccountMeta<string> = string,
  TAccountToken extends string | IAccountMeta<string> = string,
  TAccountMint extends string | IAccountMeta<string> = string,
  TAccountMetadata extends string | IAccountMeta<string> = string,
  TAccountEdition extends string | IAccountMeta<string> = string,
  TAccountPayer extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountSysvarInstructions extends
    | string
    | IAccountMeta<string> = 'Sysvar1nstructions1111111111111111111111111',
  TAccountAuthorizationRulesProgram extends
    | string
    | IAccountMeta<string> = string,
  TAccountAuthorizationRules extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    authority: TAccountAuthority extends string
      ? Address<TAccountAuthority>
      : TAccountAuthority;
    delegateRecord?: TAccountDelegateRecord extends string
      ? Address<TAccountDelegateRecord>
      : TAccountDelegateRecord;
    token?: TAccountToken extends string
      ? Address<TAccountToken>
      : TAccountToken;
    mint: TAccountMint extends string ? Address<TAccountMint> : TAccountMint;
    metadata: TAccountMetadata extends string
      ? Address<TAccountMetadata>
      : TAccountMetadata;
    edition?: TAccountEdition extends string
      ? Address<TAccountEdition>
      : TAccountEdition;
    payer: TAccountPayer extends string
      ? Address<TAccountPayer>
      : TAccountPayer;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
    sysvarInstructions?: TAccountSysvarInstructions extends string
      ? Address<TAccountSysvarInstructions>
      : TAccountSysvarInstructions;
    authorizationRulesProgram?: TAccountAuthorizationRulesProgram extends string
      ? Address<TAccountAuthorizationRulesProgram>
      : TAccountAuthorizationRulesProgram;
    authorizationRules?: TAccountAuthorizationRules extends string
      ? Address<TAccountAuthorizationRules>
      : TAccountAuthorizationRules;
  },
  args: UpdateAsCollectionItemDelegateV2InstructionDataArgs,
  programAddress: Address<TProgram> = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.authority, AccountRole.READONLY_SIGNER),
      accountMetaWithDefault(
        accounts.delegateRecord ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.token ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.mint, AccountRole.READONLY),
      accountMetaWithDefault(accounts.metadata, AccountRole.WRITABLE),
      accountMetaWithDefault(
        accounts.edition ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.payer, AccountRole.WRITABLE_SIGNER),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.sysvarInstructions ??
          ('Sysvar1nstructions1111111111111111111111111' as Address<'Sysvar1nstructions1111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.authorizationRulesProgram ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.authorizationRules ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.READONLY
      ),
      ...(remainingAccounts ?? []),
    ],
    data: getUpdateAsCollectionItemDelegateV2InstructionDataEncoder().encode(
      args
    ),
    programAddress,
  } as UpdateAsCollectionItemDelegateV2Instruction<
    TProgram,
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules,
    TRemainingAccounts
  >;
}

export type ParsedUpdateAsCollectionItemDelegateV2Instruction<
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    /** Update authority or delegate */
    authority: TAccountMetas[0];
    /** Delegate record PDA */
    delegateRecord?: TAccountMetas[1] | undefined;
    /** Token account */
    token?: TAccountMetas[2] | undefined;
    /** Mint account */
    mint: TAccountMetas[3];
    /** Metadata account */
    metadata: TAccountMetas[4];
    /** Edition account */
    edition?: TAccountMetas[5] | undefined;
    /** Payer */
    payer: TAccountMetas[6];
    /** System program */
    systemProgram: TAccountMetas[7];
    /** Instructions sysvar account */
    sysvarInstructions: TAccountMetas[8];
    /** Token Authorization Rules Program */
    authorizationRulesProgram?: TAccountMetas[9] | undefined;
    /** Token Authorization Rules account */
    authorizationRules?: TAccountMetas[10] | undefined;
  };
  data: UpdateAsCollectionItemDelegateV2InstructionData;
};

export function parseUpdateAsCollectionItemDelegateV2Instruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedUpdateAsCollectionItemDelegateV2Instruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 11) {
    // TODO: Coded error.
    throw new Error('Not enough accounts');
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  const getNextOptionalAccount = () => {
    const accountMeta = getNextAccount();
    return accountMeta.address === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
      ? undefined
      : accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      authority: getNextAccount(),
      delegateRecord: getNextOptionalAccount(),
      token: getNextOptionalAccount(),
      mint: getNextAccount(),
      metadata: getNextAccount(),
      edition: getNextOptionalAccount(),
      payer: getNextAccount(),
      systemProgram: getNextAccount(),
      sysvarInstructions: getNextAccount(),
      authorizationRulesProgram: getNextOptionalAccount(),
      authorizationRules: getNextOptionalAccount(),
    },
    data: getUpdateAsCollectionItemDelegateV2InstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
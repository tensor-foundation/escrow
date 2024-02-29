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
} from '@solana/instructions';
import {
  Option,
  OptionOrNullable,
  getOptionDecoder,
  getOptionEncoder,
  none,
} from '@solana/options';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import { findMetadataPda } from '../pdas';
import {
  ResolvedAccount,
  accountMetaWithDefault,
  expectAddress,
  getAccountMetasWithSigners,
} from '../shared';
import {
  AuthorizationData,
  AuthorizationDataArgs,
  getAuthorizationDataDecoder,
  getAuthorizationDataEncoder,
} from '../types';

export type UseV1Instruction<
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
  TAccountSplTokenProgram extends string | IAccountMeta<string> = string,
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
        ? WritableAccount<TAccountDelegateRecord>
        : TAccountDelegateRecord,
      TAccountToken extends string
        ? WritableAccount<TAccountToken>
        : TAccountToken,
      TAccountMint extends string
        ? ReadonlyAccount<TAccountMint>
        : TAccountMint,
      TAccountMetadata extends string
        ? WritableAccount<TAccountMetadata>
        : TAccountMetadata,
      TAccountEdition extends string
        ? WritableAccount<TAccountEdition>
        : TAccountEdition,
      TAccountPayer extends string
        ? ReadonlySignerAccount<TAccountPayer>
        : TAccountPayer,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountSysvarInstructions extends string
        ? ReadonlyAccount<TAccountSysvarInstructions>
        : TAccountSysvarInstructions,
      TAccountSplTokenProgram extends string
        ? ReadonlyAccount<TAccountSplTokenProgram>
        : TAccountSplTokenProgram,
      TAccountAuthorizationRulesProgram extends string
        ? ReadonlyAccount<TAccountAuthorizationRulesProgram>
        : TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules extends string
        ? ReadonlyAccount<TAccountAuthorizationRules>
        : TAccountAuthorizationRules,
      ...TRemainingAccounts
    ]
  >;

export type UseV1InstructionWithSigners<
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
  TAccountSplTokenProgram extends string | IAccountMeta<string> = string,
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
        ? WritableAccount<TAccountDelegateRecord>
        : TAccountDelegateRecord,
      TAccountToken extends string
        ? WritableAccount<TAccountToken>
        : TAccountToken,
      TAccountMint extends string
        ? ReadonlyAccount<TAccountMint>
        : TAccountMint,
      TAccountMetadata extends string
        ? WritableAccount<TAccountMetadata>
        : TAccountMetadata,
      TAccountEdition extends string
        ? WritableAccount<TAccountEdition>
        : TAccountEdition,
      TAccountPayer extends string
        ? ReadonlySignerAccount<TAccountPayer> &
            IAccountSignerMeta<TAccountPayer>
        : TAccountPayer,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountSysvarInstructions extends string
        ? ReadonlyAccount<TAccountSysvarInstructions>
        : TAccountSysvarInstructions,
      TAccountSplTokenProgram extends string
        ? ReadonlyAccount<TAccountSplTokenProgram>
        : TAccountSplTokenProgram,
      TAccountAuthorizationRulesProgram extends string
        ? ReadonlyAccount<TAccountAuthorizationRulesProgram>
        : TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules extends string
        ? ReadonlyAccount<TAccountAuthorizationRules>
        : TAccountAuthorizationRules,
      ...TRemainingAccounts
    ]
  >;

export type UseV1InstructionData = {
  discriminator: number;
  useV1Discriminator: number;
  authorizationData: Option<AuthorizationData>;
};

export type UseV1InstructionDataArgs = {
  authorizationData?: OptionOrNullable<AuthorizationDataArgs>;
};

export function getUseV1InstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: number;
      useV1Discriminator: number;
      authorizationData: OptionOrNullable<AuthorizationDataArgs>;
    }>([
      ['discriminator', getU8Encoder()],
      ['useV1Discriminator', getU8Encoder()],
      ['authorizationData', getOptionEncoder(getAuthorizationDataEncoder())],
    ]),
    (value) => ({
      ...value,
      discriminator: 51,
      useV1Discriminator: 0,
      authorizationData: value.authorizationData ?? none(),
    })
  ) satisfies Encoder<UseV1InstructionDataArgs>;
}

export function getUseV1InstructionDataDecoder() {
  return getStructDecoder<UseV1InstructionData>([
    ['discriminator', getU8Decoder()],
    ['useV1Discriminator', getU8Decoder()],
    ['authorizationData', getOptionDecoder(getAuthorizationDataDecoder())],
  ]) satisfies Decoder<UseV1InstructionData>;
}

export function getUseV1InstructionDataCodec(): Codec<
  UseV1InstructionDataArgs,
  UseV1InstructionData
> {
  return combineCodec(
    getUseV1InstructionDataEncoder(),
    getUseV1InstructionDataDecoder()
  );
}

export type UseV1AsyncInput<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Token owner or delegate */
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
  /** System program */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** SPL Token Program */
  splTokenProgram?: Address<TAccountSplTokenProgram>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  authorizationData?: UseV1InstructionDataArgs['authorizationData'];
};

export type UseV1AsyncInputWithSigners<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Token owner or delegate */
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
  /** System program */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** SPL Token Program */
  splTokenProgram?: Address<TAccountSplTokenProgram>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  authorizationData?: UseV1InstructionDataArgs['authorizationData'];
};

export async function getUseV1InstructionAsync<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UseV1AsyncInputWithSigners<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): Promise<
  UseV1InstructionWithSigners<
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
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
>;
export async function getUseV1InstructionAsync<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UseV1AsyncInput<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): Promise<
  UseV1Instruction<
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
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
>;
export async function getUseV1InstructionAsync<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UseV1AsyncInput<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): Promise<IInstruction> {
  // Program address.
  const programAddress =
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getUseV1InstructionRaw<
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
      TAccountSplTokenProgram,
      TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    authority: { value: input.authority ?? null, isWritable: false },
    delegateRecord: { value: input.delegateRecord ?? null, isWritable: true },
    token: { value: input.token ?? null, isWritable: true },
    mint: { value: input.mint ?? null, isWritable: false },
    metadata: { value: input.metadata ?? null, isWritable: true },
    edition: { value: input.edition ?? null, isWritable: true },
    payer: { value: input.payer ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    sysvarInstructions: {
      value: input.sysvarInstructions ?? null,
      isWritable: false,
    },
    splTokenProgram: {
      value: input.splTokenProgram ?? null,
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

  const instruction = getUseV1InstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as UseV1InstructionDataArgs,
    programAddress
  );

  return instruction;
}

export type UseV1Input<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Token owner or delegate */
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
  /** System program */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** SPL Token Program */
  splTokenProgram?: Address<TAccountSplTokenProgram>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  authorizationData?: UseV1InstructionDataArgs['authorizationData'];
};

export type UseV1InputWithSigners<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string
> = {
  /** Token owner or delegate */
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
  /** System program */
  sysvarInstructions?: Address<TAccountSysvarInstructions>;
  /** SPL Token Program */
  splTokenProgram?: Address<TAccountSplTokenProgram>;
  /** Token Authorization Rules Program */
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Token Authorization Rules account */
  authorizationRules?: Address<TAccountAuthorizationRules>;
  authorizationData?: UseV1InstructionDataArgs['authorizationData'];
};

export function getUseV1Instruction<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UseV1InputWithSigners<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): UseV1InstructionWithSigners<
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
  TAccountSplTokenProgram,
  TAccountAuthorizationRulesProgram,
  TAccountAuthorizationRules
>;
export function getUseV1Instruction<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UseV1Input<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): UseV1Instruction<
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
  TAccountSplTokenProgram,
  TAccountAuthorizationRulesProgram,
  TAccountAuthorizationRules
>;
export function getUseV1Instruction<
  TAccountAuthority extends string,
  TAccountDelegateRecord extends string,
  TAccountToken extends string,
  TAccountMint extends string,
  TAccountMetadata extends string,
  TAccountEdition extends string,
  TAccountPayer extends string,
  TAccountSystemProgram extends string,
  TAccountSysvarInstructions extends string,
  TAccountSplTokenProgram extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountAuthorizationRules extends string,
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
>(
  input: UseV1Input<
    TAccountAuthority,
    TAccountDelegateRecord,
    TAccountToken,
    TAccountMint,
    TAccountMetadata,
    TAccountEdition,
    TAccountPayer,
    TAccountSystemProgram,
    TAccountSysvarInstructions,
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules
  >
): IInstruction {
  // Program address.
  const programAddress =
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getUseV1InstructionRaw<
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
      TAccountSplTokenProgram,
      TAccountAuthorizationRulesProgram,
      TAccountAuthorizationRules
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    authority: { value: input.authority ?? null, isWritable: false },
    delegateRecord: { value: input.delegateRecord ?? null, isWritable: true },
    token: { value: input.token ?? null, isWritable: true },
    mint: { value: input.mint ?? null, isWritable: false },
    metadata: { value: input.metadata ?? null, isWritable: true },
    edition: { value: input.edition ?? null, isWritable: true },
    payer: { value: input.payer ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    sysvarInstructions: {
      value: input.sysvarInstructions ?? null,
      isWritable: false,
    },
    splTokenProgram: {
      value: input.splTokenProgram ?? null,
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

  const instruction = getUseV1InstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as UseV1InstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getUseV1InstructionRaw<
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
  TAccountSplTokenProgram extends string | IAccountMeta<string> = string,
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
    splTokenProgram?: TAccountSplTokenProgram extends string
      ? Address<TAccountSplTokenProgram>
      : TAccountSplTokenProgram;
    authorizationRulesProgram?: TAccountAuthorizationRulesProgram extends string
      ? Address<TAccountAuthorizationRulesProgram>
      : TAccountAuthorizationRulesProgram;
    authorizationRules?: TAccountAuthorizationRules extends string
      ? Address<TAccountAuthorizationRules>
      : TAccountAuthorizationRules;
  },
  args: UseV1InstructionDataArgs,
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
        AccountRole.WRITABLE
      ),
      accountMetaWithDefault(
        accounts.token ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.WRITABLE
      ),
      accountMetaWithDefault(accounts.mint, AccountRole.READONLY),
      accountMetaWithDefault(accounts.metadata, AccountRole.WRITABLE),
      accountMetaWithDefault(
        accounts.edition ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
        AccountRole.WRITABLE
      ),
      accountMetaWithDefault(accounts.payer, AccountRole.READONLY_SIGNER),
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
        accounts.splTokenProgram ?? {
          address:
            'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>,
          role: AccountRole.READONLY,
        },
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
    data: getUseV1InstructionDataEncoder().encode(args),
    programAddress,
  } as UseV1Instruction<
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
    TAccountSplTokenProgram,
    TAccountAuthorizationRulesProgram,
    TAccountAuthorizationRules,
    TRemainingAccounts
  >;
}

export type ParsedUseV1Instruction<
  TProgram extends string = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    /** Token owner or delegate */
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
    /** System program */
    sysvarInstructions: TAccountMetas[8];
    /** SPL Token Program */
    splTokenProgram?: TAccountMetas[9] | undefined;
    /** Token Authorization Rules Program */
    authorizationRulesProgram?: TAccountMetas[10] | undefined;
    /** Token Authorization Rules account */
    authorizationRules?: TAccountMetas[11] | undefined;
  };
  data: UseV1InstructionData;
};

export function parseUseV1Instruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedUseV1Instruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 12) {
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
      splTokenProgram: getNextOptionalAccount(),
      authorizationRulesProgram: getNextOptionalAccount(),
      authorizationRules: getNextOptionalAccount(),
    },
    data: getUseV1InstructionDataDecoder().decode(instruction.data),
  };
}

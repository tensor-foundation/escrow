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
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
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
  WritableAccount,
  WritableSignerAccount,
} from '@solana/instructions';
import {
  Option,
  OptionOrNullable,
  getOptionDecoder,
  getOptionEncoder,
} from '@solana/options';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import {
  ResolvedAccount,
  accountMetaWithDefault,
  getAccountMetasWithSigners,
} from '../shared';
import {
  AuthorizationDataLocal,
  AuthorizationDataLocalArgs,
  PoolConfig,
  PoolConfigArgs,
  getAuthorizationDataLocalDecoder,
  getAuthorizationDataLocalEncoder,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type WithdrawNftInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftDest extends string | IAccountMeta<string> = string,
  TAccountNftMint extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountRent extends
    | string
    | IAccountMeta<string> = 'SysvarRent111111111111111111111111111111111',
  TAccountNftMetadata extends string | IAccountMeta<string> = string,
  TAccountNftEdition extends string | IAccountMeta<string> = string,
  TAccountOwnerTokenRecord extends string | IAccountMeta<string> = string,
  TAccountDestTokenRecord extends string | IAccountMeta<string> = string,
  TAccountPnftShared extends string | IAccountMeta<string> = string,
  TAccountAuthRules extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountPool extends string
        ? WritableAccount<TAccountPool>
        : TAccountPool,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountNftDest extends string
        ? WritableAccount<TAccountNftDest>
        : TAccountNftDest,
      TAccountNftMint extends string
        ? ReadonlyAccount<TAccountNftMint>
        : TAccountNftMint,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountNftReceipt extends string
        ? WritableAccount<TAccountNftReceipt>
        : TAccountNftReceipt,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner>
        : TAccountOwner,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountAssociatedTokenProgram extends string
        ? ReadonlyAccount<TAccountAssociatedTokenProgram>
        : TAccountAssociatedTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountRent extends string
        ? ReadonlyAccount<TAccountRent>
        : TAccountRent,
      TAccountNftMetadata extends string
        ? WritableAccount<TAccountNftMetadata>
        : TAccountNftMetadata,
      TAccountNftEdition extends string
        ? ReadonlyAccount<TAccountNftEdition>
        : TAccountNftEdition,
      TAccountOwnerTokenRecord extends string
        ? WritableAccount<TAccountOwnerTokenRecord>
        : TAccountOwnerTokenRecord,
      TAccountDestTokenRecord extends string
        ? WritableAccount<TAccountDestTokenRecord>
        : TAccountDestTokenRecord,
      TAccountPnftShared extends string
        ? ReadonlyAccount<TAccountPnftShared>
        : TAccountPnftShared,
      TAccountAuthRules extends string
        ? ReadonlyAccount<TAccountAuthRules>
        : TAccountAuthRules,
      ...TRemainingAccounts
    ]
  >;

export type WithdrawNftInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftDest extends string | IAccountMeta<string> = string,
  TAccountNftMint extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountRent extends
    | string
    | IAccountMeta<string> = 'SysvarRent111111111111111111111111111111111',
  TAccountNftMetadata extends string | IAccountMeta<string> = string,
  TAccountNftEdition extends string | IAccountMeta<string> = string,
  TAccountOwnerTokenRecord extends string | IAccountMeta<string> = string,
  TAccountDestTokenRecord extends string | IAccountMeta<string> = string,
  TAccountPnftShared extends string | IAccountMeta<string> = string,
  TAccountAuthRules extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountPool extends string
        ? WritableAccount<TAccountPool>
        : TAccountPool,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountNftDest extends string
        ? WritableAccount<TAccountNftDest>
        : TAccountNftDest,
      TAccountNftMint extends string
        ? ReadonlyAccount<TAccountNftMint>
        : TAccountNftMint,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountNftReceipt extends string
        ? WritableAccount<TAccountNftReceipt>
        : TAccountNftReceipt,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner> &
            IAccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountAssociatedTokenProgram extends string
        ? ReadonlyAccount<TAccountAssociatedTokenProgram>
        : TAccountAssociatedTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountRent extends string
        ? ReadonlyAccount<TAccountRent>
        : TAccountRent,
      TAccountNftMetadata extends string
        ? WritableAccount<TAccountNftMetadata>
        : TAccountNftMetadata,
      TAccountNftEdition extends string
        ? ReadonlyAccount<TAccountNftEdition>
        : TAccountNftEdition,
      TAccountOwnerTokenRecord extends string
        ? WritableAccount<TAccountOwnerTokenRecord>
        : TAccountOwnerTokenRecord,
      TAccountDestTokenRecord extends string
        ? WritableAccount<TAccountDestTokenRecord>
        : TAccountDestTokenRecord,
      TAccountPnftShared extends string
        ? ReadonlyAccount<TAccountPnftShared>
        : TAccountPnftShared,
      TAccountAuthRules extends string
        ? ReadonlyAccount<TAccountAuthRules>
        : TAccountAuthRules,
      ...TRemainingAccounts
    ]
  >;

export type WithdrawNftInstructionData = {
  discriminator: Array<number>;
  config: PoolConfig;
  authorizationData: Option<AuthorizationDataLocal>;
  rulesAccPresent: boolean;
};

export type WithdrawNftInstructionDataArgs = {
  config: PoolConfigArgs;
  authorizationData: OptionOrNullable<AuthorizationDataLocalArgs>;
  rulesAccPresent: boolean;
};

export function getWithdrawNftInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      config: PoolConfigArgs;
      authorizationData: OptionOrNullable<AuthorizationDataLocalArgs>;
      rulesAccPresent: boolean;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['config', getPoolConfigEncoder()],
      [
        'authorizationData',
        getOptionEncoder(getAuthorizationDataLocalEncoder()),
      ],
      ['rulesAccPresent', getBooleanEncoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [142, 181, 191, 149, 82, 175, 216, 100],
    })
  ) satisfies Encoder<WithdrawNftInstructionDataArgs>;
}

export function getWithdrawNftInstructionDataDecoder() {
  return getStructDecoder<WithdrawNftInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['config', getPoolConfigDecoder()],
    ['authorizationData', getOptionDecoder(getAuthorizationDataLocalDecoder())],
    ['rulesAccPresent', getBooleanDecoder()],
  ]) satisfies Decoder<WithdrawNftInstructionData>;
}

export function getWithdrawNftInstructionDataCodec(): Codec<
  WithdrawNftInstructionDataArgs,
  WithdrawNftInstructionData
> {
  return combineCodec(
    getWithdrawNftInstructionDataEncoder(),
    getWithdrawNftInstructionDataDecoder()
  );
}

export type WithdrawNftInput<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftDest extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftMetadata extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountPnftShared extends string,
  TAccountAuthRules extends string
> = {
  tswap: Address<TAccountTswap>;
  pool: Address<TAccountPool>;
  whitelist: Address<TAccountWhitelist>;
  nftDest: Address<TAccountNftDest>;
  nftMint: Address<TAccountNftMint>;
  /**
   * Implicitly checked via transfer. Will fail if wrong account
   * This is closed below (dest = owner)
   */

  nftEscrow: Address<TAccountNftEscrow>;
  nftReceipt: Address<TAccountNftReceipt>;
  /** Tied to the pool because used to verify pool seeds */
  owner: Address<TAccountOwner>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  nftMetadata: Address<TAccountNftMetadata>;
  nftEdition: Address<TAccountNftEdition>;
  ownerTokenRecord: Address<TAccountOwnerTokenRecord>;
  destTokenRecord: Address<TAccountDestTokenRecord>;
  pnftShared: Address<TAccountPnftShared>;
  authRules: Address<TAccountAuthRules>;
  config: WithdrawNftInstructionDataArgs['config'];
  authorizationData: WithdrawNftInstructionDataArgs['authorizationData'];
  rulesAccPresent: WithdrawNftInstructionDataArgs['rulesAccPresent'];
};

export type WithdrawNftInputWithSigners<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftDest extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftMetadata extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountPnftShared extends string,
  TAccountAuthRules extends string
> = {
  tswap: Address<TAccountTswap>;
  pool: Address<TAccountPool>;
  whitelist: Address<TAccountWhitelist>;
  nftDest: Address<TAccountNftDest>;
  nftMint: Address<TAccountNftMint>;
  /**
   * Implicitly checked via transfer. Will fail if wrong account
   * This is closed below (dest = owner)
   */

  nftEscrow: Address<TAccountNftEscrow>;
  nftReceipt: Address<TAccountNftReceipt>;
  /** Tied to the pool because used to verify pool seeds */
  owner: TransactionSigner<TAccountOwner>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  nftMetadata: Address<TAccountNftMetadata>;
  nftEdition: Address<TAccountNftEdition>;
  ownerTokenRecord: Address<TAccountOwnerTokenRecord>;
  destTokenRecord: Address<TAccountDestTokenRecord>;
  pnftShared: Address<TAccountPnftShared>;
  authRules: Address<TAccountAuthRules>;
  config: WithdrawNftInstructionDataArgs['config'];
  authorizationData: WithdrawNftInstructionDataArgs['authorizationData'];
  rulesAccPresent: WithdrawNftInstructionDataArgs['rulesAccPresent'];
};

export function getWithdrawNftInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftDest extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftMetadata extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountPnftShared extends string,
  TAccountAuthRules extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawNftInputWithSigners<
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftDest,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftMetadata,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountPnftShared,
    TAccountAuthRules
  >
): WithdrawNftInstructionWithSigners<
  TProgram,
  TAccountTswap,
  TAccountPool,
  TAccountWhitelist,
  TAccountNftDest,
  TAccountNftMint,
  TAccountNftEscrow,
  TAccountNftReceipt,
  TAccountOwner,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountSystemProgram,
  TAccountRent,
  TAccountNftMetadata,
  TAccountNftEdition,
  TAccountOwnerTokenRecord,
  TAccountDestTokenRecord,
  TAccountPnftShared,
  TAccountAuthRules
>;
export function getWithdrawNftInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftDest extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftMetadata extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountPnftShared extends string,
  TAccountAuthRules extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawNftInput<
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftDest,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftMetadata,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountPnftShared,
    TAccountAuthRules
  >
): WithdrawNftInstruction<
  TProgram,
  TAccountTswap,
  TAccountPool,
  TAccountWhitelist,
  TAccountNftDest,
  TAccountNftMint,
  TAccountNftEscrow,
  TAccountNftReceipt,
  TAccountOwner,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountSystemProgram,
  TAccountRent,
  TAccountNftMetadata,
  TAccountNftEdition,
  TAccountOwnerTokenRecord,
  TAccountDestTokenRecord,
  TAccountPnftShared,
  TAccountAuthRules
>;
export function getWithdrawNftInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftDest extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftMetadata extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountPnftShared extends string,
  TAccountAuthRules extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawNftInput<
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftDest,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftMetadata,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountPnftShared,
    TAccountAuthRules
  >
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getWithdrawNftInstructionRaw<
      TProgram,
      TAccountTswap,
      TAccountPool,
      TAccountWhitelist,
      TAccountNftDest,
      TAccountNftMint,
      TAccountNftEscrow,
      TAccountNftReceipt,
      TAccountOwner,
      TAccountTokenProgram,
      TAccountAssociatedTokenProgram,
      TAccountSystemProgram,
      TAccountRent,
      TAccountNftMetadata,
      TAccountNftEdition,
      TAccountOwnerTokenRecord,
      TAccountDestTokenRecord,
      TAccountPnftShared,
      TAccountAuthRules
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    pool: { value: input.pool ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
    nftDest: { value: input.nftDest ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    nftReceipt: { value: input.nftReceipt ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    rent: { value: input.rent ?? null, isWritable: false },
    nftMetadata: { value: input.nftMetadata ?? null, isWritable: true },
    nftEdition: { value: input.nftEdition ?? null, isWritable: false },
    ownerTokenRecord: {
      value: input.ownerTokenRecord ?? null,
      isWritable: true,
    },
    destTokenRecord: { value: input.destTokenRecord ?? null, isWritable: true },
    pnftShared: { value: input.pnftShared ?? null, isWritable: false },
    authRules: { value: input.authRules ?? null, isWritable: false },
  };

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }
  if (!accounts.rent.value) {
    accounts.rent.value =
      'SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>;
  }

  // Get account metas and signers.
  const accountMetas = getAccountMetasWithSigners(
    accounts,
    'programId',
    programAddress
  );

  const instruction = getWithdrawNftInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as WithdrawNftInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getWithdrawNftInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftDest extends string | IAccountMeta<string> = string,
  TAccountNftMint extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountRent extends
    | string
    | IAccountMeta<string> = 'SysvarRent111111111111111111111111111111111',
  TAccountNftMetadata extends string | IAccountMeta<string> = string,
  TAccountNftEdition extends string | IAccountMeta<string> = string,
  TAccountOwnerTokenRecord extends string | IAccountMeta<string> = string,
  TAccountDestTokenRecord extends string | IAccountMeta<string> = string,
  TAccountPnftShared extends string | IAccountMeta<string> = string,
  TAccountAuthRules extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    tswap: TAccountTswap extends string
      ? Address<TAccountTswap>
      : TAccountTswap;
    pool: TAccountPool extends string ? Address<TAccountPool> : TAccountPool;
    whitelist: TAccountWhitelist extends string
      ? Address<TAccountWhitelist>
      : TAccountWhitelist;
    nftDest: TAccountNftDest extends string
      ? Address<TAccountNftDest>
      : TAccountNftDest;
    nftMint: TAccountNftMint extends string
      ? Address<TAccountNftMint>
      : TAccountNftMint;
    nftEscrow: TAccountNftEscrow extends string
      ? Address<TAccountNftEscrow>
      : TAccountNftEscrow;
    nftReceipt: TAccountNftReceipt extends string
      ? Address<TAccountNftReceipt>
      : TAccountNftReceipt;
    owner: TAccountOwner extends string
      ? Address<TAccountOwner>
      : TAccountOwner;
    tokenProgram?: TAccountTokenProgram extends string
      ? Address<TAccountTokenProgram>
      : TAccountTokenProgram;
    associatedTokenProgram: TAccountAssociatedTokenProgram extends string
      ? Address<TAccountAssociatedTokenProgram>
      : TAccountAssociatedTokenProgram;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
    rent?: TAccountRent extends string ? Address<TAccountRent> : TAccountRent;
    nftMetadata: TAccountNftMetadata extends string
      ? Address<TAccountNftMetadata>
      : TAccountNftMetadata;
    nftEdition: TAccountNftEdition extends string
      ? Address<TAccountNftEdition>
      : TAccountNftEdition;
    ownerTokenRecord: TAccountOwnerTokenRecord extends string
      ? Address<TAccountOwnerTokenRecord>
      : TAccountOwnerTokenRecord;
    destTokenRecord: TAccountDestTokenRecord extends string
      ? Address<TAccountDestTokenRecord>
      : TAccountDestTokenRecord;
    pnftShared: TAccountPnftShared extends string
      ? Address<TAccountPnftShared>
      : TAccountPnftShared;
    authRules: TAccountAuthRules extends string
      ? Address<TAccountAuthRules>
      : TAccountAuthRules;
  },
  args: WithdrawNftInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.tswap, AccountRole.READONLY),
      accountMetaWithDefault(accounts.pool, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.whitelist, AccountRole.READONLY),
      accountMetaWithDefault(accounts.nftDest, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.nftMint, AccountRole.READONLY),
      accountMetaWithDefault(accounts.nftEscrow, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.nftReceipt, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.owner, AccountRole.WRITABLE_SIGNER),
      accountMetaWithDefault(
        accounts.tokenProgram ??
          ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.associatedTokenProgram,
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.rent ??
          ('SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.nftMetadata, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.nftEdition, AccountRole.READONLY),
      accountMetaWithDefault(accounts.ownerTokenRecord, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.destTokenRecord, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.pnftShared, AccountRole.READONLY),
      accountMetaWithDefault(accounts.authRules, AccountRole.READONLY),
      ...(remainingAccounts ?? []),
    ],
    data: getWithdrawNftInstructionDataEncoder().encode(args),
    programAddress,
  } as WithdrawNftInstruction<
    TProgram,
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftDest,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftMetadata,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountPnftShared,
    TAccountAuthRules,
    TRemainingAccounts
  >;
}

export type ParsedWithdrawNftInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    pool: TAccountMetas[1];
    whitelist: TAccountMetas[2];
    nftDest: TAccountMetas[3];
    nftMint: TAccountMetas[4];
    /**
     * Implicitly checked via transfer. Will fail if wrong account
     * This is closed below (dest = owner)
     */

    nftEscrow: TAccountMetas[5];
    nftReceipt: TAccountMetas[6];
    /** Tied to the pool because used to verify pool seeds */
    owner: TAccountMetas[7];
    tokenProgram: TAccountMetas[8];
    associatedTokenProgram: TAccountMetas[9];
    systemProgram: TAccountMetas[10];
    rent: TAccountMetas[11];
    nftMetadata: TAccountMetas[12];
    nftEdition: TAccountMetas[13];
    ownerTokenRecord: TAccountMetas[14];
    destTokenRecord: TAccountMetas[15];
    pnftShared: TAccountMetas[16];
    authRules: TAccountMetas[17];
  };
  data: WithdrawNftInstructionData;
};

export function parseWithdrawNftInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWithdrawNftInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 18) {
    // TODO: Coded error.
    throw new Error('Not enough accounts');
  }
  let accountIndex = 0;
  const getNextAccount = () => {
    const accountMeta = instruction.accounts![accountIndex]!;
    accountIndex += 1;
    return accountMeta;
  };
  return {
    programAddress: instruction.programAddress,
    accounts: {
      tswap: getNextAccount(),
      pool: getNextAccount(),
      whitelist: getNextAccount(),
      nftDest: getNextAccount(),
      nftMint: getNextAccount(),
      nftEscrow: getNextAccount(),
      nftReceipt: getNextAccount(),
      owner: getNextAccount(),
      tokenProgram: getNextAccount(),
      associatedTokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      rent: getNextAccount(),
      nftMetadata: getNextAccount(),
      nftEdition: getNextAccount(),
      ownerTokenRecord: getNextAccount(),
      destTokenRecord: getNextAccount(),
      pnftShared: getNextAccount(),
      authRules: getNextAccount(),
    },
    data: getWithdrawNftInstructionDataDecoder().decode(instruction.data),
  };
}

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
import {
  getU32Decoder,
  getU32Encoder,
  getU8Decoder,
  getU8Encoder,
} from '@solana/codecs-numbers';
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
  PoolConfig,
  PoolConfigArgs,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type EditPoolInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountOldPool extends string | IAccountMeta<string> = string,
  TAccountNewPool extends string | IAccountMeta<string> = string,
  TAccountOldSolEscrow extends string | IAccountMeta<string> = string,
  TAccountNewSolEscrow extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftAuthority extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountOldPool extends string
        ? WritableAccount<TAccountOldPool>
        : TAccountOldPool,
      TAccountNewPool extends string
        ? WritableAccount<TAccountNewPool>
        : TAccountNewPool,
      TAccountOldSolEscrow extends string
        ? WritableAccount<TAccountOldSolEscrow>
        : TAccountOldSolEscrow,
      TAccountNewSolEscrow extends string
        ? WritableAccount<TAccountNewSolEscrow>
        : TAccountNewSolEscrow,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountNftAuthority extends string
        ? WritableAccount<TAccountNftAuthority>
        : TAccountNftAuthority,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner>
        : TAccountOwner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts
    ]
  >;

export type EditPoolInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountOldPool extends string | IAccountMeta<string> = string,
  TAccountNewPool extends string | IAccountMeta<string> = string,
  TAccountOldSolEscrow extends string | IAccountMeta<string> = string,
  TAccountNewSolEscrow extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftAuthority extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountOldPool extends string
        ? WritableAccount<TAccountOldPool>
        : TAccountOldPool,
      TAccountNewPool extends string
        ? WritableAccount<TAccountNewPool>
        : TAccountNewPool,
      TAccountOldSolEscrow extends string
        ? WritableAccount<TAccountOldSolEscrow>
        : TAccountOldSolEscrow,
      TAccountNewSolEscrow extends string
        ? WritableAccount<TAccountNewSolEscrow>
        : TAccountNewSolEscrow,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountNftAuthority extends string
        ? WritableAccount<TAccountNftAuthority>
        : TAccountNftAuthority,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner> &
            IAccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts
    ]
  >;

export type EditPoolInstructionData = {
  discriminator: Array<number>;
  oldConfig: PoolConfig;
  newConfig: PoolConfig;
  isCosigned: Option<boolean>;
  maxTakerSellCount: Option<number>;
};

export type EditPoolInstructionDataArgs = {
  oldConfig: PoolConfigArgs;
  newConfig: PoolConfigArgs;
  isCosigned: OptionOrNullable<boolean>;
  maxTakerSellCount: OptionOrNullable<number>;
};

export function getEditPoolInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      oldConfig: PoolConfigArgs;
      newConfig: PoolConfigArgs;
      isCosigned: OptionOrNullable<boolean>;
      maxTakerSellCount: OptionOrNullable<number>;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['oldConfig', getPoolConfigEncoder()],
      ['newConfig', getPoolConfigEncoder()],
      ['isCosigned', getOptionEncoder(getBooleanEncoder())],
      ['maxTakerSellCount', getOptionEncoder(getU32Encoder())],
    ]),
    (value) => ({ ...value, discriminator: [50, 174, 34, 36, 3, 166, 29, 204] })
  ) satisfies Encoder<EditPoolInstructionDataArgs>;
}

export function getEditPoolInstructionDataDecoder() {
  return getStructDecoder<EditPoolInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['oldConfig', getPoolConfigDecoder()],
    ['newConfig', getPoolConfigDecoder()],
    ['isCosigned', getOptionDecoder(getBooleanDecoder())],
    ['maxTakerSellCount', getOptionDecoder(getU32Decoder())],
  ]) satisfies Decoder<EditPoolInstructionData>;
}

export function getEditPoolInstructionDataCodec(): Codec<
  EditPoolInstructionDataArgs,
  EditPoolInstructionData
> {
  return combineCodec(
    getEditPoolInstructionDataEncoder(),
    getEditPoolInstructionDataDecoder()
  );
}

export type EditPoolInput<
  TAccountTswap extends string,
  TAccountOldPool extends string,
  TAccountNewPool extends string,
  TAccountOldSolEscrow extends string,
  TAccountNewSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountNftAuthority extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string
> = {
  tswap: Address<TAccountTswap>;
  oldPool: Address<TAccountOldPool>;
  newPool: Address<TAccountNewPool>;
  oldSolEscrow: Address<TAccountOldSolEscrow>;
  newSolEscrow: Address<TAccountNewSolEscrow>;
  /** Needed for pool seeds derivation / will be stored inside pool */
  whitelist: Address<TAccountWhitelist>;
  nftAuthority: Address<TAccountNftAuthority>;
  owner: Address<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  oldConfig: EditPoolInstructionDataArgs['oldConfig'];
  newConfig: EditPoolInstructionDataArgs['newConfig'];
  isCosigned: EditPoolInstructionDataArgs['isCosigned'];
  maxTakerSellCount: EditPoolInstructionDataArgs['maxTakerSellCount'];
};

export type EditPoolInputWithSigners<
  TAccountTswap extends string,
  TAccountOldPool extends string,
  TAccountNewPool extends string,
  TAccountOldSolEscrow extends string,
  TAccountNewSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountNftAuthority extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string
> = {
  tswap: Address<TAccountTswap>;
  oldPool: Address<TAccountOldPool>;
  newPool: Address<TAccountNewPool>;
  oldSolEscrow: Address<TAccountOldSolEscrow>;
  newSolEscrow: Address<TAccountNewSolEscrow>;
  /** Needed for pool seeds derivation / will be stored inside pool */
  whitelist: Address<TAccountWhitelist>;
  nftAuthority: Address<TAccountNftAuthority>;
  owner: TransactionSigner<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  oldConfig: EditPoolInstructionDataArgs['oldConfig'];
  newConfig: EditPoolInstructionDataArgs['newConfig'];
  isCosigned: EditPoolInstructionDataArgs['isCosigned'];
  maxTakerSellCount: EditPoolInstructionDataArgs['maxTakerSellCount'];
};

export function getEditPoolInstruction<
  TAccountTswap extends string,
  TAccountOldPool extends string,
  TAccountNewPool extends string,
  TAccountOldSolEscrow extends string,
  TAccountNewSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountNftAuthority extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: EditPoolInputWithSigners<
    TAccountTswap,
    TAccountOldPool,
    TAccountNewPool,
    TAccountOldSolEscrow,
    TAccountNewSolEscrow,
    TAccountWhitelist,
    TAccountNftAuthority,
    TAccountOwner,
    TAccountSystemProgram
  >
): EditPoolInstructionWithSigners<
  TProgram,
  TAccountTswap,
  TAccountOldPool,
  TAccountNewPool,
  TAccountOldSolEscrow,
  TAccountNewSolEscrow,
  TAccountWhitelist,
  TAccountNftAuthority,
  TAccountOwner,
  TAccountSystemProgram
>;
export function getEditPoolInstruction<
  TAccountTswap extends string,
  TAccountOldPool extends string,
  TAccountNewPool extends string,
  TAccountOldSolEscrow extends string,
  TAccountNewSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountNftAuthority extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: EditPoolInput<
    TAccountTswap,
    TAccountOldPool,
    TAccountNewPool,
    TAccountOldSolEscrow,
    TAccountNewSolEscrow,
    TAccountWhitelist,
    TAccountNftAuthority,
    TAccountOwner,
    TAccountSystemProgram
  >
): EditPoolInstruction<
  TProgram,
  TAccountTswap,
  TAccountOldPool,
  TAccountNewPool,
  TAccountOldSolEscrow,
  TAccountNewSolEscrow,
  TAccountWhitelist,
  TAccountNftAuthority,
  TAccountOwner,
  TAccountSystemProgram
>;
export function getEditPoolInstruction<
  TAccountTswap extends string,
  TAccountOldPool extends string,
  TAccountNewPool extends string,
  TAccountOldSolEscrow extends string,
  TAccountNewSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountNftAuthority extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: EditPoolInput<
    TAccountTswap,
    TAccountOldPool,
    TAccountNewPool,
    TAccountOldSolEscrow,
    TAccountNewSolEscrow,
    TAccountWhitelist,
    TAccountNftAuthority,
    TAccountOwner,
    TAccountSystemProgram
  >
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getEditPoolInstructionRaw<
      TProgram,
      TAccountTswap,
      TAccountOldPool,
      TAccountNewPool,
      TAccountOldSolEscrow,
      TAccountNewSolEscrow,
      TAccountWhitelist,
      TAccountNftAuthority,
      TAccountOwner,
      TAccountSystemProgram
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    oldPool: { value: input.oldPool ?? null, isWritable: true },
    newPool: { value: input.newPool ?? null, isWritable: true },
    oldSolEscrow: { value: input.oldSolEscrow ?? null, isWritable: true },
    newSolEscrow: { value: input.newSolEscrow ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
    nftAuthority: { value: input.nftAuthority ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  // Get account metas and signers.
  const accountMetas = getAccountMetasWithSigners(
    accounts,
    'programId',
    programAddress
  );

  const instruction = getEditPoolInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as EditPoolInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getEditPoolInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountOldPool extends string | IAccountMeta<string> = string,
  TAccountNewPool extends string | IAccountMeta<string> = string,
  TAccountOldSolEscrow extends string | IAccountMeta<string> = string,
  TAccountNewSolEscrow extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftAuthority extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    tswap: TAccountTswap extends string
      ? Address<TAccountTswap>
      : TAccountTswap;
    oldPool: TAccountOldPool extends string
      ? Address<TAccountOldPool>
      : TAccountOldPool;
    newPool: TAccountNewPool extends string
      ? Address<TAccountNewPool>
      : TAccountNewPool;
    oldSolEscrow: TAccountOldSolEscrow extends string
      ? Address<TAccountOldSolEscrow>
      : TAccountOldSolEscrow;
    newSolEscrow: TAccountNewSolEscrow extends string
      ? Address<TAccountNewSolEscrow>
      : TAccountNewSolEscrow;
    whitelist: TAccountWhitelist extends string
      ? Address<TAccountWhitelist>
      : TAccountWhitelist;
    nftAuthority: TAccountNftAuthority extends string
      ? Address<TAccountNftAuthority>
      : TAccountNftAuthority;
    owner: TAccountOwner extends string
      ? Address<TAccountOwner>
      : TAccountOwner;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
  },
  args: EditPoolInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.tswap, AccountRole.READONLY),
      accountMetaWithDefault(accounts.oldPool, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.newPool, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.oldSolEscrow, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.newSolEscrow, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.whitelist, AccountRole.READONLY),
      accountMetaWithDefault(accounts.nftAuthority, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.owner, AccountRole.WRITABLE_SIGNER),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      ...(remainingAccounts ?? []),
    ],
    data: getEditPoolInstructionDataEncoder().encode(args),
    programAddress,
  } as EditPoolInstruction<
    TProgram,
    TAccountTswap,
    TAccountOldPool,
    TAccountNewPool,
    TAccountOldSolEscrow,
    TAccountNewSolEscrow,
    TAccountWhitelist,
    TAccountNftAuthority,
    TAccountOwner,
    TAccountSystemProgram,
    TRemainingAccounts
  >;
}

export type ParsedEditPoolInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    oldPool: TAccountMetas[1];
    newPool: TAccountMetas[2];
    oldSolEscrow: TAccountMetas[3];
    newSolEscrow: TAccountMetas[4];
    /** Needed for pool seeds derivation / will be stored inside pool */
    whitelist: TAccountMetas[5];
    nftAuthority: TAccountMetas[6];
    owner: TAccountMetas[7];
    systemProgram: TAccountMetas[8];
  };
  data: EditPoolInstructionData;
};

export function parseEditPoolInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedEditPoolInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 9) {
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
      oldPool: getNextAccount(),
      newPool: getNextAccount(),
      oldSolEscrow: getNextAccount(),
      newSolEscrow: getNextAccount(),
      whitelist: getNextAccount(),
      nftAuthority: getNextAccount(),
      owner: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getEditPoolInstructionDataDecoder().decode(instruction.data),
  };
}

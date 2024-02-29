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
  getBytesDecoder,
  getBytesEncoder,
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

export type InitPoolInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountSolEscrow extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountNftAuthority extends string | IAccountMeta<string> = string,
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
      TAccountSolEscrow extends string
        ? WritableAccount<TAccountSolEscrow>
        : TAccountSolEscrow,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner>
        : TAccountOwner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountNftAuthority extends string
        ? WritableAccount<TAccountNftAuthority>
        : TAccountNftAuthority,
      ...TRemainingAccounts
    ]
  >;

export type InitPoolInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountSolEscrow extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountNftAuthority extends string | IAccountMeta<string> = string,
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
      TAccountSolEscrow extends string
        ? WritableAccount<TAccountSolEscrow>
        : TAccountSolEscrow,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner> &
            IAccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountNftAuthority extends string
        ? WritableAccount<TAccountNftAuthority>
        : TAccountNftAuthority,
      ...TRemainingAccounts
    ]
  >;

export type InitPoolInstructionData = {
  discriminator: Array<number>;
  config: PoolConfig;
  authSeeds: Uint8Array;
  isCosigned: boolean;
  orderType: number;
  maxTakerSellCount: Option<number>;
};

export type InitPoolInstructionDataArgs = {
  config: PoolConfigArgs;
  authSeeds: Uint8Array;
  isCosigned: boolean;
  orderType: number;
  maxTakerSellCount: OptionOrNullable<number>;
};

export function getInitPoolInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      config: PoolConfigArgs;
      authSeeds: Uint8Array;
      isCosigned: boolean;
      orderType: number;
      maxTakerSellCount: OptionOrNullable<number>;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['config', getPoolConfigEncoder()],
      ['authSeeds', getBytesEncoder({ size: 32 })],
      ['isCosigned', getBooleanEncoder()],
      ['orderType', getU8Encoder()],
      ['maxTakerSellCount', getOptionEncoder(getU32Encoder())],
    ]),
    (value) => ({
      ...value,
      discriminator: [116, 233, 199, 204, 115, 159, 171, 36],
    })
  ) satisfies Encoder<InitPoolInstructionDataArgs>;
}

export function getInitPoolInstructionDataDecoder() {
  return getStructDecoder<InitPoolInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['config', getPoolConfigDecoder()],
    ['authSeeds', getBytesDecoder({ size: 32 })],
    ['isCosigned', getBooleanDecoder()],
    ['orderType', getU8Decoder()],
    ['maxTakerSellCount', getOptionDecoder(getU32Decoder())],
  ]) satisfies Decoder<InitPoolInstructionData>;
}

export function getInitPoolInstructionDataCodec(): Codec<
  InitPoolInstructionDataArgs,
  InitPoolInstructionData
> {
  return combineCodec(
    getInitPoolInstructionDataEncoder(),
    getInitPoolInstructionDataDecoder()
  );
}

export type InitPoolInput<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TAccountNftAuthority extends string
> = {
  tswap: Address<TAccountTswap>;
  pool: Address<TAccountPool>;
  solEscrow: Address<TAccountSolEscrow>;
  /** Needed for pool seeds derivation / will be stored inside pool */
  whitelist: Address<TAccountWhitelist>;
  owner: Address<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  nftAuthority: Address<TAccountNftAuthority>;
  config: InitPoolInstructionDataArgs['config'];
  authSeeds: InitPoolInstructionDataArgs['authSeeds'];
  isCosigned: InitPoolInstructionDataArgs['isCosigned'];
  orderType: InitPoolInstructionDataArgs['orderType'];
  maxTakerSellCount: InitPoolInstructionDataArgs['maxTakerSellCount'];
};

export type InitPoolInputWithSigners<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TAccountNftAuthority extends string
> = {
  tswap: Address<TAccountTswap>;
  pool: Address<TAccountPool>;
  solEscrow: Address<TAccountSolEscrow>;
  /** Needed for pool seeds derivation / will be stored inside pool */
  whitelist: Address<TAccountWhitelist>;
  owner: TransactionSigner<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  nftAuthority: Address<TAccountNftAuthority>;
  config: InitPoolInstructionDataArgs['config'];
  authSeeds: InitPoolInstructionDataArgs['authSeeds'];
  isCosigned: InitPoolInstructionDataArgs['isCosigned'];
  orderType: InitPoolInstructionDataArgs['orderType'];
  maxTakerSellCount: InitPoolInstructionDataArgs['maxTakerSellCount'];
};

export function getInitPoolInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TAccountNftAuthority extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: InitPoolInputWithSigners<
    TAccountTswap,
    TAccountPool,
    TAccountSolEscrow,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram,
    TAccountNftAuthority
  >
): InitPoolInstructionWithSigners<
  TProgram,
  TAccountTswap,
  TAccountPool,
  TAccountSolEscrow,
  TAccountWhitelist,
  TAccountOwner,
  TAccountSystemProgram,
  TAccountNftAuthority
>;
export function getInitPoolInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TAccountNftAuthority extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: InitPoolInput<
    TAccountTswap,
    TAccountPool,
    TAccountSolEscrow,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram,
    TAccountNftAuthority
  >
): InitPoolInstruction<
  TProgram,
  TAccountTswap,
  TAccountPool,
  TAccountSolEscrow,
  TAccountWhitelist,
  TAccountOwner,
  TAccountSystemProgram,
  TAccountNftAuthority
>;
export function getInitPoolInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountSolEscrow extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TAccountNftAuthority extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: InitPoolInput<
    TAccountTswap,
    TAccountPool,
    TAccountSolEscrow,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram,
    TAccountNftAuthority
  >
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getInitPoolInstructionRaw<
      TProgram,
      TAccountTswap,
      TAccountPool,
      TAccountSolEscrow,
      TAccountWhitelist,
      TAccountOwner,
      TAccountSystemProgram,
      TAccountNftAuthority
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    pool: { value: input.pool ?? null, isWritable: true },
    solEscrow: { value: input.solEscrow ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
    owner: { value: input.owner ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    nftAuthority: { value: input.nftAuthority ?? null, isWritable: true },
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

  const instruction = getInitPoolInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as InitPoolInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getInitPoolInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountSolEscrow extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountNftAuthority extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    tswap: TAccountTswap extends string
      ? Address<TAccountTswap>
      : TAccountTswap;
    pool: TAccountPool extends string ? Address<TAccountPool> : TAccountPool;
    solEscrow: TAccountSolEscrow extends string
      ? Address<TAccountSolEscrow>
      : TAccountSolEscrow;
    whitelist: TAccountWhitelist extends string
      ? Address<TAccountWhitelist>
      : TAccountWhitelist;
    owner: TAccountOwner extends string
      ? Address<TAccountOwner>
      : TAccountOwner;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
    nftAuthority: TAccountNftAuthority extends string
      ? Address<TAccountNftAuthority>
      : TAccountNftAuthority;
  },
  args: InitPoolInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.tswap, AccountRole.READONLY),
      accountMetaWithDefault(accounts.pool, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.solEscrow, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.whitelist, AccountRole.READONLY),
      accountMetaWithDefault(accounts.owner, AccountRole.WRITABLE_SIGNER),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.nftAuthority, AccountRole.WRITABLE),
      ...(remainingAccounts ?? []),
    ],
    data: getInitPoolInstructionDataEncoder().encode(args),
    programAddress,
  } as InitPoolInstruction<
    TProgram,
    TAccountTswap,
    TAccountPool,
    TAccountSolEscrow,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram,
    TAccountNftAuthority,
    TRemainingAccounts
  >;
}

export type ParsedInitPoolInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    pool: TAccountMetas[1];
    solEscrow: TAccountMetas[2];
    /** Needed for pool seeds derivation / will be stored inside pool */
    whitelist: TAccountMetas[3];
    owner: TAccountMetas[4];
    systemProgram: TAccountMetas[5];
    nftAuthority: TAccountMetas[6];
  };
  data: InitPoolInstructionData;
};

export function parseInitPoolInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedInitPoolInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 7) {
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
      solEscrow: getNextAccount(),
      whitelist: getNextAccount(),
      owner: getNextAccount(),
      systemProgram: getNextAccount(),
      nftAuthority: getNextAccount(),
    },
    data: getInitPoolInstructionDataDecoder().decode(instruction.data),
  };
}
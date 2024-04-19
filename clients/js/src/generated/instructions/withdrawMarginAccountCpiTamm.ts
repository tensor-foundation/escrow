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
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {
  getU64Decoder,
  getU64Encoder,
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
  ReadonlySignerAccount,
  WritableAccount,
} from '@solana/instructions';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import {
  ResolvedAccount,
  accountMetaWithDefault,
  getAccountMetasWithSigners,
} from '../shared';

export type WithdrawMarginAccountCpiTammInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountDestination extends string | IAccountMeta<string> = string,
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
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountPool extends string
        ? ReadonlySignerAccount<TAccountPool>
        : TAccountPool,
      TAccountOwner extends string
        ? ReadonlyAccount<TAccountOwner>
        : TAccountOwner,
      TAccountDestination extends string
        ? WritableAccount<TAccountDestination>
        : TAccountDestination,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts
    ]
  >;

export type WithdrawMarginAccountCpiTammInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountDestination extends string | IAccountMeta<string> = string,
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
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountPool extends string
        ? ReadonlySignerAccount<TAccountPool> & IAccountSignerMeta<TAccountPool>
        : TAccountPool,
      TAccountOwner extends string
        ? ReadonlyAccount<TAccountOwner>
        : TAccountOwner,
      TAccountDestination extends string
        ? WritableAccount<TAccountDestination>
        : TAccountDestination,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts
    ]
  >;

export type WithdrawMarginAccountCpiTammInstructionData = {
  discriminator: Array<number>;
  bump: number;
  poolId: Uint8Array;
  lamports: bigint;
};

export type WithdrawMarginAccountCpiTammInstructionDataArgs = {
  bump: number;
  poolId: Uint8Array;
  lamports: number | bigint;
};

export function getWithdrawMarginAccountCpiTammInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      bump: number;
      poolId: Uint8Array;
      lamports: number | bigint;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['bump', getU8Encoder()],
      ['poolId', getBytesEncoder({ size: 32 })],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [35, 89, 16, 235, 226, 89, 248, 45],
    })
  ) satisfies Encoder<WithdrawMarginAccountCpiTammInstructionDataArgs>;
}

export function getWithdrawMarginAccountCpiTammInstructionDataDecoder() {
  return getStructDecoder<WithdrawMarginAccountCpiTammInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['bump', getU8Decoder()],
    ['poolId', getBytesDecoder({ size: 32 })],
    ['lamports', getU64Decoder()],
  ]) satisfies Decoder<WithdrawMarginAccountCpiTammInstructionData>;
}

export function getWithdrawMarginAccountCpiTammInstructionDataCodec(): Codec<
  WithdrawMarginAccountCpiTammInstructionDataArgs,
  WithdrawMarginAccountCpiTammInstructionData
> {
  return combineCodec(
    getWithdrawMarginAccountCpiTammInstructionDataEncoder(),
    getWithdrawMarginAccountCpiTammInstructionDataDecoder()
  );
}

export type WithdrawMarginAccountCpiTammInput<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountPool extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string
> = {
  tswap: Address<TAccountTswap>;
  marginAccount: Address<TAccountMarginAccount>;
  pool: Address<TAccountPool>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountCpiTammInstructionDataArgs['bump'];
  poolId: WithdrawMarginAccountCpiTammInstructionDataArgs['poolId'];
  lamports: WithdrawMarginAccountCpiTammInstructionDataArgs['lamports'];
};

export type WithdrawMarginAccountCpiTammInputWithSigners<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountPool extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string
> = {
  tswap: Address<TAccountTswap>;
  marginAccount: Address<TAccountMarginAccount>;
  pool: TransactionSigner<TAccountPool>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountCpiTammInstructionDataArgs['bump'];
  poolId: WithdrawMarginAccountCpiTammInstructionDataArgs['poolId'];
  lamports: WithdrawMarginAccountCpiTammInstructionDataArgs['lamports'];
};

export function getWithdrawMarginAccountCpiTammInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountPool extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountCpiTammInputWithSigners<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountPool,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountCpiTammInstructionWithSigners<
  TProgram,
  TAccountTswap,
  TAccountMarginAccount,
  TAccountPool,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountCpiTammInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountPool extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountCpiTammInput<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountPool,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountCpiTammInstruction<
  TProgram,
  TAccountTswap,
  TAccountMarginAccount,
  TAccountPool,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountCpiTammInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountPool extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountCpiTammInput<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountPool,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getWithdrawMarginAccountCpiTammInstructionRaw<
      TProgram,
      TAccountTswap,
      TAccountMarginAccount,
      TAccountPool,
      TAccountOwner,
      TAccountDestination,
      TAccountSystemProgram
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    pool: { value: input.pool ?? null, isWritable: false },
    owner: { value: input.owner ?? null, isWritable: false },
    destination: { value: input.destination ?? null, isWritable: true },
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

  const instruction = getWithdrawMarginAccountCpiTammInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as WithdrawMarginAccountCpiTammInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getWithdrawMarginAccountCpiTammInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountDestination extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    tswap: TAccountTswap extends string
      ? Address<TAccountTswap>
      : TAccountTswap;
    marginAccount: TAccountMarginAccount extends string
      ? Address<TAccountMarginAccount>
      : TAccountMarginAccount;
    pool: TAccountPool extends string ? Address<TAccountPool> : TAccountPool;
    owner: TAccountOwner extends string
      ? Address<TAccountOwner>
      : TAccountOwner;
    destination: TAccountDestination extends string
      ? Address<TAccountDestination>
      : TAccountDestination;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
  },
  args: WithdrawMarginAccountCpiTammInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.tswap, AccountRole.READONLY),
      accountMetaWithDefault(accounts.marginAccount, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.pool, AccountRole.READONLY_SIGNER),
      accountMetaWithDefault(accounts.owner, AccountRole.READONLY),
      accountMetaWithDefault(accounts.destination, AccountRole.WRITABLE),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      ...(remainingAccounts ?? []),
    ],
    data: getWithdrawMarginAccountCpiTammInstructionDataEncoder().encode(args),
    programAddress,
  } as WithdrawMarginAccountCpiTammInstruction<
    TProgram,
    TAccountTswap,
    TAccountMarginAccount,
    TAccountPool,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram,
    TRemainingAccounts
  >;
}

export type ParsedWithdrawMarginAccountCpiTammInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    marginAccount: TAccountMetas[1];
    pool: TAccountMetas[2];
    owner: TAccountMetas[3];
    destination: TAccountMetas[4];
    systemProgram: TAccountMetas[5];
  };
  data: WithdrawMarginAccountCpiTammInstructionData;
};

export function parseWithdrawMarginAccountCpiTammInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWithdrawMarginAccountCpiTammInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 6) {
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
      marginAccount: getNextAccount(),
      pool: getNextAccount(),
      owner: getNextAccount(),
      destination: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getWithdrawMarginAccountCpiTammInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
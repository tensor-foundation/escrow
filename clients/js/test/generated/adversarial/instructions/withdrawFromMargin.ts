/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  combineCodec,
  fixDecoderSize,
  fixEncoderSize,
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  transformEncoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
  type IAccountMeta,
  type IAccountSignerMeta,
  type IInstruction,
  type IInstructionWithAccounts,
  type IInstructionWithData,
  type ReadonlyAccount,
  type ReadonlySignerAccount,
  type ReadonlyUint8Array,
  type TransactionSigner,
  type WritableAccount,
} from '@solana/web3.js';
import { MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS } from '../programs';
import { getAccountMetaFactory, type ResolvedAccount } from '../shared';

export type WithdrawFromMarginInstruction<
  TProgram extends string = typeof MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountDestination extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountTensorEscrowProgram extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountPool extends string
        ? ReadonlyAccount<TAccountPool>
        : TAccountPool,
      TAccountOwner extends string
        ? ReadonlySignerAccount<TAccountOwner> &
            IAccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountDestination extends string
        ? WritableAccount<TAccountDestination>
        : TAccountDestination,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountTensorEscrowProgram extends string
        ? ReadonlyAccount<TAccountTensorEscrowProgram>
        : TAccountTensorEscrowProgram,
      ...TRemainingAccounts,
    ]
  >;

export type WithdrawFromMarginInstructionData = {
  discriminator: ReadonlyUint8Array;
  poolId: ReadonlyUint8Array;
  lamports: bigint;
};

export type WithdrawFromMarginInstructionDataArgs = {
  poolId: ReadonlyUint8Array;
  lamports: number | bigint;
};

export function getWithdrawFromMarginInstructionDataEncoder(): Encoder<WithdrawFromMarginInstructionDataArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['poolId', fixEncoderSize(getBytesEncoder(), 32)],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([128, 122, 127, 176, 54, 230, 182, 95]),
    })
  );
}

export function getWithdrawFromMarginInstructionDataDecoder(): Decoder<WithdrawFromMarginInstructionData> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['poolId', fixDecoderSize(getBytesDecoder(), 32)],
    ['lamports', getU64Decoder()],
  ]);
}

export function getWithdrawFromMarginInstructionDataCodec(): Codec<
  WithdrawFromMarginInstructionDataArgs,
  WithdrawFromMarginInstructionData
> {
  return combineCodec(
    getWithdrawFromMarginInstructionDataEncoder(),
    getWithdrawFromMarginInstructionDataDecoder()
  );
}

export type WithdrawFromMarginInput<
  TAccountMarginAccount extends string = string,
  TAccountPool extends string = string,
  TAccountOwner extends string = string,
  TAccountDestination extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountTensorEscrowProgram extends string = string,
> = {
  marginAccount: Address<TAccountMarginAccount>;
  pool: Address<TAccountPool>;
  owner: TransactionSigner<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  tensorEscrowProgram: Address<TAccountTensorEscrowProgram>;
  poolId: WithdrawFromMarginInstructionDataArgs['poolId'];
  lamports: WithdrawFromMarginInstructionDataArgs['lamports'];
};

export function getWithdrawFromMarginInstruction<
  TAccountMarginAccount extends string,
  TAccountPool extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TAccountTensorEscrowProgram extends string,
>(
  input: WithdrawFromMarginInput<
    TAccountMarginAccount,
    TAccountPool,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram,
    TAccountTensorEscrowProgram
  >
): WithdrawFromMarginInstruction<
  typeof MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
  TAccountMarginAccount,
  TAccountPool,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram,
  TAccountTensorEscrowProgram
> {
  // Program address.
  const programAddress = MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    pool: { value: input.pool ?? null, isWritable: false },
    owner: { value: input.owner ?? null, isWritable: false },
    destination: { value: input.destination ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    tensorEscrowProgram: {
      value: input.tensorEscrowProgram ?? null,
      isWritable: false,
    },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.pool),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.destination),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.tensorEscrowProgram),
    ],
    programAddress,
    data: getWithdrawFromMarginInstructionDataEncoder().encode(
      args as WithdrawFromMarginInstructionDataArgs
    ),
  } as WithdrawFromMarginInstruction<
    typeof MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    TAccountMarginAccount,
    TAccountPool,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram,
    TAccountTensorEscrowProgram
  >;

  return instruction;
}

export type ParsedWithdrawFromMarginInstruction<
  TProgram extends string = typeof MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    marginAccount: TAccountMetas[0];
    pool: TAccountMetas[1];
    owner: TAccountMetas[2];
    destination: TAccountMetas[3];
    systemProgram: TAccountMetas[4];
    tensorEscrowProgram: TAccountMetas[5];
  };
  data: WithdrawFromMarginInstructionData;
};

export function parseWithdrawFromMarginInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWithdrawFromMarginInstruction<TProgram, TAccountMetas> {
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
      marginAccount: getNextAccount(),
      pool: getNextAccount(),
      owner: getNextAccount(),
      destination: getNextAccount(),
      systemProgram: getNextAccount(),
      tensorEscrowProgram: getNextAccount(),
    },
    data: getWithdrawFromMarginInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
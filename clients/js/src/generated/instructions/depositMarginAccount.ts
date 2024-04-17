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
  getArrayDecoder,
  getArrayEncoder,
  getStructDecoder,
  getStructEncoder,
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
  mapEncoder,
} from '@solana/codecs';
import {
  IAccountMeta,
  IInstruction,
  IInstructionWithAccounts,
  IInstructionWithData,
  ReadonlyAccount,
  WritableAccount,
  WritableSignerAccount,
} from '@solana/instructions';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import { TENSOR_ESCROW_PROGRAM_ADDRESS } from '../programs';
import { ResolvedAccount, getAccountMetaFactory } from '../shared';

export type DepositMarginAccountInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
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
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner> &
            IAccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type DepositMarginAccountInstructionData = {
  discriminator: Array<number>;
  lamports: bigint;
};

export type DepositMarginAccountInstructionDataArgs = {
  lamports: number | bigint;
};

export function getDepositMarginAccountInstructionDataEncoder(): Encoder<DepositMarginAccountInstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [190, 85, 242, 60, 119, 81, 33, 192],
    })
  );
}

export function getDepositMarginAccountInstructionDataDecoder(): Decoder<DepositMarginAccountInstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['lamports', getU64Decoder()],
  ]);
}

export function getDepositMarginAccountInstructionDataCodec(): Codec<
  DepositMarginAccountInstructionDataArgs,
  DepositMarginAccountInstructionData
> {
  return combineCodec(
    getDepositMarginAccountInstructionDataEncoder(),
    getDepositMarginAccountInstructionDataDecoder()
  );
}

export type DepositMarginAccountInput<
  TAccountTswap extends string = string,
  TAccountMarginAccount extends string = string,
  TAccountOwner extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  tswap: Address<TAccountTswap>;
  marginAccount: Address<TAccountMarginAccount>;
  owner: TransactionSigner<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  lamports: DepositMarginAccountInstructionDataArgs['lamports'];
};

export function getDepositMarginAccountInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
>(
  input: DepositMarginAccountInput<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountOwner,
    TAccountSystemProgram
  >
): DepositMarginAccountInstruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountMarginAccount,
  TAccountOwner,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
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
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getDepositMarginAccountInstructionDataEncoder().encode(
      args as DepositMarginAccountInstructionDataArgs
    ),
  } as DepositMarginAccountInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountMarginAccount,
    TAccountOwner,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedDepositMarginAccountInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    marginAccount: TAccountMetas[1];
    owner: TAccountMetas[2];
    systemProgram: TAccountMetas[3];
  };
  data: DepositMarginAccountInstructionData;
};

export function parseDepositMarginAccountInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedDepositMarginAccountInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 4) {
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
      owner: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getDepositMarginAccountInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}

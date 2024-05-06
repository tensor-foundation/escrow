/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Address,
  getAddressDecoder,
  getAddressEncoder,
} from '@solana/addresses';
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
  ReadonlySignerAccount,
  WritableAccount,
} from '@solana/instructions';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import { resolveMarginAccountPda } from '../../hooked';
import { TENSOR_ESCROW_PROGRAM_ADDRESS } from '../programs';
import { ResolvedAccount, getAccountMetaFactory } from '../shared';

export type WithdrawMarginAccountFromTCompInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountBidState extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountDestination extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountBidState extends string
        ? ReadonlySignerAccount<TAccountBidState> &
            IAccountSignerMeta<TAccountBidState>
        : TAccountBidState,
      TAccountOwner extends string
        ? ReadonlyAccount<TAccountOwner>
        : TAccountOwner,
      TAccountDestination extends string
        ? WritableAccount<TAccountDestination>
        : TAccountDestination,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts,
    ]
  >;

export type WithdrawMarginAccountFromTCompInstructionData = {
  discriminator: Array<number>;
  bump: number;
  bidId: Address;
  lamports: bigint;
};

export type WithdrawMarginAccountFromTCompInstructionDataArgs = {
  bump: number;
  bidId: Address;
  lamports: number | bigint;
};

export function getWithdrawMarginAccountFromTCompInstructionDataEncoder(): Encoder<WithdrawMarginAccountFromTCompInstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['bump', getU8Encoder()],
      ['bidId', getAddressEncoder()],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [201, 156, 163, 27, 243, 14, 36, 237],
    })
  );
}

export function getWithdrawMarginAccountFromTCompInstructionDataDecoder(): Decoder<WithdrawMarginAccountFromTCompInstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['bump', getU8Decoder()],
    ['bidId', getAddressDecoder()],
    ['lamports', getU64Decoder()],
  ]);
}

export function getWithdrawMarginAccountFromTCompInstructionDataCodec(): Codec<
  WithdrawMarginAccountFromTCompInstructionDataArgs,
  WithdrawMarginAccountFromTCompInstructionData
> {
  return combineCodec(
    getWithdrawMarginAccountFromTCompInstructionDataEncoder(),
    getWithdrawMarginAccountFromTCompInstructionDataDecoder()
  );
}

export type WithdrawMarginAccountFromTCompAsyncInput<
  TAccountMarginAccount extends string = string,
  TAccountBidState extends string = string,
  TAccountOwner extends string = string,
  TAccountDestination extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  marginAccount?: Address<TAccountMarginAccount>;
  bidState: TransactionSigner<TAccountBidState>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountFromTCompInstructionDataArgs['bump'];
  bidId: WithdrawMarginAccountFromTCompInstructionDataArgs['bidId'];
  lamports: WithdrawMarginAccountFromTCompInstructionDataArgs['lamports'];
};

export async function getWithdrawMarginAccountFromTCompInstructionAsync<
  TAccountMarginAccount extends string,
  TAccountBidState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
>(
  input: WithdrawMarginAccountFromTCompAsyncInput<
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): Promise<
  WithdrawMarginAccountFromTCompInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    bidState: { value: input.bidState ?? null, isWritable: false },
    owner: { value: input.owner ?? null, isWritable: false },
    destination: { value: input.destination ?? null, isWritable: true },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolver scope.
  const resolverScope = { programAddress, accounts, args };

  // Resolve default values.
  if (!accounts.marginAccount.value) {
    accounts.marginAccount = {
      ...accounts.marginAccount,
      ...(await resolveMarginAccountPda(resolverScope)),
    };
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.bidState),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.destination),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getWithdrawMarginAccountFromTCompInstructionDataEncoder().encode(
      args as WithdrawMarginAccountFromTCompInstructionDataArgs
    ),
  } as WithdrawMarginAccountFromTCompInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >;

  return instruction;
}

export type WithdrawMarginAccountFromTCompInput<
  TAccountMarginAccount extends string = string,
  TAccountBidState extends string = string,
  TAccountOwner extends string = string,
  TAccountDestination extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  marginAccount: Address<TAccountMarginAccount>;
  bidState: TransactionSigner<TAccountBidState>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountFromTCompInstructionDataArgs['bump'];
  bidId: WithdrawMarginAccountFromTCompInstructionDataArgs['bidId'];
  lamports: WithdrawMarginAccountFromTCompInstructionDataArgs['lamports'];
};

export function getWithdrawMarginAccountFromTCompInstruction<
  TAccountMarginAccount extends string,
  TAccountBidState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
>(
  input: WithdrawMarginAccountFromTCompInput<
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountFromTCompInstruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMarginAccount,
  TAccountBidState,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    bidState: { value: input.bidState ?? null, isWritable: false },
    owner: { value: input.owner ?? null, isWritable: false },
    destination: { value: input.destination ?? null, isWritable: true },
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
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.bidState),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.destination),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getWithdrawMarginAccountFromTCompInstructionDataEncoder().encode(
      args as WithdrawMarginAccountFromTCompInstructionDataArgs
    ),
  } as WithdrawMarginAccountFromTCompInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedWithdrawMarginAccountFromTCompInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    marginAccount: TAccountMetas[0];
    bidState: TAccountMetas[1];
    owner: TAccountMetas[2];
    destination: TAccountMetas[3];
    systemProgram: TAccountMetas[4];
  };
  data: WithdrawMarginAccountFromTCompInstructionData;
};

export function parseWithdrawMarginAccountFromTCompInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWithdrawMarginAccountFromTCompInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 5) {
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
      bidState: getNextAccount(),
      owner: getNextAccount(),
      destination: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getWithdrawMarginAccountFromTCompInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}

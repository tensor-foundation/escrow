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
  mapEncoder,
} from '@solana/codecs-core';
import {
  getArrayDecoder,
  getArrayEncoder,
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

export type WithdrawMarginAccountFromTCompInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountBidState extends string | IAccountMeta<string> = string,
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
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountBidState extends string
        ? ReadonlySignerAccount<TAccountBidState>
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
      ...TRemainingAccounts
    ]
  >;

export type WithdrawMarginAccountFromTCompInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountBidState extends string | IAccountMeta<string> = string,
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
      ...TRemainingAccounts
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

export function getWithdrawMarginAccountFromTCompInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      bump: number;
      bidId: Address;
      lamports: number | bigint;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['bump', getU8Encoder()],
      ['bidId', getAddressEncoder()],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [201, 156, 163, 27, 243, 14, 36, 237],
    })
  ) satisfies Encoder<WithdrawMarginAccountFromTCompInstructionDataArgs>;
}

export function getWithdrawMarginAccountFromTCompInstructionDataDecoder() {
  return getStructDecoder<WithdrawMarginAccountFromTCompInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['bump', getU8Decoder()],
    ['bidId', getAddressDecoder()],
    ['lamports', getU64Decoder()],
  ]) satisfies Decoder<WithdrawMarginAccountFromTCompInstructionData>;
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

export type WithdrawMarginAccountFromTCompInput<
  TAccountMarginAccount extends string,
  TAccountBidState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string
> = {
  marginAccount: Address<TAccountMarginAccount>;
  bidState: Address<TAccountBidState>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountFromTCompInstructionDataArgs['bump'];
  bidId: WithdrawMarginAccountFromTCompInstructionDataArgs['bidId'];
  lamports: WithdrawMarginAccountFromTCompInstructionDataArgs['lamports'];
};

export type WithdrawMarginAccountFromTCompInputWithSigners<
  TAccountMarginAccount extends string,
  TAccountBidState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string
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
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountFromTCompInputWithSigners<
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountFromTCompInstructionWithSigners<
  TProgram,
  TAccountMarginAccount,
  TAccountBidState,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountFromTCompInstruction<
  TAccountMarginAccount extends string,
  TAccountBidState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountFromTCompInput<
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountFromTCompInstruction<
  TProgram,
  TAccountMarginAccount,
  TAccountBidState,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountFromTCompInstruction<
  TAccountMarginAccount extends string,
  TAccountBidState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountFromTCompInput<
    TAccountMarginAccount,
    TAccountBidState,
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
    typeof getWithdrawMarginAccountFromTCompInstructionRaw<
      TProgram,
      TAccountMarginAccount,
      TAccountBidState,
      TAccountOwner,
      TAccountDestination,
      TAccountSystemProgram
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    bidState: { value: input.bidState ?? null, isWritable: false },
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

  const instruction = getWithdrawMarginAccountFromTCompInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as WithdrawMarginAccountFromTCompInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getWithdrawMarginAccountFromTCompInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountBidState extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountDestination extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    marginAccount: TAccountMarginAccount extends string
      ? Address<TAccountMarginAccount>
      : TAccountMarginAccount;
    bidState: TAccountBidState extends string
      ? Address<TAccountBidState>
      : TAccountBidState;
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
  args: WithdrawMarginAccountFromTCompInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.marginAccount, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.bidState, AccountRole.READONLY_SIGNER),
      accountMetaWithDefault(accounts.owner, AccountRole.READONLY),
      accountMetaWithDefault(accounts.destination, AccountRole.WRITABLE),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      ...(remainingAccounts ?? []),
    ],
    data: getWithdrawMarginAccountFromTCompInstructionDataEncoder().encode(
      args
    ),
    programAddress,
  } as WithdrawMarginAccountFromTCompInstruction<
    TProgram,
    TAccountMarginAccount,
    TAccountBidState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram,
    TRemainingAccounts
  >;
}

export type ParsedWithdrawMarginAccountFromTCompInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
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
  TAccountMetas extends readonly IAccountMeta[]
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
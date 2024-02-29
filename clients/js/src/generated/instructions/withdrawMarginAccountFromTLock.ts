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

export type WithdrawMarginAccountFromTLockInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountOrderState extends string | IAccountMeta<string> = string,
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
      TAccountOrderState extends string
        ? ReadonlySignerAccount<TAccountOrderState>
        : TAccountOrderState,
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

export type WithdrawMarginAccountFromTLockInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountOrderState extends string | IAccountMeta<string> = string,
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
      TAccountOrderState extends string
        ? ReadonlySignerAccount<TAccountOrderState> &
            IAccountSignerMeta<TAccountOrderState>
        : TAccountOrderState,
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

export type WithdrawMarginAccountFromTLockInstructionData = {
  discriminator: Array<number>;
  bump: number;
  orderId: Uint8Array;
  lamports: bigint;
};

export type WithdrawMarginAccountFromTLockInstructionDataArgs = {
  bump: number;
  orderId: Uint8Array;
  lamports: number | bigint;
};

export function getWithdrawMarginAccountFromTLockInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      bump: number;
      orderId: Uint8Array;
      lamports: number | bigint;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['bump', getU8Encoder()],
      ['orderId', getBytesEncoder({ size: 32 })],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [207, 235, 166, 255, 163, 162, 149, 44],
    })
  ) satisfies Encoder<WithdrawMarginAccountFromTLockInstructionDataArgs>;
}

export function getWithdrawMarginAccountFromTLockInstructionDataDecoder() {
  return getStructDecoder<WithdrawMarginAccountFromTLockInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['bump', getU8Decoder()],
    ['orderId', getBytesDecoder({ size: 32 })],
    ['lamports', getU64Decoder()],
  ]) satisfies Decoder<WithdrawMarginAccountFromTLockInstructionData>;
}

export function getWithdrawMarginAccountFromTLockInstructionDataCodec(): Codec<
  WithdrawMarginAccountFromTLockInstructionDataArgs,
  WithdrawMarginAccountFromTLockInstructionData
> {
  return combineCodec(
    getWithdrawMarginAccountFromTLockInstructionDataEncoder(),
    getWithdrawMarginAccountFromTLockInstructionDataDecoder()
  );
}

export type WithdrawMarginAccountFromTLockInput<
  TAccountMarginAccount extends string,
  TAccountOrderState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string
> = {
  marginAccount: Address<TAccountMarginAccount>;
  orderState: Address<TAccountOrderState>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountFromTLockInstructionDataArgs['bump'];
  orderId: WithdrawMarginAccountFromTLockInstructionDataArgs['orderId'];
  lamports: WithdrawMarginAccountFromTLockInstructionDataArgs['lamports'];
};

export type WithdrawMarginAccountFromTLockInputWithSigners<
  TAccountMarginAccount extends string,
  TAccountOrderState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string
> = {
  marginAccount: Address<TAccountMarginAccount>;
  orderState: TransactionSigner<TAccountOrderState>;
  owner: Address<TAccountOwner>;
  destination: Address<TAccountDestination>;
  systemProgram?: Address<TAccountSystemProgram>;
  bump: WithdrawMarginAccountFromTLockInstructionDataArgs['bump'];
  orderId: WithdrawMarginAccountFromTLockInstructionDataArgs['orderId'];
  lamports: WithdrawMarginAccountFromTLockInstructionDataArgs['lamports'];
};

export function getWithdrawMarginAccountFromTLockInstruction<
  TAccountMarginAccount extends string,
  TAccountOrderState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountFromTLockInputWithSigners<
    TAccountMarginAccount,
    TAccountOrderState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountFromTLockInstructionWithSigners<
  TProgram,
  TAccountMarginAccount,
  TAccountOrderState,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountFromTLockInstruction<
  TAccountMarginAccount extends string,
  TAccountOrderState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountFromTLockInput<
    TAccountMarginAccount,
    TAccountOrderState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram
  >
): WithdrawMarginAccountFromTLockInstruction<
  TProgram,
  TAccountMarginAccount,
  TAccountOrderState,
  TAccountOwner,
  TAccountDestination,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountFromTLockInstruction<
  TAccountMarginAccount extends string,
  TAccountOrderState extends string,
  TAccountOwner extends string,
  TAccountDestination extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountFromTLockInput<
    TAccountMarginAccount,
    TAccountOrderState,
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
    typeof getWithdrawMarginAccountFromTLockInstructionRaw<
      TProgram,
      TAccountMarginAccount,
      TAccountOrderState,
      TAccountOwner,
      TAccountDestination,
      TAccountSystemProgram
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    orderState: { value: input.orderState ?? null, isWritable: false },
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

  const instruction = getWithdrawMarginAccountFromTLockInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as WithdrawMarginAccountFromTLockInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getWithdrawMarginAccountFromTLockInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountOrderState extends string | IAccountMeta<string> = string,
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
    orderState: TAccountOrderState extends string
      ? Address<TAccountOrderState>
      : TAccountOrderState;
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
  args: WithdrawMarginAccountFromTLockInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.marginAccount, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.orderState, AccountRole.READONLY_SIGNER),
      accountMetaWithDefault(accounts.owner, AccountRole.READONLY),
      accountMetaWithDefault(accounts.destination, AccountRole.WRITABLE),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      ...(remainingAccounts ?? []),
    ],
    data: getWithdrawMarginAccountFromTLockInstructionDataEncoder().encode(
      args
    ),
    programAddress,
  } as WithdrawMarginAccountFromTLockInstruction<
    TProgram,
    TAccountMarginAccount,
    TAccountOrderState,
    TAccountOwner,
    TAccountDestination,
    TAccountSystemProgram,
    TRemainingAccounts
  >;
}

export type ParsedWithdrawMarginAccountFromTLockInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    marginAccount: TAccountMetas[0];
    orderState: TAccountMetas[1];
    owner: TAccountMetas[2];
    destination: TAccountMetas[3];
    systemProgram: TAccountMetas[4];
  };
  data: WithdrawMarginAccountFromTLockInstructionData;
};

export function parseWithdrawMarginAccountFromTLockInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWithdrawMarginAccountFromTLockInstruction<TProgram, TAccountMetas> {
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
      orderState: getNextAccount(),
      owner: getNextAccount(),
      destination: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getWithdrawMarginAccountFromTLockInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}
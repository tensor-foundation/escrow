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
  WritableAccount,
  WritableSignerAccount,
} from '@solana/instructions';
import { IAccountSignerMeta, TransactionSigner } from '@solana/signers';
import {
  ResolvedAccount,
  accountMetaWithDefault,
  getAccountMetasWithSigners,
} from '../shared';

export type WithdrawMarginAccountInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
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
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner>
        : TAccountOwner,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      ...TRemainingAccounts
    ]
  >;

export type WithdrawMarginAccountInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
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
      ...TRemainingAccounts
    ]
  >;

export type WithdrawMarginAccountInstructionData = {
  discriminator: Array<number>;
  lamports: bigint;
};

export type WithdrawMarginAccountInstructionDataArgs = {
  lamports: number | bigint;
};

export function getWithdrawMarginAccountInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      lamports: number | bigint;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['lamports', getU64Encoder()],
    ]),
    (value) => ({ ...value, discriminator: [54, 73, 150, 208, 207, 5, 18, 17] })
  ) satisfies Encoder<WithdrawMarginAccountInstructionDataArgs>;
}

export function getWithdrawMarginAccountInstructionDataDecoder() {
  return getStructDecoder<WithdrawMarginAccountInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['lamports', getU64Decoder()],
  ]) satisfies Decoder<WithdrawMarginAccountInstructionData>;
}

export function getWithdrawMarginAccountInstructionDataCodec(): Codec<
  WithdrawMarginAccountInstructionDataArgs,
  WithdrawMarginAccountInstructionData
> {
  return combineCodec(
    getWithdrawMarginAccountInstructionDataEncoder(),
    getWithdrawMarginAccountInstructionDataDecoder()
  );
}

export type WithdrawMarginAccountInput<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string
> = {
  tswap: Address<TAccountTswap>;
  marginAccount: Address<TAccountMarginAccount>;
  owner: Address<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  lamports: WithdrawMarginAccountInstructionDataArgs['lamports'];
};

export type WithdrawMarginAccountInputWithSigners<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string
> = {
  tswap: Address<TAccountTswap>;
  marginAccount: Address<TAccountMarginAccount>;
  owner: TransactionSigner<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  lamports: WithdrawMarginAccountInstructionDataArgs['lamports'];
};

export function getWithdrawMarginAccountInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountInputWithSigners<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountOwner,
    TAccountSystemProgram
  >
): WithdrawMarginAccountInstructionWithSigners<
  TProgram,
  TAccountTswap,
  TAccountMarginAccount,
  TAccountOwner,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountInput<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountOwner,
    TAccountSystemProgram
  >
): WithdrawMarginAccountInstruction<
  TProgram,
  TAccountTswap,
  TAccountMarginAccount,
  TAccountOwner,
  TAccountSystemProgram
>;
export function getWithdrawMarginAccountInstruction<
  TAccountTswap extends string,
  TAccountMarginAccount extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WithdrawMarginAccountInput<
    TAccountTswap,
    TAccountMarginAccount,
    TAccountOwner,
    TAccountSystemProgram
  >
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getWithdrawMarginAccountInstructionRaw<
      TProgram,
      TAccountTswap,
      TAccountMarginAccount,
      TAccountOwner,
      TAccountSystemProgram
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
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

  const instruction = getWithdrawMarginAccountInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as WithdrawMarginAccountInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getWithdrawMarginAccountInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
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
    marginAccount: TAccountMarginAccount extends string
      ? Address<TAccountMarginAccount>
      : TAccountMarginAccount;
    owner: TAccountOwner extends string
      ? Address<TAccountOwner>
      : TAccountOwner;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
  },
  args: WithdrawMarginAccountInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.tswap, AccountRole.READONLY),
      accountMetaWithDefault(accounts.marginAccount, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.owner, AccountRole.WRITABLE_SIGNER),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      ...(remainingAccounts ?? []),
    ],
    data: getWithdrawMarginAccountInstructionDataEncoder().encode(args),
    programAddress,
  } as WithdrawMarginAccountInstruction<
    TProgram,
    TAccountTswap,
    TAccountMarginAccount,
    TAccountOwner,
    TAccountSystemProgram,
    TRemainingAccounts
  >;
}

export type ParsedWithdrawMarginAccountInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    marginAccount: TAccountMetas[1];
    owner: TAccountMetas[2];
    systemProgram: TAccountMetas[3];
  };
  data: WithdrawMarginAccountInstructionData;
};

export function parseWithdrawMarginAccountInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWithdrawMarginAccountInstruction<TProgram, TAccountMetas> {
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
    data: getWithdrawMarginAccountInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}

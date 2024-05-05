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
  Option,
  OptionOrNullable,
  combineCodec,
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
  getOptionDecoder,
  getOptionEncoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
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
import { findTSwapPda } from '../pdas';
import { TENSOR_ESCROW_PROGRAM_ADDRESS } from '../programs';
import { ResolvedAccount, getAccountMetaFactory } from '../shared';
import {
  PoolConfig,
  PoolConfigArgs,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type EditPoolInPlaceInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
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
      TAccountPool extends string
        ? WritableAccount<TAccountPool>
        : TAccountPool,
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
      ...TRemainingAccounts,
    ]
  >;

export type EditPoolInPlaceInstructionData = {
  discriminator: Array<number>;
  config: PoolConfig;
  isCosigned: Option<boolean>;
  maxTakerSellCount: Option<number>;
  mmCompoundFees: Option<boolean>;
};

export type EditPoolInPlaceInstructionDataArgs = {
  config: PoolConfigArgs;
  isCosigned: OptionOrNullable<boolean>;
  maxTakerSellCount: OptionOrNullable<number>;
  mmCompoundFees: OptionOrNullable<boolean>;
};

export function getEditPoolInPlaceInstructionDataEncoder(): Encoder<EditPoolInPlaceInstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['config', getPoolConfigEncoder()],
      ['isCosigned', getOptionEncoder(getBooleanEncoder())],
      ['maxTakerSellCount', getOptionEncoder(getU32Encoder())],
      ['mmCompoundFees', getOptionEncoder(getBooleanEncoder())],
    ]),
    (value) => ({
      ...value,
      discriminator: [125, 191, 119, 113, 6, 14, 164, 23],
    })
  );
}

export function getEditPoolInPlaceInstructionDataDecoder(): Decoder<EditPoolInPlaceInstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['config', getPoolConfigDecoder()],
    ['isCosigned', getOptionDecoder(getBooleanDecoder())],
    ['maxTakerSellCount', getOptionDecoder(getU32Decoder())],
    ['mmCompoundFees', getOptionDecoder(getBooleanDecoder())],
  ]);
}

export function getEditPoolInPlaceInstructionDataCodec(): Codec<
  EditPoolInPlaceInstructionDataArgs,
  EditPoolInPlaceInstructionData
> {
  return combineCodec(
    getEditPoolInPlaceInstructionDataEncoder(),
    getEditPoolInPlaceInstructionDataDecoder()
  );
}

export type EditPoolInPlaceAsyncInput<
  TAccountTswap extends string = string,
  TAccountPool extends string = string,
  TAccountWhitelist extends string = string,
  TAccountOwner extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  tswap?: Address<TAccountTswap>;
  pool: Address<TAccountPool>;
  /** Needed for pool seeds derivation / will be stored inside pool */
  whitelist: Address<TAccountWhitelist>;
  owner: TransactionSigner<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  config: EditPoolInPlaceInstructionDataArgs['config'];
  isCosigned: EditPoolInPlaceInstructionDataArgs['isCosigned'];
  maxTakerSellCount: EditPoolInPlaceInstructionDataArgs['maxTakerSellCount'];
  mmCompoundFees: EditPoolInPlaceInstructionDataArgs['mmCompoundFees'];
};

export async function getEditPoolInPlaceInstructionAsync<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
>(
  input: EditPoolInPlaceAsyncInput<
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram
  >
): Promise<
  EditPoolInPlaceInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram
  >
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    pool: { value: input.pool ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
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
  if (!accounts.tswap.value) {
    accounts.tswap.value = await findTSwapPda();
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.pool),
      getAccountMeta(accounts.whitelist),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getEditPoolInPlaceInstructionDataEncoder().encode(
      args as EditPoolInPlaceInstructionDataArgs
    ),
  } as EditPoolInPlaceInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram
  >;

  return instruction;
}

export type EditPoolInPlaceInput<
  TAccountTswap extends string = string,
  TAccountPool extends string = string,
  TAccountWhitelist extends string = string,
  TAccountOwner extends string = string,
  TAccountSystemProgram extends string = string,
> = {
  tswap: Address<TAccountTswap>;
  pool: Address<TAccountPool>;
  /** Needed for pool seeds derivation / will be stored inside pool */
  whitelist: Address<TAccountWhitelist>;
  owner: TransactionSigner<TAccountOwner>;
  systemProgram?: Address<TAccountSystemProgram>;
  config: EditPoolInPlaceInstructionDataArgs['config'];
  isCosigned: EditPoolInPlaceInstructionDataArgs['isCosigned'];
  maxTakerSellCount: EditPoolInPlaceInstructionDataArgs['maxTakerSellCount'];
  mmCompoundFees: EditPoolInPlaceInstructionDataArgs['mmCompoundFees'];
};

export function getEditPoolInPlaceInstruction<
  TAccountTswap extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountOwner extends string,
  TAccountSystemProgram extends string,
>(
  input: EditPoolInPlaceInput<
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram
  >
): EditPoolInPlaceInstruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountPool,
  TAccountWhitelist,
  TAccountOwner,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    pool: { value: input.pool ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
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
      getAccountMeta(accounts.pool),
      getAccountMeta(accounts.whitelist),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getEditPoolInPlaceInstructionDataEncoder().encode(
      args as EditPoolInPlaceInstructionDataArgs
    ),
  } as EditPoolInPlaceInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountPool,
    TAccountWhitelist,
    TAccountOwner,
    TAccountSystemProgram
  >;

  return instruction;
}

export type ParsedEditPoolInPlaceInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    pool: TAccountMetas[1];
    /** Needed for pool seeds derivation / will be stored inside pool */
    whitelist: TAccountMetas[2];
    owner: TAccountMetas[3];
    systemProgram: TAccountMetas[4];
  };
  data: EditPoolInPlaceInstructionData;
};

export function parseEditPoolInPlaceInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedEditPoolInPlaceInstruction<TProgram, TAccountMetas> {
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
      tswap: getNextAccount(),
      pool: getNextAccount(),
      whitelist: getNextAccount(),
      owner: getNextAccount(),
      systemProgram: getNextAccount(),
    },
    data: getEditPoolInPlaceInstructionDataDecoder().decode(instruction.data),
  };
}

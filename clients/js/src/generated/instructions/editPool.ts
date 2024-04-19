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
import { TENSOR_ESCROW_PROGRAM_ADDRESS } from '../programs';
import { ResolvedAccount, getAccountMetaFactory } from '../shared';
import {
  PoolConfig,
  PoolConfigArgs,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type EditPoolInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
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
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
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
      ...TRemainingAccounts,
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

export function getEditPoolInstructionDataEncoder(): Encoder<EditPoolInstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['oldConfig', getPoolConfigEncoder()],
      ['newConfig', getPoolConfigEncoder()],
      ['isCosigned', getOptionEncoder(getBooleanEncoder())],
      ['maxTakerSellCount', getOptionEncoder(getU32Encoder())],
    ]),
    (value) => ({ ...value, discriminator: [50, 174, 34, 36, 3, 166, 29, 204] })
  );
}

export function getEditPoolInstructionDataDecoder(): Decoder<EditPoolInstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['oldConfig', getPoolConfigDecoder()],
    ['newConfig', getPoolConfigDecoder()],
    ['isCosigned', getOptionDecoder(getBooleanDecoder())],
    ['maxTakerSellCount', getOptionDecoder(getU32Decoder())],
  ]);
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
  TAccountTswap extends string = string,
  TAccountOldPool extends string = string,
  TAccountNewPool extends string = string,
  TAccountOldSolEscrow extends string = string,
  TAccountNewSolEscrow extends string = string,
  TAccountWhitelist extends string = string,
  TAccountNftAuthority extends string = string,
  TAccountOwner extends string = string,
  TAccountSystemProgram extends string = string,
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
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountOldPool,
  TAccountNewPool,
  TAccountOldSolEscrow,
  TAccountNewSolEscrow,
  TAccountWhitelist,
  TAccountNftAuthority,
  TAccountOwner,
  TAccountSystemProgram
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
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
      getAccountMeta(accounts.oldPool),
      getAccountMeta(accounts.newPool),
      getAccountMeta(accounts.oldSolEscrow),
      getAccountMeta(accounts.newSolEscrow),
      getAccountMeta(accounts.whitelist),
      getAccountMeta(accounts.nftAuthority),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.systemProgram),
    ],
    programAddress,
    data: getEditPoolInstructionDataEncoder().encode(
      args as EditPoolInstructionDataArgs
    ),
  } as EditPoolInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
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

  return instruction;
}

export type ParsedEditPoolInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
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
  TAccountMetas extends readonly IAccountMeta[],
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

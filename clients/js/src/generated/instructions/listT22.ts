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
import { findTSwapPda } from '../pdas';
import { TENSOR_ESCROW_PROGRAM_ADDRESS } from '../programs';
import { ResolvedAccount, getAccountMetaFactory } from '../shared';

export type ListT22Instruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountNftSource extends string | IAccountMeta<string> = string,
  TAccountNftMint extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountSingleListing extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountPayer extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountNftSource extends string
        ? WritableAccount<TAccountNftSource>
        : TAccountNftSource,
      TAccountNftMint extends string
        ? ReadonlyAccount<TAccountNftMint>
        : TAccountNftMint,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountSingleListing extends string
        ? WritableAccount<TAccountSingleListing>
        : TAccountSingleListing,
      TAccountOwner extends string
        ? WritableSignerAccount<TAccountOwner> &
            IAccountSignerMeta<TAccountOwner>
        : TAccountOwner,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountPayer extends string
        ? WritableSignerAccount<TAccountPayer> &
            IAccountSignerMeta<TAccountPayer>
        : TAccountPayer,
      ...TRemainingAccounts,
    ]
  >;

export type ListT22InstructionData = {
  discriminator: Array<number>;
  price: bigint;
};

export type ListT22InstructionDataArgs = { price: number | bigint };

export function getListT22InstructionDataEncoder(): Encoder<ListT22InstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['price', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [9, 117, 93, 230, 221, 4, 199, 212],
    })
  );
}

export function getListT22InstructionDataDecoder(): Decoder<ListT22InstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['price', getU64Decoder()],
  ]);
}

export function getListT22InstructionDataCodec(): Codec<
  ListT22InstructionDataArgs,
  ListT22InstructionData
> {
  return combineCodec(
    getListT22InstructionDataEncoder(),
    getListT22InstructionDataDecoder()
  );
}

export type ListT22AsyncInput<
  TAccountTswap extends string = string,
  TAccountNftSource extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountSingleListing extends string = string,
  TAccountOwner extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountPayer extends string = string,
> = {
  tswap?: Address<TAccountTswap>;
  nftSource: Address<TAccountNftSource>;
  nftMint: Address<TAccountNftMint>;
  nftEscrow: Address<TAccountNftEscrow>;
  singleListing: Address<TAccountSingleListing>;
  owner: TransactionSigner<TAccountOwner>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  payer: TransactionSigner<TAccountPayer>;
  price: ListT22InstructionDataArgs['price'];
};

export async function getListT22InstructionAsync<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string,
>(
  input: ListT22AsyncInput<
    TAccountTswap,
    TAccountNftSource,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountPayer
  >
): Promise<
  ListT22Instruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountNftSource,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountPayer
  >
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    nftSource: { value: input.nftSource ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    singleListing: { value: input.singleListing ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    payer: { value: input.payer ?? null, isWritable: true },
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
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.nftSource),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.singleListing),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.payer),
    ],
    programAddress,
    data: getListT22InstructionDataEncoder().encode(
      args as ListT22InstructionDataArgs
    ),
  } as ListT22Instruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountNftSource,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountPayer
  >;

  return instruction;
}

export type ListT22Input<
  TAccountTswap extends string = string,
  TAccountNftSource extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountSingleListing extends string = string,
  TAccountOwner extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountPayer extends string = string,
> = {
  tswap: Address<TAccountTswap>;
  nftSource: Address<TAccountNftSource>;
  nftMint: Address<TAccountNftMint>;
  nftEscrow: Address<TAccountNftEscrow>;
  singleListing: Address<TAccountSingleListing>;
  owner: TransactionSigner<TAccountOwner>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  payer: TransactionSigner<TAccountPayer>;
  price: ListT22InstructionDataArgs['price'];
};

export function getListT22Instruction<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string,
>(
  input: ListT22Input<
    TAccountTswap,
    TAccountNftSource,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountPayer
  >
): ListT22Instruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountNftSource,
  TAccountNftMint,
  TAccountNftEscrow,
  TAccountSingleListing,
  TAccountOwner,
  TAccountTokenProgram,
  TAccountSystemProgram,
  TAccountPayer
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    nftSource: { value: input.nftSource ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    singleListing: { value: input.singleListing ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    payer: { value: input.payer ?? null, isWritable: true },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Original args.
  const args = { ...input };

  // Resolve default values.
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.nftSource),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.singleListing),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.payer),
    ],
    programAddress,
    data: getListT22InstructionDataEncoder().encode(
      args as ListT22InstructionDataArgs
    ),
  } as ListT22Instruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountNftSource,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountPayer
  >;

  return instruction;
}

export type ParsedListT22Instruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    nftSource: TAccountMetas[1];
    nftMint: TAccountMetas[2];
    nftEscrow: TAccountMetas[3];
    singleListing: TAccountMetas[4];
    owner: TAccountMetas[5];
    tokenProgram: TAccountMetas[6];
    systemProgram: TAccountMetas[7];
    payer: TAccountMetas[8];
  };
  data: ListT22InstructionData;
};

export function parseListT22Instruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedListT22Instruction<TProgram, TAccountMetas> {
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
      nftSource: getNextAccount(),
      nftMint: getNextAccount(),
      nftEscrow: getNextAccount(),
      singleListing: getNextAccount(),
      owner: getNextAccount(),
      tokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      payer: getNextAccount(),
    },
    data: getListT22InstructionDataDecoder().decode(instruction.data),
  };
}

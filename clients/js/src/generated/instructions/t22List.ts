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

export type T22ListInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
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
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
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
        ? WritableSignerAccount<TAccountOwner>
        : TAccountOwner,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountPayer extends string
        ? WritableSignerAccount<TAccountPayer>
        : TAccountPayer,
      ...TRemainingAccounts
    ]
  >;

export type T22ListInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
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
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
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
      ...TRemainingAccounts
    ]
  >;

export type T22ListInstructionData = {
  discriminator: Array<number>;
  price: bigint;
};

export type T22ListInstructionDataArgs = { price: number | bigint };

export function getT22ListInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{ discriminator: Array<number>; price: number | bigint }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['price', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [9, 117, 93, 230, 221, 4, 199, 212],
    })
  ) satisfies Encoder<T22ListInstructionDataArgs>;
}

export function getT22ListInstructionDataDecoder() {
  return getStructDecoder<T22ListInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['price', getU64Decoder()],
  ]) satisfies Decoder<T22ListInstructionData>;
}

export function getT22ListInstructionDataCodec(): Codec<
  T22ListInstructionDataArgs,
  T22ListInstructionData
> {
  return combineCodec(
    getT22ListInstructionDataEncoder(),
    getT22ListInstructionDataDecoder()
  );
}

export type T22ListInput<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string
> = {
  tswap: Address<TAccountTswap>;
  nftSource: Address<TAccountNftSource>;
  nftMint: Address<TAccountNftMint>;
  nftEscrow: Address<TAccountNftEscrow>;
  singleListing: Address<TAccountSingleListing>;
  owner: Address<TAccountOwner>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  payer: Address<TAccountPayer>;
  price: T22ListInstructionDataArgs['price'];
};

export type T22ListInputWithSigners<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string
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
  price: T22ListInstructionDataArgs['price'];
};

export function getT22ListInstruction<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: T22ListInputWithSigners<
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
): T22ListInstructionWithSigners<
  TProgram,
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
export function getT22ListInstruction<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: T22ListInput<
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
): T22ListInstruction<
  TProgram,
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
export function getT22ListInstruction<
  TAccountTswap extends string,
  TAccountNftSource extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountPayer extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: T22ListInput<
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
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getT22ListInstructionRaw<
      TProgram,
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
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
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

  // Get account metas and signers.
  const accountMetas = getAccountMetasWithSigners(
    accounts,
    'programId',
    programAddress
  );

  const instruction = getT22ListInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as T22ListInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getT22ListInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
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
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    tswap: TAccountTswap extends string
      ? Address<TAccountTswap>
      : TAccountTswap;
    nftSource: TAccountNftSource extends string
      ? Address<TAccountNftSource>
      : TAccountNftSource;
    nftMint: TAccountNftMint extends string
      ? Address<TAccountNftMint>
      : TAccountNftMint;
    nftEscrow: TAccountNftEscrow extends string
      ? Address<TAccountNftEscrow>
      : TAccountNftEscrow;
    singleListing: TAccountSingleListing extends string
      ? Address<TAccountSingleListing>
      : TAccountSingleListing;
    owner: TAccountOwner extends string
      ? Address<TAccountOwner>
      : TAccountOwner;
    tokenProgram?: TAccountTokenProgram extends string
      ? Address<TAccountTokenProgram>
      : TAccountTokenProgram;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
    payer: TAccountPayer extends string
      ? Address<TAccountPayer>
      : TAccountPayer;
  },
  args: T22ListInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.tswap, AccountRole.READONLY),
      accountMetaWithDefault(accounts.nftSource, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.nftMint, AccountRole.READONLY),
      accountMetaWithDefault(accounts.nftEscrow, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.singleListing, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.owner, AccountRole.WRITABLE_SIGNER),
      accountMetaWithDefault(
        accounts.tokenProgram ??
          ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.payer, AccountRole.WRITABLE_SIGNER),
      ...(remainingAccounts ?? []),
    ],
    data: getT22ListInstructionDataEncoder().encode(args),
    programAddress,
  } as T22ListInstruction<
    TProgram,
    TAccountTswap,
    TAccountNftSource,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountPayer,
    TRemainingAccounts
  >;
}

export type ParsedT22ListInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
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
  data: T22ListInstructionData;
};

export function parseT22ListInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedT22ListInstruction<TProgram, TAccountMetas> {
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
    data: getT22ListInstructionDataDecoder().decode(instruction.data),
  };
}

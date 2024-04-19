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

export type DelistWnsInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountNftDest extends string | IAccountMeta<string> = string,
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
  TAccountRent extends
    | string
    | IAccountMeta<string> = 'SysvarRent111111111111111111111111111111111',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountPayer extends string | IAccountMeta<string> = string,
  TAccountApproveAccount extends string | IAccountMeta<string> = string,
  TAccountDistribution extends string | IAccountMeta<string> = string,
  TAccountWnsProgram extends string | IAccountMeta<string> = string,
  TAccountDistributionProgram extends string | IAccountMeta<string> = string,
  TAccountExtraMetas extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountNftDest extends string
        ? WritableAccount<TAccountNftDest>
        : TAccountNftDest,
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
      TAccountRent extends string
        ? ReadonlyAccount<TAccountRent>
        : TAccountRent,
      TAccountAssociatedTokenProgram extends string
        ? ReadonlyAccount<TAccountAssociatedTokenProgram>
        : TAccountAssociatedTokenProgram,
      TAccountPayer extends string
        ? WritableSignerAccount<TAccountPayer> &
            IAccountSignerMeta<TAccountPayer>
        : TAccountPayer,
      TAccountApproveAccount extends string
        ? WritableAccount<TAccountApproveAccount>
        : TAccountApproveAccount,
      TAccountDistribution extends string
        ? WritableAccount<TAccountDistribution>
        : TAccountDistribution,
      TAccountWnsProgram extends string
        ? ReadonlyAccount<TAccountWnsProgram>
        : TAccountWnsProgram,
      TAccountDistributionProgram extends string
        ? ReadonlyAccount<TAccountDistributionProgram>
        : TAccountDistributionProgram,
      TAccountExtraMetas extends string
        ? ReadonlyAccount<TAccountExtraMetas>
        : TAccountExtraMetas,
      ...TRemainingAccounts,
    ]
  >;

export type DelistWnsInstructionData = { discriminator: Array<number> };

export type DelistWnsInstructionDataArgs = {};

export function getDelistWnsInstructionDataEncoder(): Encoder<DelistWnsInstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
    ]),
    (value) => ({
      ...value,
      discriminator: [131, 226, 161, 134, 233, 132, 243, 159],
    })
  );
}

export function getDelistWnsInstructionDataDecoder(): Decoder<DelistWnsInstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
  ]);
}

export function getDelistWnsInstructionDataCodec(): Codec<
  DelistWnsInstructionDataArgs,
  DelistWnsInstructionData
> {
  return combineCodec(
    getDelistWnsInstructionDataEncoder(),
    getDelistWnsInstructionDataDecoder()
  );
}

export type DelistWnsInput<
  TAccountTswap extends string = string,
  TAccountNftDest extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountSingleListing extends string = string,
  TAccountOwner extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountRent extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
  TAccountPayer extends string = string,
  TAccountApproveAccount extends string = string,
  TAccountDistribution extends string = string,
  TAccountWnsProgram extends string = string,
  TAccountDistributionProgram extends string = string,
  TAccountExtraMetas extends string = string,
> = {
  tswap: Address<TAccountTswap>;
  nftDest: Address<TAccountNftDest>;
  nftMint: Address<TAccountNftMint>;
  /**
   * Implicitly checked via transfer. Will fail if wrong account
   * This is closed below (dest = owner)
   */
  nftEscrow: Address<TAccountNftEscrow>;
  singleListing: Address<TAccountSingleListing>;
  owner: TransactionSigner<TAccountOwner>;
  tokenProgram?: Address<TAccountTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  payer: TransactionSigner<TAccountPayer>;
  approveAccount: Address<TAccountApproveAccount>;
  distribution: Address<TAccountDistribution>;
  wnsProgram: Address<TAccountWnsProgram>;
  distributionProgram: Address<TAccountDistributionProgram>;
  extraMetas: Address<TAccountExtraMetas>;
};

export function getDelistWnsInstruction<
  TAccountTswap extends string,
  TAccountNftDest extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountSingleListing extends string,
  TAccountOwner extends string,
  TAccountTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountPayer extends string,
  TAccountApproveAccount extends string,
  TAccountDistribution extends string,
  TAccountWnsProgram extends string,
  TAccountDistributionProgram extends string,
  TAccountExtraMetas extends string,
>(
  input: DelistWnsInput<
    TAccountTswap,
    TAccountNftDest,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountAssociatedTokenProgram,
    TAccountPayer,
    TAccountApproveAccount,
    TAccountDistribution,
    TAccountWnsProgram,
    TAccountDistributionProgram,
    TAccountExtraMetas
  >
): DelistWnsInstruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountNftDest,
  TAccountNftMint,
  TAccountNftEscrow,
  TAccountSingleListing,
  TAccountOwner,
  TAccountTokenProgram,
  TAccountSystemProgram,
  TAccountRent,
  TAccountAssociatedTokenProgram,
  TAccountPayer,
  TAccountApproveAccount,
  TAccountDistribution,
  TAccountWnsProgram,
  TAccountDistributionProgram,
  TAccountExtraMetas
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    nftDest: { value: input.nftDest ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    singleListing: { value: input.singleListing ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    rent: { value: input.rent ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    payer: { value: input.payer ?? null, isWritable: true },
    approveAccount: { value: input.approveAccount ?? null, isWritable: true },
    distribution: { value: input.distribution ?? null, isWritable: true },
    wnsProgram: { value: input.wnsProgram ?? null, isWritable: false },
    distributionProgram: {
      value: input.distributionProgram ?? null,
      isWritable: false,
    },
    extraMetas: { value: input.extraMetas ?? null, isWritable: false },
  };
  const accounts = originalAccounts as Record<
    keyof typeof originalAccounts,
    ResolvedAccount
  >;

  // Resolve default values.
  if (!accounts.tokenProgram.value) {
    accounts.tokenProgram.value =
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>;
  }
  if (!accounts.systemProgram.value) {
    accounts.systemProgram.value =
      '11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>;
  }
  if (!accounts.rent.value) {
    accounts.rent.value =
      'SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.nftDest),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.singleListing),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.rent),
      getAccountMeta(accounts.associatedTokenProgram),
      getAccountMeta(accounts.payer),
      getAccountMeta(accounts.approveAccount),
      getAccountMeta(accounts.distribution),
      getAccountMeta(accounts.wnsProgram),
      getAccountMeta(accounts.distributionProgram),
      getAccountMeta(accounts.extraMetas),
    ],
    programAddress,
    data: getDelistWnsInstructionDataEncoder().encode({}),
  } as DelistWnsInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountNftDest,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountSingleListing,
    TAccountOwner,
    TAccountTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountAssociatedTokenProgram,
    TAccountPayer,
    TAccountApproveAccount,
    TAccountDistribution,
    TAccountWnsProgram,
    TAccountDistributionProgram,
    TAccountExtraMetas
  >;

  return instruction;
}

export type ParsedDelistWnsInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    nftDest: TAccountMetas[1];
    nftMint: TAccountMetas[2];
    /**
     * Implicitly checked via transfer. Will fail if wrong account
     * This is closed below (dest = owner)
     */

    nftEscrow: TAccountMetas[3];
    singleListing: TAccountMetas[4];
    owner: TAccountMetas[5];
    tokenProgram: TAccountMetas[6];
    systemProgram: TAccountMetas[7];
    rent: TAccountMetas[8];
    associatedTokenProgram: TAccountMetas[9];
    payer: TAccountMetas[10];
    approveAccount: TAccountMetas[11];
    distribution: TAccountMetas[12];
    wnsProgram: TAccountMetas[13];
    distributionProgram: TAccountMetas[14];
    extraMetas: TAccountMetas[15];
  };
  data: DelistWnsInstructionData;
};

export function parseDelistWnsInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedDelistWnsInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 16) {
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
      nftDest: getNextAccount(),
      nftMint: getNextAccount(),
      nftEscrow: getNextAccount(),
      singleListing: getNextAccount(),
      owner: getNextAccount(),
      tokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      rent: getNextAccount(),
      associatedTokenProgram: getNextAccount(),
      payer: getNextAccount(),
      approveAccount: getNextAccount(),
      distribution: getNextAccount(),
      wnsProgram: getNextAccount(),
      distributionProgram: getNextAccount(),
      extraMetas: getNextAccount(),
    },
    data: getDelistWnsInstructionDataDecoder().decode(instruction.data),
  };
}

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
import { findMarginAccountPda, findTSwapPda } from '../pdas';
import { TENSOR_ESCROW_PROGRAM_ADDRESS } from '../programs';
import {
  ResolvedAccount,
  expectAddress,
  getAccountMetaFactory,
} from '../shared';
import {
  PoolConfig,
  PoolConfigArgs,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type BuyNftT22Instruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountFeeVault extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountNftBuyerAcc extends string | IAccountMeta<string> = string,
  TAccountNftMint extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountSolEscrow extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountBuyer extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountTakerBroker extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends readonly IAccountMeta<string>[] = [],
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountTswap extends string
        ? ReadonlyAccount<TAccountTswap>
        : TAccountTswap,
      TAccountFeeVault extends string
        ? WritableAccount<TAccountFeeVault>
        : TAccountFeeVault,
      TAccountPool extends string
        ? WritableAccount<TAccountPool>
        : TAccountPool,
      TAccountWhitelist extends string
        ? ReadonlyAccount<TAccountWhitelist>
        : TAccountWhitelist,
      TAccountNftBuyerAcc extends string
        ? WritableAccount<TAccountNftBuyerAcc>
        : TAccountNftBuyerAcc,
      TAccountNftMint extends string
        ? ReadonlyAccount<TAccountNftMint>
        : TAccountNftMint,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountNftReceipt extends string
        ? WritableAccount<TAccountNftReceipt>
        : TAccountNftReceipt,
      TAccountSolEscrow extends string
        ? WritableAccount<TAccountSolEscrow>
        : TAccountSolEscrow,
      TAccountOwner extends string
        ? WritableAccount<TAccountOwner>
        : TAccountOwner,
      TAccountBuyer extends string
        ? WritableSignerAccount<TAccountBuyer> &
            IAccountSignerMeta<TAccountBuyer>
        : TAccountBuyer,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountAssociatedTokenProgram extends string
        ? ReadonlyAccount<TAccountAssociatedTokenProgram>
        : TAccountAssociatedTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountTakerBroker extends string
        ? WritableAccount<TAccountTakerBroker>
        : TAccountTakerBroker,
      ...TRemainingAccounts,
    ]
  >;

export type BuyNftT22InstructionData = {
  discriminator: Array<number>;
  config: PoolConfig;
  maxPrice: bigint;
};

export type BuyNftT22InstructionDataArgs = {
  config: PoolConfigArgs;
  maxPrice: number | bigint;
};

export function getBuyNftT22InstructionDataEncoder(): Encoder<BuyNftT22InstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['config', getPoolConfigEncoder()],
      ['maxPrice', getU64Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [155, 219, 126, 245, 170, 199, 51, 79],
    })
  );
}

export function getBuyNftT22InstructionDataDecoder(): Decoder<BuyNftT22InstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['config', getPoolConfigDecoder()],
    ['maxPrice', getU64Decoder()],
  ]);
}

export function getBuyNftT22InstructionDataCodec(): Codec<
  BuyNftT22InstructionDataArgs,
  BuyNftT22InstructionData
> {
  return combineCodec(
    getBuyNftT22InstructionDataEncoder(),
    getBuyNftT22InstructionDataDecoder()
  );
}

export type BuyNftT22AsyncInput<
  TAccountTswap extends string = string,
  TAccountFeeVault extends string = string,
  TAccountPool extends string = string,
  TAccountWhitelist extends string = string,
  TAccountNftBuyerAcc extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountNftReceipt extends string = string,
  TAccountSolEscrow extends string = string,
  TAccountOwner extends string = string,
  TAccountBuyer extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountMarginAccount extends string = string,
  TAccountTakerBroker extends string = string,
> = {
  tswap?: Address<TAccountTswap>;
  feeVault: Address<TAccountFeeVault>;
  pool: Address<TAccountPool>;
  /** Needed for pool seeds derivation, has_one = whitelist on pool */
  whitelist: Address<TAccountWhitelist>;
  nftBuyerAcc: Address<TAccountNftBuyerAcc>;
  nftMint: Address<TAccountNftMint>;
  /**
   * Implicitly checked via transfer. Will fail if wrong account.
   * This is closed below (dest = owner)
   */
  nftEscrow: Address<TAccountNftEscrow>;
  nftReceipt: Address<TAccountNftReceipt>;
  solEscrow: Address<TAccountSolEscrow>;
  owner: Address<TAccountOwner>;
  buyer: TransactionSigner<TAccountBuyer>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  marginAccount?: Address<TAccountMarginAccount>;
  takerBroker: Address<TAccountTakerBroker>;
  config: BuyNftT22InstructionDataArgs['config'];
  maxPrice: BuyNftT22InstructionDataArgs['maxPrice'];
};

export async function getBuyNftT22InstructionAsync<
  TAccountTswap extends string,
  TAccountFeeVault extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftBuyerAcc extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountSolEscrow extends string,
  TAccountOwner extends string,
  TAccountBuyer extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
>(
  input: BuyNftT22AsyncInput<
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftBuyerAcc,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountBuyer,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker
  >
): Promise<
  BuyNftT22Instruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftBuyerAcc,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountBuyer,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker
  >
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    feeVault: { value: input.feeVault ?? null, isWritable: true },
    pool: { value: input.pool ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
    nftBuyerAcc: { value: input.nftBuyerAcc ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    nftReceipt: { value: input.nftReceipt ?? null, isWritable: true },
    solEscrow: { value: input.solEscrow ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    buyer: { value: input.buyer ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    takerBroker: { value: input.takerBroker ?? null, isWritable: true },
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
  if (!accounts.marginAccount.value) {
    accounts.marginAccount.value = await findMarginAccountPda({
      tswap: expectAddress(accounts.tswap.value),
      owner: expectAddress(accounts.owner.value),
    });
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.feeVault),
      getAccountMeta(accounts.pool),
      getAccountMeta(accounts.whitelist),
      getAccountMeta(accounts.nftBuyerAcc),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.nftReceipt),
      getAccountMeta(accounts.solEscrow),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.buyer),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.associatedTokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.takerBroker),
    ],
    programAddress,
    data: getBuyNftT22InstructionDataEncoder().encode(
      args as BuyNftT22InstructionDataArgs
    ),
  } as BuyNftT22Instruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftBuyerAcc,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountBuyer,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker
  >;

  return instruction;
}

export type BuyNftT22Input<
  TAccountTswap extends string = string,
  TAccountFeeVault extends string = string,
  TAccountPool extends string = string,
  TAccountWhitelist extends string = string,
  TAccountNftBuyerAcc extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountNftReceipt extends string = string,
  TAccountSolEscrow extends string = string,
  TAccountOwner extends string = string,
  TAccountBuyer extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountMarginAccount extends string = string,
  TAccountTakerBroker extends string = string,
> = {
  tswap: Address<TAccountTswap>;
  feeVault: Address<TAccountFeeVault>;
  pool: Address<TAccountPool>;
  /** Needed for pool seeds derivation, has_one = whitelist on pool */
  whitelist: Address<TAccountWhitelist>;
  nftBuyerAcc: Address<TAccountNftBuyerAcc>;
  nftMint: Address<TAccountNftMint>;
  /**
   * Implicitly checked via transfer. Will fail if wrong account.
   * This is closed below (dest = owner)
   */
  nftEscrow: Address<TAccountNftEscrow>;
  nftReceipt: Address<TAccountNftReceipt>;
  solEscrow: Address<TAccountSolEscrow>;
  owner: Address<TAccountOwner>;
  buyer: TransactionSigner<TAccountBuyer>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  marginAccount: Address<TAccountMarginAccount>;
  takerBroker: Address<TAccountTakerBroker>;
  config: BuyNftT22InstructionDataArgs['config'];
  maxPrice: BuyNftT22InstructionDataArgs['maxPrice'];
};

export function getBuyNftT22Instruction<
  TAccountTswap extends string,
  TAccountFeeVault extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountNftBuyerAcc extends string,
  TAccountNftMint extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountSolEscrow extends string,
  TAccountOwner extends string,
  TAccountBuyer extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
>(
  input: BuyNftT22Input<
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftBuyerAcc,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountBuyer,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker
  >
): BuyNftT22Instruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountFeeVault,
  TAccountPool,
  TAccountWhitelist,
  TAccountNftBuyerAcc,
  TAccountNftMint,
  TAccountNftEscrow,
  TAccountNftReceipt,
  TAccountSolEscrow,
  TAccountOwner,
  TAccountBuyer,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountSystemProgram,
  TAccountMarginAccount,
  TAccountTakerBroker
> {
  // Program address.
  const programAddress = TENSOR_ESCROW_PROGRAM_ADDRESS;

  // Original accounts.
  const originalAccounts = {
    tswap: { value: input.tswap ?? null, isWritable: false },
    feeVault: { value: input.feeVault ?? null, isWritable: true },
    pool: { value: input.pool ?? null, isWritable: true },
    whitelist: { value: input.whitelist ?? null, isWritable: false },
    nftBuyerAcc: { value: input.nftBuyerAcc ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    nftReceipt: { value: input.nftReceipt ?? null, isWritable: true },
    solEscrow: { value: input.solEscrow ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    buyer: { value: input.buyer ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    takerBroker: { value: input.takerBroker ?? null, isWritable: true },
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
      getAccountMeta(accounts.feeVault),
      getAccountMeta(accounts.pool),
      getAccountMeta(accounts.whitelist),
      getAccountMeta(accounts.nftBuyerAcc),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.nftReceipt),
      getAccountMeta(accounts.solEscrow),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.buyer),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.associatedTokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.takerBroker),
    ],
    programAddress,
    data: getBuyNftT22InstructionDataEncoder().encode(
      args as BuyNftT22InstructionDataArgs
    ),
  } as BuyNftT22Instruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountNftBuyerAcc,
    TAccountNftMint,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountBuyer,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker
  >;

  return instruction;
}

export type ParsedBuyNftT22Instruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    feeVault: TAccountMetas[1];
    pool: TAccountMetas[2];
    /** Needed for pool seeds derivation, has_one = whitelist on pool */
    whitelist: TAccountMetas[3];
    nftBuyerAcc: TAccountMetas[4];
    nftMint: TAccountMetas[5];
    /**
     * Implicitly checked via transfer. Will fail if wrong account.
     * This is closed below (dest = owner)
     */

    nftEscrow: TAccountMetas[6];
    nftReceipt: TAccountMetas[7];
    solEscrow: TAccountMetas[8];
    owner: TAccountMetas[9];
    buyer: TAccountMetas[10];
    tokenProgram: TAccountMetas[11];
    associatedTokenProgram: TAccountMetas[12];
    systemProgram: TAccountMetas[13];
    marginAccount: TAccountMetas[14];
    takerBroker: TAccountMetas[15];
  };
  data: BuyNftT22InstructionData;
};

export function parseBuyNftT22Instruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedBuyNftT22Instruction<TProgram, TAccountMetas> {
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
      feeVault: getNextAccount(),
      pool: getNextAccount(),
      whitelist: getNextAccount(),
      nftBuyerAcc: getNextAccount(),
      nftMint: getNextAccount(),
      nftEscrow: getNextAccount(),
      nftReceipt: getNextAccount(),
      solEscrow: getNextAccount(),
      owner: getNextAccount(),
      buyer: getNextAccount(),
      tokenProgram: getNextAccount(),
      associatedTokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      marginAccount: getNextAccount(),
      takerBroker: getNextAccount(),
    },
    data: getBuyNftT22InstructionDataDecoder().decode(instruction.data),
  };
}

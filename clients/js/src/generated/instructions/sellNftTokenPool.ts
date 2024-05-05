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
  getU16Decoder,
  getU16Encoder,
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
  AuthorizationDataLocal,
  AuthorizationDataLocalArgs,
  PoolConfig,
  PoolConfigArgs,
  getAuthorizationDataLocalDecoder,
  getAuthorizationDataLocalEncoder,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type SellNftTokenPoolInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap extends string | IAccountMeta<string> = string,
  TAccountFeeVault extends string | IAccountMeta<string> = string,
  TAccountPool extends string | IAccountMeta<string> = string,
  TAccountWhitelist extends string | IAccountMeta<string> = string,
  TAccountMintProof extends string | IAccountMeta<string> = string,
  TAccountNftSellerAcc extends string | IAccountMeta<string> = string,
  TAccountNftMint extends string | IAccountMeta<string> = string,
  TAccountNftMetadata extends string | IAccountMeta<string> = string,
  TAccountSolEscrow extends string | IAccountMeta<string> = string,
  TAccountOwner extends string | IAccountMeta<string> = string,
  TAccountSeller extends string | IAccountMeta<string> = string,
  TAccountOwnerAtaAcc extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountRent extends
    | string
    | IAccountMeta<string> = 'SysvarRent111111111111111111111111111111111',
  TAccountNftEdition extends string | IAccountMeta<string> = string,
  TAccountOwnerTokenRecord extends string | IAccountMeta<string> = string,
  TAccountDestTokenRecord extends string | IAccountMeta<string> = string,
  TAccountTokenMetadataProgram extends
    | string
    | IAccountMeta<string> = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  TAccountInstructions extends string | IAccountMeta<string> = string,
  TAccountAuthorizationRulesProgram extends
    | string
    | IAccountMeta<string> = 'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountTempEscrowTokenRecord extends string | IAccountMeta<string> = string,
  TAccountAuthRules extends string | IAccountMeta<string> = string,
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
      TAccountMintProof extends string
        ? ReadonlyAccount<TAccountMintProof>
        : TAccountMintProof,
      TAccountNftSellerAcc extends string
        ? WritableAccount<TAccountNftSellerAcc>
        : TAccountNftSellerAcc,
      TAccountNftMint extends string
        ? ReadonlyAccount<TAccountNftMint>
        : TAccountNftMint,
      TAccountNftMetadata extends string
        ? WritableAccount<TAccountNftMetadata>
        : TAccountNftMetadata,
      TAccountSolEscrow extends string
        ? WritableAccount<TAccountSolEscrow>
        : TAccountSolEscrow,
      TAccountOwner extends string
        ? WritableAccount<TAccountOwner>
        : TAccountOwner,
      TAccountSeller extends string
        ? WritableSignerAccount<TAccountSeller> &
            IAccountSignerMeta<TAccountSeller>
        : TAccountSeller,
      TAccountOwnerAtaAcc extends string
        ? WritableAccount<TAccountOwnerAtaAcc>
        : TAccountOwnerAtaAcc,
      TAccountTokenProgram extends string
        ? ReadonlyAccount<TAccountTokenProgram>
        : TAccountTokenProgram,
      TAccountAssociatedTokenProgram extends string
        ? ReadonlyAccount<TAccountAssociatedTokenProgram>
        : TAccountAssociatedTokenProgram,
      TAccountSystemProgram extends string
        ? ReadonlyAccount<TAccountSystemProgram>
        : TAccountSystemProgram,
      TAccountRent extends string
        ? ReadonlyAccount<TAccountRent>
        : TAccountRent,
      TAccountNftEdition extends string
        ? ReadonlyAccount<TAccountNftEdition>
        : TAccountNftEdition,
      TAccountOwnerTokenRecord extends string
        ? WritableAccount<TAccountOwnerTokenRecord>
        : TAccountOwnerTokenRecord,
      TAccountDestTokenRecord extends string
        ? WritableAccount<TAccountDestTokenRecord>
        : TAccountDestTokenRecord,
      TAccountTokenMetadataProgram extends string
        ? ReadonlyAccount<TAccountTokenMetadataProgram>
        : TAccountTokenMetadataProgram,
      TAccountInstructions extends string
        ? ReadonlyAccount<TAccountInstructions>
        : TAccountInstructions,
      TAccountAuthorizationRulesProgram extends string
        ? ReadonlyAccount<TAccountAuthorizationRulesProgram>
        : TAccountAuthorizationRulesProgram,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountTempEscrowTokenRecord extends string
        ? WritableAccount<TAccountTempEscrowTokenRecord>
        : TAccountTempEscrowTokenRecord,
      TAccountAuthRules extends string
        ? ReadonlyAccount<TAccountAuthRules>
        : TAccountAuthRules,
      TAccountMarginAccount extends string
        ? WritableAccount<TAccountMarginAccount>
        : TAccountMarginAccount,
      TAccountTakerBroker extends string
        ? WritableAccount<TAccountTakerBroker>
        : TAccountTakerBroker,
      ...TRemainingAccounts,
    ]
  >;

export type SellNftTokenPoolInstructionData = {
  discriminator: Array<number>;
  config: PoolConfig;
  minPrice: bigint;
  rulesAccPresent: boolean;
  authorizationData: Option<AuthorizationDataLocal>;
  optionalRoyaltyPct: Option<number>;
};

export type SellNftTokenPoolInstructionDataArgs = {
  config: PoolConfigArgs;
  minPrice: number | bigint;
  rulesAccPresent: boolean;
  authorizationData: OptionOrNullable<AuthorizationDataLocalArgs>;
  optionalRoyaltyPct: OptionOrNullable<number>;
};

export function getSellNftTokenPoolInstructionDataEncoder(): Encoder<SellNftTokenPoolInstructionDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['config', getPoolConfigEncoder()],
      ['minPrice', getU64Encoder()],
      ['rulesAccPresent', getBooleanEncoder()],
      [
        'authorizationData',
        getOptionEncoder(getAuthorizationDataLocalEncoder()),
      ],
      ['optionalRoyaltyPct', getOptionEncoder(getU16Encoder())],
    ]),
    (value) => ({ ...value, discriminator: [57, 44, 192, 48, 83, 8, 107, 48] })
  );
}

export function getSellNftTokenPoolInstructionDataDecoder(): Decoder<SellNftTokenPoolInstructionData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['config', getPoolConfigDecoder()],
    ['minPrice', getU64Decoder()],
    ['rulesAccPresent', getBooleanDecoder()],
    ['authorizationData', getOptionDecoder(getAuthorizationDataLocalDecoder())],
    ['optionalRoyaltyPct', getOptionDecoder(getU16Decoder())],
  ]);
}

export function getSellNftTokenPoolInstructionDataCodec(): Codec<
  SellNftTokenPoolInstructionDataArgs,
  SellNftTokenPoolInstructionData
> {
  return combineCodec(
    getSellNftTokenPoolInstructionDataEncoder(),
    getSellNftTokenPoolInstructionDataDecoder()
  );
}

export type SellNftTokenPoolAsyncInput<
  TAccountTswap extends string = string,
  TAccountFeeVault extends string = string,
  TAccountPool extends string = string,
  TAccountWhitelist extends string = string,
  TAccountMintProof extends string = string,
  TAccountNftSellerAcc extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftMetadata extends string = string,
  TAccountSolEscrow extends string = string,
  TAccountOwner extends string = string,
  TAccountSeller extends string = string,
  TAccountOwnerAtaAcc extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountRent extends string = string,
  TAccountNftEdition extends string = string,
  TAccountOwnerTokenRecord extends string = string,
  TAccountDestTokenRecord extends string = string,
  TAccountTokenMetadataProgram extends string = string,
  TAccountInstructions extends string = string,
  TAccountAuthorizationRulesProgram extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountTempEscrowTokenRecord extends string = string,
  TAccountAuthRules extends string = string,
  TAccountMarginAccount extends string = string,
  TAccountTakerBroker extends string = string,
> = {
  tswap?: Address<TAccountTswap>;
  feeVault: Address<TAccountFeeVault>;
  pool: Address<TAccountPool>;
  /** Needed for pool seeds derivation, also checked via has_one on pool */
  whitelist: Address<TAccountWhitelist>;
  /** intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification */
  mintProof: Address<TAccountMintProof>;
  nftSellerAcc: Address<TAccountNftSellerAcc>;
  nftMint: Address<TAccountNftMint>;
  nftMetadata: Address<TAccountNftMetadata>;
  solEscrow: Address<TAccountSolEscrow>;
  owner: Address<TAccountOwner>;
  seller: TransactionSigner<TAccountSeller>;
  ownerAtaAcc: Address<TAccountOwnerAtaAcc>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  nftEdition: Address<TAccountNftEdition>;
  ownerTokenRecord: Address<TAccountOwnerTokenRecord>;
  destTokenRecord: Address<TAccountDestTokenRecord>;
  tokenMetadataProgram?: Address<TAccountTokenMetadataProgram>;
  instructions: Address<TAccountInstructions>;
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Implicitly checked via transfer. Will fail if wrong account */
  nftEscrow: Address<TAccountNftEscrow>;
  tempEscrowTokenRecord: Address<TAccountTempEscrowTokenRecord>;
  authRules: Address<TAccountAuthRules>;
  marginAccount?: Address<TAccountMarginAccount>;
  takerBroker: Address<TAccountTakerBroker>;
  config: SellNftTokenPoolInstructionDataArgs['config'];
  minPrice: SellNftTokenPoolInstructionDataArgs['minPrice'];
  rulesAccPresent: SellNftTokenPoolInstructionDataArgs['rulesAccPresent'];
  authorizationData: SellNftTokenPoolInstructionDataArgs['authorizationData'];
  optionalRoyaltyPct: SellNftTokenPoolInstructionDataArgs['optionalRoyaltyPct'];
};

export async function getSellNftTokenPoolInstructionAsync<
  TAccountTswap extends string,
  TAccountFeeVault extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountMintProof extends string,
  TAccountNftSellerAcc extends string,
  TAccountNftMint extends string,
  TAccountNftMetadata extends string,
  TAccountSolEscrow extends string,
  TAccountOwner extends string,
  TAccountSeller extends string,
  TAccountOwnerAtaAcc extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountTokenMetadataProgram extends string,
  TAccountInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountNftEscrow extends string,
  TAccountTempEscrowTokenRecord extends string,
  TAccountAuthRules extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
>(
  input: SellNftTokenPoolAsyncInput<
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountMintProof,
    TAccountNftSellerAcc,
    TAccountNftMint,
    TAccountNftMetadata,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountSeller,
    TAccountOwnerAtaAcc,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountTokenMetadataProgram,
    TAccountInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountNftEscrow,
    TAccountTempEscrowTokenRecord,
    TAccountAuthRules,
    TAccountMarginAccount,
    TAccountTakerBroker
  >
): Promise<
  SellNftTokenPoolInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountMintProof,
    TAccountNftSellerAcc,
    TAccountNftMint,
    TAccountNftMetadata,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountSeller,
    TAccountOwnerAtaAcc,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountTokenMetadataProgram,
    TAccountInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountNftEscrow,
    TAccountTempEscrowTokenRecord,
    TAccountAuthRules,
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
    mintProof: { value: input.mintProof ?? null, isWritable: false },
    nftSellerAcc: { value: input.nftSellerAcc ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftMetadata: { value: input.nftMetadata ?? null, isWritable: true },
    solEscrow: { value: input.solEscrow ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    seller: { value: input.seller ?? null, isWritable: true },
    ownerAtaAcc: { value: input.ownerAtaAcc ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    rent: { value: input.rent ?? null, isWritable: false },
    nftEdition: { value: input.nftEdition ?? null, isWritable: false },
    ownerTokenRecord: {
      value: input.ownerTokenRecord ?? null,
      isWritable: true,
    },
    destTokenRecord: { value: input.destTokenRecord ?? null, isWritable: true },
    tokenMetadataProgram: {
      value: input.tokenMetadataProgram ?? null,
      isWritable: false,
    },
    instructions: { value: input.instructions ?? null, isWritable: false },
    authorizationRulesProgram: {
      value: input.authorizationRulesProgram ?? null,
      isWritable: false,
    },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    tempEscrowTokenRecord: {
      value: input.tempEscrowTokenRecord ?? null,
      isWritable: true,
    },
    authRules: { value: input.authRules ?? null, isWritable: false },
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
  if (!accounts.rent.value) {
    accounts.rent.value =
      'SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>;
  }
  if (!accounts.tokenMetadataProgram.value) {
    accounts.tokenMetadataProgram.value =
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>;
  }
  if (!accounts.authorizationRulesProgram.value) {
    accounts.authorizationRulesProgram.value =
      'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg' as Address<'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'>;
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
      getAccountMeta(accounts.mintProof),
      getAccountMeta(accounts.nftSellerAcc),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftMetadata),
      getAccountMeta(accounts.solEscrow),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.seller),
      getAccountMeta(accounts.ownerAtaAcc),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.associatedTokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.rent),
      getAccountMeta(accounts.nftEdition),
      getAccountMeta(accounts.ownerTokenRecord),
      getAccountMeta(accounts.destTokenRecord),
      getAccountMeta(accounts.tokenMetadataProgram),
      getAccountMeta(accounts.instructions),
      getAccountMeta(accounts.authorizationRulesProgram),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.tempEscrowTokenRecord),
      getAccountMeta(accounts.authRules),
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.takerBroker),
    ],
    programAddress,
    data: getSellNftTokenPoolInstructionDataEncoder().encode(
      args as SellNftTokenPoolInstructionDataArgs
    ),
  } as SellNftTokenPoolInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountMintProof,
    TAccountNftSellerAcc,
    TAccountNftMint,
    TAccountNftMetadata,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountSeller,
    TAccountOwnerAtaAcc,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountTokenMetadataProgram,
    TAccountInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountNftEscrow,
    TAccountTempEscrowTokenRecord,
    TAccountAuthRules,
    TAccountMarginAccount,
    TAccountTakerBroker
  >;

  return instruction;
}

export type SellNftTokenPoolInput<
  TAccountTswap extends string = string,
  TAccountFeeVault extends string = string,
  TAccountPool extends string = string,
  TAccountWhitelist extends string = string,
  TAccountMintProof extends string = string,
  TAccountNftSellerAcc extends string = string,
  TAccountNftMint extends string = string,
  TAccountNftMetadata extends string = string,
  TAccountSolEscrow extends string = string,
  TAccountOwner extends string = string,
  TAccountSeller extends string = string,
  TAccountOwnerAtaAcc extends string = string,
  TAccountTokenProgram extends string = string,
  TAccountAssociatedTokenProgram extends string = string,
  TAccountSystemProgram extends string = string,
  TAccountRent extends string = string,
  TAccountNftEdition extends string = string,
  TAccountOwnerTokenRecord extends string = string,
  TAccountDestTokenRecord extends string = string,
  TAccountTokenMetadataProgram extends string = string,
  TAccountInstructions extends string = string,
  TAccountAuthorizationRulesProgram extends string = string,
  TAccountNftEscrow extends string = string,
  TAccountTempEscrowTokenRecord extends string = string,
  TAccountAuthRules extends string = string,
  TAccountMarginAccount extends string = string,
  TAccountTakerBroker extends string = string,
> = {
  tswap: Address<TAccountTswap>;
  feeVault: Address<TAccountFeeVault>;
  pool: Address<TAccountPool>;
  /** Needed for pool seeds derivation, also checked via has_one on pool */
  whitelist: Address<TAccountWhitelist>;
  /** intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification */
  mintProof: Address<TAccountMintProof>;
  nftSellerAcc: Address<TAccountNftSellerAcc>;
  nftMint: Address<TAccountNftMint>;
  nftMetadata: Address<TAccountNftMetadata>;
  solEscrow: Address<TAccountSolEscrow>;
  owner: Address<TAccountOwner>;
  seller: TransactionSigner<TAccountSeller>;
  ownerAtaAcc: Address<TAccountOwnerAtaAcc>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  rent?: Address<TAccountRent>;
  nftEdition: Address<TAccountNftEdition>;
  ownerTokenRecord: Address<TAccountOwnerTokenRecord>;
  destTokenRecord: Address<TAccountDestTokenRecord>;
  tokenMetadataProgram?: Address<TAccountTokenMetadataProgram>;
  instructions: Address<TAccountInstructions>;
  authorizationRulesProgram?: Address<TAccountAuthorizationRulesProgram>;
  /** Implicitly checked via transfer. Will fail if wrong account */
  nftEscrow: Address<TAccountNftEscrow>;
  tempEscrowTokenRecord: Address<TAccountTempEscrowTokenRecord>;
  authRules: Address<TAccountAuthRules>;
  marginAccount: Address<TAccountMarginAccount>;
  takerBroker: Address<TAccountTakerBroker>;
  config: SellNftTokenPoolInstructionDataArgs['config'];
  minPrice: SellNftTokenPoolInstructionDataArgs['minPrice'];
  rulesAccPresent: SellNftTokenPoolInstructionDataArgs['rulesAccPresent'];
  authorizationData: SellNftTokenPoolInstructionDataArgs['authorizationData'];
  optionalRoyaltyPct: SellNftTokenPoolInstructionDataArgs['optionalRoyaltyPct'];
};

export function getSellNftTokenPoolInstruction<
  TAccountTswap extends string,
  TAccountFeeVault extends string,
  TAccountPool extends string,
  TAccountWhitelist extends string,
  TAccountMintProof extends string,
  TAccountNftSellerAcc extends string,
  TAccountNftMint extends string,
  TAccountNftMetadata extends string,
  TAccountSolEscrow extends string,
  TAccountOwner extends string,
  TAccountSeller extends string,
  TAccountOwnerAtaAcc extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountRent extends string,
  TAccountNftEdition extends string,
  TAccountOwnerTokenRecord extends string,
  TAccountDestTokenRecord extends string,
  TAccountTokenMetadataProgram extends string,
  TAccountInstructions extends string,
  TAccountAuthorizationRulesProgram extends string,
  TAccountNftEscrow extends string,
  TAccountTempEscrowTokenRecord extends string,
  TAccountAuthRules extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
>(
  input: SellNftTokenPoolInput<
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountMintProof,
    TAccountNftSellerAcc,
    TAccountNftMint,
    TAccountNftMetadata,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountSeller,
    TAccountOwnerAtaAcc,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountTokenMetadataProgram,
    TAccountInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountNftEscrow,
    TAccountTempEscrowTokenRecord,
    TAccountAuthRules,
    TAccountMarginAccount,
    TAccountTakerBroker
  >
): SellNftTokenPoolInstruction<
  typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountTswap,
  TAccountFeeVault,
  TAccountPool,
  TAccountWhitelist,
  TAccountMintProof,
  TAccountNftSellerAcc,
  TAccountNftMint,
  TAccountNftMetadata,
  TAccountSolEscrow,
  TAccountOwner,
  TAccountSeller,
  TAccountOwnerAtaAcc,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountSystemProgram,
  TAccountRent,
  TAccountNftEdition,
  TAccountOwnerTokenRecord,
  TAccountDestTokenRecord,
  TAccountTokenMetadataProgram,
  TAccountInstructions,
  TAccountAuthorizationRulesProgram,
  TAccountNftEscrow,
  TAccountTempEscrowTokenRecord,
  TAccountAuthRules,
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
    mintProof: { value: input.mintProof ?? null, isWritable: false },
    nftSellerAcc: { value: input.nftSellerAcc ?? null, isWritable: true },
    nftMint: { value: input.nftMint ?? null, isWritable: false },
    nftMetadata: { value: input.nftMetadata ?? null, isWritable: true },
    solEscrow: { value: input.solEscrow ?? null, isWritable: true },
    owner: { value: input.owner ?? null, isWritable: true },
    seller: { value: input.seller ?? null, isWritable: true },
    ownerAtaAcc: { value: input.ownerAtaAcc ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    rent: { value: input.rent ?? null, isWritable: false },
    nftEdition: { value: input.nftEdition ?? null, isWritable: false },
    ownerTokenRecord: {
      value: input.ownerTokenRecord ?? null,
      isWritable: true,
    },
    destTokenRecord: { value: input.destTokenRecord ?? null, isWritable: true },
    tokenMetadataProgram: {
      value: input.tokenMetadataProgram ?? null,
      isWritable: false,
    },
    instructions: { value: input.instructions ?? null, isWritable: false },
    authorizationRulesProgram: {
      value: input.authorizationRulesProgram ?? null,
      isWritable: false,
    },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    tempEscrowTokenRecord: {
      value: input.tempEscrowTokenRecord ?? null,
      isWritable: true,
    },
    authRules: { value: input.authRules ?? null, isWritable: false },
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
  if (!accounts.rent.value) {
    accounts.rent.value =
      'SysvarRent111111111111111111111111111111111' as Address<'SysvarRent111111111111111111111111111111111'>;
  }
  if (!accounts.tokenMetadataProgram.value) {
    accounts.tokenMetadataProgram.value =
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address<'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'>;
  }
  if (!accounts.authorizationRulesProgram.value) {
    accounts.authorizationRulesProgram.value =
      'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg' as Address<'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'>;
  }

  const getAccountMeta = getAccountMetaFactory(programAddress, 'programId');
  const instruction = {
    accounts: [
      getAccountMeta(accounts.tswap),
      getAccountMeta(accounts.feeVault),
      getAccountMeta(accounts.pool),
      getAccountMeta(accounts.whitelist),
      getAccountMeta(accounts.mintProof),
      getAccountMeta(accounts.nftSellerAcc),
      getAccountMeta(accounts.nftMint),
      getAccountMeta(accounts.nftMetadata),
      getAccountMeta(accounts.solEscrow),
      getAccountMeta(accounts.owner),
      getAccountMeta(accounts.seller),
      getAccountMeta(accounts.ownerAtaAcc),
      getAccountMeta(accounts.tokenProgram),
      getAccountMeta(accounts.associatedTokenProgram),
      getAccountMeta(accounts.systemProgram),
      getAccountMeta(accounts.rent),
      getAccountMeta(accounts.nftEdition),
      getAccountMeta(accounts.ownerTokenRecord),
      getAccountMeta(accounts.destTokenRecord),
      getAccountMeta(accounts.tokenMetadataProgram),
      getAccountMeta(accounts.instructions),
      getAccountMeta(accounts.authorizationRulesProgram),
      getAccountMeta(accounts.nftEscrow),
      getAccountMeta(accounts.tempEscrowTokenRecord),
      getAccountMeta(accounts.authRules),
      getAccountMeta(accounts.marginAccount),
      getAccountMeta(accounts.takerBroker),
    ],
    programAddress,
    data: getSellNftTokenPoolInstructionDataEncoder().encode(
      args as SellNftTokenPoolInstructionDataArgs
    ),
  } as SellNftTokenPoolInstruction<
    typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
    TAccountTswap,
    TAccountFeeVault,
    TAccountPool,
    TAccountWhitelist,
    TAccountMintProof,
    TAccountNftSellerAcc,
    TAccountNftMint,
    TAccountNftMetadata,
    TAccountSolEscrow,
    TAccountOwner,
    TAccountSeller,
    TAccountOwnerAtaAcc,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountRent,
    TAccountNftEdition,
    TAccountOwnerTokenRecord,
    TAccountDestTokenRecord,
    TAccountTokenMetadataProgram,
    TAccountInstructions,
    TAccountAuthorizationRulesProgram,
    TAccountNftEscrow,
    TAccountTempEscrowTokenRecord,
    TAccountAuthRules,
    TAccountMarginAccount,
    TAccountTakerBroker
  >;

  return instruction;
}

export type ParsedSellNftTokenPoolInstruction<
  TProgram extends string = typeof TENSOR_ESCROW_PROGRAM_ADDRESS,
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[],
> = {
  programAddress: Address<TProgram>;
  accounts: {
    tswap: TAccountMetas[0];
    feeVault: TAccountMetas[1];
    pool: TAccountMetas[2];
    /** Needed for pool seeds derivation, also checked via has_one on pool */
    whitelist: TAccountMetas[3];
    /** intentionally not deserializing, it would be dummy in the case of VOC/FVC based verification */
    mintProof: TAccountMetas[4];
    nftSellerAcc: TAccountMetas[5];
    nftMint: TAccountMetas[6];
    nftMetadata: TAccountMetas[7];
    solEscrow: TAccountMetas[8];
    owner: TAccountMetas[9];
    seller: TAccountMetas[10];
    ownerAtaAcc: TAccountMetas[11];
    tokenProgram: TAccountMetas[12];
    associatedTokenProgram: TAccountMetas[13];
    systemProgram: TAccountMetas[14];
    rent: TAccountMetas[15];
    nftEdition: TAccountMetas[16];
    ownerTokenRecord: TAccountMetas[17];
    destTokenRecord: TAccountMetas[18];
    tokenMetadataProgram: TAccountMetas[19];
    instructions: TAccountMetas[20];
    authorizationRulesProgram: TAccountMetas[21];
    /** Implicitly checked via transfer. Will fail if wrong account */
    nftEscrow: TAccountMetas[22];
    tempEscrowTokenRecord: TAccountMetas[23];
    authRules: TAccountMetas[24];
    marginAccount: TAccountMetas[25];
    takerBroker: TAccountMetas[26];
  };
  data: SellNftTokenPoolInstructionData;
};

export function parseSellNftTokenPoolInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[],
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedSellNftTokenPoolInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 27) {
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
      mintProof: getNextAccount(),
      nftSellerAcc: getNextAccount(),
      nftMint: getNextAccount(),
      nftMetadata: getNextAccount(),
      solEscrow: getNextAccount(),
      owner: getNextAccount(),
      seller: getNextAccount(),
      ownerAtaAcc: getNextAccount(),
      tokenProgram: getNextAccount(),
      associatedTokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      rent: getNextAccount(),
      nftEdition: getNextAccount(),
      ownerTokenRecord: getNextAccount(),
      destTokenRecord: getNextAccount(),
      tokenMetadataProgram: getNextAccount(),
      instructions: getNextAccount(),
      authorizationRulesProgram: getNextAccount(),
      nftEscrow: getNextAccount(),
      tempEscrowTokenRecord: getNextAccount(),
      authRules: getNextAccount(),
      marginAccount: getNextAccount(),
      takerBroker: getNextAccount(),
    },
    data: getSellNftTokenPoolInstructionDataDecoder().decode(instruction.data),
  };
}

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
} from '@solana/instructions';
import {
  ResolvedAccount,
  accountMetaWithDefault,
  getAccountMetasWithSigners,
} from '../shared';
import {
  PoolConfig,
  PoolConfigArgs,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
} from '../types';

export type WnsSellNftTradePoolInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountShared extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountTakerBroker extends string | IAccountMeta<string> = string,
  TAccountApproveAccount extends string | IAccountMeta<string> = string,
  TAccountDistribution extends string | IAccountMeta<string> = string,
  TAccountWnsProgram extends string | IAccountMeta<string> = string,
  TAccountDistributionProgram extends string | IAccountMeta<string> = string,
  TAccountExtraMetas extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountShared extends string
        ? ReadonlyAccount<TAccountShared>
        : TAccountShared,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountNftReceipt extends string
        ? WritableAccount<TAccountNftReceipt>
        : TAccountNftReceipt,
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
      ...TRemainingAccounts
    ]
  >;

export type WnsSellNftTradePoolInstructionWithSigners<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountShared extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountTakerBroker extends string | IAccountMeta<string> = string,
  TAccountApproveAccount extends string | IAccountMeta<string> = string,
  TAccountDistribution extends string | IAccountMeta<string> = string,
  TAccountWnsProgram extends string | IAccountMeta<string> = string,
  TAccountDistributionProgram extends string | IAccountMeta<string> = string,
  TAccountExtraMetas extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
> = IInstruction<TProgram> &
  IInstructionWithData<Uint8Array> &
  IInstructionWithAccounts<
    [
      TAccountShared extends string
        ? ReadonlyAccount<TAccountShared>
        : TAccountShared,
      TAccountNftEscrow extends string
        ? WritableAccount<TAccountNftEscrow>
        : TAccountNftEscrow,
      TAccountNftReceipt extends string
        ? WritableAccount<TAccountNftReceipt>
        : TAccountNftReceipt,
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
      ...TRemainingAccounts
    ]
  >;

export type WnsSellNftTradePoolInstructionData = {
  discriminator: Array<number>;
  config: PoolConfig;
  minPrice: bigint;
};

export type WnsSellNftTradePoolInstructionDataArgs = {
  config: PoolConfigArgs;
  minPrice: number | bigint;
};

export function getWnsSellNftTradePoolInstructionDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      discriminator: Array<number>;
      config: PoolConfigArgs;
      minPrice: number | bigint;
    }>([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['config', getPoolConfigEncoder()],
      ['minPrice', getU64Encoder()],
    ]),
    (value) => ({ ...value, discriminator: [169, 175, 125, 88, 1, 16, 130, 7] })
  ) satisfies Encoder<WnsSellNftTradePoolInstructionDataArgs>;
}

export function getWnsSellNftTradePoolInstructionDataDecoder() {
  return getStructDecoder<WnsSellNftTradePoolInstructionData>([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['config', getPoolConfigDecoder()],
    ['minPrice', getU64Decoder()],
  ]) satisfies Decoder<WnsSellNftTradePoolInstructionData>;
}

export function getWnsSellNftTradePoolInstructionDataCodec(): Codec<
  WnsSellNftTradePoolInstructionDataArgs,
  WnsSellNftTradePoolInstructionData
> {
  return combineCodec(
    getWnsSellNftTradePoolInstructionDataEncoder(),
    getWnsSellNftTradePoolInstructionDataDecoder()
  );
}

export type WnsSellNftTradePoolInput<
  TAccountShared extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
  TAccountApproveAccount extends string,
  TAccountDistribution extends string,
  TAccountWnsProgram extends string,
  TAccountDistributionProgram extends string,
  TAccountExtraMetas extends string
> = {
  shared: Address<TAccountShared>;
  nftEscrow: Address<TAccountNftEscrow>;
  nftReceipt: Address<TAccountNftReceipt>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  marginAccount: Address<TAccountMarginAccount>;
  takerBroker: Address<TAccountTakerBroker>;
  approveAccount: Address<TAccountApproveAccount>;
  distribution: Address<TAccountDistribution>;
  wnsProgram: Address<TAccountWnsProgram>;
  distributionProgram: Address<TAccountDistributionProgram>;
  extraMetas: Address<TAccountExtraMetas>;
  config: WnsSellNftTradePoolInstructionDataArgs['config'];
  minPrice: WnsSellNftTradePoolInstructionDataArgs['minPrice'];
};

export type WnsSellNftTradePoolInputWithSigners<
  TAccountShared extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
  TAccountApproveAccount extends string,
  TAccountDistribution extends string,
  TAccountWnsProgram extends string,
  TAccountDistributionProgram extends string,
  TAccountExtraMetas extends string
> = {
  shared: Address<TAccountShared>;
  nftEscrow: Address<TAccountNftEscrow>;
  nftReceipt: Address<TAccountNftReceipt>;
  tokenProgram?: Address<TAccountTokenProgram>;
  associatedTokenProgram: Address<TAccountAssociatedTokenProgram>;
  systemProgram?: Address<TAccountSystemProgram>;
  marginAccount: Address<TAccountMarginAccount>;
  takerBroker: Address<TAccountTakerBroker>;
  approveAccount: Address<TAccountApproveAccount>;
  distribution: Address<TAccountDistribution>;
  wnsProgram: Address<TAccountWnsProgram>;
  distributionProgram: Address<TAccountDistributionProgram>;
  extraMetas: Address<TAccountExtraMetas>;
  config: WnsSellNftTradePoolInstructionDataArgs['config'];
  minPrice: WnsSellNftTradePoolInstructionDataArgs['minPrice'];
};

export function getWnsSellNftTradePoolInstruction<
  TAccountShared extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
  TAccountApproveAccount extends string,
  TAccountDistribution extends string,
  TAccountWnsProgram extends string,
  TAccountDistributionProgram extends string,
  TAccountExtraMetas extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WnsSellNftTradePoolInputWithSigners<
    TAccountShared,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker,
    TAccountApproveAccount,
    TAccountDistribution,
    TAccountWnsProgram,
    TAccountDistributionProgram,
    TAccountExtraMetas
  >
): WnsSellNftTradePoolInstructionWithSigners<
  TProgram,
  TAccountShared,
  TAccountNftEscrow,
  TAccountNftReceipt,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountSystemProgram,
  TAccountMarginAccount,
  TAccountTakerBroker,
  TAccountApproveAccount,
  TAccountDistribution,
  TAccountWnsProgram,
  TAccountDistributionProgram,
  TAccountExtraMetas
>;
export function getWnsSellNftTradePoolInstruction<
  TAccountShared extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
  TAccountApproveAccount extends string,
  TAccountDistribution extends string,
  TAccountWnsProgram extends string,
  TAccountDistributionProgram extends string,
  TAccountExtraMetas extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WnsSellNftTradePoolInput<
    TAccountShared,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker,
    TAccountApproveAccount,
    TAccountDistribution,
    TAccountWnsProgram,
    TAccountDistributionProgram,
    TAccountExtraMetas
  >
): WnsSellNftTradePoolInstruction<
  TProgram,
  TAccountShared,
  TAccountNftEscrow,
  TAccountNftReceipt,
  TAccountTokenProgram,
  TAccountAssociatedTokenProgram,
  TAccountSystemProgram,
  TAccountMarginAccount,
  TAccountTakerBroker,
  TAccountApproveAccount,
  TAccountDistribution,
  TAccountWnsProgram,
  TAccountDistributionProgram,
  TAccountExtraMetas
>;
export function getWnsSellNftTradePoolInstruction<
  TAccountShared extends string,
  TAccountNftEscrow extends string,
  TAccountNftReceipt extends string,
  TAccountTokenProgram extends string,
  TAccountAssociatedTokenProgram extends string,
  TAccountSystemProgram extends string,
  TAccountMarginAccount extends string,
  TAccountTakerBroker extends string,
  TAccountApproveAccount extends string,
  TAccountDistribution extends string,
  TAccountWnsProgram extends string,
  TAccountDistributionProgram extends string,
  TAccountExtraMetas extends string,
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
>(
  input: WnsSellNftTradePoolInput<
    TAccountShared,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker,
    TAccountApproveAccount,
    TAccountDistribution,
    TAccountWnsProgram,
    TAccountDistributionProgram,
    TAccountExtraMetas
  >
): IInstruction {
  // Program address.
  const programAddress =
    'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>;

  // Original accounts.
  type AccountMetas = Parameters<
    typeof getWnsSellNftTradePoolInstructionRaw<
      TProgram,
      TAccountShared,
      TAccountNftEscrow,
      TAccountNftReceipt,
      TAccountTokenProgram,
      TAccountAssociatedTokenProgram,
      TAccountSystemProgram,
      TAccountMarginAccount,
      TAccountTakerBroker,
      TAccountApproveAccount,
      TAccountDistribution,
      TAccountWnsProgram,
      TAccountDistributionProgram,
      TAccountExtraMetas
    >
  >[0];
  const accounts: Record<keyof AccountMetas, ResolvedAccount> = {
    shared: { value: input.shared ?? null, isWritable: false },
    nftEscrow: { value: input.nftEscrow ?? null, isWritable: true },
    nftReceipt: { value: input.nftReceipt ?? null, isWritable: true },
    tokenProgram: { value: input.tokenProgram ?? null, isWritable: false },
    associatedTokenProgram: {
      value: input.associatedTokenProgram ?? null,
      isWritable: false,
    },
    systemProgram: { value: input.systemProgram ?? null, isWritable: false },
    marginAccount: { value: input.marginAccount ?? null, isWritable: true },
    takerBroker: { value: input.takerBroker ?? null, isWritable: true },
    approveAccount: { value: input.approveAccount ?? null, isWritable: true },
    distribution: { value: input.distribution ?? null, isWritable: true },
    wnsProgram: { value: input.wnsProgram ?? null, isWritable: false },
    distributionProgram: {
      value: input.distributionProgram ?? null,
      isWritable: false,
    },
    extraMetas: { value: input.extraMetas ?? null, isWritable: false },
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

  const instruction = getWnsSellNftTradePoolInstructionRaw(
    accountMetas as Record<keyof AccountMetas, IAccountMeta>,
    args as WnsSellNftTradePoolInstructionDataArgs,
    programAddress
  );

  return instruction;
}

export function getWnsSellNftTradePoolInstructionRaw<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountShared extends string | IAccountMeta<string> = string,
  TAccountNftEscrow extends string | IAccountMeta<string> = string,
  TAccountNftReceipt extends string | IAccountMeta<string> = string,
  TAccountTokenProgram extends
    | string
    | IAccountMeta<string> = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TAccountAssociatedTokenProgram extends string | IAccountMeta<string> = string,
  TAccountSystemProgram extends
    | string
    | IAccountMeta<string> = '11111111111111111111111111111111',
  TAccountMarginAccount extends string | IAccountMeta<string> = string,
  TAccountTakerBroker extends string | IAccountMeta<string> = string,
  TAccountApproveAccount extends string | IAccountMeta<string> = string,
  TAccountDistribution extends string | IAccountMeta<string> = string,
  TAccountWnsProgram extends string | IAccountMeta<string> = string,
  TAccountDistributionProgram extends string | IAccountMeta<string> = string,
  TAccountExtraMetas extends string | IAccountMeta<string> = string,
  TRemainingAccounts extends Array<IAccountMeta<string>> = []
>(
  accounts: {
    shared: TAccountShared extends string
      ? Address<TAccountShared>
      : TAccountShared;
    nftEscrow: TAccountNftEscrow extends string
      ? Address<TAccountNftEscrow>
      : TAccountNftEscrow;
    nftReceipt: TAccountNftReceipt extends string
      ? Address<TAccountNftReceipt>
      : TAccountNftReceipt;
    tokenProgram?: TAccountTokenProgram extends string
      ? Address<TAccountTokenProgram>
      : TAccountTokenProgram;
    associatedTokenProgram: TAccountAssociatedTokenProgram extends string
      ? Address<TAccountAssociatedTokenProgram>
      : TAccountAssociatedTokenProgram;
    systemProgram?: TAccountSystemProgram extends string
      ? Address<TAccountSystemProgram>
      : TAccountSystemProgram;
    marginAccount: TAccountMarginAccount extends string
      ? Address<TAccountMarginAccount>
      : TAccountMarginAccount;
    takerBroker: TAccountTakerBroker extends string
      ? Address<TAccountTakerBroker>
      : TAccountTakerBroker;
    approveAccount: TAccountApproveAccount extends string
      ? Address<TAccountApproveAccount>
      : TAccountApproveAccount;
    distribution: TAccountDistribution extends string
      ? Address<TAccountDistribution>
      : TAccountDistribution;
    wnsProgram: TAccountWnsProgram extends string
      ? Address<TAccountWnsProgram>
      : TAccountWnsProgram;
    distributionProgram: TAccountDistributionProgram extends string
      ? Address<TAccountDistributionProgram>
      : TAccountDistributionProgram;
    extraMetas: TAccountExtraMetas extends string
      ? Address<TAccountExtraMetas>
      : TAccountExtraMetas;
  },
  args: WnsSellNftTradePoolInstructionDataArgs,
  programAddress: Address<TProgram> = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<TProgram>,
  remainingAccounts?: TRemainingAccounts
) {
  return {
    accounts: [
      accountMetaWithDefault(accounts.shared, AccountRole.READONLY),
      accountMetaWithDefault(accounts.nftEscrow, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.nftReceipt, AccountRole.WRITABLE),
      accountMetaWithDefault(
        accounts.tokenProgram ??
          ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address<'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.associatedTokenProgram,
        AccountRole.READONLY
      ),
      accountMetaWithDefault(
        accounts.systemProgram ??
          ('11111111111111111111111111111111' as Address<'11111111111111111111111111111111'>),
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.marginAccount, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.takerBroker, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.approveAccount, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.distribution, AccountRole.WRITABLE),
      accountMetaWithDefault(accounts.wnsProgram, AccountRole.READONLY),
      accountMetaWithDefault(
        accounts.distributionProgram,
        AccountRole.READONLY
      ),
      accountMetaWithDefault(accounts.extraMetas, AccountRole.READONLY),
      ...(remainingAccounts ?? []),
    ],
    data: getWnsSellNftTradePoolInstructionDataEncoder().encode(args),
    programAddress,
  } as WnsSellNftTradePoolInstruction<
    TProgram,
    TAccountShared,
    TAccountNftEscrow,
    TAccountNftReceipt,
    TAccountTokenProgram,
    TAccountAssociatedTokenProgram,
    TAccountSystemProgram,
    TAccountMarginAccount,
    TAccountTakerBroker,
    TAccountApproveAccount,
    TAccountDistribution,
    TAccountWnsProgram,
    TAccountDistributionProgram,
    TAccountExtraMetas,
    TRemainingAccounts
  >;
}

export type ParsedWnsSellNftTradePoolInstruction<
  TProgram extends string = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
  TAccountMetas extends readonly IAccountMeta[] = readonly IAccountMeta[]
> = {
  programAddress: Address<TProgram>;
  accounts: {
    shared: TAccountMetas[0];
    nftEscrow: TAccountMetas[1];
    nftReceipt: TAccountMetas[2];
    tokenProgram: TAccountMetas[3];
    associatedTokenProgram: TAccountMetas[4];
    systemProgram: TAccountMetas[5];
    marginAccount: TAccountMetas[6];
    takerBroker: TAccountMetas[7];
    approveAccount: TAccountMetas[8];
    distribution: TAccountMetas[9];
    wnsProgram: TAccountMetas[10];
    distributionProgram: TAccountMetas[11];
    extraMetas: TAccountMetas[12];
  };
  data: WnsSellNftTradePoolInstructionData;
};

export function parseWnsSellNftTradePoolInstruction<
  TProgram extends string,
  TAccountMetas extends readonly IAccountMeta[]
>(
  instruction: IInstruction<TProgram> &
    IInstructionWithAccounts<TAccountMetas> &
    IInstructionWithData<Uint8Array>
): ParsedWnsSellNftTradePoolInstruction<TProgram, TAccountMetas> {
  if (instruction.accounts.length < 13) {
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
      shared: getNextAccount(),
      nftEscrow: getNextAccount(),
      nftReceipt: getNextAccount(),
      tokenProgram: getNextAccount(),
      associatedTokenProgram: getNextAccount(),
      systemProgram: getNextAccount(),
      marginAccount: getNextAccount(),
      takerBroker: getNextAccount(),
      approveAccount: getNextAccount(),
      distribution: getNextAccount(),
      wnsProgram: getNextAccount(),
      distributionProgram: getNextAccount(),
      extraMetas: getNextAccount(),
    },
    data: getWnsSellNftTradePoolInstructionDataDecoder().decode(
      instruction.data
    ),
  };
}

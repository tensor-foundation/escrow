/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Account,
  EncodedAccount,
  FetchAccountConfig,
  FetchAccountsConfig,
  MaybeAccount,
  MaybeEncodedAccount,
  assertAccountExists,
  assertAccountsExist,
  decodeAccount,
  fetchEncodedAccount,
  fetchEncodedAccounts,
} from '@solana/accounts';
import {
  Address,
  getAddressDecoder,
  getAddressEncoder,
} from '@solana/addresses';
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
  getI64Decoder,
  getI64Encoder,
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
  Frozen,
  FrozenArgs,
  PoolConfig,
  PoolConfigArgs,
  PoolStats,
  PoolStatsArgs,
  getFrozenDecoder,
  getFrozenEncoder,
  getPoolConfigDecoder,
  getPoolConfigEncoder,
  getPoolStatsDecoder,
  getPoolStatsEncoder,
} from '../types';

export type Pool<TAddress extends string = string> = Account<
  PoolAccountData,
  TAddress
>;

export type MaybePool<TAddress extends string = string> = MaybeAccount<
  PoolAccountData,
  TAddress
>;

export type PoolAccountData = {
  discriminator: Array<number>;
  version: number;
  bump: Array<number>;
  solEscrowBump: Array<number>;
  /** Unix timestamp in seconds when pool was created */
  createdUnixSeconds: bigint;
  config: PoolConfig;
  tswap: Address;
  owner: Address;
  whitelist: Address;
  /**
   * Used by Trade / Token pools only, but always initiated
   * Amount to spend is implied by balance - rent
   * (!) for margin accounts this should always be empty EXCEPT when we move frozen amount in
   */
  solEscrow: Address;
  /** How many times a taker has SOLD into the pool */
  takerSellCount: number;
  /** How many times a taker has BOUGHT from the pool */
  takerBuyCount: number;
  nftsHeld: number;
  nftAuthority: Address;
  /** All stats incorporate both 1)carried over and 2)current data */
  stats: PoolStats;
  /** If margin account present, means it's a marginated pool (currently bids only) */
  margin: Option<Address>;
  /** Offchain actor signs off to make sure an offchain condition is met (eg trait present) */
  isCosigned: boolean;
  /**
   * Order type for indexing ease (anchor enums annoying, so using a u8)
   * 0 = standard, 1 = sniping (in the future eg 2 = take profit, etc)
   */
  orderType: number;
  /**
   * Order is being executed by an offchain party and can't be modified at this time
   * incl. deposit/withdraw/edit/close/buy/sell
   */
  frozen: Option<Frozen>;
  /** Last time a buy or sell order has been executed */
  lastTransactedSeconds: bigint;
  /** Limit how many buys a pool can execute - useful for cross-margin, else keeps buying into infinity */
  maxTakerSellCount: number;
};

export type PoolAccountDataArgs = {
  version: number;
  bump: Array<number>;
  solEscrowBump: Array<number>;
  /** Unix timestamp in seconds when pool was created */
  createdUnixSeconds: number | bigint;
  config: PoolConfigArgs;
  tswap: Address;
  owner: Address;
  whitelist: Address;
  /**
   * Used by Trade / Token pools only, but always initiated
   * Amount to spend is implied by balance - rent
   * (!) for margin accounts this should always be empty EXCEPT when we move frozen amount in
   */
  solEscrow: Address;
  /** How many times a taker has SOLD into the pool */
  takerSellCount: number;
  /** How many times a taker has BOUGHT from the pool */
  takerBuyCount: number;
  nftsHeld: number;
  nftAuthority: Address;
  /** All stats incorporate both 1)carried over and 2)current data */
  stats: PoolStatsArgs;
  /** If margin account present, means it's a marginated pool (currently bids only) */
  margin: OptionOrNullable<Address>;
  /** Offchain actor signs off to make sure an offchain condition is met (eg trait present) */
  isCosigned: boolean;
  /**
   * Order type for indexing ease (anchor enums annoying, so using a u8)
   * 0 = standard, 1 = sniping (in the future eg 2 = take profit, etc)
   */
  orderType: number;
  /**
   * Order is being executed by an offchain party and can't be modified at this time
   * incl. deposit/withdraw/edit/close/buy/sell
   */
  frozen: OptionOrNullable<FrozenArgs>;
  /** Last time a buy or sell order has been executed */
  lastTransactedSeconds: number | bigint;
  /** Limit how many buys a pool can execute - useful for cross-margin, else keeps buying into infinity */
  maxTakerSellCount: number;
};

export function getPoolAccountDataEncoder(): Encoder<PoolAccountDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['version', getU8Encoder()],
      ['bump', getArrayEncoder(getU8Encoder(), { size: 1 })],
      ['solEscrowBump', getArrayEncoder(getU8Encoder(), { size: 1 })],
      ['createdUnixSeconds', getI64Encoder()],
      ['config', getPoolConfigEncoder()],
      ['tswap', getAddressEncoder()],
      ['owner', getAddressEncoder()],
      ['whitelist', getAddressEncoder()],
      ['solEscrow', getAddressEncoder()],
      ['takerSellCount', getU32Encoder()],
      ['takerBuyCount', getU32Encoder()],
      ['nftsHeld', getU32Encoder()],
      ['nftAuthority', getAddressEncoder()],
      ['stats', getPoolStatsEncoder()],
      ['margin', getOptionEncoder(getAddressEncoder())],
      ['isCosigned', getBooleanEncoder()],
      ['orderType', getU8Encoder()],
      ['frozen', getOptionEncoder(getFrozenEncoder())],
      ['lastTransactedSeconds', getI64Encoder()],
      ['maxTakerSellCount', getU32Encoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [241, 154, 109, 4, 17, 177, 109, 188],
    })
  );
}

export function getPoolAccountDataDecoder(): Decoder<PoolAccountData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['version', getU8Decoder()],
    ['bump', getArrayDecoder(getU8Decoder(), { size: 1 })],
    ['solEscrowBump', getArrayDecoder(getU8Decoder(), { size: 1 })],
    ['createdUnixSeconds', getI64Decoder()],
    ['config', getPoolConfigDecoder()],
    ['tswap', getAddressDecoder()],
    ['owner', getAddressDecoder()],
    ['whitelist', getAddressDecoder()],
    ['solEscrow', getAddressDecoder()],
    ['takerSellCount', getU32Decoder()],
    ['takerBuyCount', getU32Decoder()],
    ['nftsHeld', getU32Decoder()],
    ['nftAuthority', getAddressDecoder()],
    ['stats', getPoolStatsDecoder()],
    ['margin', getOptionDecoder(getAddressDecoder())],
    ['isCosigned', getBooleanDecoder()],
    ['orderType', getU8Decoder()],
    ['frozen', getOptionDecoder(getFrozenDecoder())],
    ['lastTransactedSeconds', getI64Decoder()],
    ['maxTakerSellCount', getU32Decoder()],
  ]);
}

export function getPoolAccountDataCodec(): Codec<
  PoolAccountDataArgs,
  PoolAccountData
> {
  return combineCodec(getPoolAccountDataEncoder(), getPoolAccountDataDecoder());
}

export function decodePool<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Pool<TAddress>;
export function decodePool<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybePool<TAddress>;
export function decodePool<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Pool<TAddress> | MaybePool<TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getPoolAccountDataDecoder()
  );
}

export async function fetchPool<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Pool<TAddress>> {
  const maybeAccount = await fetchMaybePool(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybePool<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybePool<TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodePool(maybeAccount);
}

export async function fetchAllPool(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Pool[]> {
  const maybeAccounts = await fetchAllMaybePool(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybePool(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybePool[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodePool(maybeAccount));
}

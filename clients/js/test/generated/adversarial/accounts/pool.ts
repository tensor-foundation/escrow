/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/kinobi-so/kinobi
 */

import {
  assertAccountExists,
  assertAccountsExist,
  combineCodec,
  decodeAccount,
  fetchEncodedAccount,
  fetchEncodedAccounts,
  fixDecoderSize,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getArrayDecoder,
  getArrayEncoder,
  getBytesDecoder,
  getBytesEncoder,
  getStructDecoder,
  getStructEncoder,
  getU8Decoder,
  getU8Encoder,
  transformEncoder,
  type Account,
  type Address,
  type Codec,
  type Decoder,
  type EncodedAccount,
  type Encoder,
  type FetchAccountConfig,
  type FetchAccountsConfig,
  type MaybeAccount,
  type MaybeEncodedAccount,
  type ReadonlyUint8Array,
} from '@solana/web3.js';

export type Pool = {
  discriminator: ReadonlyUint8Array;
  owner: Address;
  poolId: ReadonlyUint8Array;
  reserved: Array<number>;
};

export type PoolArgs = {
  owner: Address;
  poolId: ReadonlyUint8Array;
  reserved: Array<number>;
};

export function getPoolEncoder(): Encoder<PoolArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['owner', getAddressEncoder()],
      ['poolId', fixEncoderSize(getBytesEncoder(), 32)],
      ['reserved', getArrayEncoder(getU8Encoder(), { size: 374 })],
    ]),
    (value) => ({
      ...value,
      discriminator: new Uint8Array([241, 154, 109, 4, 17, 177, 109, 188]),
    })
  );
}

export function getPoolDecoder(): Decoder<Pool> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['owner', getAddressDecoder()],
    ['poolId', fixDecoderSize(getBytesDecoder(), 32)],
    ['reserved', getArrayDecoder(getU8Decoder(), { size: 374 })],
  ]);
}

export function getPoolCodec(): Codec<PoolArgs, Pool> {
  return combineCodec(getPoolEncoder(), getPoolDecoder());
}

export function decodePool<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<Pool, TAddress>;
export function decodePool<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<Pool, TAddress>;
export function decodePool<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Account<Pool, TAddress> | MaybeAccount<Pool, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getPoolDecoder()
  );
}

export async function fetchPool<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<Pool, TAddress>> {
  const maybeAccount = await fetchMaybePool(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybePool<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<Pool, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodePool(maybeAccount);
}

export async function fetchAllPool(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<Pool>[]> {
  const maybeAccounts = await fetchAllMaybePool(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybePool(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<Pool>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodePool(maybeAccount));
}

export function getPoolSize(): number {
  return 446;
}

/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
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
import { findTSwapPda } from '../pdas';
import {
  getTSwapConfigDecoder,
  getTSwapConfigEncoder,
  type TSwapConfig,
  type TSwapConfigArgs,
} from '../types';

export const T_SWAP_DISCRIMINATOR = new Uint8Array([
  169, 211, 171, 36, 219, 189, 79, 188,
]);

export function getTSwapDiscriminatorBytes() {
  return fixEncoderSize(getBytesEncoder(), 8).encode(T_SWAP_DISCRIMINATOR);
}

export type TSwap = {
  discriminator: ReadonlyUint8Array;
  version: number;
  bump: Array<number>;
  /** @DEPRECATED, use constant above instead */
  config: TSwapConfig;
  owner: Address;
  feeVault: Address;
  cosigner: Address;
};

export type TSwapArgs = {
  version: number;
  bump: Array<number>;
  /** @DEPRECATED, use constant above instead */
  config: TSwapConfigArgs;
  owner: Address;
  feeVault: Address;
  cosigner: Address;
};

export function getTSwapEncoder(): Encoder<TSwapArgs> {
  return transformEncoder(
    getStructEncoder([
      ['discriminator', fixEncoderSize(getBytesEncoder(), 8)],
      ['version', getU8Encoder()],
      ['bump', getArrayEncoder(getU8Encoder(), { size: 1 })],
      ['config', getTSwapConfigEncoder()],
      ['owner', getAddressEncoder()],
      ['feeVault', getAddressEncoder()],
      ['cosigner', getAddressEncoder()],
    ]),
    (value) => ({ ...value, discriminator: T_SWAP_DISCRIMINATOR })
  );
}

export function getTSwapDecoder(): Decoder<TSwap> {
  return getStructDecoder([
    ['discriminator', fixDecoderSize(getBytesDecoder(), 8)],
    ['version', getU8Decoder()],
    ['bump', getArrayDecoder(getU8Decoder(), { size: 1 })],
    ['config', getTSwapConfigDecoder()],
    ['owner', getAddressDecoder()],
    ['feeVault', getAddressDecoder()],
    ['cosigner', getAddressDecoder()],
  ]);
}

export function getTSwapCodec(): Codec<TSwapArgs, TSwap> {
  return combineCodec(getTSwapEncoder(), getTSwapDecoder());
}

export function decodeTSwap<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Account<TSwap, TAddress>;
export function decodeTSwap<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeAccount<TSwap, TAddress>;
export function decodeTSwap<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Account<TSwap, TAddress> | MaybeAccount<TSwap, TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getTSwapDecoder()
  );
}

export async function fetchTSwap<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Account<TSwap, TAddress>> {
  const maybeAccount = await fetchMaybeTSwap(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeTSwap<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeAccount<TSwap, TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeTSwap(maybeAccount);
}

export async function fetchAllTSwap(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Account<TSwap>[]> {
  const maybeAccounts = await fetchAllMaybeTSwap(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeTSwap(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeAccount<TSwap>[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeTSwap(maybeAccount));
}

export function getTSwapSize(): number {
  return 108;
}

export async function fetchTSwapFromSeeds(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  config: FetchAccountConfig & { programAddress?: Address } = {}
): Promise<Account<TSwap>> {
  const maybeAccount = await fetchMaybeTSwapFromSeeds(rpc, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeTSwapFromSeeds(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  config: FetchAccountConfig & { programAddress?: Address } = {}
): Promise<MaybeAccount<TSwap>> {
  const { programAddress, ...fetchConfig } = config;
  const [address] = await findTSwapPda({ programAddress });
  return await fetchMaybeTSwap(rpc, address, fetchConfig);
}

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
  TSwapConfig,
  TSwapConfigArgs,
  getTSwapConfigDecoder,
  getTSwapConfigEncoder,
} from '../types';

export type TSwap<TAddress extends string = string> = Account<
  TSwapAccountData,
  TAddress
>;

export type MaybeTSwap<TAddress extends string = string> = MaybeAccount<
  TSwapAccountData,
  TAddress
>;

export type TSwapAccountData = {
  discriminator: Array<number>;
  version: number;
  bump: Array<number>;
  /** @DEPRECATED, use constant above instead */
  config: TSwapConfig;
  owner: Address;
  feeVault: Address;
  cosigner: Address;
};

export type TSwapAccountDataArgs = {
  version: number;
  bump: Array<number>;
  /** @DEPRECATED, use constant above instead */
  config: TSwapConfigArgs;
  owner: Address;
  feeVault: Address;
  cosigner: Address;
};

export function getTSwapAccountDataEncoder(): Encoder<TSwapAccountDataArgs> {
  return mapEncoder(
    getStructEncoder([
      ['discriminator', getArrayEncoder(getU8Encoder(), { size: 8 })],
      ['version', getU8Encoder()],
      ['bump', getArrayEncoder(getU8Encoder(), { size: 1 })],
      ['config', getTSwapConfigEncoder()],
      ['owner', getAddressEncoder()],
      ['feeVault', getAddressEncoder()],
      ['cosigner', getAddressEncoder()],
    ]),
    (value) => ({
      ...value,
      discriminator: [169, 211, 171, 36, 219, 189, 79, 188],
    })
  );
}

export function getTSwapAccountDataDecoder(): Decoder<TSwapAccountData> {
  return getStructDecoder([
    ['discriminator', getArrayDecoder(getU8Decoder(), { size: 8 })],
    ['version', getU8Decoder()],
    ['bump', getArrayDecoder(getU8Decoder(), { size: 1 })],
    ['config', getTSwapConfigDecoder()],
    ['owner', getAddressDecoder()],
    ['feeVault', getAddressDecoder()],
    ['cosigner', getAddressDecoder()],
  ]);
}

export function getTSwapAccountDataCodec(): Codec<
  TSwapAccountDataArgs,
  TSwapAccountData
> {
  return combineCodec(
    getTSwapAccountDataEncoder(),
    getTSwapAccountDataDecoder()
  );
}

export function decodeTSwap<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): TSwap<TAddress>;
export function decodeTSwap<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeTSwap<TAddress>;
export function decodeTSwap<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): TSwap<TAddress> | MaybeTSwap<TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getTSwapAccountDataDecoder()
  );
}

export async function fetchTSwap<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<TSwap<TAddress>> {
  const maybeAccount = await fetchMaybeTSwap(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeTSwap<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeTSwap<TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeTSwap(maybeAccount);
}

export async function fetchAllTSwap(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<TSwap[]> {
  const maybeAccounts = await fetchAllMaybeTSwap(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeTSwap(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeTSwap[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeTSwap(maybeAccount));
}

export function getTSwapSize(): number {
  return 108;
}

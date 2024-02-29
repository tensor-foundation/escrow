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
import { Address } from '@solana/addresses';
import {
  Codec,
  Decoder,
  Encoder,
  combineCodec,
  mapEncoder,
} from '@solana/codecs-core';
import {
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {
  getU64Decoder,
  getU64Encoder,
  getU8Decoder,
  getU8Encoder,
} from '@solana/codecs-numbers';
import { UseAuthorityRecordSeeds, findUseAuthorityRecordPda } from '../pdas';
import { Key, KeyArgs, getKeyDecoder, getKeyEncoder } from '../types';

export type UseAuthorityRecord<TAddress extends string = string> = Account<
  UseAuthorityRecordAccountData,
  TAddress
>;

export type MaybeUseAuthorityRecord<TAddress extends string = string> =
  MaybeAccount<UseAuthorityRecordAccountData, TAddress>;

export type UseAuthorityRecordAccountData = {
  key: Key;
  allowedUses: bigint;
  bump: number;
};

export type UseAuthorityRecordAccountDataArgs = {
  allowedUses: number | bigint;
  bump: number;
};

export function getUseAuthorityRecordAccountDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      key: KeyArgs;
      allowedUses: number | bigint;
      bump: number;
    }>([
      ['key', getKeyEncoder()],
      ['allowedUses', getU64Encoder()],
      ['bump', getU8Encoder()],
    ]),
    (value) => ({ ...value, key: Key.UseAuthorityRecord })
  ) satisfies Encoder<UseAuthorityRecordAccountDataArgs>;
}

export function getUseAuthorityRecordAccountDataDecoder() {
  return getStructDecoder<UseAuthorityRecordAccountData>([
    ['key', getKeyDecoder()],
    ['allowedUses', getU64Decoder()],
    ['bump', getU8Decoder()],
  ]) satisfies Decoder<UseAuthorityRecordAccountData>;
}

export function getUseAuthorityRecordAccountDataCodec(): Codec<
  UseAuthorityRecordAccountDataArgs,
  UseAuthorityRecordAccountData
> {
  return combineCodec(
    getUseAuthorityRecordAccountDataEncoder(),
    getUseAuthorityRecordAccountDataDecoder()
  );
}

export function decodeUseAuthorityRecord<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): UseAuthorityRecord<TAddress>;
export function decodeUseAuthorityRecord<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeUseAuthorityRecord<TAddress>;
export function decodeUseAuthorityRecord<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): UseAuthorityRecord<TAddress> | MaybeUseAuthorityRecord<TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getUseAuthorityRecordAccountDataDecoder()
  );
}

export async function fetchUseAuthorityRecord<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<UseAuthorityRecord<TAddress>> {
  const maybeAccount = await fetchMaybeUseAuthorityRecord(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeUseAuthorityRecord<
  TAddress extends string = string
>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeUseAuthorityRecord<TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeUseAuthorityRecord(maybeAccount);
}

export async function fetchAllUseAuthorityRecord(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<UseAuthorityRecord[]> {
  const maybeAccounts = await fetchAllMaybeUseAuthorityRecord(
    rpc,
    addresses,
    config
  );
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeUseAuthorityRecord(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeUseAuthorityRecord[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) =>
    decodeUseAuthorityRecord(maybeAccount)
  );
}

export function getUseAuthorityRecordSize(): number {
  return 10;
}

export async function fetchUseAuthorityRecordFromSeeds(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  seeds: UseAuthorityRecordSeeds,
  config: FetchAccountConfig & { programAddress?: Address } = {}
): Promise<UseAuthorityRecord> {
  const maybeAccount = await fetchMaybeUseAuthorityRecordFromSeeds(
    rpc,
    seeds,
    config
  );
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeUseAuthorityRecordFromSeeds(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  seeds: UseAuthorityRecordSeeds,
  config: FetchAccountConfig & { programAddress?: Address } = {}
): Promise<MaybeUseAuthorityRecord> {
  const { programAddress, ...fetchConfig } = config;
  const [address] = await findUseAuthorityRecordPda(seeds, { programAddress });
  return fetchMaybeUseAuthorityRecord(rpc, address, fetchConfig);
}
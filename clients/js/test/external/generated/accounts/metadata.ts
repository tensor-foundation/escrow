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
  mapEncoder,
} from '@solana/codecs-core';
import {
  getArrayDecoder,
  getArrayEncoder,
  getBooleanDecoder,
  getBooleanEncoder,
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {
  getU16Decoder,
  getU16Encoder,
  getU8Decoder,
  getU8Encoder,
} from '@solana/codecs-numbers';
import { getStringDecoder, getStringEncoder } from '@solana/codecs-strings';
import {
  Option,
  OptionOrNullable,
  getOptionDecoder,
  getOptionEncoder,
} from '@solana/options';
import { MetadataSeeds, findMetadataPda } from '../pdas';
import {
  Collection,
  CollectionArgs,
  CollectionDetails,
  CollectionDetailsArgs,
  Creator,
  CreatorArgs,
  Key,
  KeyArgs,
  ProgrammableConfig,
  ProgrammableConfigArgs,
  TokenStandard,
  TokenStandardArgs,
  Uses,
  UsesArgs,
  getCollectionDecoder,
  getCollectionDetailsDecoder,
  getCollectionDetailsEncoder,
  getCollectionEncoder,
  getCreatorDecoder,
  getCreatorEncoder,
  getKeyDecoder,
  getKeyEncoder,
  getProgrammableConfigDecoder,
  getProgrammableConfigEncoder,
  getTokenStandardDecoder,
  getTokenStandardEncoder,
  getUsesDecoder,
  getUsesEncoder,
} from '../types';

export type Metadata<TAddress extends string = string> = Account<
  MetadataAccountData,
  TAddress
>;

export type MaybeMetadata<TAddress extends string = string> = MaybeAccount<
  MetadataAccountData,
  TAddress
>;

export type MetadataAccountData = {
  key: Key;
  updateAuthority: Address;
  mint: Address;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Option<Array<Creator>>;
  primarySaleHappened: boolean;
  isMutable: boolean;
  editionNonce: Option<number>;
  tokenStandard: Option<TokenStandard>;
  collection: Option<Collection>;
  uses: Option<Uses>;
  collectionDetails: Option<CollectionDetails>;
  programmableConfig: Option<ProgrammableConfig>;
};

export type MetadataAccountDataArgs = {
  updateAuthority: Address;
  mint: Address;
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: OptionOrNullable<Array<CreatorArgs>>;
  primarySaleHappened: boolean;
  isMutable: boolean;
  editionNonce: OptionOrNullable<number>;
  tokenStandard: OptionOrNullable<TokenStandardArgs>;
  collection: OptionOrNullable<CollectionArgs>;
  uses: OptionOrNullable<UsesArgs>;
  collectionDetails: OptionOrNullable<CollectionDetailsArgs>;
  programmableConfig: OptionOrNullable<ProgrammableConfigArgs>;
};

export function getMetadataAccountDataEncoder() {
  return mapEncoder(
    getStructEncoder<{
      key: KeyArgs;
      updateAuthority: Address;
      mint: Address;
      name: string;
      symbol: string;
      uri: string;
      sellerFeeBasisPoints: number;
      creators: OptionOrNullable<Array<CreatorArgs>>;
      primarySaleHappened: boolean;
      isMutable: boolean;
      editionNonce: OptionOrNullable<number>;
      tokenStandard: OptionOrNullable<TokenStandardArgs>;
      collection: OptionOrNullable<CollectionArgs>;
      uses: OptionOrNullable<UsesArgs>;
      collectionDetails: OptionOrNullable<CollectionDetailsArgs>;
      programmableConfig: OptionOrNullable<ProgrammableConfigArgs>;
    }>([
      ['key', getKeyEncoder()],
      ['updateAuthority', getAddressEncoder()],
      ['mint', getAddressEncoder()],
      ['name', getStringEncoder()],
      ['symbol', getStringEncoder()],
      ['uri', getStringEncoder()],
      ['sellerFeeBasisPoints', getU16Encoder()],
      ['creators', getOptionEncoder(getArrayEncoder(getCreatorEncoder()))],
      ['primarySaleHappened', getBooleanEncoder()],
      ['isMutable', getBooleanEncoder()],
      ['editionNonce', getOptionEncoder(getU8Encoder())],
      ['tokenStandard', getOptionEncoder(getTokenStandardEncoder())],
      ['collection', getOptionEncoder(getCollectionEncoder())],
      ['uses', getOptionEncoder(getUsesEncoder())],
      ['collectionDetails', getOptionEncoder(getCollectionDetailsEncoder())],
      ['programmableConfig', getOptionEncoder(getProgrammableConfigEncoder())],
    ]),
    (value) => ({ ...value, key: Key.MetadataV1 })
  ) satisfies Encoder<MetadataAccountDataArgs>;
}

export function getMetadataAccountDataDecoder() {
  return getStructDecoder<MetadataAccountData>([
    ['key', getKeyDecoder()],
    ['updateAuthority', getAddressDecoder()],
    ['mint', getAddressDecoder()],
    ['name', getStringDecoder()],
    ['symbol', getStringDecoder()],
    ['uri', getStringDecoder()],
    ['sellerFeeBasisPoints', getU16Decoder()],
    ['creators', getOptionDecoder(getArrayDecoder(getCreatorDecoder()))],
    ['primarySaleHappened', getBooleanDecoder()],
    ['isMutable', getBooleanDecoder()],
    ['editionNonce', getOptionDecoder(getU8Decoder())],
    ['tokenStandard', getOptionDecoder(getTokenStandardDecoder())],
    ['collection', getOptionDecoder(getCollectionDecoder())],
    ['uses', getOptionDecoder(getUsesDecoder())],
    ['collectionDetails', getOptionDecoder(getCollectionDetailsDecoder())],
    ['programmableConfig', getOptionDecoder(getProgrammableConfigDecoder())],
  ]) satisfies Decoder<MetadataAccountData>;
}

export function getMetadataAccountDataCodec(): Codec<
  MetadataAccountDataArgs,
  MetadataAccountData
> {
  return combineCodec(
    getMetadataAccountDataEncoder(),
    getMetadataAccountDataDecoder()
  );
}

export function decodeMetadata<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress>
): Metadata<TAddress>;
export function decodeMetadata<TAddress extends string = string>(
  encodedAccount: MaybeEncodedAccount<TAddress>
): MaybeMetadata<TAddress>;
export function decodeMetadata<TAddress extends string = string>(
  encodedAccount: EncodedAccount<TAddress> | MaybeEncodedAccount<TAddress>
): Metadata<TAddress> | MaybeMetadata<TAddress> {
  return decodeAccount(
    encodedAccount as MaybeEncodedAccount<TAddress>,
    getMetadataAccountDataDecoder()
  );
}

export async function fetchMetadata<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<Metadata<TAddress>> {
  const maybeAccount = await fetchMaybeMetadata(rpc, address, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeMetadata<TAddress extends string = string>(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  address: Address<TAddress>,
  config?: FetchAccountConfig
): Promise<MaybeMetadata<TAddress>> {
  const maybeAccount = await fetchEncodedAccount(rpc, address, config);
  return decodeMetadata(maybeAccount);
}

export async function fetchAllMetadata(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<Metadata[]> {
  const maybeAccounts = await fetchAllMaybeMetadata(rpc, addresses, config);
  assertAccountsExist(maybeAccounts);
  return maybeAccounts;
}

export async function fetchAllMaybeMetadata(
  rpc: Parameters<typeof fetchEncodedAccounts>[0],
  addresses: Array<Address>,
  config?: FetchAccountsConfig
): Promise<MaybeMetadata[]> {
  const maybeAccounts = await fetchEncodedAccounts(rpc, addresses, config);
  return maybeAccounts.map((maybeAccount) => decodeMetadata(maybeAccount));
}

export async function fetchMetadataFromSeeds(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  seeds: MetadataSeeds,
  config: FetchAccountConfig & { programAddress?: Address } = {}
): Promise<Metadata> {
  const maybeAccount = await fetchMaybeMetadataFromSeeds(rpc, seeds, config);
  assertAccountExists(maybeAccount);
  return maybeAccount;
}

export async function fetchMaybeMetadataFromSeeds(
  rpc: Parameters<typeof fetchEncodedAccount>[0],
  seeds: MetadataSeeds,
  config: FetchAccountConfig & { programAddress?: Address } = {}
): Promise<MaybeMetadata> {
  const { programAddress, ...fetchConfig } = config;
  const [address] = await findMetadataPda(seeds, { programAddress });
  return fetchMaybeMetadata(rpc, address, fetchConfig);
}
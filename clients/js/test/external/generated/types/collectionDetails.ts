/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { Codec, Decoder, Encoder, combineCodec } from '@solana/codecs-core';
import {
  GetDataEnumKind,
  GetDataEnumKindContent,
  getDataEnumDecoder,
  getDataEnumEncoder,
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import { getU64Decoder, getU64Encoder } from '@solana/codecs-numbers';

export type CollectionDetails = { __kind: 'V1'; size: bigint };

export type CollectionDetailsArgs = { __kind: 'V1'; size: number | bigint };

export function getCollectionDetailsEncoder() {
  return getDataEnumEncoder<CollectionDetailsArgs>([
    [
      'V1',
      getStructEncoder<GetDataEnumKindContent<CollectionDetailsArgs, 'V1'>>([
        ['size', getU64Encoder()],
      ]),
    ],
  ]) satisfies Encoder<CollectionDetailsArgs>;
}

export function getCollectionDetailsDecoder() {
  return getDataEnumDecoder<CollectionDetails>([
    [
      'V1',
      getStructDecoder<GetDataEnumKindContent<CollectionDetails, 'V1'>>([
        ['size', getU64Decoder()],
      ]),
    ],
  ]) satisfies Decoder<CollectionDetails>;
}

export function getCollectionDetailsCodec(): Codec<
  CollectionDetailsArgs,
  CollectionDetails
> {
  return combineCodec(
    getCollectionDetailsEncoder(),
    getCollectionDetailsDecoder()
  );
}

// Data Enum Helpers.
export function collectionDetails(
  kind: 'V1',
  data: GetDataEnumKindContent<CollectionDetailsArgs, 'V1'>
): GetDataEnumKind<CollectionDetailsArgs, 'V1'>;
export function collectionDetails<K extends CollectionDetailsArgs['__kind']>(
  kind: K,
  data?: any
): Extract<CollectionDetailsArgs, { __kind: K }> {
  return Array.isArray(data)
    ? { __kind: kind, fields: data }
    : { __kind: kind, ...(data ?? {}) };
}

export function isCollectionDetails<K extends CollectionDetails['__kind']>(
  kind: K,
  value: CollectionDetails
): value is CollectionDetails & { __kind: K } {
  return value.__kind === kind;
}
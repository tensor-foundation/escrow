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
  getTupleDecoder,
  getTupleEncoder,
  getUnitDecoder,
  getUnitEncoder,
} from '@solana/codecs-data-structures';
import { Uses, UsesArgs, getUsesDecoder, getUsesEncoder } from '.';

export type UsesToggle =
  | { __kind: 'None' }
  | { __kind: 'Clear' }
  | { __kind: 'Set'; fields: [Uses] };

export type UsesToggleArgs =
  | { __kind: 'None' }
  | { __kind: 'Clear' }
  | { __kind: 'Set'; fields: [UsesArgs] };

export function getUsesToggleEncoder() {
  return getDataEnumEncoder<UsesToggleArgs>([
    ['None', getUnitEncoder()],
    ['Clear', getUnitEncoder()],
    [
      'Set',
      getStructEncoder<GetDataEnumKindContent<UsesToggleArgs, 'Set'>>([
        ['fields', getTupleEncoder([getUsesEncoder()])],
      ]),
    ],
  ]) satisfies Encoder<UsesToggleArgs>;
}

export function getUsesToggleDecoder() {
  return getDataEnumDecoder<UsesToggle>([
    ['None', getUnitDecoder()],
    ['Clear', getUnitDecoder()],
    [
      'Set',
      getStructDecoder<GetDataEnumKindContent<UsesToggle, 'Set'>>([
        ['fields', getTupleDecoder([getUsesDecoder()])],
      ]),
    ],
  ]) satisfies Decoder<UsesToggle>;
}

export function getUsesToggleCodec(): Codec<UsesToggleArgs, UsesToggle> {
  return combineCodec(getUsesToggleEncoder(), getUsesToggleDecoder());
}

// Data Enum Helpers.
export function usesToggle(
  kind: 'None'
): GetDataEnumKind<UsesToggleArgs, 'None'>;
export function usesToggle(
  kind: 'Clear'
): GetDataEnumKind<UsesToggleArgs, 'Clear'>;
export function usesToggle(
  kind: 'Set',
  data: GetDataEnumKindContent<UsesToggleArgs, 'Set'>['fields']
): GetDataEnumKind<UsesToggleArgs, 'Set'>;
export function usesToggle<K extends UsesToggleArgs['__kind']>(
  kind: K,
  data?: any
): Extract<UsesToggleArgs, { __kind: K }> {
  return Array.isArray(data)
    ? { __kind: kind, fields: data }
    : { __kind: kind, ...(data ?? {}) };
}

export function isUsesToggle<K extends UsesToggle['__kind']>(
  kind: K,
  value: UsesToggle
): value is UsesToggle & { __kind: K } {
  return value.__kind === kind;
}

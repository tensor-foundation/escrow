/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Address,
  getAddressDecoder,
  getAddressEncoder,
} from '@solana/addresses';
import { Codec, Decoder, Encoder, combineCodec } from '@solana/codecs-core';
import {
  GetDataEnumKind,
  GetDataEnumKindContent,
  getDataEnumDecoder,
  getDataEnumEncoder,
  getStructDecoder,
  getStructEncoder,
} from '@solana/codecs-data-structures';
import {
  Option,
  OptionOrNullable,
  getOptionDecoder,
  getOptionEncoder,
} from '@solana/options';

export type ProgrammableConfig = { __kind: 'V1'; ruleSet: Option<Address> };

export type ProgrammableConfigArgs = {
  __kind: 'V1';
  ruleSet: OptionOrNullable<Address>;
};

export function getProgrammableConfigEncoder() {
  return getDataEnumEncoder<ProgrammableConfigArgs>([
    [
      'V1',
      getStructEncoder<GetDataEnumKindContent<ProgrammableConfigArgs, 'V1'>>([
        ['ruleSet', getOptionEncoder(getAddressEncoder())],
      ]),
    ],
  ]) satisfies Encoder<ProgrammableConfigArgs>;
}

export function getProgrammableConfigDecoder() {
  return getDataEnumDecoder<ProgrammableConfig>([
    [
      'V1',
      getStructDecoder<GetDataEnumKindContent<ProgrammableConfig, 'V1'>>([
        ['ruleSet', getOptionDecoder(getAddressDecoder())],
      ]),
    ],
  ]) satisfies Decoder<ProgrammableConfig>;
}

export function getProgrammableConfigCodec(): Codec<
  ProgrammableConfigArgs,
  ProgrammableConfig
> {
  return combineCodec(
    getProgrammableConfigEncoder(),
    getProgrammableConfigDecoder()
  );
}

// Data Enum Helpers.
export function programmableConfig(
  kind: 'V1',
  data: GetDataEnumKindContent<ProgrammableConfigArgs, 'V1'>
): GetDataEnumKind<ProgrammableConfigArgs, 'V1'>;
export function programmableConfig<K extends ProgrammableConfigArgs['__kind']>(
  kind: K,
  data?: any
): Extract<ProgrammableConfigArgs, { __kind: K }> {
  return Array.isArray(data)
    ? { __kind: kind, fields: data }
    : { __kind: kind, ...(data ?? {}) };
}

export function isProgrammableConfig<K extends ProgrammableConfig['__kind']>(
  kind: K,
  value: ProgrammableConfig
): value is ProgrammableConfig & { __kind: K } {
  return value.__kind === kind;
}
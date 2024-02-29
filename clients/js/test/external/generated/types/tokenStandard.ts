/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { Codec, Decoder, Encoder, combineCodec } from '@solana/codecs-core';
import {
  getScalarEnumDecoder,
  getScalarEnumEncoder,
} from '@solana/codecs-data-structures';

export enum TokenStandard {
  NonFungible,
  FungibleAsset,
  Fungible,
  NonFungibleEdition,
  ProgrammableNonFungible,
  ProgrammableNonFungibleEdition,
}

export type TokenStandardArgs = TokenStandard;

export function getTokenStandardEncoder() {
  return getScalarEnumEncoder(
    TokenStandard
  ) satisfies Encoder<TokenStandardArgs>;
}

export function getTokenStandardDecoder() {
  return getScalarEnumDecoder(TokenStandard) satisfies Decoder<TokenStandard>;
}

export function getTokenStandardCodec(): Codec<
  TokenStandardArgs,
  TokenStandard
> {
  return combineCodec(getTokenStandardEncoder(), getTokenStandardDecoder());
}

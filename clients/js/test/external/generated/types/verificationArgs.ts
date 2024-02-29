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

export enum VerificationArgs {
  CreatorV1,
  CollectionV1,
}

export type VerificationArgsArgs = VerificationArgs;

export function getVerificationArgsEncoder() {
  return getScalarEnumEncoder(
    VerificationArgs
  ) satisfies Encoder<VerificationArgsArgs>;
}

export function getVerificationArgsDecoder() {
  return getScalarEnumDecoder(
    VerificationArgs
  ) satisfies Decoder<VerificationArgs>;
}

export function getVerificationArgsCodec(): Codec<
  VerificationArgsArgs,
  VerificationArgs
> {
  return combineCodec(
    getVerificationArgsEncoder(),
    getVerificationArgsDecoder()
  );
}
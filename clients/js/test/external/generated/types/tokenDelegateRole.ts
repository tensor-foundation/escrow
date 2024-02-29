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

export enum TokenDelegateRole {
  Sale,
  Transfer,
  Utility,
  Staking,
  Standard,
  LockedTransfer,
  Migration,
}

export type TokenDelegateRoleArgs = TokenDelegateRole;

export function getTokenDelegateRoleEncoder() {
  return getScalarEnumEncoder(
    TokenDelegateRole
  ) satisfies Encoder<TokenDelegateRoleArgs>;
}

export function getTokenDelegateRoleDecoder() {
  return getScalarEnumDecoder(
    TokenDelegateRole
  ) satisfies Decoder<TokenDelegateRole>;
}

export function getTokenDelegateRoleCodec(): Codec<
  TokenDelegateRoleArgs,
  TokenDelegateRole
> {
  return combineCodec(
    getTokenDelegateRoleEncoder(),
    getTokenDelegateRoleDecoder()
  );
}
/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Address,
  ProgramDerivedAddress,
  getAddressEncoder,
  getProgramDerivedAddress,
} from '@solana/addresses';
import { getBytesEncoder, getStringEncoder } from '@solana/codecs';

export type MarginAccountSeeds = {
  /** Tswap singleton account */
  tswap: Address;
  /** The address of the pool and escrow owner */
  owner: Address;

  marginNr: Uint8Array;
};

export async function findMarginAccountPda(
  seeds: MarginAccountSeeds,
  config: { programAddress?: Address | undefined } = {}
): Promise<ProgramDerivedAddress> {
  const {
    programAddress = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN' as Address<'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'>,
  } = config;
  return await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getStringEncoder({ size: 'variable' }).encode('margin'),
      getAddressEncoder().encode(seeds.tswap),
      getAddressEncoder().encode(seeds.owner),
      getBytesEncoder({ size: 2 }).encode(seeds.marginNr),
    ],
  });
}
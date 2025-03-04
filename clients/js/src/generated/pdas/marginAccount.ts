/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  getAddressEncoder,
  getProgramDerivedAddress,
  getU16Encoder,
  getUtf8Encoder,
  type Address,
  type ProgramDerivedAddress,
} from '@solana/web3.js';

export type MarginAccountSeeds = {
  /** Tswap singleton account */
  tswap: Address;
  /** The address of the pool and escrow owner */
  owner: Address;

  marginNr: number;
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
      getUtf8Encoder().encode('margin'),
      getAddressEncoder().encode(seeds.tswap),
      getAddressEncoder().encode(seeds.owner),
      getU16Encoder().encode(seeds.marginNr),
    ],
  });
}

import { ProgramDerivedAddress } from '@solana/addresses';
import {
  ResolvedAccount,
  expectAddress,
  findMarginAccountPda,
  findTSwapPda,
} from 'src/generated';

export const resolveMarginAccountPda = async ({
  accounts,
}: {
  accounts: Record<string, ResolvedAccount>;
}): Promise<Partial<{ value: ProgramDerivedAddress | null }>> => {
  return {
    value: await findMarginAccountPda({
      // ugly but tswapPda should always be derivable
      tswap: await findTSwapPda().then((r: ProgramDerivedAddress) => r[0]),
      owner: expectAddress(accounts.owner?.value),
      marginNr: new Uint8Array(2).fill(0),
    }),
  };
};

import { ProgramDerivedAddress } from '@solana/web3.js';
import { findMarginAccountPda, findTSwapPda } from '../generated';
import { ResolvedAccount, expectAddress } from '../generated/shared';

export const resolveMarginAccountPda = async ({
  accounts,
  args,
}: {
  accounts: Record<string, ResolvedAccount>;
  args: { marginNr?: number };
}): Promise<Partial<{ value: ProgramDerivedAddress | null }>> => {
  return {
    value: await findMarginAccountPda({
      tswap: (await findTSwapPda())[0],
      owner: expectAddress(accounts.owner?.value),
      marginNr: args.marginNr ?? 0,
    }),
  };
};

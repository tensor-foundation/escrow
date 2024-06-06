import { KeyPairSigner, createKeyPairSignerFromBytes } from "@solana/web3.js";
import { keypairBytes, rpc } from "./common";
import type { DepositMarginAccountAsyncInput } from "@tensor-foundation/escrow";
import { getDepositMarginAccountInstructionAsync } from "@tensor-foundation/escrow";
import { simulateTxWithIxs } from "@tensor-foundation/common-helpers";

// deposits sol (in lamports) to your escrow account
async function depositSolEscrow(lamports: number) {
  const keypairSigner: KeyPairSigner = await createKeyPairSignerFromBytes(
    Buffer.from(keypairBytes),
    false,
  );
  const depositMarginAccountAsyncInput: DepositMarginAccountAsyncInput = {
    owner: keypairSigner,
    lamports: lamports,
  };
  const depositSolEscrowIx = await getDepositMarginAccountInstructionAsync(
    depositMarginAccountAsyncInput,
  );
  await simulateTxWithIxs(rpc, [depositSolEscrowIx], keypairSigner);
}
depositSolEscrow(0.1 * 1_000_000_000);

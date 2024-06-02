import { KeyPairSigner, createKeyPairSignerFromBytes } from "@solana/web3.js";
import { keypairBytes, rpc } from "./common";
import type { WithdrawMarginAccountAsyncInput } from "@tensor-foundation/escrow";
import { getWithdrawMarginAccountInstructionAsync } from "@tensor-foundation/escrow";
import { simulateTxWithIxs } from "@tensor-foundation/common-helpers";

// withdraws sol (in lamports) from your escrow account
async function withdrawSolEscrow(lamports: number) {
  const keypairSigner: KeyPairSigner = await createKeyPairSignerFromBytes(
    Buffer.from(keypairBytes),
    false,
  );
  const withdrawMarginAccountAsyncInput: WithdrawMarginAccountAsyncInput = {
    owner: keypairSigner,
    lamports: lamports,
  };
  const withdrawSolEscrowIx = await getWithdrawMarginAccountInstructionAsync(
    withdrawMarginAccountAsyncInput,
  );
  await simulateTxWithIxs(rpc, [withdrawSolEscrowIx], keypairSigner);
}
withdrawSolEscrow(0.01 * 1_000_000_000);

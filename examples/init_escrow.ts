import { KeyPairSigner, createKeyPairSignerFromBytes } from "@solana/web3.js";
import { keypairBytes, rpc } from "./common";
import type { InitMarginAccountAsyncInput } from "@tensor-foundation/escrow";
import { getInitMarginAccountInstructionAsync } from "@tensor-foundation/escrow";
import { simulateTxWithIxs } from "@tensor-foundation/common-helpers";

// initializes your escrow account (only needs to be done once per wallet)
async function initEscrow() {
  const keypairSigner: KeyPairSigner = await createKeyPairSignerFromBytes(
    Buffer.from(keypairBytes),
    false,
  );
  const initMarginAccountAsyncInput: InitMarginAccountAsyncInput = {
    owner: keypairSigner
  };
  const initEscrowIx = await getInitMarginAccountInstructionAsync(
    initMarginAccountAsyncInput,
  );
  await simulateTxWithIxs(rpc, [initEscrowIx], keypairSigner);
}
initEscrow();

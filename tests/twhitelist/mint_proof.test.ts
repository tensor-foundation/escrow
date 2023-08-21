import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { MAX_PROOF_LEN, TensorWhitelistSDK } from "../../src";
import {
  buildAndSendTx,
  generateTreeOfSize,
  testInitWLAuthority,
  TEST_PROVIDER,
  wlSdk,
} from "../shared";
import { createAndFundAta, createFundedWallet } from "../tswap/common";
import { testInitUpdateMintProof } from "./common";

// ---------------------------- Mint proofs

describe("tensor_whitelist mint proofs", () => {
  let authPda: PublicKey;

  // inits authority
  before(async () => {
    ({ authPda } = await testInitWLAuthority());
  });

  it("init update mint proof", async () => {
    const uuidBuffer = TensorWhitelistSDK.uuidToBuffer(
      wlSdk.genWhitelistUUID()
    );
    const nameBuffer = TensorWhitelistSDK.nameToBuffer("hello_world");
    const owner = await createFundedWallet();
    const { mint } = await createAndFundAta({ owner });
    const { mint: badMint } = await createAndFundAta({ owner });
    const {
      root,
      proofs: [wlNft],
    } = generateTreeOfSize(100, [mint]);

    const {
      tx: { ixs },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist({
      cosigner: TEST_PROVIDER.publicKey,
      uuid: uuidBuffer,
      rootHash: root,
      name: nameBuffer,
    });
    await buildAndSendTx({ ixs });

    // Create valid mint proof.
    await testInitUpdateMintProof({
      user: owner,
      mint,
      whitelist: whitelistPda,
      proof: wlNft.proof,
      expectedProofLen: 7, // floor(log_2(100)) + 1 => 7
    });

    // Bad mint/proof fails.
    for (const { curMint, proof } of [
      { curMint: mint, proof: [Keypair.generate().publicKey.toBuffer()] },
      { curMint: badMint, proof: wlNft.proof },
    ]) {
      const {
        tx: { ixs },
      } = await wlSdk.initUpdateMintProof({
        user: TEST_PROVIDER.publicKey,
        mint: curMint,
        whitelist: whitelistPda,
        // Invalid proof
        proof,
      });
      await expect(buildAndSendTx({ ixs })).rejectedWith(
        wlSdk.getErrorCodeHex("FailedMerkleProofVerification")
      );
    }

    // Too long proof fails.
    // NB: ProofTooLong isn't thrown b/c we hit transaction size limit first.
    {
      const {
        tx: { ixs },
      } = await wlSdk.initUpdateMintProof({
        user: TEST_PROVIDER.publicKey,
        mint,
        whitelist: whitelistPda,
        // Proof too long
        proof: Array(MAX_PROOF_LEN + 1)
          .fill(null)
          .map((_) => Keypair.generate().publicKey.toBuffer()),
      });
      await expect(buildAndSendTx({ ixs })).rejectedWith(
        "Transaction too large"
      );
    }

    // Update our whitelist and then update mint proof should work.
    {
      // Update whitelist w/ new root
      const {
        root,
        proofs: [wlNft2],
        // Different sized proof.
      } = generateTreeOfSize(2, [mint]);
      const {
        tx: { ixs },
      } = await wlSdk.initUpdateWhitelist({
        cosigner: TEST_PROVIDER.publicKey,
        uuid: uuidBuffer,
        rootHash: root,
      });
      await buildAndSendTx({ ixs });

      // Update mint proof.
      await testInitUpdateMintProof({
        user: owner,
        mint,
        whitelist: whitelistPda,
        proof: wlNft2.proof,
        expectedProofLen: 2, // floor(log_2(2)) + 1 => 2
      });
    }
  });
});

import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { buildAndSendTx, MAX_PROOF_LEN, wlSdk } from "../shared";

export const testInitUpdateMintProof = async ({
  user,
  mint,
  whitelist,
  proof,
  expectedProofLen = Math.floor(Math.log2(100)) + 1,
}: {
  user: Keypair;
  mint: PublicKey;
  whitelist: PublicKey;
  proof: Buffer[];
  expectedProofLen?: number;
}) => {
  const {
    tx: { ixs },
    mintProofPda,
  } = await wlSdk.initUpdateMintProof({
    user: user.publicKey,
    mint,
    whitelist,
    proof,
  });
  await buildAndSendTx({ ixs, extraSigners: [user] });

  const proofAcc = await wlSdk.fetchMintProof(mintProofPda);
  const proofLen = proof.length;
  expect(proofLen).eq(expectedProofLen);
  expect(proofAcc.proof.slice(0, proofLen)).eql(
    proof.map((b) => Array.from(b))
  );
  expect(proofAcc.proofLen).eq(proofLen);
  expect(proofAcc.proof.slice(proof.length)).eql(
    Array(MAX_PROOF_LEN - proofLen)
      .fill(null)
      .map((_) => Array(32).fill(0))
  );
};

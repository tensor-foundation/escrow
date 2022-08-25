import { PublicKey, Signer, TransactionInstruction } from "@solana/web3.js";
import { buildTx } from "@tensor-hq/tensor-common/dist/solana_contrib";
import * as anchor from "@project-serum/anchor";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { AnchorProvider } from "@project-serum/anchor";

export const buildAndSendTx = async (
  provider: AnchorProvider,
  ixs: TransactionInstruction[],
  extraSigners?: Signer[]
): Promise<string> => {
  const { tx } = await buildTx({
    connections: [provider.connection],
    instructions: ixs,
    additionalSigners: extraSigners,
    feePayer: provider.publicKey,
  });
  await provider.wallet.signTransaction(tx);
  return await provider.connection.sendRawTransaction(tx.serialize());
};

export const generateTreeOfSize = (size: number, targetMint: PublicKey) => {
  const leaves = [targetMint.toBuffer()];

  for (let i = 0; i < size; i++) {
    let u = anchor.web3.Keypair.generate();
    leaves.push(u.publicKey.toBuffer());
    // if (i % 1000 === 0) {
    //   console.log(i);
    // }
  }

  console.log(`there are ${leaves.length} leaves`);

  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    hashLeaves: true,
  });

  const leaf = keccak256(targetMint.toBuffer());
  const proof = tree.getProof(leaf);
  const validProof: Buffer[] = proof.map((p) => p.data);
  console.log(`proof is ${validProof.length} long`);

  return { tree, root: tree.getRoot().toJSON().data, proof: validProof };
};

export const removeNullBytes = (str: string) => {
  return str
    .split("")
    .filter((char) => char.codePointAt(0))
    .join("");
};

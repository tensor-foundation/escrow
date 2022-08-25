import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { buildTx } from "@tensor-hq/tensor-common/dist/solana_contrib";
import * as anchor from "@project-serum/anchor";
import { AnchorProvider } from "@project-serum/anchor";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
} from "@solana/spl-token";

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

export const createFundedWallet = async (
  provider: AnchorProvider,
  sol?: number
): Promise<Keypair> => {
  const keypair = Keypair.generate();
  //aidrops are funky, best to move from provider wallet
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: keypair.publicKey,
      lamports: (sol ?? 10) * LAMPORTS_PER_SOL,
    })
  );
  await buildAndSendTx(provider, tx.instructions);
  return keypair;
};

export const createAndFundATA = async (
  provider: AnchorProvider,
  amount: number,
  owner?: Keypair
): Promise<{ mint: PublicKey; ata: PublicKey; owner: Keypair }> => {
  const usedOwner = owner ?? (await createFundedWallet(provider));
  const mint = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(
    provider.connection
  );
  const createMintAccIx = SystemProgram.createAccount({
    fromPubkey: usedOwner.publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  });
  const createMintIx = await createInitializeMintInstruction(
    mint.publicKey,
    0,
    usedOwner.publicKey,
    usedOwner.publicKey
  );
  const ata = await getAssociatedTokenAddress(
    mint.publicKey,
    usedOwner.publicKey
  );
  const createAtaIx = createAssociatedTokenAccountInstruction(
    usedOwner.publicKey,
    ata,
    usedOwner.publicKey,
    mint.publicKey
  );
  const mintIx = createMintToInstruction(
    mint.publicKey,
    ata,
    usedOwner.publicKey,
    amount
  );
  await buildAndSendTx(
    provider,
    [createMintAccIx, createMintIx, createAtaIx, mintIx],
    [usedOwner, mint]
  );
  return { mint: mint.publicKey, ata, owner: usedOwner };
};

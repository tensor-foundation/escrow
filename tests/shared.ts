import {
  ConfirmOptions,
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
import { AccountClient, AnchorProvider } from "@project-serum/anchor";
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import { TensorSwapSDK, TensorWhitelistSDK } from "../src";
import { expect } from "chai";

export const waitMS = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const buildAndSendTx = async (
  provider: AnchorProvider,
  ixs: TransactionInstruction[],
  extraSigners?: Signer[],
  opts?: ConfirmOptions
) => {
  const { tx } = await buildTx({
    connections: [provider.connection],
    instructions: ixs,
    additionalSigners: extraSigners,
    feePayer: provider.publicKey,
  });
  await provider.wallet.signTransaction(tx);
  try {
    //(!) SUPER IMPORTANT TO USE THIS METHOD AND NOT sendRawTransaction()
    return await provider.sendAndConfirm(tx, extraSigners, opts);
  } catch (e) {
    //this is needed to see program error logs
    console.error("❌ FAILED TO SEND TX, FULL ERROR: ❌");
    console.error(e);
    throw e;
  }
};

export const generateTreeOfSize = (size: number, targetMints: PublicKey[]) => {
  const leaves = targetMints.map((m) => m.toBuffer());

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

  const proofs: { mint: PublicKey; proof: Buffer[] }[] = targetMints.map(
    (targetMint) => {
      const leaf = keccak256(targetMint.toBuffer());
      const proof = tree.getProof(leaf);
      const validProof: Buffer[] = proof.map((p) => p.data);
      console.log(`proof is ${validProof.length} long`);
      return { mint: targetMint, proof: validProof };
    }
  );

  return { tree, root: tree.getRoot().toJSON().data, proofs };
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

export const createATA = async (
  provider: AnchorProvider,
  mint: PublicKey,
  owner: Keypair
) => {
  const ata = await getAssociatedTokenAddress(mint, owner.publicKey);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    owner.publicKey,
    ata,
    owner.publicKey,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  await buildAndSendTx(provider, [createAtaIx], [owner]);
  return { mint, owner, ata };
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

  const ixs = [createMintAccIx, createMintIx, createAtaIx];
  if (amount > 0) {
    ixs.push(mintIx);
  }

  await buildAndSendTx(provider, ixs, [usedOwner, mint]);
  return { mint: mint.publicKey, ata, owner: usedOwner };
};

export const stringifyPKsAndBNs = (i: any) => {
  if (_isPk(i)) {
    return (<PublicKey>i).toBase58();
  } else if (i instanceof BN) {
    return i.toString();
  } else if (_parseType(i) === "array") {
    return _stringifyPKsAndBNInArray(i);
  } else if (_parseType(i) === "object") {
    return _stringifyPKsAndBNsInObject(i);
  }
  return i;
};

export const getAccountRent = (
  provider: AnchorProvider,
  acct: AccountClient
) => {
  return provider.connection.getMinimumBalanceForRentExemption(acct.size);
};

//#region Helper fns.

const _isPk = (obj: any): boolean => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj["toBase58"] === "function"
  );
};

const _stringifyPKsAndBNsInObject = (o: any) => {
  const newO = { ...o };
  for (const [k, v] of Object.entries(newO)) {
    if (_isPk(v)) {
      newO[k] = (<PublicKey>v).toBase58();
    } else if (v instanceof BN) {
      newO[k] = (v as BN).toString();
    } else if (_parseType(v) === "array") {
      newO[k] = _stringifyPKsAndBNInArray(v as any);
    } else if (_parseType(v) === "object") {
      newO[k] = _stringifyPKsAndBNsInObject(v);
    } else {
      newO[k] = v;
    }
  }
  return newO;
};

const _stringifyPKsAndBNInArray = (a: any[]): any[] => {
  const newA = [];
  for (const i of a) {
    if (_isPk(i)) {
      newA.push(i.toBase58());
    } else if (i instanceof BN) {
      newA.push(i.toString());
    } else if (_parseType(i) === "array") {
      newA.push(_stringifyPKsAndBNInArray(i));
    } else if (_parseType(i) === "object") {
      newA.push(stringifyPKsAndBNs(i));
    } else {
      newA.push(i);
    }
  }
  return newA;
};

const _parseType = <T>(v: T): string => {
  if (v === null || v === undefined) {
    return "null";
  }
  if (typeof v === "object") {
    if (v instanceof Array) {
      return "array";
    }
    if (v instanceof Date) {
      return "date";
    }
    return "object";
  }
  return typeof v;
};

// #endregion

//(!) provider used across all tests
export const TEST_PROVIDER = anchor.AnchorProvider.local();
export const swapSdk = new TensorSwapSDK({ provider: TEST_PROVIDER });
export const wlSdk = new TensorWhitelistSDK({ provider: TEST_PROVIDER });

//#region Shared test functions.

export const testInitWLAuthority = async () => {
  const {
    tx: { ixs },
    authPda,
  } = await wlSdk.initUpdateAuthority(
    TEST_PROVIDER.publicKey,
    TEST_PROVIDER.publicKey
  );
  await buildAndSendTx(TEST_PROVIDER, ixs);

  let authAcc = await wlSdk.fetchAuthority(authPda);
  expect(authAcc.owner.toBase58()).to.eq(TEST_PROVIDER.publicKey.toBase58());

  return authPda;
};

//#endregion

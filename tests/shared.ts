// Common helper functions b/w tensor_whitelist & tensorswap.
import * as anchor from "@project-serum/anchor";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import {
  ConfirmOptions,
  Keypair,
  PublicKey,
  Signer,
  TransactionInstruction,
} from "@solana/web3.js";
import { buildTx } from "@tensor-hq/tensor-common/dist/solana_contrib";
import { expect } from "chai";
import { backOff } from "exponential-backoff";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import { TensorSwapSDK, TensorWhitelistSDK } from "../src";
import { getLamports as _getLamports } from "../src/common";
import {
  SingleConnectionBroadcaster,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
// Exporting these here vs in each .test.ts file prevents weird undefined issues.
export {
  castPoolConfigAnchor,
  CurveTypeAnchor,
  hexCode,
  HUNDRED_PCT_BPS,
  MAX_PROOF_LEN,
  PoolAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  stringifyPKsAndBNs,
  TakerSide,
  TSWAP_FEE_ACC,
} from "../src";

export const ACCT_NOT_EXISTS_ERR = "Account does not exist";
// Vipers IntegerOverflow error.
export const INTEGER_OVERFLOW_ERR = "0x44f";

export const getLamports = (acct: PublicKey) =>
  _getLamports(TEST_PROVIDER.connection, acct);

export const waitMS = (ms: number) => new Promise((res) => setTimeout(res, ms));

type BuildAndSendTxArgs = {
  provider: AnchorProvider;
  ixs: TransactionInstruction[];
  extraSigners?: Signer[];
  opts?: ConfirmOptions;
  // Prints out transaction (w/ logs) to stdout
  debug?: boolean;
};

const _buildAndSendTx = async ({
  provider,
  ixs,
  extraSigners,
  opts,
  debug,
}: BuildAndSendTxArgs) => {
  const { tx } = await backOff(
    () =>
      buildTx({
        connections: [provider.connection],
        instructions: ixs,
        additionalSigners: extraSigners,
        feePayer: provider.publicKey,
      }),
    {
      // Retry blockhash errors (happens during tests sometimes).
      retry: (e: any) => {
        return e.message.includes("blockhash");
      },
    }
  );
  await provider.wallet.signTransaction(tx);
  try {
    if (debug) opts = { ...opts, commitment: "confirmed" };
    //(!) SUPER IMPORTANT TO USE THIS METHOD AND NOT sendRawTransaction()
    const sig = await provider.sendAndConfirm(tx, extraSigners, opts);
    if (debug) {
      console.log(
        await provider.connection.getTransaction(sig, {
          commitment: "confirmed",
        })
      );
    }
    return sig;
  } catch (e) {
    //this is needed to see program error logs
    console.error("❌ FAILED TO SEND TX, FULL ERROR: ❌");
    console.error(e);
    throw e;
  }
};

export const buildAndSendTx = (
  args: Omit<BuildAndSendTxArgs, "provider"> & { provider?: AnchorProvider }
) => _buildAndSendTx({ provider: TEST_PROVIDER, ...args });

export const generateTreeOfSize = (size: number, targetMints: PublicKey[]) => {
  const leaves = targetMints.map((m) => m.toBuffer());

  for (let i = 0; i < size; i++) {
    let u = anchor.web3.Keypair.generate();
    leaves.push(u.publicKey.toBuffer());
  }

  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    hashLeaves: true,
  });

  const proofs: { mint: PublicKey; proof: Buffer[] }[] = targetMints.map(
    (targetMint) => {
      const leaf = keccak256(targetMint.toBuffer());
      const proof = tree.getProof(leaf);
      const validProof: Buffer[] = proof.map((p) => p.data);
      return { mint: targetMint, proof: validProof };
    }
  );

  return { tree, root: tree.getRoot().toJSON().data, proofs };
};

// This passes the accounts' lamports before the provided `callback` function is called.
// Useful for doing before/after lamports diffing.
//
// Example:
// ```
// // Create tx...
// await withLamports(
//   { prevLamports: traderA.publicKey, prevEscrowLamports: solEscrowPda },
//   async ({ prevLamports, prevEscrowLamports }) => {
//     // Actually send tx
//     await buildAndSendTx({...});
//     const currlamports = await getLamports(traderA.publicKey);
//     // Compare currlamports w/ prevLamports
//   })
// );
// ```
export const withLamports = async <
  Accounts extends Record<string, PublicKey>,
  R
>(
  accts: Accounts,
  callback: (results: {
    [k in keyof Accounts]: number | undefined;
  }) => Promise<R>
): Promise<R> => {
  const results = Object.fromEntries(
    await Promise.all(
      Object.entries(accts).map(async ([k, key]) => [
        k,
        await getLamports(key as PublicKey),
      ])
    )
  );
  return await callback(results);
};

// Taken from https://stackoverflow.com/a/65025697/4463793
type MapCartesian<T extends any[][]> = {
  [P in keyof T]: T[P] extends Array<infer U> ? U : never;
};
// Lets you form the cartesian/cross product of a bunch of parameters, useful for tests with a ladder.
//
// Example:
// ```
// await Promise.all(
//   cartesian([traderA, traderB], [nftPoolConfig, tradePoolConfig]).map(
//     async ([owner, config]) => {
//        // Do stuff
//     }
//   )
// );
// ```
export const cartesian = <T extends any[][]>(...arr: T): MapCartesian<T>[] =>
  arr.reduce(
    (a, b) => a.flatMap((c) => b.map((d) => [...c, d])),
    [[]]
  ) as MapCartesian<T>[];

//(!) provider used across all tests
export const TEST_PROVIDER = anchor.AnchorProvider.local();
export const swapSdk = new TensorSwapSDK({ provider: TEST_PROVIDER });
export const wlSdk = new TensorWhitelistSDK({ provider: TEST_PROVIDER });

//#region Shared test functions.

//keeping this outside the fn so that it's constant for all tests
const tlistOwner = Keypair.generate();

export const testInitWLAuthority = async () => {
  const {
    tx: { ixs },
    authPda,
  } = await wlSdk.initUpdateAuthority({
    cosigner: TEST_PROVIDER.publicKey,
    owner: tlistOwner.publicKey,
    newCosigner: TEST_PROVIDER.publicKey,
    newOwner: tlistOwner.publicKey,
  });

  await buildAndSendTx({ ixs, extraSigners: [tlistOwner] });

  let authAcc = await wlSdk.fetchAuthority(authPda);
  expect(authAcc.cosigner.toBase58()).to.eq(TEST_PROVIDER.publicKey.toBase58());

  return { authPda, tlistOwner };
};

//#endregion

//useful for debugging
export const simulateTxTable = async (ixs: TransactionInstruction[]) => {
  const broadcaster = new SingleConnectionBroadcaster(TEST_PROVIDER.connection);
  const wallet = new Wallet(Keypair.generate());
  const provider = new SolanaProvider(
    TEST_PROVIDER.connection,
    broadcaster,
    wallet
  );
  const tx = new TransactionEnvelope(provider, ixs);
  console.log(await tx.simulateTable());
};

export const calcMinRent = async (address: PublicKey) => {
  const acc = await TEST_PROVIDER.connection.getAccountInfo(address);
  if (acc) {
    console.log(
      "min rent is",
      await TEST_PROVIDER.connection.getMinimumBalanceForRentExemption(
        acc.data.length
      )
    );
  } else {
    console.log("acc not found");
  }
};

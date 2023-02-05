// Common helper functions b/w tensor_whitelist & tensorswap.
import * as anchor from "@project-serum/anchor";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Commitment,
  ComputeBudgetProgram,
  ConfirmOptions,
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { backOff } from "exponential-backoff";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import {
  AUTH_PROG_ID,
  findTSwapPDA,
  isNullLike,
  TENSORSWAP_ADDR,
  TensorSwapSDK,
  TensorWhitelistSDK,
  TMETA_PROG_ID,
} from "../src";
import { getLamports as _getLamports } from "../src/common";
import {
  SingleConnectionBroadcaster,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  createCreateOrUpdateInstruction,
  findRuleSetPDA,
} from "@metaplex-foundation/mpl-token-auth-rules";
import { encode } from "@msgpack/msgpack";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

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
} from "../src";

export const ACCT_NOT_EXISTS_ERR = "Account does not exist";
// Vipers IntegerOverflow error.
export const INTEGER_OVERFLOW_ERR = "0x44f";

export const getLamports = (acct: PublicKey) =>
  _getLamports(TEST_PROVIDER.connection, acct);

export const waitMS = (ms: number) => new Promise((res) => setTimeout(res, ms));

type BuildAndSendTxArgs = {
  provider?: AnchorProvider;
  ixs: TransactionInstruction[];
  extraSigners?: Signer[];
  opts?: ConfirmOptions;
  // Prints out transaction (w/ logs) to stdout
  debug?: boolean;
  // Optional, if present signify that a V0 tx should be sent
  lookupTableAccounts?: [AddressLookupTableAccount] | undefined;
};

//simplified version from tensor-common
const _buildTx = async ({
  connections,
  feePayer,
  instructions,
  additionalSigners,
  commitment = "confirmed",
}: {
  //(!) ideally this should be the same RPC node that will then try to send/confirm the tx
  connections: Array<Connection>;
  feePayer: PublicKey;
  instructions: TransactionInstruction[];
  additionalSigners?: Array<Signer>;
  commitment?: Commitment;
}) => {
  if (!instructions.length) {
    throw new Error("must pass at least one instruction");
  }

  const tx = new Transaction();
  tx.add(...instructions);
  tx.feePayer = feePayer;

  const latestBlockhash = await connections[0].getLatestBlockhash({
    commitment,
  });
  tx.recentBlockhash = latestBlockhash.blockhash;
  const lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

  if (additionalSigners) {
    additionalSigners
      .filter((s): s is Signer => s !== undefined)
      .forEach((kp) => {
        tx.partialSign(kp);
      });
  }

  return { tx, lastValidBlockHeight };
};

//simplified version from tensor-common
const _buildTxV0 = async ({
  connections,
  feePayer,
  instructions,
  additionalSigners,
  commitment = "confirmed",
  addressLookupTableAccs,
}: {
  //(!) ideally this should be the same RPC node that will then try to send/confirm the tx
  connections: Array<Connection>;
  feePayer: PublicKey;
  instructions: TransactionInstruction[];
  additionalSigners?: Array<Signer>;
  commitment?: Commitment;
  addressLookupTableAccs: AddressLookupTableAccount[];
}) => {
  if (!instructions.length) {
    throw new Error("must pass at least one instruction");
  }

  const latestBlockhash = await connections[0].getLatestBlockhash({
    commitment,
  });
  const lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

  const msg = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccs);
  const tx = new VersionedTransaction(msg);

  if (additionalSigners) {
    tx.sign(additionalSigners.filter((s): s is Signer => s !== undefined));
  }

  return { tx, lastValidBlockHeight };
};

export const buildAndSendTx = async ({
  provider = TEST_PROVIDER,
  ixs,
  extraSigners,
  opts,
  debug,
  lookupTableAccounts,
}: BuildAndSendTxArgs) => {
  let tx: Transaction | VersionedTransaction;

  if (isNullLike(lookupTableAccounts)) {
    //build legacy
    ({ tx } = await backOff(
      () =>
        _buildTx({
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
    ));
    await provider.wallet.signTransaction(tx);
  } else {
    //build v0
    ({ tx } = await backOff(
      () =>
        _buildTxV0({
          connections: [provider.connection],
          instructions: ixs,
          //have to add TEST_KEYPAIR here instead of wallet.signTx() since partialSign not impl on v0 txs
          additionalSigners: [TEST_KEYPAIR, ...(extraSigners ?? [])],
          feePayer: provider.publicKey,
          addressLookupTableAccs: lookupTableAccounts,
        }),
      {
        // Retry blockhash errors (happens during tests sometimes).
        retry: (e: any) => {
          return e.message.includes("blockhash");
        },
      }
    ));
  }

  try {
    if (debug) opts = { ...opts, commitment: "confirmed" };
    const sig = await provider.connection.sendRawTransaction(
      tx.serialize(),
      opts
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
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
process.env.ANCHOR_WALLET = "tests/test-keypair.json";
export const TEST_PROVIDER = anchor.AnchorProvider.local();
const TEST_KEYPAIR = Keypair.fromSecretKey(
  Buffer.from(
    JSON.parse(
      require("fs").readFileSync(process.env.ANCHOR_WALLET, {
        encoding: "utf-8",
      })
    )
  )
);

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

export const createTokenAuthorizationRules = async (
  provider: AnchorProvider,
  payer: Keypair,
  name = "a", //keep it short or we wont have space for tx to pass
  data?: Uint8Array
) => {
  const [ruleSetAddress] = await findRuleSetPDA(payer.publicKey, name);

  //ruleset relevant for transfers
  const ruleSet = {
    libVersion: 1,
    ruleSetName: name,
    owner: Array.from(payer.publicKey.toBytes()),
    operations: {
      "Delegate:Transfer": {
        ProgramOwnedList: {
          programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
          field: "Delegate",
        },
      },
      "Transfer:Owner": {
        All: {
          rules: [
            //no space
            // {
            //   Amount: {
            //     amount: 1,
            //     operator: "Eq",
            //     field: "Amount",
            //   },
            // },
            {
              Any: {
                rules: [
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
                      field: "Source",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
                      field: "Destination",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
                      field: "Authority",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      "Transfer:TransferDelegate": {
        All: {
          rules: [
            //no space
            // {
            //   Amount: {
            //     amount: 1,
            //     operator: "Eq",
            //     field: "Amount",
            //   },
            // },
            {
              Any: {
                rules: [
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
                      field: "Source",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
                      field: "Destination",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(TENSORSWAP_ADDR.toBytes())],
                      field: "Authority",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
  };

  // Encode the file using msgpack so the pre-encoded data can be written directly to a Solana program account
  let finalData = data ?? encode(ruleSet);

  let createIX = createCreateOrUpdateInstruction(
    {
      payer: payer.publicKey,
      ruleSetPda: ruleSetAddress,
      systemProgram: SystemProgram.programId,
    },
    {
      createOrUpdateArgs: { __kind: "V1", serializedRuleSet: finalData },
    },
    AUTH_PROG_ID
  );

  await buildAndSendTx({ provider, ixs: [createIX], extraSigners: [payer] });

  return ruleSetAddress;
};

export const createCoreTswapLUT = async (
  provider = TEST_PROVIDER,
  slotCommitment: Commitment = "finalized"
) => {
  const conn = provider.connection;

  //use finalized, otherwise get "is not a recent slot err"
  const slot = await conn.getSlot(slotCommitment);

  //create
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: provider.publicKey,
      payer: provider.publicKey,
      recentSlot: slot,
    });

  //see if already created
  let lookupTableAccount = (
    await conn.getAddressLookupTable(lookupTableAddress)
  ).value;
  if (!!lookupTableAccount) {
    console.log("LUT exists", lookupTableAddress.toBase58());
    return lookupTableAccount;
  }

  console.log("LUT missing");

  const [tswapPda] = findTSwapPDA({});

  //add addresses
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: provider.publicKey,
    authority: provider.publicKey,
    lookupTable: lookupTableAddress,
    addresses: [
      tswapPda,
      TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      SYSVAR_RENT_PUBKEY,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      AUTH_PROG_ID,
      TMETA_PROG_ID,
      SYSVAR_INSTRUCTIONS_PUBKEY,
    ],
  });

  let done = false;
  while (!done) {
    try {
      await buildAndSendTx({
        provider,
        ixs: [lookupTableInst, extendInstruction],
      });
      done = true;
    } catch (e) {
      console.log("failed, try again in 5");
      await waitMS(5000);
    }
  }

  console.log("new LUT created", lookupTableAddress.toBase58());

  //fetch
  lookupTableAccount = (await conn.getAddressLookupTable(lookupTableAddress))
    .value;

  return lookupTableAccount;
};

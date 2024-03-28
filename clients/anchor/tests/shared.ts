// Common helper functions b/w tensor_whitelist & tensorswap.
import * as anchor from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor";
import {
  createCreateOrUpdateInstruction,
  findRuleSetPDA,
} from "@metaplex-foundation/mpl-token-auth-rules";
import { encode } from "@msgpack/msgpack";
import {
  SingleConnectionBroadcaster,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AddressLookupTableProgram,
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  AUTH_PROGRAM_ID,
  getLamports as _getLamports,
  Overwrite,
  test_utils,
  TMETA_PROGRAM_ID,
  waitMS,
} from "@tensor-hq/tensor-common";
import { expect } from "chai";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import { resolve } from "path";
import {
  findTSwapPDA,
  TBID_ADDR,
  TensorBidSDK,
  TensorSwapSDK,
  TENSORSWAP_ADDR,
  TensorWhitelistSDK,
  TLIST_ADDR,
} from "../src";

// Exporting these here vs in each .test.ts file prevents weird undefined issues.
export { waitMS } from "@tensor-hq/tensor-common";
export {
  castPoolConfigAnchor,
  CurveTypeAnchor,
  HUNDRED_PCT_BPS,
  MAX_PROOF_LEN,
  PoolAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  TakerSide,
} from "../src";

export const ACCT_NOT_EXISTS_ERR = "Account does not exist";
// Vipers IntegerOverflow error.
export const INTEGER_OVERFLOW_ERR = "0x44f";

//tensor common errors
export const COMMON_BAD_ROYALTY_ERR = "0x3a99";
export const COMMON_INSUFFICIENT_FUNDS_ERR = "0x3a9a";
export const COMMON_CREATOR_MISMATCH_ERR = "0x3a9b";
export const COMMON_ARITHMETIC_ERR = "0x3a9d";
export const COMMON_BAD_METADATA_ERR = "0x3a9e";
export const COMMON_BAD_RULESET_ERR = "0x3a9f";

export const getLamports = (acct: PublicKey) =>
  _getLamports(TEST_PROVIDER.connection, acct);

export const buildAndSendTx = async ({
  conn = TEST_CONN_PAYER.conn,
  payer = TEST_CONN_PAYER.payer,
  ...args
}: Overwrite<
  test_utils.BuildAndSendTxArgs,
  {
    conn?: Connection;
    payer?: Keypair;
  }
>) =>
  test_utils.buildAndSendTx({
    conn,
    payer,
    ...args,
  });

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
process.env.ANCHOR_WALLET = resolve(__dirname, "test-keypair.json");
export const TEST_PROVIDER = anchor.AnchorProvider.local("http://127.0.0.1:8899");
const TEST_KEYPAIR = Keypair.fromSecretKey(
  Buffer.from(
    JSON.parse(
      require("fs").readFileSync(process.env.ANCHOR_WALLET, {
        encoding: "utf-8",
      })
    )
  )
);
export const TEST_CONN_PAYER = {
  conn: TEST_PROVIDER.connection,
  payer: TEST_KEYPAIR,
};

export const swapSdk = new TensorSwapSDK({ provider: TEST_PROVIDER });
export const wlSdk = new TensorWhitelistSDK({ provider: TEST_PROVIDER });
export const bidSdk = new TensorBidSDK({ provider: TEST_PROVIDER });

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

export const createTokenAuthorizationRules = async ({
  payer,
  name = "a",
  data,
  whitelistedProgram = TENSORSWAP_ADDR,
}: {
  payer: Keypair;
  name?: string;
  data?: Uint8Array;
  whitelistedProgram?: anchor.web3.PublicKey;
}) => {
  const [ruleSetAddress] = await findRuleSetPDA(payer.publicKey, name);

  //ruleset relevant for transfers
  const ruleSet = {
    libVersion: 1,
    ruleSetName: name,
    owner: Array.from(payer.publicKey.toBytes()),
    operations: {
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
                      programs: [Array.from(whitelistedProgram.toBytes())],
                      field: "Source",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(whitelistedProgram.toBytes())],
                      field: "Destination",
                    },
                  },
                  {
                    ProgramOwnedList: {
                      programs: [Array.from(whitelistedProgram.toBytes())],
                      field: "Authority",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      // DISABLE THESE IF YOU WANT A PNFT W/O A DELEGATE RULE
      // "Delegate:Transfer": {
      //   ProgramOwnedList: {
      //     programs: [Array.from(whitelistedProgram.toBytes())],
      //     field: "Delegate",
      //   },
      // },
      // "Transfer:TransferDelegate": {
      //   All: {
      //     rules: [
      //       //no space
      //       // {
      //       //   Amount: {
      //       //     amount: 1,
      //       //     operator: "Eq",
      //       //     field: "Amount",
      //       //   },
      //       // },
      //       {
      //         Any: {
      //           rules: [
      //             {
      //               ProgramOwnedList: {
      //                 programs: [Array.from(whitelistedProgram.toBytes())],
      //                 field: "Source",
      //               },
      //             },
      //             {
      //               ProgramOwnedList: {
      //                 programs: [Array.from(whitelistedProgram.toBytes())],
      //                 field: "Destination",
      //               },
      //             },
      //             {
      //               ProgramOwnedList: {
      //                 programs: [Array.from(whitelistedProgram.toBytes())],
      //                 field: "Authority",
      //               },
      //             },
      //           ],
      //         },
      //       },
      //     ],
      //   },
      // },
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
    AUTH_PROGRAM_ID
  );

  await buildAndSendTx({ ixs: [createIX], extraSigners: [payer] });

  return ruleSetAddress;
};

export const updateLUT = async (
  provider: anchor.AnchorProvider,
  lookupTableAddress: PublicKey
) => {
  const conn = provider.connection;

  //add NEW addresses ONLY
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    authority: provider.wallet.publicKey,
    payer: provider.wallet.publicKey,
    lookupTable: lookupTableAddress,
    addresses: [
      TBID_ADDR,
      TLIST_ADDR,
      TENSORSWAP_ADDR,
      new PublicKey("hadeK9DLv9eA7ya5KCTqSvSvRZeJC3JgD5a9Y3CNbvu"),
    ],
  });

  let done = false;
  while (!done) {
    try {
      await buildAndSendTx({
        ixs: [extendInstruction],
      });
      done = true;
    } catch (e) {
      console.log("failed, try again in 5");
      await waitMS(5000);
    }
  }

  //fetch (this will actually show wrong the first time, need to rerun
  const lookupTableAccount = (
    await conn.getAddressLookupTable(lookupTableAddress)
  ).value;

  console.log("updated LUT", lookupTableAccount);
};

export const createCoreTswapLUT = async (
  provider: anchor.AnchorProvider = TEST_PROVIDER,
  slotCommitment: Commitment = "finalized"
) => {
  //use finalized, otherwise get "is not a recent slot err"
  const slot = await provider.connection.getSlot(slotCommitment);

  //create
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
      recentSlot: slot,
    });

  //see if already created
  let lookupTableAccount = (
    await provider.connection.getAddressLookupTable(lookupTableAddress)
  ).value;
  if (!!lookupTableAccount) {
    console.log("LUT exists", lookupTableAddress.toBase58());
    return lookupTableAccount;
  }

  console.log("LUT missing");

  const [tswapPda] = findTSwapPDA({});

  //add addresses
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    authority: provider.wallet.publicKey,
    payer: provider.wallet.publicKey,
    lookupTable: lookupTableAddress,
    addresses: [
      tswapPda,
      TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      SYSVAR_RENT_PUBKEY,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      AUTH_PROGRAM_ID,
      TMETA_PROGRAM_ID,
      SYSVAR_INSTRUCTIONS_PUBKEY,
    ],
  });

  let done = false;
  while (!done) {
    try {
      await buildAndSendTx({
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
  lookupTableAccount = (
    await provider.connection.getAddressLookupTable(lookupTableAddress)
  ).value;

  return lookupTableAccount;
};

import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import keccak256 from "keccak256";
import { MerkleTree } from "merkletreejs";
import * as path from "path";
import { TensorSwapSDK, TensorWhitelistSDK } from "../src";
import { buildAndSendTx, wlSdk } from "../tests/shared";

const payer = Keypair.fromSecretKey(
  Uint8Array.from(require("/Users/ilmoi/.config/solana/id.json"))
);
const wallet = new NodeWallet(payer);
const provider = new AnchorProvider(
  new Connection("https://api.devnet.solana.com", { commitment: "confirmed" }),
  wallet,
  { commitment: "confirmed" }
);

const swapSDK = new TensorSwapSDK({ provider });
const wlSDK = new TensorWhitelistSDK({ provider });

// --------------------------------------- init whitelist prog

const initWhitelistProgram = async () => {
  const {
    tx: { ixs },
  } = await wlSDK.initUpdateAuthority({
    newCosigner: payer.publicKey,
    newOwner: payer.publicKey,
  });
  const sig = await buildAndSendTx({ ixs, conn: provider.connection, payer });
  console.log(sig);
};

// --------------------------------------- create a whitelist for test collection

const generateTree = (targetMints: string[]) => {
  const leaves = targetMints.map((m) => new PublicKey(m).toBuffer());

  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    hashLeaves: true,
  });

  const proofs: { mint: string; proof: Buffer[] }[] = targetMints.map(
    (targetMint) => {
      const leaf = keccak256(new PublicKey(targetMint).toBuffer());
      const proof = tree.getProof(leaf);
      const validProof: Buffer[] = proof.map((p) => p.data);
      return { mint: targetMint, proof: validProof };
    }
  );

  return { tree, root: tree.getRoot().toJSON().data, proofs };
};

const dir = path.join(process.cwd(), "one_off/donkey_mints.txt");
const mints = require("fs").readFileSync(dir, "utf-8").split("\n");
const { root, proofs } = generateTree(mints);

const initWhitelistForDonkeys = async () => {
  console.log("found this many mints", mints.length);

  console.log("root is", root);
  // console.log("proofs are", proofs);

  const uuid = wlSdk.genWhitelistUUID();
  const name = "fancy_donkey";
  const {
    tx: { ixs },
    whitelistPda,
  } = await wlSdk.initUpdateWhitelist({
    cosigner: payer.publicKey,
    uuid: Buffer.from(uuid).toJSON().data,
    rootHash: root,
    name: Buffer.from(name.padEnd(32, "\0")).toJSON().data,
  });
  const sig = await buildAndSendTx({ ixs, conn: provider.connection, payer });
  console.log(sig, whitelistPda.toBase58());
};

//whitelist pda for donkeys = 6KtNLgptTXuXEofdZou49ct8hjeZnmSWRpjQuMqyfbx3

// --------------------------------------- init tswap

const initTswap = async () => {
  const {
    tx: { ixs },
  } = await swapSDK.initUpdateTSwap({
    owner: payer.publicKey,
    newOwner: payer.publicKey,
    config: { feeBps: 500 },
  });
  const sig = await buildAndSendTx({ ixs, conn: provider.connection, payer });
  console.log(sig);
};

// --------------------------------------- lfg

(async () => {
  console.log("lfg");

  // await initWhitelistProgram();
  // await initWhitelistForDonkeys();
  // console.log("donkey tree root is", root);

  await initTswap();
})();

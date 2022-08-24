import * as anchor from "@project-serum/anchor";
import { CurveType, PoolConfig, PoolType, TSwapSDK } from "../src";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import { buildTx } from "@tensor-hq/tensor-common/dist/solana_contrib";
import BN from "bn.js";
import chai, { expect } from "chai";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

const provider = anchor.AnchorProvider.env();
const sdk = new TSwapSDK({ provider });

const buildAndSendTx = async (
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

const generateTreeOfSize = (size: number, targetMint: PublicKey) => {
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

describe("tensorswap", () => {
  const whitelistedMint = new PublicKey(
    "27f3pdgwC9sCR7RUxZxxaE57cACCcoJGb6Nu4fhEiKh6"
  );
  const NOTwhitelistedMint = new PublicKey(
    "EQohfmuH9FVKGwgn2JR9bcV2MEeCogmMMeRpxaosGGcW"
  );
  const poolConfig: PoolConfig = {
    poolType: PoolType.NFT,
    curveType: CurveType.Exponential,
    startingPrice: new BN(1),
    delta: new BN(1),
    honorRoyalties: true,
    feeBps: 0,
    feeVault: null,
  };
  const { tree, root, proof } = generateTreeOfSize(100, whitelistedMint);

  let tSwap: Keypair;
  let pool: PublicKey;
  let creator: Keypair;

  beforeEach("configure accs", async () => {
    tSwap = Keypair.generate();
    creator = Keypair.generate();
    await provider.connection.requestAirdrop(
      creator.publicKey,
      LAMPORTS_PER_SOL
    );

    //tSwap
    const {
      tx: { ixs, extraSigners },
    } = await sdk.initTSwap(provider.publicKey, tSwap);
    await buildAndSendTx(ixs, extraSigners);
    await waitMS(2000);

    //pool
    const {
      tx: { ixs: poolIxs },
      poolPda,
    } = await sdk.initPool(
      tSwap.publicKey,
      creator.publicKey,
      poolConfig,
      root
    );
    pool = poolPda;
    await buildAndSendTx(poolIxs, [creator]);
    await waitMS(2000);
  });

  it("happy path", async () => {
    //swap
    const swapAcc = await sdk.fetchTSwap(tSwap.publicKey);
    expect(swapAcc).to.be.not.null;
    expect(swapAcc.owner.toBase58()).to.be.eq(provider.publicKey.toBase58());

    //pool
    const poolAcc = await sdk.fetchPool(pool);
    expect(poolAcc).to.be.not.null;
    expect(poolAcc.creator.toBase58()).to.eq(creator.publicKey.toBase58());

    //nft
    const {
      tx: { ixs: goodIxs },
    } = await sdk.addNft(
      tSwap.publicKey,
      creator.publicKey,
      poolConfig,
      root,
      proof,
      whitelistedMint
    );
    await buildAndSendTx(goodIxs);
    console.log("done, works!");

    const {
      tx: { ixs: badIxs },
    } = await sdk.addNft(
      tSwap.publicKey,
      creator.publicKey,
      poolConfig,
      root,
      proof,
      NOTwhitelistedMint //<-- (!)
    );

    await expect(buildAndSendTx(badIxs)).to.be.rejectedWith("0x1770");
  });
});

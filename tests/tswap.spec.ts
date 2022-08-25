import * as anchor from "@project-serum/anchor";
import {
  CurveType,
  PoolConfig,
  PoolType,
  TensorSwapSDK,
  TensorWhitelistSDK,
} from "../src";
import { Keypair, PublicKey } from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  buildAndSendTx,
  createAndFundATA,
  createFundedWallet,
  generateTreeOfSize,
} from "./shared";
//(!) KEEP THIS IMPORT. It ensures ordering of tests (WL -> swap), otherwise both will fail
import "./twhitelist.spec";
import { MerkleTree } from "merkletreejs";

chai.use(chaiAsPromised);

const provider = anchor.AnchorProvider.env();
const sdk = new TensorSwapSDK({ provider });
const wlSdk = new TensorWhitelistSDK({ provider });

describe("tensorswap", () => {
  const poolConfig: PoolConfig = {
    poolType: PoolType.NFT,
    curveType: CurveType.Exponential,
    startingPrice: new BN(1),
    delta: new BN(1),
    honorRoyalties: true,
    feeBps: 0,
    feeVault: null,
  };

  let tSwap: Keypair;
  let pool: PublicKey;

  let creator: Keypair;
  let traderA: Keypair;
  let traderB: Keypair;
  let whitelist: PublicKey;

  let whitelistedNftMint: PublicKey;
  let whitelistedNftAta: PublicKey;

  let NOTwhitelistedNftMint: PublicKey;
  let NOTwhitelistedNftAta: PublicKey;

  let tree: MerkleTree;
  let root: number[];
  let proof: Buffer[];

  before("inits necessary accs", async () => {
    //keypairs
    tSwap = Keypair.generate();
    creator = await createFundedWallet(provider);
    traderA = await createFundedWallet(provider);
    traderB = await createFundedWallet(provider);
    await waitMS(1000);

    //token accounts
    ({ mint: whitelistedNftMint, ata: whitelistedNftAta } =
      await createAndFundATA(provider, 1, traderA));
    ({ mint: NOTwhitelistedNftMint, ata: NOTwhitelistedNftAta } =
      await createAndFundATA(provider, 1, traderA));

    //whitelist
    ({ tree, root, proof } = generateTreeOfSize(100, whitelistedNftMint));
    const uuid = "0001c1a567594e34aeebccf4b49e3333"; //todo make random
    const name = "hello_world";
    const {
      tx: { ixs: wlIxs },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist(
      provider.publicKey,
      Buffer.from(uuid).toJSON().data,
      root,
      Buffer.from(name.padEnd(32, "\0")).toJSON().data
    );
    whitelist = whitelistPda;
    await buildAndSendTx(provider, wlIxs);
  });

  it("inits swap/pool", async () => {
    //swap
    const {
      tx: { ixs, extraSigners },
    } = await sdk.initTSwap(provider.publicKey, tSwap);
    await buildAndSendTx(provider, ixs, extraSigners);
    await waitMS(1000);

    const swapAcc = await sdk.fetchTSwap(tSwap.publicKey);
    expect(swapAcc.owner.toBase58()).to.be.eq(provider.publicKey.toBase58());

    //pool
    const {
      tx: { ixs: poolIxs },
      poolPda,
    } = await sdk.initPool(
      tSwap.publicKey,
      creator.publicKey,
      whitelist,
      poolConfig
    );
    pool = poolPda;
    await buildAndSendTx(provider, poolIxs, [creator]);
    await waitMS(1000);

    const poolAcc = await sdk.fetchPool(pool);
    expect(poolAcc.creator.toBase58()).to.eq(creator.publicKey.toBase58());
  });

  it("deposits nft", async () => {
    //bad
    const {
      tx: { ixs: badIxs },
    } = await sdk.depositNft(
      tSwap.publicKey,
      creator.publicKey,
      whitelist,
      NOTwhitelistedNftMint,
      NOTwhitelistedNftAta,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await expect(
      buildAndSendTx(provider, badIxs, [traderA])
    ).to.be.rejectedWith("0x1770");

    //good
    const {
      tx: { ixs: goodIxs },
      receiptPda,
      escrowPda,
    } = await sdk.depositNft(
      tSwap.publicKey,
      creator.publicKey,
      whitelist,
      whitelistedNftMint,
      whitelistedNftAta,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await buildAndSendTx(provider, goodIxs, [traderA]);
    await waitMS(1000);

    const receipt = await sdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(pool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(whitelistedNftMint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());
  });
});

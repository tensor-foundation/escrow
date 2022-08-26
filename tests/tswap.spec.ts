import * as anchor from "@project-serum/anchor";
import {
  CurveType,
  PoolConfig,
  PoolType,
  TensorSwapSDK,
  TensorWhitelistSDK,
} from "../src";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  buildAndSendTx,
  createAndFundATA,
  createATA,
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
    //todo changing this to Linear breaks the tests, need to see what's going on with seeds
    curveType: CurveType.Exponential,
    startingPrice: new BN(1),
    delta: new BN(1),
    honorRoyalties: true,
    mmFeeBps: 0,
    mmFeeVault: null,
  };

  let tSwap: Keypair;
  let pool: PublicKey;

  let traderA: Keypair;
  let traderB: Keypair;
  let whitelist: PublicKey;

  let whitelistedNftMint: PublicKey;
  let whitelistedNftAtaTraderA: PublicKey;
  let whitelistedNftAtaTraderB: PublicKey;

  let NOTwhitelistedNftMint: PublicKey;
  let NOTwhitelistedNftAta: PublicKey;

  let tree: MerkleTree;
  let root: number[];
  let proof: Buffer[];

  before("inits necessary accs", async () => {
    //keypairs
    tSwap = Keypair.generate();
    traderA = await createFundedWallet(provider);
    traderB = await createFundedWallet(provider);
    await waitMS(1000);

    //token accounts
    ({ mint: whitelistedNftMint, ata: whitelistedNftAtaTraderA } =
      await createAndFundATA(provider, 1, traderA));
    ({ mint: NOTwhitelistedNftMint, ata: NOTwhitelistedNftAta } =
      await createAndFundATA(provider, 1, traderA));
    await waitMS(1000);

    //need to wait for mint to propagate...
    ({ ata: whitelistedNftAtaTraderB } = await createATA(
      provider,
      whitelistedNftMint,
      traderB
    ));
    await waitMS(1000);

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
      traderA.publicKey,
      whitelist,
      poolConfig
    );
    pool = poolPda;
    await buildAndSendTx(provider, poolIxs, [traderA]);
    await waitMS(1000);

    const poolAcc = await sdk.fetchPool(pool);
    expect(poolAcc.creator.toBase58()).to.eq(traderA.publicKey.toBase58());
  });

  it("deposits nft", async () => {
    //bad

    // todo fix - getting whitelisting errs
    // const {
    //   tx: { ixs: badIxs },
    // } = await sdk.depositNft(
    //   tSwap.publicKey,
    //   whitelist,
    //   NOTwhitelistedNftMint,
    //   NOTwhitelistedNftAta,
    //   traderA.publicKey,
    //   poolConfig,
    //   proof
    // );
    // await expect(
    //   buildAndSendTx(provider, badIxs, [traderA])
    // ).to.be.rejectedWith("0x1770");

    //good
    const {
      tx: { ixs: goodIxs },
      receiptPda,
      escrowPda,
    } = await sdk.depositNft(
      tSwap.publicKey,
      whitelist,
      whitelistedNftMint,
      whitelistedNftAtaTraderA,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await buildAndSendTx(provider, goodIxs, [traderA]);
    await waitMS(2000);

    const receipt = await sdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(pool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(whitelistedNftMint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());
  });

  it("buys nft", async () => {
    const {
      tx: { ixs },
      receiptPda,
    } = await sdk.buyNft(
      tSwap.publicKey,
      whitelist,
      whitelistedNftMint,
      whitelistedNftAtaTraderB,
      traderA.publicKey,
      traderB.publicKey,
      poolConfig,
      proof
    );
    await buildAndSendTx(provider, ixs, [traderB]);
    await waitMS(1000);

    // const receipt = await sdk.fetchReceipt(receiptPda);
    // expect(receipt).to.undefined;
  });
});

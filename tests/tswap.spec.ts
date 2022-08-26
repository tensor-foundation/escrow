import { CurveType, PoolConfig, PoolType } from "../src";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  buildAndSendTx,
  createAndFundATA,
  createATA,
  createFundedWallet,
  generateTreeOfSize,
  stringifyPKsAndBNs,
  swapSdk,
  TEST_PROVIDER,
  wlSdk,
} from "./shared";
//(!) KEEP THIS IMPORT. It ensures ordering of tests (WL -> swap), otherwise both will fail
import "./twhitelist.spec";
import { MerkleTree } from "merkletreejs";

chai.use(chaiAsPromised);

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

  it("inits necessary accs", async () => {
    //keypairs
    tSwap = Keypair.generate();
    traderA = await createFundedWallet(TEST_PROVIDER);
    traderB = await createFundedWallet(TEST_PROVIDER);

    //token accounts
    ({ mint: whitelistedNftMint, ata: whitelistedNftAtaTraderA } =
      await createAndFundATA(TEST_PROVIDER, 1, traderA));
    ({ mint: NOTwhitelistedNftMint, ata: NOTwhitelistedNftAta } =
      await createAndFundATA(TEST_PROVIDER, 1, traderA));
    ({ ata: whitelistedNftAtaTraderB } = await createATA(
      TEST_PROVIDER,
      whitelistedNftMint,
      traderB
    ));

    //whitelist
    ({ tree, root, proof } = generateTreeOfSize(100, whitelistedNftMint));
    const uuid = "0001c1a567594e34aeebccf4b49e3333"; //todo make random
    const name = "hello_world";
    const {
      tx: { ixs: wlIxs },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist(
      TEST_PROVIDER.publicKey,
      Buffer.from(uuid).toJSON().data,
      root,
      Buffer.from(name.padEnd(32, "\0")).toJSON().data
    );
    whitelist = whitelistPda;
    await buildAndSendTx(TEST_PROVIDER, wlIxs);

    console.log(
      "debug accs",
      stringifyPKsAndBNs({
        tSwap: tSwap.publicKey,
        pool,
        traderA: traderA.publicKey,
        traderB: traderB.publicKey,
        whitelist,
        whitelistedNftMint,
        whitelistedNftAtaTraderA,
        whitelistedNftAtaTraderB,
        NOTwhitelistedNftMint,
        NOTwhitelistedNftAta,
      })
    );
  });

  it("inits swap/pool", async () => {
    //swap
    const {
      tx: { ixs, extraSigners },
    } = await swapSdk.initTSwap(TEST_PROVIDER.publicKey, tSwap);
    await buildAndSendTx(TEST_PROVIDER, ixs, extraSigners);

    const swapAcc = await swapSdk.fetchTSwap(tSwap.publicKey);
    expect(swapAcc.owner.toBase58()).to.be.eq(
      TEST_PROVIDER.publicKey.toBase58()
    );

    //pool
    const {
      tx: { ixs: poolIxs },
      poolPda,
    } = await swapSdk.initPool(
      tSwap.publicKey,
      traderA.publicKey,
      whitelist,
      poolConfig
    );
    pool = poolPda;
    await buildAndSendTx(TEST_PROVIDER, poolIxs, [traderA]);

    const poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.creator.toBase58()).to.eq(traderA.publicKey.toBase58());
  });

  it("deposits nft", async () => {
    //bad
    const {
      tx: { ixs: badIxs },
    } = await swapSdk.depositNft(
      tSwap.publicKey,
      whitelist,
      NOTwhitelistedNftMint,
      NOTwhitelistedNftAta,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await expect(
      buildAndSendTx(TEST_PROVIDER, badIxs, [traderA])
    ).to.be.rejectedWith("0x1770");

    //good
    const {
      tx: { ixs: goodIxs },
      receiptPda,
      escrowPda,
    } = await swapSdk.depositNft(
      tSwap.publicKey,
      whitelist,
      whitelistedNftMint,
      whitelistedNftAtaTraderA,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await buildAndSendTx(TEST_PROVIDER, goodIxs, [traderA]);

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(pool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(whitelistedNftMint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());
  });

  it("buys nft", async () => {
    const {
      tx: { ixs },
      receiptPda,
    } = await swapSdk.buyNft(
      tSwap.publicKey,
      whitelist,
      whitelistedNftMint,
      whitelistedNftAtaTraderB,
      traderA.publicKey,
      traderB.publicKey,
      poolConfig,
      proof
    );
    await buildAndSendTx(TEST_PROVIDER, ixs, [traderB]);

    // const receipt = await sdk.fetchReceipt(receiptPda);
    // expect(receipt).to.undefined;

    //todo check fee accs
  });
});

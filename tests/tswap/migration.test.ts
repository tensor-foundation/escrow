import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";
import { buildAndSendTx, swapSdk, TEST_PROVIDER, waitMS } from "../shared";
import {
  beforeHook,
  makeMintTwoAta,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testBuyNft,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";
import { testInitUpdateMintProof } from "../twhitelist/common";
import { TensorswapIDL_v0_2_0, TensorSwapSDK } from "../../src";
const { exec } = require("child_process");

const swapV2Sdk = new TensorSwapSDK({
  provider: TEST_PROVIDER,
  idl: TensorswapIDL_v0_2_0,
});

describe("migration test", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  it("creates v1 pool on TS2 -> migrates to v2 pool on TS3", async () => {
    ({ tswapPda: tswap } = await beforeHook());
    const [owner, buyer] = await makeNTraders(3);

    //make delta larger or we'll get a sell error
    const config = { ...tradePoolConfig, mmFeeBps: 2500 };

    const { mint, ata, otherAta } = await makeMintTwoAta(owner, buyer);
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeWhitelist([mint]);

    // --------------------------------------- INIT

    //create pool v1
    const {
      tx: { ixs },
      poolPda,
    } = await swapV2Sdk.initPoolV1({
      owner: owner.publicKey,
      whitelist,
      config,
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [owner],
    });
    const poolAcc = await swapV2Sdk.fetchPool(poolPda);
    expect(poolAcc.version).eq(1);
    console.log("pool v1 created");

    // --------------------------------------- DEPOSIT + TRADE

    //only nft and trade pools
    //deposit an nft (which creates a v1 receipt, since it's for a v1 pool)
    let {
      tx: { ixs: depositIxs },
    } = await swapV2Sdk.depositNft({
      whitelist,
      nftMint: wlNft.mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: wlNft.proof,
    });
    await buildAndSendTx({
      ixs: depositIxs,
      extraSigners: [owner],
    });

    //trade (mm only)
    //taker buys
    const {
      tx: { ixs: buyIxs },
    } = await swapV2Sdk.buyNft({
      whitelist,
      nftMint: wlNft.mint,
      nftBuyerAcc: otherAta,
      owner: owner.publicKey,
      buyer: buyer.publicKey,
      config,
      proof: wlNft.proof,
      maxPrice: new BN(LAMPORTS_PER_SOL),
    });
    await buildAndSendTx({
      ixs: buyIxs,
      extraSigners: [buyer],
    });
    console.log("bought");

    //taker sells back
    // Need to create mint proof first before being able to sell.
    await testInitUpdateMintProof({
      user: buyer,
      mint,
      whitelist,
      proof: wlNft.proof,
      expectedProofLen: Math.trunc(Math.log2(100)) + 1,
    });

    const {
      tx: { ixs: sellIxs },
    } = await swapV2Sdk.sellNft({
      type: "trade",
      whitelist,
      nftMint: mint,
      nftSellerAcc: otherAta,
      owner: owner.publicKey,
      seller: buyer.publicKey,
      config,
      proof: wlNft.proof,
      minPrice: new BN(LAMPORTS_PER_SOL),
    });
    await buildAndSendTx({
      ixs: sellIxs,
      extraSigners: [buyer],
    });
    console.log("deposit + trading done");

    // --------------------------------------- REALLOC

    const {
      tx: { ixs: reallocIxs },
    } = await swapV2Sdk.reallocPool({
      config,
      owner: owner.publicKey,
      tswapOwner: TEST_PROVIDER.publicKey,
      whitelist,
    });
    await buildAndSendTx({
      ixs: reallocIxs,
      extraSigners: [],
    });
    console.log("realloc done");

    //---------------------- DEPLOY V3

    const command = `
    solana program deploy ./target/deploy/tensorswap.so --url http://localhost:8899 --program-id ./target/deploy/tensorswap-keypair.json &&
    solana program show TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN --url http://localhost:8899
    `;

    await new Promise((resolve, _reject) =>
      exec(command, async (error: any, stdout: string, stderr: string) => {
        if (stderr) {
          console.log("ERR ❌", stderr);
        }
        console.log(stdout);
        resolve(undefined);
      })
    );

    // --------------------------------------- MIGRATE

    //migrate pool to v2
    const {
      tx: { ixs: ixsMigratePool },
      nftAuthPda,
      authSeed,
    } = await swapSdk.migratePoolV1ToV2({
      owner: owner.publicKey,
      tswapOwner: TEST_PROVIDER.publicKey,
      whitelist,
      config,
    });
    await buildAndSendTx({
      ixs: ixsMigratePool,
      extraSigners: [],
    });
    const poolAcc2 = await swapSdk.fetchPool(poolPda);
    console.log(poolAcc2);
    expect(poolAcc2.version).eq(2);
    expect(poolAcc2.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());

    const authAcc = await swapSdk.fetchNftAuthority(nftAuthPda);
    expect(authAcc.randomSeed).to.deep.eq(authSeed);
    expect(authAcc.pool.toBase58()).eq(poolPda.toBase58());

    //running again should fail
    await expect(
      buildAndSendTx({
        ixs: ixsMigratePool,
        extraSigners: [],
      })
    ).rejectedWith("0x0"); //nft_auth already in ude

    console.log("pool migrated to v2");

    //only nft and trade pools
    //migrate receipt to v2
    const {
      tx: { ixs: ixsMigrateReceipt },
      receiptPda,
    } = await swapSdk.migrateReceiptV1ToV2({
      owner: owner.publicKey,
      tswapOwner: TEST_PROVIDER.publicKey,
      whitelist,
      config,
      nftMint: mint,
    });
    await buildAndSendTx({
      ixs: ixsMigrateReceipt,
      extraSigners: [],
    });
    const receipt2 = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt2.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());

    await expect(
      buildAndSendTx({
        ixs: ixsMigrateReceipt,
        extraSigners: [],
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPool"));

    //test stats and MM fees for MM pool
    expect(poolAcc2.stats.takerBuyCount).eq(1);
    expect(poolAcc2.stats.takerSellCount).eq(1);
    expect(poolAcc2.stats.accumulatedMmProfit.toNumber()).eq(
      LAMPORTS_PER_SOL * 0.25
    );
    console.log("receipt migrated to v2");
  });
});

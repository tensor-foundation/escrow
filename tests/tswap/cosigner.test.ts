import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  buildAndSendTx,
  hexCode,
  swapSdk,
  testInitWLAuthority,
  TEST_PROVIDER,
} from "../shared";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  tradePoolConfig,
  TSWAP_CONFIG,
  TSWAP_FEE_PCT,
  WhitelistedNft,
} from "./common";
import { BN } from "bn.js";
import { LangErrorCode } from "@project-serum/anchor";
import { testInitUpdateMintProof } from "../twhitelist/common";

// Enables rejectedWith.
chai.use(chaiAsPromised);

describe("tswap cosigner", () => {
  let tswap: PublicKey;
  let cosignerKp: Keypair;
  let cosigner: PublicKey;

  let owner: Keypair;
  let buyer: Keypair;
  let seller: Keypair;
  let mintSell: PublicKey;
  let sellerAta: PublicKey;
  let ownerSellAta: PublicKey;
  let mintBuy: PublicKey;
  let buyerAta: PublicKey;
  let ownerBuyAta: PublicKey;
  let wlSell: WhitelistedNft;
  let wlBuy: WhitelistedNft;
  let whitelist: PublicKey;
  const config = tradePoolConfig;

  const testWithWithoutCosigner = async ({
    ixs,
    extraSigners = [],
    checkFakeCosigner = true,
  }: {
    ixs: TransactionInstruction[];
    checkFakeCosigner?: boolean;
    extraSigners?: Keypair[];
  }) => {
    // Test faking a cosigner.
    // if (checkFakeCosigner) {
    //   const fakeCosigner = Keypair.generate();
    //   const fakeCosignerIxs = ixs.map((ix) => ({
    //     ...ix,
    //     keys: ix.keys.map((k) =>
    //       k.pubkey.equals(cosigner)
    //         ? { ...k, pubkey: fakeCosigner.publicKey }
    //         : k
    //     ),
    //   }));
    //   await expect(
    //     buildAndSendTx({
    //       ixs: fakeCosignerIxs,
    //       extraSigners: [...extraSigners, fakeCosigner],
    //     })
    //   ).rejectedWith(hexCode(LangErrorCode.ConstraintHasOne));
    // }

    // Without cosigner signing off works now.
    return await buildAndSendTx({
      ixs,
      extraSigners,
    });

    // await expect(buildAndSendTx({ ixs, extraSigners })).rejectedWith(
    //   "Signature verification failed"
    // );

    // // Succeeds now when true cosigner signs off.
    // return await buildAndSendTx({
    //   ixs,
    //   extraSigners: [...extraSigners, cosignerKp],
    // });
  };

  before(async () => {
    // WL authority
    await testInitWLAuthority();

    cosignerKp = Keypair.generate();
    cosigner = cosignerKp.publicKey;

    // Initialize tswap.
    const {
      tx: { ixs },
      tswapPda,
    } = await swapSdk.initUpdateTSwap({
      owner: TEST_PROVIDER.publicKey,
      newCosigner: TEST_PROVIDER.publicKey,
      config: TSWAP_CONFIG,
      cosigner,
    });
    tswap = tswapPda;
    // Can't check fake cosigner failing since cosigner has not been init'ed yet.
    // await testWithWithoutCosigner({ ixs, checkFakeCosigner: false });
    await buildAndSendTx({ ixs, extraSigners: [cosignerKp] });

    // Initialize a bunch of addn accts.
    [owner, seller, buyer] = await makeNTraders(3);
    ({
      mint: mintSell,
      ata: sellerAta,
      otherAta: ownerSellAta,
    } = await makeMintTwoAta(seller, owner));
    ({
      mint: mintBuy,
      ata: ownerBuyAta,
      otherAta: buyerAta,
    } = await makeMintTwoAta(owner, buyer));
    ({
      proofs: [wlSell, wlBuy],
      whitelist,
    } = await makeProofWhitelist([mintSell, mintBuy]));

    // Init pool.
    // Needs to go here for other txs.
    {
      const {
        tx: { ixs },
      } = await swapSdk.initPool({
        owner: owner.publicKey,
        whitelist,
        config,
      });
      await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
    }

    // Deposit NFT
    // Needs to go here for buy tx.
    {
      const {
        tx: { ixs },
      } = await swapSdk.depositNft({
        owner: owner.publicKey,
        whitelist,
        config,
        nftSource: ownerBuyAta,
        nftMint: wlBuy.mint,
        proof: wlBuy.proof,
      });
      await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
    }

    // Deposit SOL
    // Needs to go here for sell tx.
    {
      const {
        tx: { ixs },
      } = await swapSdk.depositSol({
        owner: owner.publicKey,
        whitelist,
        config,
        lamports: new BN(LAMPORTS_PER_SOL - 1234),
      });
      await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
    }
  });

  it("buy nft cosign", async () => {
    // Buy NFT.
    const {
      tx: { ixs },
    } = await swapSdk.buyNft({
      owner: owner.publicKey,
      whitelist,
      nftMint: mintBuy,
      config,
      buyer: buyer.publicKey,
      nftBuyerAcc: buyerAta,
      maxPrice: new BN(LAMPORTS_PER_SOL),
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [buyer] });
  });

  it("sell nft cosign", async () => {
    // Sell NFT.

    // Need to create mint proof first before being able to sell.
    await testInitUpdateMintProof({
      user: seller,
      mint: mintSell,
      whitelist,
      proof: wlSell.proof,
    });

    const {
      tx: { ixs },
    } = await swapSdk.sellNft({
      type: "trade",
      owner: owner.publicKey,
      whitelist,
      nftMint: mintSell,
      config,
      seller: seller.publicKey,
      nftSellerAcc: sellerAta,
      minPrice: new BN(Math.trunc((LAMPORTS_PER_SOL - 1234) * 0.97)),
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [seller] });
  });

  it("withdraw nft cosign", async () => {
    // Withdraw NFT
    const {
      tx: { ixs },
    } = await swapSdk.withdrawNft({
      owner: owner.publicKey,
      whitelist,
      config,
      nftDest: ownerSellAta,
      nftMint: wlSell.mint,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });

  it("withdraw sol cosign", async () => {
    // Withdraw SOL
    const {
      tx: { ixs },
    } = await swapSdk.withdrawSol({
      owner: owner.publicKey,
      whitelist,
      config,
      lamports: new BN(LAMPORTS_PER_SOL * (1 - TSWAP_FEE_PCT)),
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });

  it("close pool cosign", async () => {
    // Close pool.
    const {
      tx: { ixs },
    } = await swapSdk.closePool({
      owner: owner.publicKey,
      whitelist,
      config,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });
});

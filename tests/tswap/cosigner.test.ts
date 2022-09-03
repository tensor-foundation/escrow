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
  makeWhitelist,
  tradePoolConfig,
  TSWAP_FEE,
  WhitelistedNft,
} from "./common";
import { BN } from "bn.js";
import { LangErrorCode } from "@project-serum/anchor";

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
    if (checkFakeCosigner) {
      const fakeCosigner = Keypair.generate();
      const fakeCosignerIxs = ixs.map((ix) => ({
        ...ix,
        keys: ix.keys.map((k) =>
          k.pubkey.equals(cosigner)
            ? { ...k, pubkey: fakeCosigner.publicKey }
            : k
        ),
      }));
      await expect(
        buildAndSendTx({
          ixs: fakeCosignerIxs,
          extraSigners: [...extraSigners, fakeCosigner],
        })
      ).rejectedWith(hexCode(LangErrorCode.ConstraintHasOne));
    }

    // Without cosigner signing off.
    await expect(buildAndSendTx({ ixs, extraSigners })).rejectedWith(
      "Signature verification failed"
    );

    // Succeeds now when true cosigner signs off.
    return await buildAndSendTx({
      ixs,
      extraSigners: [...extraSigners, cosignerKp],
    });
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
      cosigner,
    });
    tswap = tswapPda;
    // Can't check fake cosigner failing since cosigner has not been init'ed yet.
    await testWithWithoutCosigner({ ixs, checkFakeCosigner: false });

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
    } = await makeWhitelist([mintSell, mintBuy]));
  });

  it("init pool cosign", async () => {
    // Init pool.
    const {
      tx: { ixs },
    } = await swapSdk.initPool({
      owner: owner.publicKey,
      whitelist,
      config,
      cosigner,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });

  it("deposit nft cosign", async () => {
    // Deposit NFT
    const {
      tx: { ixs },
    } = await swapSdk.depositNft({
      owner: owner.publicKey,
      whitelist,
      config,
      nftSource: ownerBuyAta,
      nftMint: wlBuy.mint,
      proof: wlBuy.proof,
      cosigner,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });

  it("deposit sol cosign", async () => {
    // Deposit SOL
    const {
      tx: { ixs },
    } = await swapSdk.depositSol({
      owner: owner.publicKey,
      whitelist,
      config,
      lamports: new BN(LAMPORTS_PER_SOL - 1234),
      cosigner,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });

  it("buy nft cosign", async () => {
    // Buy NFT.
    const {
      tx: { ixs },
    } = await swapSdk.buyNft({
      owner: owner.publicKey,
      whitelist,
      nftMint: mintBuy,
      proof: wlBuy.proof,
      config,
      buyer: buyer.publicKey,
      nftBuyerAcc: buyerAta,
      maxPrice: new BN(LAMPORTS_PER_SOL),
      cosigner,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [buyer] });
  });

  it("sell nft cosign", async () => {
    // Sell NFT.
    const {
      tx: { ixs },
    } = await swapSdk.sellNft({
      type: "trade",
      owner: owner.publicKey,
      whitelist,
      nftMint: mintSell,
      proof: wlSell.proof,
      config,
      seller: seller.publicKey,
      nftSellerAcc: sellerAta,
      minPrice: new BN(LAMPORTS_PER_SOL - 1234),
      cosigner,
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
      cosigner,
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
      lamports: new BN(LAMPORTS_PER_SOL * (1 - TSWAP_FEE)),
      cosigner,
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
      cosigner,
    });
    await testWithWithoutCosigner({ ixs, extraSigners: [owner] });
  });
});

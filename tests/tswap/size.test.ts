import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { simulateTxTable, swapSdk, wlSdk } from "../shared";
import {
  beforeHook,
  createAndFundAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testMakePool,
  TEST_COSIGNER,
} from "./common";

// This is a useful test to quickly get tx size info
describe.skip("tx sizer", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  it("tx sizer", async () => {
    const [owner, seller, buyer] = await makeNTraders({ n: 3 });
    const config = nftPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps: 10,
      creators,
    });

    const {
      whitelist,
      proofs: [wlNft],
      // Long proof!
    } = await makeProofWhitelist([mint], 20000);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    console.log("proof len", wlNft.proof.length);

    // --------------------------------------- init / close

    const {
      tx: { ixs: initIxs },
    } = await swapSdk.initPool({
      owner: owner.publicKey,
      whitelist,
      config,
    });

    const {
      tx: { ixs: closeIxs },
    } = await swapSdk.closePool({
      owner: owner.publicKey,
      whitelist,
      config,
    });

    // --------------------------------------- deposit / withdraw

    const {
      tx: { ixs: depositSolIxs },
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(123),
    });

    const {
      tx: { ixs: withdrawSolIxs },
    } = await swapSdk.withdrawSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(123),
    });

    let {
      tx: { ixs: depositNftIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

    let {
      tx: { ixs: withdrawNftIxs },
    } = await swapSdk.withdrawNft({
      whitelist,
      nftMint: mint,
      owner: owner.publicKey,
      config,
      nftDest: ata,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

    // --------------------------------------- buy sell

    const {
      tx: { ixs: proofIxs },
      mintProofPda,
    } = await wlSdk.initUpdateMintProof({
      user: owner.publicKey,
      mint,
      whitelist,
      proof: wlNft.proof,
    });

    const {
      tx: { ixs: sellIxs },
    } = await swapSdk.sellNft({
      type: "token",
      whitelist,
      nftMint: mint,
      nftSellerAcc: ata,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      minPrice: new BN(123),
      cosigner: TEST_COSIGNER.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

    const {
      tx: { ixs: buyIxs },
    } = await swapSdk.buyNft({
      whitelist,
      nftMint: wlNft.mint,
      nftBuyerAcc: ata,
      owner: owner.publicKey,
      buyer: buyer.publicKey,
      config,
      maxPrice: new BN(123),
      tokenProgram: TOKEN_PROGRAM_ID,
    });

    // --------------------------------------- margin

    const {
      tx: { ixs: initMarginIxs },
    } = await swapSdk.initMarginAcc({
      owner: owner.publicKey,
      name: [],
    });

    const {
      tx: { ixs: closeMarginIxs },
    } = await swapSdk.closeMarginAcc({
      owner: owner.publicKey,
      marginNr: 0,
    });

    const {
      tx: { ixs: depositMarginIxs },
    } = await swapSdk.depositMarginAcc({
      owner: owner.publicKey,
      marginNr: 0,
      amount: new BN(Math.round(0)),
    });

    const {
      tx: { ixs: withdrawMarginIxs },
    } = await swapSdk.withdrawMarginAcc({
      owner: owner.publicKey,
      marginNr: 0,
      amount: new BN(Math.round(0)),
    });

    const {
      tx: { ixs: attachMarginIxs },
    } = await swapSdk.attachPoolMargin({
      config,
      marginNr: 0,
      owner: owner.publicKey,
      whitelist,
    });

    const {
      tx: { ixs: detachMarginIxs },
    } = await swapSdk.detachPoolMargin({
      config,
      marginNr: 0,
      owner: owner.publicKey,
      whitelist,
    });

    // --------------------------------------- play

    //init + deposit sol
    // await simulateTxTable([...initIxs, ...depositSolIxs]); //571 √

    //mute - we're already withdrawing sol on close
    // await simulateTxTable([...closeIxs, ...depositSolIxs]);

    //5 creators + 100 tree = 1271
    //5 creators + 1k tree = 1367
    //5 creators + 10k tree = 1495
    // await simulateTxTable([...proofIxs, ...sellIxs]); //X

    // await simulateTxTable([
    //   ...initMarginIxs,
    //   ...initIxs,
    //   ...attachMarginIxs,
    //   ...depositMarginIxs,
    // ]); // 636

    // await simulateTxTable([...detachMarginIxs, ...closeIxs]); // 570

    // await simulateTxTable([...depositNftIxs, ...depositNftIxs]); // X even 2 don't fit it due to proofs

    // await simulateTxTable(
    //   await Promise.all(
    //     [1, 2, 3, 4].map(async (_) => {
    //       const { mint, ata } = await createAndFundATA(
    //         owner,
    //         undefined,
    //         10,
    //         creators
    //       );
    //
    //       let {
    //         tx: { ixs: withdrawNftIxs },
    //       } = await swapSdk.withdrawNft({
    //         whitelist,
    //         nftMint: mint,
    //         owner: owner.publicKey,
    //         config,
    //         nftDest: ata,
    //       });
    //
    //       return withdrawNftIxs[0];
    //     })
    //   )
    // ); // √1170

    // if get rid of sol escrow - can do 10k mints
    // if get rid of sol escrow + whitelist - can do 20k mints
    await simulateTxTable([...initIxs, ...depositNftIxs]); // X
  });
});

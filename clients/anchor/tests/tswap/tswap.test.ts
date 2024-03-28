import { ACCOUNT_SIZE } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getRentSync } from "@tensor-hq/tensor-common";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  APPROX_AUTHORITY_RENT,
  APPROX_DEPOSIT_RECEIPT_RENT,
  APPROX_MINT_PROOF_RENT,
  APPROX_NFT_AUTHORITY_RENT,
  APPROX_POOL_RENT,
  APPROX_SINGLE_LISTING_RENT,
  APPROX_SOL_ESCROW_RENT,
  APPROX_SOL_MARGIN_RENT,
  APPROX_TSWAP_RENT,
  APPROX_WHITELIST_RENT,
} from "../../src";
import { APPROX_BID_STATE_RENT } from "../../src/tensor_bid";
import {
  bidSdk,
  buildAndSendTx,
  COMMON_INSUFFICIENT_FUNDS_ERR,
  createTokenAuthorizationRules,
  getLamports,
  swapSdk,
  TEST_PROVIDER,
  withLamports,
  wlSdk,
} from "../shared";
import {
  beforeHook,
  createFundedWallet,
  makeNTraders,
  MAKER_REBATE_PCT,
  TAKER_FEE_PCT,
  testMakePoolBuyNft,
  TEST_COSIGNER,
  tradePoolConfig,
  TSWAP_CONFIG,
  fundTestWallets,
} from "./common";

// Enables rejectedWith.
chai.use(chaiAsPromised);

describe("tswap init_update_tswap", () => {
  it("properly checks for owner on further updates", async () => {
    // funds the test wallet
    await fundTestWallets();

    const initialOwner = await createFundedWallet();
    const {
      tx: { ixs },
      tswapPda: tswap,
    } = await swapSdk.initUpdateTSwap({
      owner: initialOwner.publicKey,
      newOwner: initialOwner.publicKey,
      cosigner: initialOwner.publicKey,
      config: TSWAP_CONFIG,
    });
    await buildAndSendTx({ ixs, extraSigners: [initialOwner] });

    let tswapAcc = await swapSdk.fetchTSwap(tswap);
    expect(tswapAcc.owner.toBase58()).eq(initialOwner.publicKey.toBase58());
    expect(tswapAcc.cosigner.toBase58()).eq(initialOwner.publicKey.toBase58());
    expect(tswapAcc.feeVault.toBase58()).eq(tswap.toBase58());

    const randomOwner = await createFundedWallet();
    const randomFeeAcct = Keypair.generate().publicKey;
    const randomCosigner = Keypair.generate();

    const {
      tx: { ixs: fakeIxs },
    } = await swapSdk.initUpdateTSwap({
      owner: randomOwner.publicKey,
      newOwner: randomOwner.publicKey,
      cosigner: randomCosigner.publicKey,
      config: TSWAP_CONFIG,
    });
    await expect(
      buildAndSendTx({
        ixs: fakeIxs,
        extraSigners: [randomOwner, randomCosigner],
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("BadOwner"));

    // Update cosigner + owner works.
    const {
      tx: { ixs: goodIxs },
    } = await swapSdk.initUpdateTSwap({
      owner: initialOwner.publicKey,
      newOwner: randomOwner.publicKey,
      feeVault: randomFeeAcct,
      cosigner: randomCosigner.publicKey,
      config: TSWAP_CONFIG,
    });
    await buildAndSendTx({
      ixs: goodIxs,
      extraSigners: [initialOwner, randomCosigner, randomOwner],
    });
    tswapAcc = await swapSdk.fetchTSwap(tswap);
    expect(tswapAcc.owner.toBase58()).eq(randomOwner.publicKey.toBase58());
    expect(tswapAcc.cosigner.toBase58()).eq(
      randomCosigner.publicKey.toBase58()
    );
    expect(tswapAcc.feeVault.toBase58()).eq(randomFeeAcct.toBase58());

    // revert it back for other tests to work ok (becomes an issue if run on the same machine)
    const {
      tx: { ixs: revertIxs },
    } = await swapSdk.initUpdateTSwap({
      owner: randomOwner.publicKey,
      newOwner: TEST_PROVIDER.publicKey,
      config: TSWAP_CONFIG,
      cosigner: randomCosigner.publicKey,
    });

    await buildAndSendTx({
      ixs: revertIxs,
      extraSigners: [randomOwner, randomCosigner],
    });
  });

  it("withdraws fees ok", async () => {
    const { tswapPda: tswap } = await beforeHook();
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    const ruleSetAddr = await createTokenAuthorizationRules({ payer: traderA });

    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: tradePoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        programmable: true,
        ruleSetAddr,
        creators,
        royaltyBps: 1000,
      });
    }

    //withdraws all fees earned
    const destination = Keypair.generate();
    const earnedFee = new BN(
      LAMPORTS_PER_SOL * (TAKER_FEE_PCT - MAKER_REBATE_PCT) * 2
    );
    const {
      tx: { ixs },
    } = await swapSdk.withdrawTswapFee({
      lamports: earnedFee,
      destination: destination.publicKey,
      cosigner: TEST_COSIGNER.publicKey,
      owner: TEST_PROVIDER.publicKey,
    });

    await withLamports({ prevTswap: tswap }, async ({ prevTswap }) => {
      await buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] });

      const postTswap = await getLamports(tswap);
      const postDest = await getLamports(destination.publicKey);

      await expect(postTswap).to.eq(prevTswap! - earnedFee.toNumber());
      await expect(postTswap).approximately(await swapSdk.getTswapRent(), 1);
      await expect(postDest).to.eq(earnedFee.toNumber());
    });

    //fails to withdraw more
    const {
      tx: { ixs: ixsTwoLamports },
    } = await swapSdk.withdrawTswapFee({
      lamports: new BN(2),
      destination: destination.publicKey,
      cosigner: TEST_COSIGNER.publicKey,
      owner: TEST_PROVIDER.publicKey,
    });
    await expect(
      buildAndSendTx({ ixs: ixsTwoLamports, extraSigners: [TEST_COSIGNER] })
    ).to.be.rejectedWith(COMMON_INSUFFICIENT_FUNDS_ERR);
  });

  // it("withdraws spl token ok", async () => {
  //   const { tswapPda: tswap } = await beforeHook();
  //   const [owner, other] = await makeNTraders(2);
  //
  //   // bonk set-up
  //   const bonkToken = await createMint(
  //     TEST_PROVIDER.connection,
  //     owner,
  //     owner.publicKey,
  //     owner.publicKey,
  //     4
  //   );
  //
  //   // Bonk ATA controlled by gem farm
  //   const tswapControlledBothSplAccount =
  //     await getOrCreateAssociatedTokenAccount(
  //       TEST_PROVIDER.connection,
  //       owner,
  //       bonkToken,
  //       tswap,
  //       true
  //     );
  //
  //   await mintTo(
  //     TEST_PROVIDER.connection,
  //     owner,
  //     bonkToken,
  //     tswapControlledBothSplAccount.address,
  //     owner,
  //     10
  //   );
  //   expect(
  //     (
  //       await TEST_PROVIDER.connection.getTokenAccountBalance(
  //         tswapControlledBothSplAccount.address
  //       )
  //     ).value.amount
  //   ).to.eq("10");
  //
  //   const {
  //     tx: { ixs },
  //     splDest,
  //   } = await swapSdk.withdrawTswapOwnedSpl({
  //     mint: bonkToken,
  //     amount: new BN(10),
  //     cosigner: TEST_COSIGNER.publicKey,
  //     owner: TEST_PROVIDER.publicKey,
  //   });
  //
  //   await buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] });
  //   expect(
  //     (
  //       await TEST_PROVIDER.connection.getTokenAccountBalance(
  //         tswapControlledBothSplAccount.address
  //       )
  //     ).value.amount
  //   ).to.eq("0");
  //   expect(
  //     (await TEST_PROVIDER.connection.getTokenAccountBalance(splDest)).value
  //       .amount
  //   ).to.eq("10");
  //
  //   //fails to withdraw more
  //   await expect(
  //     buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] })
  //   ).to.be.rejectedWith("0x1");
  // });

  it("sizes are correct", async () => {
    //tbid
    expect(await bidSdk.getBidStateRent()).to.eq(APPROX_BID_STATE_RENT);

    //tlist
    expect(await wlSdk.getAuthorityRent()).to.eq(APPROX_AUTHORITY_RENT);
    expect(await wlSdk.getWhitelistRent()).to.eq(APPROX_WHITELIST_RENT);
    expect(await wlSdk.getMintProofRent()).to.eq(APPROX_MINT_PROOF_RENT);

    //tswap
    expect(await swapSdk.getTswapRent()).to.eq(APPROX_TSWAP_RENT);
    expect(await swapSdk.getPoolRent()).to.eq(APPROX_POOL_RENT);
    expect(await swapSdk.getMarginAccountRent()).to.eq(APPROX_SOL_MARGIN_RENT);
    expect(await swapSdk.getSingleListingRent()).to.eq(
      APPROX_SINGLE_LISTING_RENT
    );
    expect(await swapSdk.getNftDepositReceiptRent()).to.eq(
      APPROX_DEPOSIT_RECEIPT_RENT
    );
    expect(await swapSdk.getNftAuthorityRent()).to.eq(
      APPROX_NFT_AUTHORITY_RENT
    );
    expect(await swapSdk.getSolEscrowRent()).to.eq(APPROX_SOL_ESCROW_RENT);
    expect(await swapSdk.getTokenAcctRent()).to.eq(getRentSync(ACCOUNT_SIZE));
  });
});

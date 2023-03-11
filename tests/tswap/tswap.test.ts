import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import {
  swapSdk,
  buildAndSendTx,
  TEST_PROVIDER,
  createTokenAuthorizationRules,
  withLamports,
  getLamports,
} from "../shared";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  beforeHook,
  createFundedWallet,
  makeMintTwoAta,
  makeNTraders,
  TEST_COSIGNER,
  testMakePoolBuyNft,
  tradePoolConfig,
  TSWAP_CONFIG,
  TSWAP_FEE_PCT,
} from "./common";
import BN from "bn.js";
import {
  createAssociatedTokenAccountInstruction,
  createMint,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// Enables rejectedWith.
chai.use(chaiAsPromised);

describe("tswap init_update_tswap", () => {
  it("properly checks for owner on further updates", async () => {
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
      extraSigners: [initialOwner, randomCosigner],
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
    const [traderA, traderB] = await makeNTraders(2);

    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      traderA
    );

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
    const earnedFee = new BN(LAMPORTS_PER_SOL * TSWAP_FEE_PCT * 2);
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
      await expect(postTswap).to.eq(await swapSdk.getTswapRent());
      await expect(postDest).to.eq(earnedFee.toNumber());
    });

    //fails to withdraw more
    const {
      tx: { ixs: ixsOneLamport },
    } = await swapSdk.withdrawTswapFee({
      lamports: new BN(1),
      destination: destination.publicKey,
      cosigner: TEST_COSIGNER.publicKey,
      owner: TEST_PROVIDER.publicKey,
    });
    await expect(
      buildAndSendTx({ ixs: ixsOneLamport, extraSigners: [TEST_COSIGNER] })
    ).to.be.rejectedWith(
      swapSdk.getErrorCodeHex("InsufficientTswapAccBalance")
    );
  });

  it("withdraws spl token ok", async () => {
    const { tswapPda: tswap } = await beforeHook();
    const [owner, other] = await makeNTraders(2);

    // bonk set-up
    const bonkToken = await createMint(
      TEST_PROVIDER.connection,
      owner,
      owner.publicKey,
      owner.publicKey,
      4
    );

    // Bonk ATA controlled by gem farm
    const tswapControlledBothSplAccount =
      await getOrCreateAssociatedTokenAccount(
        TEST_PROVIDER.connection,
        owner,
        bonkToken,
        tswap,
        true
      );

    await mintTo(
      TEST_PROVIDER.connection,
      owner,
      bonkToken,
      tswapControlledBothSplAccount.address,
      owner,
      10
    );
    expect(
      (
        await TEST_PROVIDER.connection.getTokenAccountBalance(
          tswapControlledBothSplAccount.address
        )
      ).value.amount
    ).to.eq("10");

    const {
      tx: { ixs },
      splDest,
    } = await swapSdk.withdrawTswapOwnedSpl({
      mint: bonkToken,
      amount: new BN(10),
      cosigner: TEST_COSIGNER.publicKey,
      owner: TEST_PROVIDER.publicKey,
    });

    await buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] });
    expect(
      (
        await TEST_PROVIDER.connection.getTokenAccountBalance(
          tswapControlledBothSplAccount.address
        )
      ).value.amount
    ).to.eq("0");
    expect(
      (await TEST_PROVIDER.connection.getTokenAccountBalance(splDest)).value
        .amount
    ).to.eq("10");

    //fails to withdraw more
    await expect(
      buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] })
    ).to.be.rejectedWith("0x1");
  });
});

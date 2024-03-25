import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";
import { castPoolTypeAnchor, PoolType, TensorWhitelistSDK } from "../../src";
import {
  buildAndSendTx,
  createTokenAuthorizationRules,
  getLamports, COMMON_CREATOR_MISMATCH_ERR,
  PoolConfigAnchor,
  swapSdk, COMMON_INSUFFICIENT_FUNDS_ERR,
} from "../shared";
import {
  adjustSellMinLamports,
  beforeHook,
  defaultSellExpectedLamports,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  MAKER_REBATE_PCT,
  testAttachPoolToMargin,
  testClosePool,
  testDepositIntoMargin,
  testDetachPoolFromMargin,
  testEditPool,
  testMakeMargin,
  testMakePool,
  testSellNft,
  testWithdrawFromMargin,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("margin account", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("inits > deposits > withdraws > closes margin acc", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const { marginPda, marginNr, marginRent } = await testMakeMargin({ owner });

    //deposit
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL,
    });

    //withdraw
    await testWithdrawFromMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL,
    });

    //try withdraw into rent, should fail
    await expect(
      testWithdrawFromMargin({
        owner,
        marginNr,
        marginPda,
        amount: 1,
      })
    ).to.be.rejectedWith(
      COMMON_INSUFFICIENT_FUNDS_ERR
    );

    //deposit again, so we can see if it's withdrawn correctly
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL,
    });

    const lamports = await getLamports(marginPda);
    expect(lamports).to.eq(marginRent + LAMPORTS_PER_SOL);

    //close and check amount move out correctly
    const preCloseOwnerBalance = await getLamports(owner.publicKey);
    const {
      tx: { ixs: ixsClose },
    } = await swapSdk.closeMarginAcc({
      owner: owner.publicKey,
      marginNr: marginNr,
    });
    await buildAndSendTx({
      ixs: ixsClose,
      extraSigners: [owner],
    });
    const postCloseOwnerBalance = await getLamports(owner.publicKey);
    expect(postCloseOwnerBalance).to.eq(preCloseOwnerBalance! + lamports!);
  });

  it("creates multiple margin accs", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const name = "hello_world";
    const nameBuffer = TensorWhitelistSDK.nameToBuffer(name);

    //1
    const { ixs, marginNr } = await testMakeMargin({ owner });

    //try 1 again, should fail
    await expect(
      buildAndSendTx({
        ixs,
        extraSigners: [owner],
      })
    ).to.be.rejectedWith("0x0");

    //2
    const { marginNr: marginNr2 } = await testMakeMargin({ owner });
    expect(marginNr2).to.eq(marginNr + 1);
  });

  // TODO: temp while figure out space issue
  // it("multiple sniping orders all successfully withdrawing from same margin acc", async () => {
  //   const [owner, seller] = await makeNTraders(2);
  //
  //   //create margin acc
  //   const { marginNr, marginPda, marginRent } = await testMakeMargin({ owner });
  //
  //   //deposit into it once, but for 3x orders
  //   await testDepositIntoMargin({
  //     owner,
  //     marginNr,
  //     marginPda,
  //     amount: calcSnipeBidWithFee(LAMPORTS_PER_SOL) * 3,
  //   });
  //
  //   const config = tokenPoolConfig;
  //   const creators = Array(5)
  //     .fill(null)
  //     .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
  //
  //   //prices
  //   const bidAmount = LAMPORTS_PER_SOL;
  //   const snipeAmount = bidAmount;
  //   const fullBidAmount = calcSnipeBidWithFee(bidAmount);
  //
  //   //create and execute 3 marginated bids, all pulling from the same account
  //   let i = 1;
  //   for (const freeze of [true, false, true]) {
  //     const { mint, ata } = await makeMintTwoAta(seller, owner, 1000, creators);
  //     const {
  //       proofs: [wlNft],
  //       whitelist,
  //     } = await makeProofWhitelist([mint], 100);
  //     const { poolPda } = await testMakePool({
  //       tswap,
  //       owner,
  //       whitelist,
  //       config,
  //       orderType: OrderType.Sniping,
  //     });
  //     await testAttachPoolToMargin({
  //       config,
  //       marginNr,
  //       owner,
  //       whitelist,
  //       poolsAttached: i,
  //     });
  //     i++;
  //
  //     //freeze it
  //     if (freeze) {
  //       await testSetFreeze({
  //         owner: owner.publicKey,
  //         config,
  //         marginNr,
  //         whitelist,
  //         fullBidAmount,
  //         freeze: true,
  //         skipMarginBalanceCheck: true,
  //       });
  //     }
  //
  //     await testTakeSnipe({
  //       actualSnipeAmount: snipeAmount,
  //       initialBidAmount: bidAmount,
  //       ata,
  //       config,
  //       marginNr,
  //       wlNft,
  //       owner,
  //       poolPda,
  //       seller,
  //       whitelist,
  //       frozen: freeze,
  //     });
  //   }
  //
  //   const marginBalance = await getLamports(marginPda);
  //   expect(marginBalance).to.eq(await swapSdk.getMarginAccountRent());
  // });

  it("multiple normal orders all successfully withdrawing from same margin acc (token and trade)", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    for (const config of [
      tokenPoolConfig,
      { ...tradePoolConfig, mmFeeBps: 10_00 },
    ]) {
      const isToken = castPoolTypeAnchor(config.poolType) === PoolType.Token;
      const coefs = [1, 0.6, 0.5];
      const amount =
        (1 + 0.6 + 0.5) * LAMPORTS_PER_SOL -
        (isToken ? 0 : coefs.length * 1234);

      //create and execute 2 marginated bids, all pulling from the same account
      let i = 1;

      //create margin acc
      const { marginNr, marginPda, marginRent } = await testMakeMargin({
        owner,
      });

      //deposit into it once, but for 3x orders
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount,
      });

      for (const coef of coefs) {
        const creators = Array(5)
          .fill(null)
          .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

        const config2 = {
          ...config,
          startingPrice: new BN(coef * LAMPORTS_PER_SOL),
        };
        const { mint, ata } = await makeMintTwoAta({
          owner: seller,
          other: owner,
          royaltyBps: 1000,
          creators,
        });
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint], 100);
        const { poolPda, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          whitelist,
          config: config2,
          // orderType: OrderType.Sniping, //<-- normal order!
        });
        await testAttachPoolToMargin({
          config: config2,
          marginNr,
          owner,
          whitelist,
          poolsAttached: i,
        });
        i++;

        const expectedLamports = defaultSellExpectedLamports(
          isToken,
          coef * LAMPORTS_PER_SOL
        );
        await testSellNft({
          wlNft,
          ata,
          config: config2,
          expectedLamports,
          minLamports: isToken
            ? undefined
            : adjustSellMinLamports(
                isToken,
                expectedLamports,
                config.mmFeeBps!
              ) - 10, //margin of safety for rounding
          owner,
          poolPda,
          sellType: castPoolTypeAnchor(config.poolType)
            .toString()
            .toLowerCase() as "trade" | "token",
          seller,
          whitelist,
          marginNr,
          royaltyBps: 1000,
          creators,
          nftAuthPda,
          lookupTableAccount, //<-- make it a v0
        });
      }

      const marginBalance = await getLamports(marginPda);
      expect(marginBalance).approximately(
        (await swapSdk.getMarginAccountRent()) +
          (isToken ? 0 : (amount * config.mmFeeBps!) / 100_00) +
          amount * MAKER_REBATE_PCT,
        10
      );
    }
  });

  //we have tests testing each individually but not together
  //this one is especially important coz we're passing in 7 extra accounts: cosigner, margin, 5 creators
  it("cosigned + marginated sell now works for edited pool", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr, marginPda, marginRent } = await testMakeMargin({ owner });

    //deposit into it once, but for 3x orders
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL * (1 + 0.6 + 0.5),
    });

    const config = tokenPoolConfig;

    let totalRebate = 0;

    //create and execute 3 marginated bids, all pulling from the same account
    let i = 1;
    for (const coef of [1, 0.6, 0.5]) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

      const config2 = {
        ...config,
        startingPrice: new BN(coef * LAMPORTS_PER_SOL),
      };
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 1000,
        creators,
      });
      const {
        proofs: [wlNft],
        whitelist,
      } = await makeProofWhitelist([mint], 100);
      const { poolPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config: config2,
        // orderType: OrderType.Sniping, //<-- normal order!
        isCosigned: true,
      });
      await testAttachPoolToMargin({
        config: config2,
        marginNr,
        owner,
        whitelist,
        poolsAttached: i,
      });
      i++;

      const config3 = {
        ...config2,
        delta: new BN(123),
      };
      const { newPoolPda } = await testEditPool({
        tswap,
        owner,
        newConfig: config3,
        oldConfig: config2,
        whitelist,
      });

      await testSellNft({
        wlNft,
        ata,
        config: config3,
        expectedLamports: coef * LAMPORTS_PER_SOL,
        owner,
        poolPda: newPoolPda,
        sellType: "token",
        seller,
        whitelist,
        marginNr,
        royaltyBps: 1000,
        creators,
        isCosigned: true,
        lookupTableAccount, //<-- make it a v0
      });

      totalRebate += coef * LAMPORTS_PER_SOL * MAKER_REBATE_PCT;
    }

    const marginBalance = await getLamports(marginPda);
    expect(marginBalance).to.eq(
      (await swapSdk.getMarginAccountRent()) + totalRebate
    );
  });

  it("correctly handles pool count", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr, marginPda, marginRent } = await testMakeMargin({ owner });

    //deposit into it once, but for 3x orders
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL * 3,
    });

    const config = tokenPoolConfig;

    const storedOrderData: {
      whitelist: PublicKey;
      config2: PoolConfigAnchor;
    }[] = [];

    //create and execute 3 marginated bids, all pulling from the same account
    for (let i = 0; i < 3; i++) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

      const config2 = {
        ...config,
        startingPrice: new BN(LAMPORTS_PER_SOL),
      };
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 1000,
        creators,
      });
      const {
        proofs: [wlNft],
        whitelist,
      } = await makeProofWhitelist([mint], 100);
      const { poolPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config: config2,
      });
      await testAttachPoolToMargin({
        config: config2,
        marginNr,
        owner,
        whitelist,
        poolsAttached: i + 1,
      });

      await testSellNft({
        wlNft,
        ata,
        config: config2,
        expectedLamports: LAMPORTS_PER_SOL,
        owner,
        poolPda,
        sellType: "token",
        seller,
        whitelist,
        marginNr,
        royaltyBps: 1000,
        creators,
        lookupTableAccount, //<-- make it a v0
      });

      storedOrderData.push({ config2, whitelist });
    }

    //try to close margin, should fail coz pools open
    const {
      tx: { ixs: ixsClose },
    } = await swapSdk.closeMarginAcc({
      owner: owner.publicKey,
      marginNr: marginNr,
    });
    await expect(
      buildAndSendTx({
        ixs: ixsClose,
        extraSigners: [owner],
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MarginInUse"));

    //now close pools
    let j = 2;
    for (const { whitelist, config2 } of storedOrderData) {
      //can't lose if not detaches
      await expect(
        testClosePool({
          owner,
          whitelist,
          config: config2,
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolMarginated"));
      await testDetachPoolFromMargin({
        owner,
        config: config2,
        whitelist,
        marginNr,
        poolsAttached: j,
      });
      j--;
      await testClosePool({
        owner,
        whitelist,
        config: config2,
      });
    }

    //now should close ok
    await buildAndSendTx({
      ixs: ixsClose,
      extraSigners: [owner],
    });
  });

  it("MAX ACC CHECK: cosigned + marginated + pnft + 5 creators (8 extra accs) sell now works", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    for (const config of [
      tokenPoolConfig,
      { ...tradePoolConfig, mmFeeBps: 10_00 },
    ]) {
      const isToken = castPoolTypeAnchor(config.poolType) === PoolType.Token;
      const coefs = [1, 0.6, 0.5];
      const amount =
        (1 + 0.6 + 0.5) * LAMPORTS_PER_SOL -
        (isToken ? 0 : coefs.length * 1234);

      //create margin acc
      const { marginNr, marginPda, marginRent } = await testMakeMargin({
        owner,
      });

      const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });

      //deposit into it once, but for 3x orders
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount,
      });

      //create and execute 3 marginated bids, all pulling from the same account
      let i = 1;
      for (const coef of [1, 0.6, 0.5]) {
        const creators = Array(5)
          .fill(null)
          .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

        const config2 = {
          ...config,
          startingPrice: new BN(coef * LAMPORTS_PER_SOL),
        };
        const { mint, ata } = await makeMintTwoAta({
          owner: seller,
          other: owner,
          royaltyBps: 1000,
          creators,
          collection: undefined,
          collectionVerified: undefined,
          programmable: true,
          ruleSetAddr,
        });
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint], 100);
        const { poolPda, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          whitelist,
          config: config2,
          // orderType: OrderType.Sniping, //<-- normal order!
          isCosigned: isToken, //<-- token only
        });
        await testAttachPoolToMargin({
          config: config2,
          marginNr,
          owner,
          whitelist,
          poolsAttached: i,
        });
        i++;

        const expectedLamports = defaultSellExpectedLamports(
          isToken,
          coef * LAMPORTS_PER_SOL
        );
        await testSellNft({
          wlNft,
          ata,
          config: config2,
          expectedLamports,
          minLamports: isToken
            ? undefined
            : adjustSellMinLamports(
                isToken,
                expectedLamports,
                config.mmFeeBps!
              ) - 10, //margin of safety for rounding
          owner,
          poolPda,
          sellType: castPoolTypeAnchor(config.poolType)
            .toString()
            .toLowerCase() as "trade" | "token",
          seller,
          whitelist,
          marginNr,
          royaltyBps: 1000,
          creators,
          isCosigned: isToken, //<-- token only
          programmable: true,
          lookupTableAccount, //passing this makes it a v0
          nftAuthPda,
        });
      }

      const marginBalance = await getLamports(marginPda);
      expect(marginBalance).approximately(
        (await swapSdk.getMarginAccountRent()) +
          (isToken ? 0 : (amount * config.mmFeeBps!) / 100_00) +
          amount * MAKER_REBATE_PCT,
        10
      );
    }
  });
});

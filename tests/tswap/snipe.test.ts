import { BN } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { expect } from "chai";
import { findMarginPDA, OrderType } from "../../src";
import {
  buildAndSendTx,
  cartesian,
  createTokenAuthorizationRules,
  getLamports,
  swapSdk,
} from "../shared";
import {
  beforeHook,
  calcSnipeBidWithFee,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  testAttachPoolToMargin,
  testClosePool,
  testDepositIntoMargin,
  testDepositSol,
  testDetachPoolFromMargin,
  testEditPool,
  testMakeMargin,
  testMakePool,
  testSellNft,
  testSetFreeze,
  testTakeSnipe,
  testWithdrawSol,
  TEST_COSIGNER,
  tokenPoolConfig,
} from "./common";

describe.skip("snipe", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("freezes > unfreezes", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });
    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //deposit sol into it
    const fullBidAmount = calcSnipeBidWithFee(config.startingPrice.toNumber());
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: fullBidAmount,
    });

    //freeze it
    await testSetFreeze({
      owner: owner.publicKey,
      config,
      marginNr,
      whitelist,
      fullBidAmount,
      freeze: true,
    });

    //try to withdraw / deposit / edit / close (should fail)
    await expect(
      testWithdrawSol({
        pool: poolPda,
        whitelist,
        config,
        lamports: 1,
        owner,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolFrozen"));
    await expect(
      testDepositSol({
        pool: poolPda,
        whitelist,
        config,
        lamports: 1,
        owner,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolFrozen"));
    await expect(
      testEditPool({
        tswap,
        whitelist,
        owner,
        oldConfig: config,
        newConfig: {
          ...config,
          startingPrice: config.startingPrice.add(new BN(1)),
        },
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolFrozen"));
    await expect(
      testClosePool({
        whitelist,
        owner,
        config,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolFrozen"));
    await expect(
      testSellNft({
        ata,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        owner,
        poolPda,
        sellType: "token",
        seller,
        whitelist,
        wlNft,
        creators,
        royaltyBps: 1000,
        marginNr,
        isSniping: true,
        lookupTableAccount,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolFrozen"));

    //unfreeze
    await testSetFreeze({
      owner: owner.publicKey,
      config,
      marginNr,
      whitelist,
      fullBidAmount,
      freeze: false,
    });

    //freeze + unfreeze 1 more time
    await testSetFreeze({
      owner: owner.publicKey,
      config,
      marginNr,
      whitelist,
      fullBidAmount,
      freeze: true,
    });

    await testSetFreeze({
      owner: owner.publicKey,
      config,
      marginNr,
      whitelist,
      fullBidAmount,
      freeze: false,
    });

    await testSellNft({
      ata,
      config,
      expectedLamports: LAMPORTS_PER_SOL,
      owner,
      poolPda,
      sellType: "token",
      seller,
      whitelist,
      wlNft,
      creators,
      royaltyBps: 1000,
      marginNr,
      isSniping: true,
      lookupTableAccount,
    });

    //try to edit / close (should succeed)
    await testEditPool({
      tswap,
      whitelist,
      owner,
      oldConfig: config,
      newConfig: {
        ...config,
        startingPrice: config.startingPrice.add(new BN(1)),
      },
    });
    await testClosePool({
      whitelist,
      owner,
      config: {
        ...config,
        startingPrice: config.startingPrice.add(new BN(1)),
      },
      marginNr,
    });
  });

  it("fails to freeze w/ wrong cosigner", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });
    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //deposit sol into it
    const fullBidAmount = calcSnipeBidWithFee(config.startingPrice.toNumber());
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: fullBidAmount,
    });

    //freeze it
    await expect(
      testSetFreeze({
        owner: owner.publicKey,
        config,
        marginNr,
        whitelist,
        fullBidAmount,
        freeze: true,
        cosigner: Keypair.generate(),
      })
    ).to.be.rejectedWith("0x7d1"); //has_one violated
  });

  it("fails to freeze an already frozen pool", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });
    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //deposit sol into it
    const fullBidAmount = calcSnipeBidWithFee(config.startingPrice.toNumber());
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: fullBidAmount,
    });

    //freeze it
    await testSetFreeze({
      owner: owner.publicKey,
      config,
      marginNr,
      whitelist,
      fullBidAmount,
      freeze: true,
    });

    //try freezing it again
    await expect(
      testSetFreeze({
        owner: owner.publicKey,
        config,
        marginNr,
        whitelist,
        fullBidAmount,
        freeze: true,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("WrongFrozenStatus"));
  });

  it("fails to unfreeze an already unfrozen pool", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });
    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //deposit sol into it
    const fullBidAmount = calcSnipeBidWithFee(config.startingPrice.toNumber());
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: fullBidAmount,
    });

    //freeze it
    await expect(
      testSetFreeze({
        owner: owner.publicKey,
        config,
        marginNr,
        whitelist,
        fullBidAmount,
        freeze: false,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("WrongFrozenStatus"));
  });

  it("snipes ok", async () => {
    for (const [freeze, snipePricePct] of cartesian(
      [true, false],
      [0.8, 1, 0]
    )) {
      const [owner, seller] = await makeNTraders({ n: 2 });

      //create margin acc
      const { marginNr } = await testMakeMargin({ owner });

      //created marginated bid
      const config = tokenPoolConfig;
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
        config,
        orderType: OrderType.Sniping,
      });
      const { marginPda } = await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      });

      //prices
      const bidAmount = LAMPORTS_PER_SOL;
      const snipeAmount = bidAmount * snipePricePct;
      const fullBidAmount = calcSnipeBidWithFee(bidAmount);

      //deposit sol into it
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: fullBidAmount,
      });

      //freeze it
      if (freeze) {
        await testSetFreeze({
          owner: owner.publicKey,
          config,
          marginNr,
          whitelist,
          fullBidAmount,
          freeze: true,
        });
      }

      await testTakeSnipe({
        actualSnipeAmount: snipeAmount,
        initialBidAmount: bidAmount,
        ata,
        config,
        marginNr,
        wlNft,
        owner,
        poolPda,
        seller,
        whitelist,
        frozen: freeze,
      });
    }
  });

  it("snipes ok (tiny amount, triggers min snipe fee)", async () => {
    for (const [freeze, snipePricePct] of cartesian(
      [true, false],
      [0.8, 1, 0]
    )) {
      const [owner, seller] = await makeNTraders({ n: 2 });

      //create margin acc
      const { marginNr } = await testMakeMargin({ owner });

      //created marginated bid
      const config = { ...tokenPoolConfig, startingPrice: new BN(100) };
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
        config,
        orderType: OrderType.Sniping,
      });
      const { marginPda } = await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      });

      //prices
      const bidAmount = 100;
      const snipeAmount = bidAmount * snipePricePct;
      const fullBidAmount = calcSnipeBidWithFee(bidAmount);

      //deposit sol into it
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: fullBidAmount,
      });

      //freeze it
      if (freeze) {
        await testSetFreeze({
          owner: owner.publicKey,
          config,
          marginNr,
          whitelist,
          fullBidAmount,
          freeze: true,
        });
      }

      await testTakeSnipe({
        actualSnipeAmount: snipeAmount,
        initialBidAmount: bidAmount,
        ata,
        config,
        marginNr,
        wlNft,
        owner,
        poolPda,
        seller,
        whitelist,
        frozen: freeze,
      });
    }
  });

  it("fails to snipe if order non-sniping", async () => {
    for (const freeze of [true, false]) {
      const [owner, seller] = await makeNTraders({ n: 2 });

      //create margin acc
      const { marginNr } = await testMakeMargin({ owner });

      //created marginated bid
      const config = tokenPoolConfig;
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
        config,
        //non sniping
      });
      const { marginPda } = await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      });

      //prices
      const bidAmount = LAMPORTS_PER_SOL;
      const snipeAmount = LAMPORTS_PER_SOL * 0.8;
      const fullBidAmount = calcSnipeBidWithFee(bidAmount);

      //deposit sol into it
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: fullBidAmount,
      });

      //freeze it
      if (freeze) {
        const {
          tx: { ixs },
        } = await swapSdk.setPoolFreeze({
          whitelist,
          owner: owner.publicKey,
          config,
          marginNr,
          freeze,
          cosigner: TEST_COSIGNER.publicKey,
        });
        await expect(
          buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] })
        ).to.be.rejectedWith(swapSdk.getErrorCodeHex("WrongOrderType"));
      }

      await expect(
        testTakeSnipe({
          actualSnipeAmount: snipeAmount,
          initialBidAmount: bidAmount,
          ata,
          config,
          marginNr,
          wlNft,
          owner,
          poolPda,
          seller,
          whitelist,
          frozen: false, //coz one fails
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("WrongOrderType"));
    }
  });

  it("fails to snipe if wrong cosigner", async () => {
    for (const freeze of [true, false]) {
      const [owner, seller] = await makeNTraders({ n: 2 });

      //create margin acc
      const { marginNr } = await testMakeMargin({ owner });

      //created marginated bid
      const config = tokenPoolConfig;
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
        config,
        orderType: OrderType.Sniping,
      });
      const { marginPda } = await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      });

      //prices
      const bidAmount = LAMPORTS_PER_SOL;
      const snipeAmount = LAMPORTS_PER_SOL * 0.8;
      const fullBidAmount = calcSnipeBidWithFee(bidAmount);

      //deposit sol into it
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: fullBidAmount,
      });

      //freeze it
      if (freeze) {
        const {
          tx: { ixs },
        } = await swapSdk.setPoolFreeze({
          whitelist,
          owner: owner.publicKey,
          config,
          marginNr,
          freeze,
          cosigner: TEST_COSIGNER.publicKey, //<-- correct one here
        });
        await buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] });
      }

      await expect(
        testTakeSnipe({
          actualSnipeAmount: snipeAmount,
          initialBidAmount: bidAmount,
          ata,
          config,
          marginNr,
          wlNft,
          owner,
          poolPda,
          seller,
          whitelist,
          frozen: freeze,
          cosigner: Keypair.generate(), //<-- random cosigner
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadCosigner"));
    }
  });

  it("fails to snipe if order not marginated", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      // marginNr, //<-- not marginated
      orderType: OrderType.Sniping,
    });

    //prices
    const bidAmount = LAMPORTS_PER_SOL;
    const snipeAmount = LAMPORTS_PER_SOL * 0.8;
    const fullBidAmount = calcSnipeBidWithFee(bidAmount);

    //deposit sol into it
    const [marginPda] = findMarginPDA({
      tswap,
      owner: owner.publicKey,
      marginNr,
    });
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: fullBidAmount,
    });

    await expect(
      testTakeSnipe({
        actualSnipeAmount: snipeAmount,
        initialBidAmount: bidAmount,
        ata,
        config,
        marginNr,
        wlNft,
        owner,
        poolPda,
        seller,
        whitelist,
        frozen: false,
      })
      //fails to compile because .unwrap() is called on margin field on pool inside of anchor macro
    ).to.be.rejectedWith("Program failed to complete");
  });

  it("fails to deposit into marginate bid's escrow", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
    await testMakePool({
      tswap,
      owner,
      whitelist,
      config,
      orderType: OrderType.Sniping,
    });
    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //try to deposit sol into it
    let {
      tx: { ixs: ixsDeposit },
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(LAMPORTS_PER_SOL),
    });
    await expect(
      buildAndSendTx({
        ixs: ixsDeposit,
        extraSigners: [owner],
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolMarginated"));
  });

  it("fails to withdraw from marginated bid's escrow", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });

    //deposit sol into it, before attaching
    let {
      tx: { ixs: ixsDeposit },
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(LAMPORTS_PER_SOL),
    });
    await buildAndSendTx({
      ixs: ixsDeposit,
      extraSigners: [owner],
    });

    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //try to withdraw sol
    let {
      tx: { ixs: ixsWithdraw },
    } = await swapSdk.withdrawSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(LAMPORTS_PER_SOL),
    });
    await expect(
      buildAndSendTx({
        ixs: ixsWithdraw,
        extraSigners: [owner],
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolMarginated"));
  });

  it("correctly moves lamports between escrow and margin", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });

    //deposit sol into it, before attaching
    let {
      tx: { ixs: ixsDeposit },
      solEscrowPda,
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(LAMPORTS_PER_SOL + 12345),
    });
    await buildAndSendTx({
      ixs: ixsDeposit,
      extraSigners: [owner],
    });

    const { marginPda } = await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //margin full
    let marginRent = await swapSdk.getMarginAccountRent();
    let margin = await getLamports(marginPda);
    expect(margin).to.eq(LAMPORTS_PER_SOL + 12345 + marginRent);

    //escrow empty
    let escrowRent = await swapSdk.getSolEscrowRent();
    let escrow = await getLamports(solEscrowPda);
    expect(escrow).to.eq(escrowRent);

    await testDetachPoolFromMargin({
      config,
      marginNr,
      owner,
      whitelist,
      amount: new BN(12345),
    });

    //margin
    margin = await getLamports(marginPda);
    expect(margin).to.eq(LAMPORTS_PER_SOL + marginRent);

    //escrow
    escrow = await getLamports(solEscrowPda);
    expect(escrow).to.eq(12345 + escrowRent);
  });

  it("fail scenarios for attaching/detaching", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //create margin acc
    const { marginNr } = await testMakeMargin({ owner });
    const { marginNr: marginNr2 } = await testMakeMargin({ owner });
    const { marginNr: marginNrSeller } = await testMakeMargin({
      owner: seller,
    });

    //created marginated bid
    const config = tokenPoolConfig;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
      config,
      orderType: OrderType.Sniping,
    });

    //can't detach before pool marginated
    await expect(
      testDetachPoolFromMargin({
        config,
        marginNr,
        owner,
        whitelist,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolNotMarginated"));

    //attach successfully
    await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
    });

    //can't attach twice
    await expect(
      testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PoolMarginated"));

    //can't detach the wrong margin
    await expect(
      testDetachPoolFromMargin({
        config,
        marginNr: marginNr2,
        owner,
        whitelist,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadMargin"));
  });

  it("snipes pnft ok (no rulesets)", async () => {
    for (const [freeze, snipePricePct] of cartesian(
      [true, false],
      [0.8, 1, 0]
    )) {
      const [owner, seller] = await makeNTraders({ n: 2 });

      //create margin acc
      const { marginNr } = await testMakeMargin({ owner });

      //created marginated bid
      const config = tokenPoolConfig;
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 1000,
        creators,
        programmable: true,
      });
      const {
        proofs: [wlNft],
        whitelist,
      } = await makeProofWhitelist([mint], 100);
      const { poolPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
        orderType: OrderType.Sniping,
      });
      const { marginPda } = await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      });

      //prices
      const bidAmount = LAMPORTS_PER_SOL;
      const snipeAmount = bidAmount * snipePricePct;
      const fullBidAmount = calcSnipeBidWithFee(bidAmount);

      //deposit sol into it
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: fullBidAmount,
      });

      //freeze it
      if (freeze) {
        await testSetFreeze({
          owner: owner.publicKey,
          config,
          marginNr,
          whitelist,
          fullBidAmount,
          freeze: true,
        });
      }

      await testTakeSnipe({
        actualSnipeAmount: snipeAmount,
        initialBidAmount: bidAmount,
        ata,
        config,
        marginNr,
        wlNft,
        owner,
        poolPda,
        seller,
        whitelist,
        frozen: freeze,
        programmable: true,
      });
    }
  });

  it("snipes pnft ok (1 ruleset)", async () => {
    for (const [freeze, snipePricePct] of cartesian(
      [true, false],
      [0.8, 1, 0]
    )) {
      const [owner, seller] = await makeNTraders({ n: 2 });

      const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });

      //create margin acc
      const { marginNr } = await testMakeMargin({ owner });

      //created marginated bid
      const config = tokenPoolConfig;
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 1000,
        creators: creators,
        programmable: true,
        ruleSetAddr,
      });
      const {
        proofs: [wlNft],
        whitelist,
      } = await makeProofWhitelist([mint], 100);
      const { poolPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
        orderType: OrderType.Sniping,
      });
      const { marginPda } = await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
      });

      //prices
      const bidAmount = LAMPORTS_PER_SOL;
      const snipeAmount = bidAmount * snipePricePct;
      const fullBidAmount = calcSnipeBidWithFee(bidAmount);

      //deposit sol into it
      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: fullBidAmount,
      });

      //freeze it
      if (freeze) {
        await testSetFreeze({
          owner: owner.publicKey,
          config,
          marginNr,
          whitelist,
          fullBidAmount,
          freeze: true,
        });
      }

      await testTakeSnipe({
        actualSnipeAmount: snipeAmount,
        initialBidAmount: bidAmount,
        ata,
        config,
        marginNr,
        wlNft,
        owner,
        poolPda,
        seller,
        whitelist,
        frozen: freeze,
        programmable: true,
      });
    }
  });
});

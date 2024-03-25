import {
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getTransactionConvertedToLegacy } from "@tensor-hq/tensor-common";
import BN from "bn.js";
import { expect } from "chai";
import { castPoolTypeAnchor, PoolType } from "../../src";
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  COMMON_INSUFFICIENT_FUNDS_ERR,
  CurveTypeAnchor,
  getLamports,
  HUNDRED_PCT_BPS,
  PoolTypeAnchor,
  swapSdk,
  TEST_PROVIDER,
  withLamports,
  wlSdk,
} from "../shared";
import {
  adjustSellMinLamports,
  beforeHook,
  createAndFundAta,
  CREATE_META_TAX,
  defaultSellExpectedLamports,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  MAKER_REBATE_PCT,
  nftPoolConfig,
  testAttachPoolToMargin,
  testBuyNft,
  testClosePool,
  testDepositIntoMargin,
  testDepositNft,
  testDepositSol,
  testDetachPoolFromMargin,
  testEditPool,
  testMakeMargin,
  testMakePool,
  testMakePoolBuyNft,
  testMakePoolSellNft,
  testSellNft,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap pool", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Create pool.

  it("pool adds the created unix timestamp (in seconds)", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundAta({ owner });
        const { whitelist } = await makeProofWhitelist([mint]);

        const { poolPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        const pool = await swapSdk.fetchPool(poolPda);
        const dateMs = pool.createdUnixSeconds.toNumber() * 1000;
        console.log(`pool created: ${new Date(dateMs)}`);
        // This should be within 3 days (max clock drift historical) of the current time.
        expect(dateMs).gte(Date.now() - 3 * 86400 * 1000);
      })
    );
  });

  it("cannot init exponential pool with 100% delta", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundAta({ owner });
        const { whitelist } = await makeProofWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              curveType: CurveTypeAnchor.Exponential,
              delta: new BN(HUNDRED_PCT_BPS),
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("DeltaTooLarge"));
      })
    );
  });

  it("cannot init non-trade pool with mmFees", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig].map(async (config) => {
        const { mint } = await createAndFundAta({ owner });
        const { whitelist } = await makeProofWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              mmFeeBps: 0,
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("FeesNotAllowed"));
      })
    );
  });

  it("cannot init trade pool with no fees or high fees", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = tradePoolConfig;
    const { mint } = await createAndFundAta({ owner });
    const { whitelist } = await makeProofWhitelist([mint]);

    await expect(
      testMakePool({
        tswap,
        owner,
        config: {
          ...config,
          mmFeeBps: null,
        },
        whitelist,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("MissingFees"));

    await Promise.all(
      [
        { mmFeeBps: 9900, fail: false },
        { mmFeeBps: 10000, fail: true },
      ].map(async ({ mmFeeBps, fail }) => {
        const promise = testMakePool({
          tswap,
          owner,
          config: {
            ...config,
            mmFeeBps,
          },
          whitelist,
        });
        if (fail)
          await expect(promise).rejectedWith(
            swapSdk.getErrorCodeHex("FeesTooHigh")
          );
        else await promise;
      })
    );
  });

  it("properly parses raw init/edit/close pool tx", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const { mint } = await createAndFundAta({ owner });
    const { whitelist } = await makeProofWhitelist([mint]);

    await Promise.all(
      [tokenPoolConfig, tradePoolConfig, nftPoolConfig].map(async (config) => {
        const {
          sig: initSig,
          poolPda,
          nftAuthPda,
          solEscrowPda,
        } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        const newConfig = { ...config, delta: new BN(0) };
        const {
          sig: editSig,
          newPoolPda,
          newSolEscrowPda,
        } = await testEditPool({
          tswap,
          owner,
          newConfig,
          oldConfig: config,
          whitelist,
        });

        // Edit/move stuff back so we can use the old pool/config again.
        await testEditPool({
          tswap,
          owner,
          newConfig: config,
          oldConfig: newConfig,
          whitelist,
        });

        const { sig: closeSig } = await testClosePool({
          owner,
          config,
          whitelist,
        });

        for (const { sig, name } of [
          { sig: initSig, name: "initPool" },
          { sig: editSig, name: "editPool" },
          { sig: closeSig, name: "closePool" },
        ]) {
          const tx = await getTransactionConvertedToLegacy(
            TEST_PROVIDER.connection,
            sig,
            "confirmed"
          );
          expect(tx).not.null;
          const ixs = swapSdk.parseIxs(tx!);
          expect(ixs).length(1);

          const ix = ixs[0];
          expect(ix.ix.name).eq(name);
          expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
            JSON.stringify(
              castPoolConfigAnchor(name === "editPool" ? newConfig : config)
            )
          );
          expect(swapSdk.getSolAmount(ix)).null;
          expect(swapSdk.getFeeAmount(ix)).null;

          if (name === "editPool") {
            expect(
              swapSdk.getAccountByName(ix, "Old Pool")?.pubkey.toBase58()
            ).eq(poolPda.toBase58());
            expect(
              swapSdk.getAccountByName(ix, "New Pool")?.pubkey.toBase58()
            ).eq(newPoolPda.toBase58());
            expect(
              swapSdk.getAccountByName(ix, "Old Sol Escrow")?.pubkey.toBase58()
            ).eq(solEscrowPda.toBase58());
            expect(
              swapSdk.getAccountByName(ix, "New Sol Escrow")?.pubkey.toBase58()
            ).eq(newSolEscrowPda.toBase58());
          } else {
            expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
              poolPda.toBase58()
            );
            expect(
              swapSdk.getAccountByName(ix, "Sol Escrow")?.pubkey.toBase58()
            ).eq(solEscrowPda.toBase58());
          }

          expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
            owner.publicKey.toBase58()
          );
          expect(
            swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()
          ).eq(whitelist.toBase58());
          expect(
            swapSdk.getAccountByName(ix, "Nft Authority")?.pubkey.toBase58()
          ).eq(nftAuthPda.toBase58());
        }
      })
    );
  });

  //#endregion

  //#region Close pool.

  it("close pool roundtrips fees + any deposited SOL", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    for (const [config, lamports] of cartesian(
      [tokenPoolConfig, tradePoolConfig],
      [0, 69 * LAMPORTS_PER_SOL]
    )) {
      const { mint } = await createAndFundAta({ owner });
      const { whitelist } = await makeProofWhitelist([mint]);

      await withLamports(
        { prevLamports: owner.publicKey },
        async ({ prevLamports }) => {
          const { poolPda: pool } = await testMakePool({
            tswap,
            owner,
            config,
            whitelist,
          });

          // Deposit SOL if applicable.
          if (lamports !== 0) {
            await testDepositSol({
              pool,
              whitelist,
              config,
              owner,
              lamports,
            });
          }

          await testClosePool({ owner, whitelist, config });

          const currLamports = await getLamports(owner.publicKey);
          expect(currLamports! - prevLamports!).eq(0);
        }
      );
    }
  });

  it("close pool withdraws SOL from any buys from the TRADE pool", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    // We know for TOKEN pools SOL goes directly to owner.
    const config = tradePoolConfig;
    const buyPrice = LAMPORTS_PER_SOL;

    await withLamports(
      { prevLamports: owner.publicKey },
      async ({ prevLamports }) => {
        const {
          whitelist,
          ata: ownerAta,
          masterEdition,
          metadata,
        } = await testMakePoolBuyNft({
          tswap,
          owner,
          buyer,
          config,
          expectedLamports: buyPrice,
        });
        await testClosePool({ owner, whitelist, config });

        const currLamports = await getLamports(owner.publicKey);
        const diff = currLamports! - prevLamports!;

        const conn = TEST_PROVIDER.connection;
        const metaRent = await conn.getMinimumBalanceForRentExemption(
          (await conn.getAccountInfo(metadata))!.data.byteLength
        );
        const editionRent = await conn.getMinimumBalanceForRentExemption(
          (await conn.getAccountInfo(masterEdition))!.data.byteLength
        );
        const proofRent = await wlSdk.getMintProofRent();

        const expected =
          // Proceeds from sale, minus the rent we paid to create the mint + ATA initially.
          buyPrice * (1 + MAKER_REBATE_PCT) -
          metaRent -
          editionRent -
          proofRent -
          (await getMinimumBalanceForRentExemptMint(conn)) -
          // NB: for some reason if we close the ATA beforehand (and now have this adjustment)
          // the resulting amount credited differs depending on which tests run before this one (wtf??)
          (await getMinimumBalanceForRentExemptAccount(conn)) -
          CREATE_META_TAX; // Metaplex tax
        // No addn from rent since we roundtrip it from deposit.

        // For some reason running this test by itself is fine, but running it with the other tests before
        // has a 10000 lamport difference.
        expect(diff).within(expected - 100000, expected);
      }
    );
  });

  it("close pool fails if nfts still deposited", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundAta({ owner });
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint]);

        const { poolPda: pool, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        await testDepositNft({
          pool,
          config,
          owner,
          ata,
          wlNft,
          whitelist,
          nftAuthPda,
        });

        await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
          swapSdk.getErrorCodeHex("ExistingNfts")
        );
      })
    );
  });

  it("close pool fails if someone sold nfts into it", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    // Only works for trade pool o/w nft goes directly to buyer.
    const config = tradePoolConfig;
    const isToken = false;
    const expectedLamports = defaultSellExpectedLamports(isToken);
    const minLamports = adjustSellMinLamports(isToken, expectedLamports);

    // Cannot run async.
    const { whitelist } = await testMakePoolSellNft({
      sellType: config === tradePoolConfig ? "trade" : "token",
      tswap,
      owner,
      seller,
      config,
      expectedLamports,
      minLamports,
    });

    await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
      swapSdk.getErrorCodeHex("ExistingNfts")
    );
  });

  //#endregion

  //#region Edit pool.

  it("editing pool works", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundAta({ owner });
        const { whitelist } = await makeProofWhitelist([mint]);

        // --------------------------------------- init new pool
        const { poolPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
          maxTakerSellCount: 55,
        });
        const pool = await swapSdk.fetchPool(poolPda);
        const dateMs = pool.createdUnixSeconds.toNumber() * 1000;
        console.log(`pool created: ${new Date(dateMs)}`);
        // This should be within 3 days (max clock drift historical) of the current time.
        expect(dateMs).gte(Date.now() - 3 * 86400 * 1000);

        // --------------------------------------- edit it
        const newConfig = { ...config, delta: new BN(0) };

        const { newPoolPda } = await testEditPool({
          tswap,
          owner,
          newConfig,
          oldConfig: config,
          whitelist,
          maxTakerSellCount: 111,
        });
        const newPool = await swapSdk.fetchPool(newPoolPda);
        const newDateMs = newPool.createdUnixSeconds.toNumber() * 1000;
        console.log(`new (edited) pool created: ${new Date(newDateMs)}`);
        // This should be within 3 days (max clock drift historical) of the current time.
        expect(newDateMs).gte(Date.now() - 3 * 86400 * 1000);
      })
    );
  });

  it("init/edit correctly handles maxTakerSellCount", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const { mint: mint1, ata: ata1 } = await makeMintTwoAta({
      owner: seller,
      other: owner,
    });
    const { mint: mint2, ata: ata2 } = await makeMintTwoAta({
      owner: seller,
      other: owner,
    });
    const { mint: mint3, ata: ata3 } = await makeMintTwoAta({
      owner: seller,
      other: owner,
    });
    const {
      proofs: [wlNft1, wlNft2, wlNft3],
      whitelist,
    } = await makeProofWhitelist([mint1, mint2, mint3], 100);

    // --------------------------------------- allowed sell count 1

    const config = tokenPoolConfig;
    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
      maxTakerSellCount: 1,
    });
    const expectedLamports = defaultSellExpectedLamports(true);
    const minLamports = adjustSellMinLamports(true, expectedLamports);

    const { marginNr, marginPda, marginRent } = await testMakeMargin({
      owner,
    });
    await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
      poolsAttached: 1,
    });

    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: expectedLamports * 10, //more than enough
    });

    //sel once = ok
    await testSellNft({
      whitelist,
      wlNft: wlNft1,
      ata: ata1,
      nftAuthPda,
      poolPda,
      sellType: "token",
      owner,
      seller,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft2,
        ata: ata2,
        nftAuthPda,
        poolPda,
        sellType: "token",
        owner,
        seller,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));

    // --------------------------------------- allowed sell count 2

    //edit pool to increase allowed sell count to 2
    const newConfig = { ...config, delta: new BN(1) };
    const { newPoolPda } = await testEditPool({
      tswap,
      owner,
      newConfig,
      oldConfig: config,
      whitelist,
      maxTakerSellCount: 2,
    });

    //sell 2nd = ok
    await testSellNft({
      whitelist,
      wlNft: wlNft2,
      ata: ata2,
      nftAuthPda,
      poolPda: newPoolPda,
      sellType: "token",
      owner,
      seller,
      config: newConfig,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft3,
        ata: ata3,
        nftAuthPda,
        poolPda: newPoolPda,
        sellType: "token",
        owner,
        seller,
        config: newConfig,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));

    //try to edit down from 2 to 1 = fails
    const newConfig2 = { ...config, delta: new BN(2) };
    await expect(
      testEditPool({
        tswap,
        owner,
        newConfig: newConfig2,
        oldConfig: newConfig,
        whitelist,
        maxTakerSellCount: 1,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountTooSmall"));

    // --------------------------------------- allowed sell count 0 (unlimited)

    //edit pool 2nd time, this time set max taker count to 0
    const { newPoolPda: newPoolPda2 } = await testEditPool({
      tswap,
      owner,
      newConfig: newConfig2,
      oldConfig: newConfig,
      whitelist,
      maxTakerSellCount: 0,
    });

    //sell 2nd = ok
    await testSellNft({
      whitelist,
      wlNft: wlNft3,
      ata: ata3,
      nftAuthPda,
      poolPda: newPoolPda2,
      sellType: "token",
      owner,
      seller,
      config: newConfig2,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });
  });

  it("init/edit correctly handles maxTakerSellCount (use edit in place)", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    //make the pool with no delta / mm fee so that math is easy
    for (const config of [
      { ...tokenPoolConfig, delta: new BN(0) },
      { ...tradePoolConfig, delta: new BN(0), mmFeeBps: 0 },
    ]) {
      const { mint: mint1, ata: ata1 } = await makeMintTwoAta({
        owner: seller,
        other: owner,
      });
      const { mint: mint2, ata: ata2 } = await makeMintTwoAta({
        owner: seller,
        other: owner,
      });
      const { mint: mint3, ata: ata3 } = await makeMintTwoAta({
        owner: seller,
        other: owner,
      });
      const {
        proofs: [wlNft1, wlNft2, wlNft3],
        whitelist,
      } = await makeProofWhitelist([mint1, mint2, mint3], 100);

      // --------------------------------------- allowed sell count 1

      const isToken = castPoolTypeAnchor(config.poolType) === PoolType.Token;
      const { poolPda, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        config,
        whitelist,
        maxTakerSellCount: 1,
      });
      const expectedLamports = LAMPORTS_PER_SOL;
      const minLamports = adjustSellMinLamports(isToken, expectedLamports, 0);

      const { marginNr, marginPda, marginRent } = await testMakeMargin({
        owner,
      });
      await testAttachPoolToMargin({
        config,
        marginNr,
        owner,
        whitelist,
        poolsAttached: 1,
      });

      await testDepositIntoMargin({
        owner,
        marginNr,
        marginPda,
        amount: expectedLamports * 10, //more than enough
      });

      //sel once = ok
      await testSellNft({
        whitelist,
        wlNft: wlNft1,
        ata: ata1,
        nftAuthPda,
        poolPda,
        sellType: isToken ? "token" : "trade",
        owner,
        seller,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      });

      //try to sell again = fails
      await expect(
        testSellNft({
          whitelist,
          wlNft: wlNft2,
          ata: ata2,
          nftAuthPda,
          poolPda,
          sellType: isToken ? "token" : "trade",
          owner,
          seller,
          config,
          expectedLamports,
          minLamports,
          treeSize: 100,
          marginNr,
        })
      ).to.be.rejectedWith(
        swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded")
      );

      // --------------------------------------- allowed sell count 2

      //edit pool to increase allowed sell count to 2
      const { newPoolPda } = await testEditPool({
        tswap,
        owner,
        oldConfig: config,
        whitelist,
        maxTakerSellCount: 2,
      });

      //sell 2nd = ok
      await testSellNft({
        whitelist,
        wlNft: wlNft2,
        ata: ata2,
        nftAuthPda,
        poolPda: newPoolPda,
        sellType: isToken ? "token" : "trade",
        owner,
        seller,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      });

      //try to sell again = fails
      await expect(
        testSellNft({
          whitelist,
          wlNft: wlNft3,
          ata: ata3,
          nftAuthPda,
          poolPda: newPoolPda,
          sellType: isToken ? "token" : "trade",
          owner,
          seller,
          config,
          expectedLamports,
          minLamports,
          treeSize: 100,
          marginNr,
        })
      ).to.be.rejectedWith(
        swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded")
      );

      //try to edit down from 2 to 1 = fails
      await expect(
        testEditPool({
          tswap,
          owner,
          oldConfig: config,
          whitelist,
          maxTakerSellCount: 1,
        })
      ).to.be.rejectedWith(
        swapSdk.getErrorCodeHex("MaxTakerSellCountTooSmall")
      );

      // --------------------------------------- allowed sell count 0 (unlimited)

      //edit pool 2nd time, this time set max taker count to 0
      const { newPoolPda: newPoolPda2 } = await testEditPool({
        tswap,
        owner,
        oldConfig: config,
        whitelist,
        maxTakerSellCount: 0,
      });

      //sell 2nd = ok
      await testSellNft({
        whitelist,
        wlNft: wlNft3,
        ata: ata3,
        nftAuthPda,
        poolPda: newPoolPda2,
        sellType: isToken ? "token" : "trade",
        owner,
        seller,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      });
    }
  });

  it("maxTakerSellCount (both buys & sells, market-making pool)", async () => {
    const [owner, taker] = await makeNTraders({ n: 2 });
    const { mint: mint1, ata: ata1 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint2, ata: ata2 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint3, ata: ata3 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint4, ata: ata4 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const {
      mint: mint5,
      ata: ata5,
      otherAta: otherAta5,
    } = await makeMintTwoAta({ owner: owner, other: taker });
    const {
      mint: mint6,
      ata: ata6,
      otherAta: otherAta6,
    } = await makeMintTwoAta({ owner: owner, other: taker });
    const {
      proofs: [wlNft1, wlNft2, wlNft3, wlNft4, wlNft5, wlNft6],
      whitelist,
    } = await makeProofWhitelist(
      [mint1, mint2, mint3, mint4, mint5, mint6],
      100
    );

    // --------------------------------------- allowed sell count 1

    //make the pool with no delta / mm fee so that math is easy
    const config = { ...tradePoolConfig, delta: new BN(0), mmFeeBps: 0 };

    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
      maxTakerSellCount: 1,
    });
    const expectedLamports = LAMPORTS_PER_SOL;
    const minLamports = adjustSellMinLamports(false, expectedLamports, 0);

    const { marginNr, marginPda, marginRent } = await testMakeMargin({
      owner,
    });
    await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
      poolsAttached: 1,
    });

    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: expectedLamports * 10, //more than enough
    });

    //after: takerSell = 1, takerBuy = 0, cap = 1, left till cap = 0
    await testSellNft({
      whitelist,
      wlNft: wlNft1,
      ata: ata1,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft2,
        ata: ata2,
        nftAuthPda,
        poolPda,
        sellType: "trade",
        owner,
        seller: taker,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));

    //after: takerSell = 1, takerBuy = 1, cap = 1, left till cap = 1
    await testDepositNft({
      nftAuthPda,
      pool: poolPda,
      config,
      owner,
      ata: ata5,
      wlNft: wlNft5,
      whitelist,
    });
    await testBuyNft({
      pool: poolPda,
      wlNft: wlNft5,
      whitelist,
      otherAta: otherAta5,
      owner,
      buyer: taker,
      config,
      expectedLamports: LAMPORTS_PER_SOL,
      marginNr,
    });

    //after: takerSell = 2, takerBuy = 1, cap = 1, left till cap = 0
    await testSellNft({
      whitelist,
      wlNft: wlNft2,
      ata: ata2,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft3,
        ata: ata3,
        nftAuthPda,
        poolPda,
        sellType: "trade",
        owner,
        seller: taker,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));

    // --------------------------------------- allowed sell count 2

    //edit pool to increase allowed sell count to 2
    const { newPoolPda } = await testEditPool({
      tswap,
      owner,
      oldConfig: config,
      whitelist,
      maxTakerSellCount: 2,
    });

    //after: takerSell = 3, takerBuy = 1, cap = 2, left till cap = 0
    await testSellNft({
      whitelist,
      wlNft: wlNft3,
      ata: ata3,
      nftAuthPda,
      poolPda: newPoolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft4,
        ata: ata4,
        nftAuthPda,
        poolPda: newPoolPda,
        sellType: "trade",
        owner,
        seller: taker,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));

    //try to edit down from 2 to 1 = fails
    await expect(
      testEditPool({
        tswap,
        owner,
        oldConfig: config,
        whitelist,
        maxTakerSellCount: 1,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountTooSmall"));

    // --------------------------------------- allowed sell count 0 (unlimited)

    //edit pool 2nd time, this time set max taker count to 0
    const { newPoolPda: newPoolPda2 } = await testEditPool({
      tswap,
      owner,
      oldConfig: config,
      whitelist,
      maxTakerSellCount: 0,
    });

    //sell 2nd = ok
    await testSellNft({
      whitelist,
      wlNft: wlNft4,
      ata: ata4,
      nftAuthPda,
      poolPda: newPoolPda2,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });
  });

  it("maxTakerSellCount (negative, market-making pool)", async () => {
    const [owner, taker] = await makeNTraders({ n: 2 });
    const { mint: mint1, ata: ata1 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint2, ata: ata2 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint3, ata: ata3 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint4, ata: ata4 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const {
      mint: mint5,
      ata: ata5,
      otherAta: otherAta5,
    } = await makeMintTwoAta({ owner: owner, other: taker });
    const {
      mint: mint6,
      ata: ata6,
      otherAta: otherAta6,
    } = await makeMintTwoAta({ owner: owner, other: taker });
    const {
      proofs: [wlNft1, wlNft2, wlNft3, wlNft4, wlNft5, wlNft6],
      whitelist,
    } = await makeProofWhitelist(
      [mint1, mint2, mint3, mint4, mint5, mint6],
      100
    );

    // --------------------------------------- allowed sell count 1

    //make the pool with no delta / mm fee so that math is easy
    const config = { ...tradePoolConfig, delta: new BN(0), mmFeeBps: 0 };

    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
      maxTakerSellCount: 1,
    });
    const expectedLamports = LAMPORTS_PER_SOL;
    const minLamports = adjustSellMinLamports(false, expectedLamports, 0);

    const { marginNr, marginPda, marginRent } = await testMakeMargin({
      owner,
    });
    await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
      poolsAttached: 1,
    });

    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: expectedLamports * 10, //more than enough
    });

    // --------------------------------------- buy

    //after: takerSell = 0, takerBuy = 1, cap = 1, left till cap = 2
    await testDepositNft({
      nftAuthPda,
      pool: poolPda,
      config,
      owner,
      ata: ata5,
      wlNft: wlNft5,
      whitelist,
    });
    await testBuyNft({
      pool: poolPda,
      wlNft: wlNft5,
      whitelist,
      otherAta: otherAta5,
      owner,
      buyer: taker,
      config,
      expectedLamports: LAMPORTS_PER_SOL,
      marginNr,
    });

    //after: takerSell = 0, takerBuy = 2, cap = 1, left till cap = 3
    await testDepositNft({
      nftAuthPda,
      pool: poolPda,
      config,
      owner,
      ata: ata6,
      wlNft: wlNft6,
      whitelist,
    });
    await testBuyNft({
      pool: poolPda,
      wlNft: wlNft6,
      whitelist,
      otherAta: otherAta6,
      owner,
      buyer: taker,
      config,
      expectedLamports: LAMPORTS_PER_SOL,
      marginNr,
    });

    // --------------------------------------- sell

    //after: takerSell = 1, takerBuy = 2, cap = 1, left till cap = 2
    await testSellNft({
      whitelist,
      wlNft: wlNft1,
      ata: ata1,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //after: takerSell = 2, takerBuy = 2, cap = 1, left till cap = 1
    await testSellNft({
      whitelist,
      wlNft: wlNft2,
      ata: ata2,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //after: takerSell = 3, takerBuy = 2, cap = 1, left till cap = 0
    await testSellNft({
      whitelist,
      wlNft: wlNft3,
      ata: ata3,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft4,
        ata: ata4,
        nftAuthPda,
        poolPda,
        sellType: "trade",
        owner,
        seller: taker,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));
  });

  it("maxTakerSellCount (market-making pool, with attaching/detaching margin)", async () => {
    const [owner, taker] = await makeNTraders({ n: 2 });
    const { mint: mint1, ata: ata1 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint2, ata: ata2 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint3, ata: ata3 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const { mint: mint4, ata: ata4 } = await makeMintTwoAta({
      owner: taker,
      other: owner,
    });
    const {
      mint: mint5,
      ata: ata5,
      otherAta: otherAta5,
    } = await makeMintTwoAta({ owner: owner, other: taker });
    const {
      mint: mint6,
      ata: ata6,
      otherAta: otherAta6,
    } = await makeMintTwoAta({ owner: owner, other: taker });
    const {
      proofs: [wlNft1, wlNft2, wlNft3, wlNft4, wlNft5, wlNft6],
      whitelist,
    } = await makeProofWhitelist(
      [mint1, mint2, mint3, mint4, mint5, mint6],
      100
    );
    const { marginNr, marginPda, marginRent } = await testMakeMargin({
      owner,
    });

    // --------------------------------------- allowed sell count 1

    //make the pool with no delta / mm fee so that math is easy
    const config = { ...tradePoolConfig, delta: new BN(0), mmFeeBps: 0 };
    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
      maxTakerSellCount: 1,
    });
    const expectedLamports = LAMPORTS_PER_SOL;
    const minLamports = adjustSellMinLamports(false, expectedLamports, 0);

    await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
      poolsAttached: 1,
    });

    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: expectedLamports * 10, //more than enough
    });

    // --------------------------------------- buy

    //after: takerSell = 0, takerBuy = 1, cap = 1, left till cap = 2
    await testDepositNft({
      nftAuthPda,
      pool: poolPda,
      config,
      owner,
      ata: ata5,
      wlNft: wlNft5,
      whitelist,
    });
    await testBuyNft({
      pool: poolPda,
      wlNft: wlNft5,
      whitelist,
      otherAta: otherAta5,
      owner,
      buyer: taker,
      config,
      expectedLamports: LAMPORTS_PER_SOL,
      marginNr,
    });

    // --------------------------------------- sell

    //after: takerSell = 1, takerBuy = 1, cap = 1, left till cap = 1
    await testSellNft({
      whitelist,
      wlNft: wlNft1,
      ata: ata1,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //after: takerSell = 2, takerBuy = 1, cap = 1, left till cap = 0
    await testSellNft({
      whitelist,
      wlNft: wlNft2,
      ata: ata2,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
      marginNr,
    });

    //try to sell again = fails
    await expect(
      testSellNft({
        whitelist,
        wlNft: wlNft4,
        ata: ata4,
        nftAuthPda,
        poolPda,
        sellType: "trade",
        owner,
        seller: taker,
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
        marginNr,
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("MaxTakerSellCountExceeded"));

    //detach margin
    await testDetachPoolFromMargin({
      owner,
      config,
      whitelist,
      marginNr,
      poolsAttached: 0,
    });

    //fund escrow since we detached margin
    await testDepositSol({
      pool: poolPda,
      config,
      owner,
      lamports: expectedLamports * 10, //more than enough
      whitelist,
    });

    //sell one more, shifting cap into negative
    //after: takerSell = 3, takerBuy = 1, cap = 1, left till cap = -1
    await testSellNft({
      whitelist,
      wlNft: wlNft3,
      ata: ata3,
      nftAuthPda,
      poolPda,
      sellType: "trade",
      owner,
      seller: taker,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
    });

    //cap still at 1
    let pool = await swapSdk.fetchPool(poolPda);
    expect(pool.maxTakerSellCount).to.equal(1);

    //attach margin again
    await testAttachPoolToMargin({
      config,
      marginNr,
      owner,
      whitelist,
      poolsAttached: 1,
    });

    //cap should reset to 3 - 1 = 2;
    pool = await swapSdk.fetchPool(poolPda);
    expect(pool.maxTakerSellCount).to.equal(2);
  });

  it("editing pool transfers stats & balances ok", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, buyer }, marginated] of cartesian(
      [
        { owner: traderA, buyer: traderB },
        { owner: traderB, buyer: traderA },
      ],
      [true, false]
    )) {
      const config = {
        ...tradePoolConfig,
        delta: new BN(LAMPORTS_PER_SOL / 10),
        mmFeeBps: 2500,
      };
      const {
        mint: mintA,
        ata: ataA,
        otherAta: otherAtaA,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      //make pool + deposit 1st nft + make 1st buy
      const { poolPda: pool, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });

      let marginNr;
      let marginPda: PublicKey | undefined;
      if (
        marginated &&
        castPoolTypeAnchor(config.poolType) === PoolType.Trade
      ) {
        ({ marginNr, marginPda } = await testMakeMargin({
          owner,
        }));
        await testAttachPoolToMargin({
          config,
          marginNr,
          owner,
          whitelist,
          poolsAttached: 1,
        });
      }

      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        marginNr,
      });

      //edit pool + deposit 2nd nft + make 2nd buy
      const newConfig1 = {
        ...config,
        startingPrice: new BN(2 * LAMPORTS_PER_SOL),
      };
      const { newPoolPda: newPoolPda1 } = await testEditPool({
        tswap,
        owner,
        newConfig: newConfig1,
        oldConfig: config,
        whitelist,
      });

      await testDepositNft({
        pool: newPoolPda1,
        nftAuthPda,
        owner,
        config: newConfig1,
        whitelist,
        wlNft: wlNftB,
        ata: ataB,
      });
      await testBuyNft({
        pool: newPoolPda1,
        wlNft: wlNftB,
        whitelist,
        otherAta: otherAtaB,
        owner,
        buyer,
        config: newConfig1,
        expectedLamports: 2 * LAMPORTS_PER_SOL,
        marginNr,
      });

      //edit pool final time
      const newConfig2 = {
        ...config,
        startingPrice: new BN(3 * LAMPORTS_PER_SOL),
      };
      const { newPoolAcc: newPoolAcc2, newSolEscrowPda: newSolEscrowPda2 } =
        await testEditPool({
          tswap,
          owner,
          newConfig: newConfig2,
          oldConfig: newConfig1,
          whitelist,
        });

      //one final manual check
      expect(newPoolAcc2.nftsHeld).eq(0);
      expect(newPoolAcc2.takerBuyCount).eq(0);
      expect(newPoolAcc2.stats.takerBuyCount).eq(2);
      expect(newPoolAcc2.stats.takerSellCount).eq(0);
      expect(newPoolAcc2.stats.accumulatedMmProfit.toNumber()).eq(
        (3 * LAMPORTS_PER_SOL * 2500) / HUNDRED_PCT_BPS
      );
      expect(await getLamports(newSolEscrowPda2)).eq(
        (await swapSdk.getSolEscrowRent()) +
          (marginated ? 0 : 3 * LAMPORTS_PER_SOL * (1 + MAKER_REBATE_PCT))
      );
      if (marginPda) {
        expect(await getLamports(marginPda)).eq(
          (await swapSdk.getMarginAccountRent()) +
            (marginated ? 3 * LAMPORTS_PER_SOL * (1 + MAKER_REBATE_PCT) : 0)
        );
      }
    }
  });

  it("edited pool buys nft ok", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const { mint, ata } = await makeMintTwoAta({ owner: seller, other: owner });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeProofWhitelist([mint]);
    const config = tokenPoolConfig;

    //create pool
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    //deposit sol
    const depositedLamports = 2 * LAMPORTS_PER_SOL;
    await testDepositSol({
      pool,
      whitelist,
      owner,
      config,
      lamports: depositedLamports,
    });

    //edit pool
    const newPrice = depositedLamports; //initial was 1 SOL
    const newConfig = {
      ...config,
      startingPrice: new BN(newPrice),
    };

    const { newPoolPda } = await testEditPool({
      tswap,
      owner,
      newConfig,
      oldConfig: config,
      whitelist,
    });

    await testSellNft({
      ata,
      config: newConfig,
      expectedLamports: newPrice,
      nftMint: mint,
      nftAuthPda,
      owner,
      poolPda: newPoolPda,
      sellType: "token",
      seller,
      whitelist,
      wlNft,
    });
  });

  it("editing isCosigned works", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const { mint, ata } = await makeMintTwoAta({ owner: seller, other: owner });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeProofWhitelist([mint]);
    const config = tokenPoolConfig;

    //create pool
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    //deposit sol
    const depositedLamports = 2 * LAMPORTS_PER_SOL;
    await testDepositSol({
      pool,
      whitelist,
      owner,
      config,
      lamports: depositedLamports,
    });

    //edit pool
    const newPrice = depositedLamports; //initial was 1 SOL
    const newConfig = {
      ...config,
      startingPrice: new BN(newPrice),
    };

    const { newPoolPda } = await testEditPool({
      tswap,
      owner,
      newConfig,
      oldConfig: config,
      whitelist,
      isCosigned: true,
    });

    //fails w/o cosigner
    await expect(
      testSellNft({
        ata,
        config: newConfig,
        expectedLamports: newPrice,
        nftMint: mint,
        nftAuthPda,
        owner,
        poolPda: newPoolPda,
        sellType: "token",
        seller,
        whitelist,
        wlNft,
      })
    ).to.be.rejectedWith("insufficient account keys for instruction");

    //succeeds with
    await testSellNft({
      ata,
      config: newConfig,
      expectedLamports: newPrice,
      nftMint: mint,
      nftAuthPda,
      owner,
      poolPda: newPoolPda,
      sellType: "token",
      seller,
      whitelist,
      wlNft,
      isCosigned: true,
    });
  });

  it("edited pool sells nft ok", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    const { mint, ata, otherAta } = await makeMintTwoAta({
      owner: owner,
      other: buyer,
    });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeProofWhitelist([mint]);
    const config = nftPoolConfig;

    //create pool
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    //deposit nft
    await testDepositNft({
      pool,
      nftAuthPda,
      owner,
      config,
      whitelist,
      wlNft,
      ata,
    });

    //edit pool
    const newPrice = 2 * LAMPORTS_PER_SOL; //initial was 1 SOL
    const newConfig = {
      ...config,
      startingPrice: new BN(newPrice),
    };

    const { newPoolPda } = await testEditPool({
      tswap,
      owner,
      newConfig,
      oldConfig: config,
      whitelist,
    });

    await testBuyNft({
      otherAta,
      config: newConfig,
      expectedLamports: newPrice,
      owner,
      pool: newPoolPda,
      buyer,
      whitelist,
      wlNft,
    });
  });

  it("editing pool fails due to diff pool types", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundAta({ owner });
        const { whitelist } = await makeProofWhitelist([mint]);

        // --------------------------------------- init new pool
        const { poolPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        const pool = await swapSdk.fetchPool(poolPda);
        const dateMs = pool.createdUnixSeconds.toNumber() * 1000;
        console.log(`pool created: ${new Date(dateMs)}`);
        // This should be within 3 days (max clock drift historical) of the current time.
        expect(dateMs).gte(Date.now() - 3 * 86400 * 1000);

        // --------------------------------------- edit it

        //intentionally selects the wrong pooltype
        const _swapPoolType = (
          poolType: typeof PoolTypeAnchor[keyof typeof PoolTypeAnchor]
        ): typeof PoolTypeAnchor[keyof typeof PoolTypeAnchor] => {
          if (castPoolTypeAnchor(poolType) === PoolType.NFT) {
            return PoolTypeAnchor.Token;
          }
          return PoolTypeAnchor.NFT;
        };

        const newConfig = {
          ...config,
          delta: new BN(0),
          poolType: _swapPoolType(config.poolType),
        };

        await expect(
          testEditPool({
            tswap,
            owner,
            newConfig,
            oldConfig: config,
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
      })
    );
  });

  //#endregion

  //#region MM Profit Accounting.

  it("correctly account for MM profit", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      const config = {
        ...tradePoolConfig,
        delta: new BN(LAMPORTS_PER_SOL / 10),
        mmFeeBps: 2500,
      };
      const {
        mint: mintA,
        ata: ataA,
        otherAta: otherAtaA,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      //make pool + deposit 1st nft + make 1st buy
      const { poolPda: pool, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });
      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataB,
        wlNft: wlNftB,
        whitelist,
      });

      //taker buys 1
      const mmProfit1 = LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc1 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
      });
      expect(poolAcc1.stats.accumulatedMmProfit.toNumber()).eq(mmProfit1);

      //taker sells 1
      //since the pool sold 1 nft before, the price went up by 1 delta, but the purchase price is 1 notch lower, ie it's the same
      const mmProfit2 = mmProfit1;
      const { poolAcc: poolAcc2 } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
      });
      expect(poolAcc2.stats.accumulatedMmProfit.toNumber()).eq(mmProfit2);

      //taker buys 2
      const mmProfit3 = mmProfit2 + LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc3 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
      });
      expect(poolAcc3.stats.accumulatedMmProfit.toNumber()).eq(mmProfit3);

      //taker buys 3
      const mmProfit4 = mmProfit3 + LAMPORTS_PER_SOL * 1.1 * 0.25;
      const { poolAcc: poolAcc4 } = await testBuyNft({
        pool,
        wlNft: wlNftB,
        whitelist,
        otherAta: otherAtaB,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL * 1.1,
      });
      expect(poolAcc4.stats.accumulatedMmProfit.toNumber()).eq(mmProfit4);

      //taker sells 2
      const mmProfit5 = mmProfit4;
      const { poolAcc: poolAcc5 } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config,
        expectedLamports: LAMPORTS_PER_SOL * 1.1,
        minLamports: LAMPORTS_PER_SOL * 1.1 * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
      });
      expect(poolAcc5.stats.accumulatedMmProfit.toNumber()).eq(mmProfit5);

      //taker sells 3
      const mmProfit6 = mmProfit5;
      const { poolAcc: poolAcc6 } = await testSellNft({
        nftMint: mintB,
        ata: otherAtaB,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftB,
      });
      expect(poolAcc6.stats.accumulatedMmProfit.toNumber()).eq(mmProfit6);
    }
  });

  it("tries to creates 2x pools with same nft_auth", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundAta({ owner });
        const { whitelist } = await makeProofWhitelist([mint]);

        //creates pool once
        const { authSeed, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });

        //fails to create again with the same seed
        const {
          tx: { ixs },
        } = await swapSdk.initPool({
          owner: owner.publicKey,
          whitelist,
          customAuthSeed: authSeed,
          config: { ...config, delta: new BN(0) }, //change up the config
        });
        await expect(
          buildAndSendTx({
            ixs,
            extraSigners: [owner],
          })
        )
          .rejectedWith("0x0")
          .then((e) =>
            expect(
              JSON.stringify(e).includes(
                `Allocate: account Address { address: ${nftAuthPda.toBase58()}, base: None } already in use}`
              )
            )
          );
      })
    );
  });

  //endregion

  //#region MM Segregated fees.

  it("correctly handles & withdraws segregated MM profit (normal and marginated)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    for (const [{ owner, buyer }, marginated] of cartesian(
      [
        { owner: traderA, buyer: traderB },
        { owner: traderB, buyer: traderA },
      ],
      [true, false]
    )) {
      const config = {
        ...tradePoolConfig,
        delta: new BN(LAMPORTS_PER_SOL / 10),
        mmFeeBps: 2500,
        mmCompoundFees: false, //<-- important
      };
      const {
        mint: mintA,
        ata: ataA,
        otherAta: otherAtaA,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      let marginNr = undefined;
      let marginPda: PublicKey | undefined;
      if (marginated) {
        ({ marginNr, marginPda } = await testMakeMargin({
          owner,
        }));
      }

      //make pool + deposit 1st nft + make 1st buy
      const { poolPda: pool, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });

      if (marginated) {
        await testAttachPoolToMargin({
          config,
          marginNr: marginNr!,
          owner,
          whitelist,
          poolsAttached: 1,
        });
      }

      const poolRent = await swapSdk.getPoolRent();

      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataB,
        wlNft: wlNftB,
        whitelist,
      });

      //taker buys 1
      const mmProfit1 = LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc1 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        marginNr,
      });
      expect(poolAcc1.stats.accumulatedMmProfit.toNumber()).eq(mmProfit1);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit1);

      //taker sells 1
      //since the pool sold 1 nft before, the price went up by 1 delta, but the purchase price is 1 notch lower, ie it's the same
      const mmProfit2 = mmProfit1;
      const { poolAcc: poolAcc2 } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
        marginNr,
      });
      expect(poolAcc2.stats.accumulatedMmProfit.toNumber()).eq(mmProfit2);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit2);

      //taker buys 2
      const mmProfit3 = mmProfit2 + LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc3 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        marginNr,
      });
      expect(poolAcc3.stats.accumulatedMmProfit.toNumber()).eq(mmProfit3);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit3);

      //taker buys 3
      const mmProfit4 = mmProfit3 + LAMPORTS_PER_SOL * 1.1 * 0.25;
      const { poolAcc: poolAcc4 } = await testBuyNft({
        pool,
        wlNft: wlNftB,
        whitelist,
        otherAta: otherAtaB,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL * 1.1,
        marginNr,
      });
      expect(poolAcc4.stats.accumulatedMmProfit.toNumber()).eq(mmProfit4);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit4);

      //taker sells 2
      const mmProfit5 = mmProfit4;
      const { poolAcc: poolAcc5 } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config,
        expectedLamports: LAMPORTS_PER_SOL * 1.1,
        minLamports: LAMPORTS_PER_SOL * 1.1 * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
        marginNr,
      });
      expect(poolAcc5.stats.accumulatedMmProfit.toNumber()).eq(mmProfit5);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit5);

      //taker sells 3
      const mmProfit6 = mmProfit5;
      const { poolAcc: poolAcc6 } = await testSellNft({
        nftMint: mintB,
        ata: otherAtaB,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftB,
        marginNr,
      });
      expect(poolAcc6.stats.accumulatedMmProfit.toNumber()).eq(mmProfit6);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit6);

      const ownerCurrent = (await getLamports(owner.publicKey))!;

      const withdrawFees = async (lamports: BN) => {
        const {
          tx: { ixs },
        } = await swapSdk.withdrawMmFee({
          whitelist,
          config,
          owner: owner.publicKey,
          lamports,
        });
        await buildAndSendTx({ ixs, extraSigners: [owner] });
      };

      //try to withdraw too much
      await expect(withdrawFees(new BN(mmProfit6 + 1))).to.be.rejectedWith(
        COMMON_INSUFFICIENT_FUNDS_ERR
      );

      //try to withdraw a little
      await withdrawFees(new BN(1));
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit6 - 1);
      expect(await getLamports(owner.publicKey)).to.eq(ownerCurrent + 1);

      //try to withdraw everything
      await withdrawFees(new BN(mmProfit6 - 1));
      expect(await getLamports(pool)).to.eq(poolRent);
      expect(await getLamports(owner.publicKey)).to.eq(
        ownerCurrent + mmProfit6
      );

      //try to withdraw again
      await expect(withdrawFees(new BN(1))).to.be.rejectedWith(
        COMMON_INSUFFICIENT_FUNDS_ERR
      );
    }
  });

  it("editing works for segregated MM pools (normal and marginated)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    for (const [{ owner, buyer }, marginated] of cartesian(
      [
        { owner: traderA, buyer: traderB },
        { owner: traderB, buyer: traderA },
      ],
      [true, false]
    )) {
      const config = {
        ...tradePoolConfig,
        delta: new BN(LAMPORTS_PER_SOL / 10),
        mmFeeBps: 2500,
        mmCompoundFees: false, //<-- important
      };
      const {
        mint: mintA,
        ata: ataA,
        otherAta: otherAtaA,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      let marginNr = undefined;
      let marginPda: PublicKey | undefined;
      if (marginated) {
        ({ marginNr, marginPda } = await testMakeMargin({
          owner,
        }));
      }

      //make pool + deposit 1st nft + make 1st buy
      const { poolPda: pool, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });

      if (marginated) {
        await testAttachPoolToMargin({
          config,
          marginNr: marginNr!,
          owner,
          whitelist,
          poolsAttached: 1,
        });
      }

      const poolRent = await swapSdk.getPoolRent();

      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataB,
        wlNft: wlNftB,
        whitelist,
      });

      //taker buys 1
      const mmProfit1 = LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc1 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        marginNr,
      });
      expect(poolAcc1.stats.accumulatedMmProfit.toNumber()).eq(mmProfit1);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit1);

      //taker sells 1
      //since the pool sold 1 nft before, the price went up by 1 delta, but the purchase price is 1 notch lower, ie it's the same
      const mmProfit2 = mmProfit1;
      const { poolAcc: poolAcc2 } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
        marginNr,
      });
      expect(poolAcc2.stats.accumulatedMmProfit.toNumber()).eq(mmProfit2);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit2);

      // --------------------------------------- not compounding

      //edit
      await testEditPool({
        oldConfig: config,
        owner,
        tswap,
        whitelist,
        mmCompoundFees: true, //<-- now compounding
      });

      //taker buys 2
      const mmProfit3 = mmProfit2;
      const mmProfit3Stats = mmProfit2 + LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc3 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config: { ...config, mmCompoundFees: true },
        expectedLamports: LAMPORTS_PER_SOL,
        marginNr,
      });
      expect(poolAcc3.stats.accumulatedMmProfit.toNumber()).eq(mmProfit3Stats);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit3);

      //taker sells 2
      const mmProfit4 = mmProfit3;
      const mmProfit4Stats = mmProfit3Stats;
      const { poolAcc: poolAcc4, solEscrowPda } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config: { ...config, mmCompoundFees: true },
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
        marginNr,
      });
      expect(poolAcc4.stats.accumulatedMmProfit.toNumber()).eq(mmProfit4Stats);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit4);

      // --------------------------------------- not compounding

      //edit
      await testEditPool({
        oldConfig: config,
        owner,
        tswap,
        whitelist,
        mmCompoundFees: false, //<-- again not compounding
      });

      //taker buys 3
      const mmProfit5 = mmProfit4 + LAMPORTS_PER_SOL * 0.25;
      const mmProfit5Stats = mmProfit4Stats + LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc5 } = await testBuyNft({
        pool,
        wlNft: wlNftB,
        whitelist,
        otherAta: otherAtaB,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        marginNr,
      });
      expect(poolAcc5.stats.accumulatedMmProfit.toNumber()).eq(mmProfit5Stats);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit5);

      //taker sells 3
      const mmProfit6 = mmProfit5;
      const mmProfit6Stats = mmProfit5Stats;
      const { poolAcc: poolAcc6 } = await testSellNft({
        nftMint: mintB,
        ata: otherAtaB,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftB,
        marginNr,
      });
      expect(poolAcc6.stats.accumulatedMmProfit.toNumber()).eq(mmProfit6Stats);
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit6);

      //edit
      await testEditPool({
        oldConfig: config,
        owner,
        tswap,
        whitelist,
        mmCompoundFees: true, //<-- again compounding
      });

      const ownerCurrent = (await getLamports(owner.publicKey))!;

      //should still be able to withdraw fees!

      const withdrawFees = async (lamports: BN) => {
        const {
          tx: { ixs },
        } = await swapSdk.withdrawMmFee({
          whitelist,
          config,
          owner: owner.publicKey,
          lamports,
        });
        await buildAndSendTx({ ixs, extraSigners: [owner] });
      };

      //try to withdraw too much
      await expect(withdrawFees(new BN(mmProfit6 + 1))).to.be.rejectedWith(
        COMMON_INSUFFICIENT_FUNDS_ERR
      );

      //try to withdraw a little
      await withdrawFees(new BN(1));
      expect(await getLamports(pool)).to.eq(poolRent + mmProfit6 - 1);
      expect(await getLamports(owner.publicKey)).to.eq(ownerCurrent + 1);

      //try to withdraw everything
      await withdrawFees(new BN(mmProfit6 - 1));
      expect(await getLamports(pool)).to.eq(poolRent);
      expect(await getLamports(owner.publicKey)).to.eq(
        ownerCurrent + mmProfit6
      );

      //try to withdraw again
      await expect(withdrawFees(new BN(1))).to.be.rejectedWith(
        COMMON_INSUFFICIENT_FUNDS_ERR
      );
    }
  });

  it("fails to withdraw segregated MM profit from a compounded account", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      const config = {
        ...tradePoolConfig,
        delta: new BN(LAMPORTS_PER_SOL / 10),
        mmFeeBps: 2500,
        mmCompoundFees: true, //<-- important
      };
      const {
        mint: mintA,
        ata: ataA,
        otherAta: otherAtaA,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta({ owner: owner, other: buyer });
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      //make pool + deposit 1st nft + make 1st buy
      const { poolPda: pool, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });
      const poolRent = await swapSdk.getPoolRent();

      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata: ataB,
        wlNft: wlNftB,
        whitelist,
      });

      //taker buys 1
      const mmProfit1 = LAMPORTS_PER_SOL * 0.25;
      const { poolAcc: poolAcc1 } = await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
      });
      expect(poolAcc1.stats.accumulatedMmProfit.toNumber()).eq(mmProfit1);
      expect(await getLamports(pool)).to.eq(poolRent); //<-- no profit into pool

      //taker sells 1
      //since the pool sold 1 nft before, the price went up by 1 delta, but the purchase price is 1 notch lower, ie it's the same
      const mmProfit2 = mmProfit1;
      const { poolAcc: poolAcc2 } = await testSellNft({
        nftMint: mintA,
        ata: otherAtaA,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL * 0.75,
        nftAuthPda,
        owner,
        poolPda: pool,
        sellType: "trade",
        seller: buyer,
        whitelist,
        wlNft: wlNftA,
      });
      expect(poolAcc2.stats.accumulatedMmProfit.toNumber()).eq(mmProfit2);
      expect(await getLamports(pool)).to.eq(poolRent); //<-- no profit into pool

      //it will try to withdraw but will get 0 out
      const prevOwner = await getLamports(owner.publicKey);
      const {
        tx: { ixs },
      } = await swapSdk.withdrawMmFee({
        whitelist,
        config,
        owner: owner.publicKey,
        lamports: new BN(1),
      });
      await expect(
        buildAndSendTx({ ixs, extraSigners: [owner] })
      ).to.be.rejectedWith(COMMON_INSUFFICIENT_FUNDS_ERR);
    }
  });

  //endregion
});

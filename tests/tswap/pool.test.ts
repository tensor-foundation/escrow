import {
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  CurveTypeAnchor,
  getLamports,
  HUNDRED_PCT_BPS,
  PoolTypeAnchor,
  swapSdk,
  TEST_PROVIDER,
  withLamports,
} from "../shared";
import {
  adjustSellMinLamports,
  beforeHook,
  createAndFundATA,
  defaultSellExpectedLamports,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testBuyNft,
  testClosePool,
  testDepositNft,
  testDepositSol,
  testEditPool,
  testMakePool,
  testMakePoolBuyNft,
  testMakePoolSellNft,
  testSellNft,
  tokenPoolConfig,
  tradePoolConfig,
  TSWAP_CONFIG,
  TSWAP_FEE_PCT,
} from "./common";
import { castPoolTypeAnchor, findNftAuthorityPDA, PoolType } from "../../src";

describe("tswap pool", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Create pool.

  it("pool adds the created unix timestamp (in seconds)", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
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

  it("cannot init pool without royalties", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
        const { whitelist } = await makeProofWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              honorRoyalties: false,
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("RoyaltiesEnabled"));
      })
    );
  });

  it("cannot init exponential pool with 100% delta", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
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
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
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
    const [owner] = await makeNTraders(1);
    const config = tradePoolConfig;
    const { mint } = await createAndFundATA(owner);
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
        { mmFeeBps: 9901, fail: true },
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
    const [owner] = await makeNTraders(1);
    const { mint } = await createAndFundATA(owner);
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
          commitment: "confirmed",
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
          commitment: "confirmed",
        });

        // Edit/move stuff back so we can use the old pool/config again.
        await testEditPool({
          tswap,
          owner,
          newConfig: config,
          oldConfig: newConfig,
          whitelist,
          commitment: "confirmed",
        });

        const { sig: closeSig } = await testClosePool({
          owner,
          config,
          whitelist,
          commitment: "confirmed",
        });

        for (const { sig, name } of [
          { sig: initSig, name: "initPool" },
          { sig: editSig, name: "editPool" },
          { sig: closeSig, name: "closePool" },
        ]) {
          const tx = (await TEST_PROVIDER.connection.getTransaction(sig, {
            commitment: "confirmed",
          }))!;
          expect(tx).not.null;
          const ixs = swapSdk.parseIxs(tx);
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
    const [owner] = await makeNTraders(1);
    for (const [config, lamports] of cartesian(
      [tokenPoolConfig, tradePoolConfig],
      [0, 69 * LAMPORTS_PER_SOL]
    )) {
      const { mint } = await createAndFundATA(owner);
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
    const [owner, buyer] = await makeNTraders(2);
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

        const expected =
          // Proceeds from sale, minus the rent we paid to create the mint + ATA initially.
          buyPrice * (1 - TSWAP_FEE_PCT) -
          metaRent -
          editionRent -
          (await getMinimumBalanceForRentExemptMint(conn)) -
          // NB: for some reason if we close the ATA beforehand (and now have this adjustment)
          // the resulting amount credited differs depending on which tests run before this one (wtf??)
          (await getMinimumBalanceForRentExemptAccount(conn));
        // No addn from rent since we roundtrip it from deposit.

        // For some reason running this test by itself is fine, but running it with the other tests before
        // has a 10000 lamport difference.
        expect(diff).within(expected - 10000, expected);
      }
    );
  });

  it("close pool fails if nfts still deposited", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundATA(owner);
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
    const [owner, seller] = await makeNTraders(2);
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
    const [owner] = await makeNTraders(1);

    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
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
    const [owner, seller] = await makeNTraders(2);
    const { mint: mint1, ata: ata1 } = await makeMintTwoAta(seller, owner);
    const { mint: mint2, ata: ata2 } = await makeMintTwoAta(seller, owner);
    const { mint: mint3, ata: ata3 } = await makeMintTwoAta(seller, owner);
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

    await testDepositSol({
      pool: poolPda,
      config,
      owner,
      lamports: expectedLamports * 10, //more than enough
      whitelist,
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
    });
  });

  it("init/edit correctly handles maxTakerSellCount (use edit in place)", async () => {
    const [owner, seller] = await makeNTraders(2);
    const { mint: mint1, ata: ata1 } = await makeMintTwoAta(seller, owner);
    const { mint: mint2, ata: ata2 } = await makeMintTwoAta(seller, owner);
    const { mint: mint3, ata: ata3 } = await makeMintTwoAta(seller, owner);
    const {
      proofs: [wlNft1, wlNft2, wlNft3],
      whitelist,
    } = await makeProofWhitelist([mint1, mint2, mint3], 100);

    // --------------------------------------- allowed sell count 1

    //make the pool with no delta so that math is easy
    const config = { ...tokenPoolConfig, delta: new BN(0) };
    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
      maxTakerSellCount: 1,
    });
    const expectedLamports = defaultSellExpectedLamports(true);
    const minLamports = adjustSellMinLamports(true, expectedLamports);

    await testDepositSol({
      pool: poolPda,
      config,
      owner,
      lamports: expectedLamports * 10, //more than enough
      whitelist,
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
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
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
        config,
        expectedLamports,
        minLamports,
        treeSize: 100,
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
      wlNft: wlNft3,
      ata: ata3,
      nftAuthPda,
      poolPda: newPoolPda2,
      sellType: "token",
      owner,
      seller,
      config,
      expectedLamports,
      minLamports,
      treeSize: 100,
    });
  });

  it("editing pool transfers stats ok", async () => {
    const [traderA, traderB] = await makeNTraders(2);
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
      } = await makeMintTwoAta(owner, buyer);
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta(owner, buyer);
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
      await testBuyNft({
        pool,
        wlNft: wlNftA,
        whitelist,
        otherAta: otherAtaA,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
      });

      //edit pool + deposit 2nd nft + make 2nd buy
      const mmProfit1 = (LAMPORTS_PER_SOL * 0.25) / 2;
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
      });

      //edit pool final time
      const mmProfit2 = (LAMPORTS_PER_SOL * 2 * 0.25) / 2;
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
        mmProfit1 + mmProfit2
      );
      expect(await getLamports(newSolEscrowPda2)).eq(
        (await swapSdk.getSolEscrowRent()) +
          3 * LAMPORTS_PER_SOL * (1 - TSWAP_CONFIG.feeBps / HUNDRED_PCT_BPS)
      );
    }
  });

  it("edited pool buys nft ok", async () => {
    const [owner, seller] = await makeNTraders(2);
    const { mint, ata } = await makeMintTwoAta(seller, owner);
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
    const [owner, seller] = await makeNTraders(2);
    const { mint, ata } = await makeMintTwoAta(seller, owner);
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
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadCosigner"));

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
    const [owner, buyer] = await makeNTraders(2);
    const { mint, ata, otherAta } = await makeMintTwoAta(owner, buyer);
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
    const [owner] = await makeNTraders(1);

    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
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
    const [traderA, traderB] = await makeNTraders(2);
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
      } = await makeMintTwoAta(owner, buyer);
      const {
        mint: mintB,
        ata: ataB,
        otherAta: otherAtaB,
      } = await makeMintTwoAta(owner, buyer);
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
      const mmProfit1 = (LAMPORTS_PER_SOL * 0.25) / 2;
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
      const mmProfit2 = mmProfit1 + (LAMPORTS_PER_SOL * 0.25) / 2;
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
      const mmProfit3 = mmProfit2 + (LAMPORTS_PER_SOL * 0.25) / 2;
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
      const mmProfit4 = mmProfit3 + (LAMPORTS_PER_SOL * 1.1 * 0.25) / 2;
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
      const mmProfit5 = mmProfit4 + (LAMPORTS_PER_SOL * 1.1 * 0.25) / 2;
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
      const mmProfit6 = mmProfit5 + (LAMPORTS_PER_SOL * 0.25) / 2;
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
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
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
});

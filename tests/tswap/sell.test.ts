import { BN, LangErrorCode } from "@project-serum/anchor";
import { closeAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  CurveTypeAnchor,
  hexCode,
  INTEGER_OVERFLOW_ERR,
  PoolConfigAnchor,
  PoolTypeAnchor,
  swapSdk,
  TakerSide,
  TEST_PROVIDER,
} from "../shared";
import { testInitUpdateMintProof } from "../twhitelist/common";
import {
  adjustSellMinLamports,
  beforeHook,
  computeDepositAmount,
  computeTakerPrice,
  createAndFundATA,
  defaultSellExpectedLamports,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testDepositSol,
  testMakePool,
  testMakePoolSellNft,
  tokenPoolConfig,
  tradePoolConfig,
  TSWAP_FEE,
} from "./common";

describe("tswap sell", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  it("sell into token/trade pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const expectedLamports = defaultSellExpectedLamports(
        config === tokenPoolConfig
      );
      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(
          config === tokenPoolConfig,
          expectedLamports
        ),
      });
    }
  });

  it("sell at lower min price works (a steal!)", async () => {
    const [owner, seller] = await makeNTraders(2);

    // needs to be serial ugh
    for (const [config, price] of cartesian(
      [tokenPoolConfig, tradePoolConfig],
      [0.99 * LAMPORTS_PER_SOL, 0.01 * LAMPORTS_PER_SOL]
    )) {
      const isToken = config === tokenPoolConfig;
      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports: defaultSellExpectedLamports(isToken),
        minLamports: isToken
          ? price
          : adjustSellMinLamports(isToken, price - 1234),
      });
    }
  });

  it("sell into token pool inits owner's ATA", async () => {
    const [owner, seller] = await makeNTraders(2);
    const config = tokenPoolConfig;

    const { mint, ata } = await createAndFundATA(seller);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      whitelist,
      config,
    });
    await testDepositSol({
      pool,
      config,
      owner,
      lamports: LAMPORTS_PER_SOL,
      whitelist,
    });

    await testInitUpdateMintProof({
      user: seller,
      mint,
      whitelist,
      proof: wlNft.proof,
    });

    const {
      tx: { ixs },
      ownerAtaAcc,
    } = await swapSdk.sellNft({
      type: "token",
      whitelist,
      nftMint: wlNft.mint,
      nftSellerAcc: ata,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      proof: wlNft.proof,
      minPrice: new BN(LAMPORTS_PER_SOL),
    });

    // Ensure ATA is closed to begin with.
    try {
      await getAccount(ownerAtaAcc);
      await closeAccount(
        TEST_PROVIDER.connection,
        owner,
        ownerAtaAcc,
        owner.publicKey,
        owner
      );
    } catch (err) {
      if (!(err instanceof TokenAccountNotFoundError)) throw err;
    }
    // Now seller sells into pool.
    await buildAndSendTx({
      ixs,
      extraSigners: [seller],
    });
    // Owner should have ATA now.
    expect((await getAccount(ownerAtaAcc)).amount.toString()).eq("1");
  });

  it("sell into token/trade pool works with royalties (both < & > 0.9%)", async () => {
    const [owner, seller] = await makeNTraders(2);

    // Intentionally do this serially (o/w balances will race).
    for (const [royaltyBps, config] of cartesian(
      [50, 1000],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(isToken, expectedLamports),
        royaltyBps,
        creators,
      });
    }
  });

  it("sell into token/trade pool works with royalties (check for InsufficientFundsForRent)", async () => {
    const [owner, seller] = await makeNTraders(2);

    // Intentionally do this serially (o/w balances will race).
    for (const [royaltyBps, config] of cartesian(
      [50, 1000],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      //want tiny royalties to cause error
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 1 }));
      creators[0].share = 96;

      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(isToken, expectedLamports),
        royaltyBps,
        creators,
      });
    }
  });

  // We add this test since <= v0.1.29 we passed in mint proof in the ix.
  // > v0.1.29 we use a mint proof PDA.
  it("sell nft with creators + long proof works", async () => {
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      const [owner, seller] = await makeNTraders(2);

      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(isToken, expectedLamports),
        royaltyBps: 50,
        creators,
        treeSize: 5_000,
      });
    }
  });

  it("sell into nft pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    for (const sellType of ["trade", "token"] as const) {
      await expect(
        testMakePoolSellNft({
          sellType,
          tswap,
          owner: traderA,
          seller: traderB,
          config: nftPoolConfig,
          expectedLamports: LAMPORTS_PER_SOL,
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
    }
  });

  it("sellNft(Trade|Token)Pool into (Token|Trade) pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    for (const sellType of ["trade", "token"] as const) {
      await expect(
        testMakePoolSellNft({
          sellType,
          tswap,
          owner: traderA,
          seller: traderB,
          // Reverse the pool type vs the sell instr type.
          config: sellType === "trade" ? tokenPoolConfig : tradePoolConfig,
          expectedLamports: LAMPORTS_PER_SOL,
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
    }
  });

  it("sell at higher price fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

    await Promise.all(
      cartesian(
        [
          { owner: traderA, seller: traderB },
          { owner: traderB, seller: traderA },
        ],
        [tokenPoolConfig, tradePoolConfig],
        [1.01 * LAMPORTS_PER_SOL, 1.5 * LAMPORTS_PER_SOL]
      ).map(async ([{ owner, seller }, config, price]) => {
        await expect(
          testMakePoolSellNft({
            sellType: config === tradePoolConfig ? "trade" : "token",
            tswap,
            owner,
            seller,
            config,
            expectedLamports: config === tokenPoolConfig ? price : price - 1234,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));
      })
    );
  });

  it("sell at price higher than price post MM fees but lower than base price fails", async () => {
    const [owner, seller] = await makeNTraders(2);
    const expectedLamports = defaultSellExpectedLamports(false);

    await expect(
      testMakePoolSellNft({
        sellType: "trade",
        tswap,
        owner,
        seller,
        config: tradePoolConfig,
        expectedLamports,
        // 1 higher than the expected minLamports.
        minLamports: adjustSellMinLamports(false, expectedLamports) + 1,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));
  });

  it("sell non-WL nft fails", async () => {
    await Promise.all(
      [tradePoolConfig, tokenPoolConfig].map(async (config) => {
        const [owner, seller] = await makeNTraders(2);
        const { mint, ata } = await makeMintTwoAta(seller, owner);
        const { mint: badMint, ata: badAta } = await makeMintTwoAta(
          seller,
          owner
        );
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);
        await testMakePool({ tswap, owner, whitelist, config });

        await testInitUpdateMintProof({
          user: seller,
          mint,
          whitelist,
          proof: wlNft.proof,
        });

        // All:
        // 1) non-WL mint + bad ATA
        // 2) non-WL mint + good ATA
        // 3) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: badAta,
            // No mint proof acct.
            // err: swapSdk.getErrorCodeHex("InvalidProof"),
            err: hexCode(LangErrorCode.AccountNotInitialized),
          },
          {
            currMint: badMint,
            currAta: ata,
            // No mint proof acct.
            // err: hexCode(LangErrorCode.ConstraintTokenMint),
            err: hexCode(LangErrorCode.AccountNotInitialized),
          },
          {
            currMint: mint,
            currAta: badAta,
            err: hexCode(LangErrorCode.ConstraintTokenMint),
          },
        ]) {
          const {
            tx: { ixs },
          } = await swapSdk.sellNft({
            type: config === tradePoolConfig ? "trade" : "token",
            whitelist,
            nftMint: currMint,
            nftSellerAcc: currAta,
            owner: owner.publicKey,
            seller: seller.publicKey,
            config,
            proof: wlNft.proof,
            minPrice: new BN(
              adjustSellMinLamports(
                config === tokenPoolConfig,
                defaultSellExpectedLamports(config === tokenPoolConfig)
              )
            ),
          });

          await expect(
            buildAndSendTx({
              ixs,
              extraSigners: [seller],
            })
          ).rejectedWith(err);
        }
      })
    );
  });

  it("sell below 0 is not possible", async () => {
    const [traderA, traderB] = await makeNTraders(2, 1_000_000);

    const numSells = 5;
    const baseConfig = {
      startingPrice: new BN(2),
      honorRoyalties: true,
    };
    await Promise.all(
      cartesian(
        [PoolTypeAnchor.Token, PoolTypeAnchor.Trade],
        [
          {
            ...baseConfig,
            curveType: CurveTypeAnchor.Linear,
            delta: new BN(3),
          },
          {
            ...baseConfig,
            curveType: CurveTypeAnchor.Exponential,
            delta: new BN(99_99),
          },
        ]
      ).map(async ([poolType, config]) => {
        const currConfig = {
          ...config,
          poolType,
          mmFeeBps: poolType === PoolTypeAnchor.Trade ? 0 : null,
        };
        const type =
          currConfig.poolType === PoolTypeAnchor.Trade ? "trade" : "token";
        const failOnIdx =
          currConfig.curveType === CurveTypeAnchor.Exponential
            ? // Exponential will asymptote be at 0: can always sell.
              null
            : // For linear curves: trade pools 1 tick lower so will 1 index earlier.
            poolType === PoolTypeAnchor.Token
            ? 1
            : 0;

        //prepare nfts
        const nfts = await Promise.all(
          new Array(numSells).fill(null).map(async () => {
            const {
              mint,
              ata: ataB,
              otherAta: ataA,
            } = await makeMintTwoAta(traderB, traderA);
            return { mint, ataA, ataB };
          })
        );

        //prepare tree & pool
        const { proofs, whitelist } = await makeWhitelist(
          nfts.map((nft) => nft.mint)
        );
        await testMakePool({
          tswap,
          owner: traderA,
          whitelist,
          config: currConfig,
        });

        // deposit
        const {
          tx: { ixs },
        } = await swapSdk.depositSol({
          whitelist,
          owner: traderA.publicKey,
          config: currConfig,
          lamports: new BN(LAMPORTS_PER_SOL),
        });
        await buildAndSendTx({
          ixs,
          extraSigners: [traderA],
        });

        for (const [idx, nft] of nfts.entries()) {
          const proof = proofs.find((p) => p.mint === nft.mint)!.proof;
          await testInitUpdateMintProof({
            user: traderB,
            mint: nft.mint,
            whitelist,
            proof,
          });
          const {
            tx: { ixs },
          } = await swapSdk.sellNft({
            type,
            whitelist,
            nftMint: nft.mint,
            nftSellerAcc: nft.ataB,
            owner: traderA.publicKey,
            seller: traderB.publicKey,
            config: currConfig,
            proof,
            minPrice: new BN(0),
          });

          const promise = buildAndSendTx({
            ixs,
            extraSigners: [traderB],
          });

          if (idx === failOnIdx) {
            await expect(promise).rejectedWith(INTEGER_OVERFLOW_ERR);
            break;
          }
          await promise;
        }
      })
    );
  });

  it("cannot sell when sol escrow eats into rent", async () => {
    const [owner, seller] = await makeNTraders(2);
    const { mint, ata } = await createAndFundATA(seller);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeWhitelist([mint]);

    // o/w we need to subtract more to trigger insufficient sol balance
    // b/c some balance is kept for MM.
    const noMmTradeConfig = {
      ...tradePoolConfig,
      mmFeeBps: 0,
    };

    await Promise.all(
      [tokenPoolConfig, noMmTradeConfig].map(async (config) => {
        const { poolPda: pool } = await testMakePool({
          tswap,
          owner,
          whitelist,
          config,
        });
        const expectedLamports =
          config === noMmTradeConfig
            ? LAMPORTS_PER_SOL - 1234
            : LAMPORTS_PER_SOL;
        await testDepositSol({
          pool,
          config,
          owner,
          // Deposit 1 lamport less than required.
          lamports: expectedLamports - 1,
          whitelist,
        });

        await testInitUpdateMintProof({
          user: seller,
          mint: wlNft.mint,
          whitelist,
          proof: wlNft.proof,
        });

        const {
          tx: { ixs },
        } = await swapSdk.sellNft({
          type: config === noMmTradeConfig ? "trade" : "token",
          whitelist,
          nftMint: wlNft.mint,
          nftSellerAcc: ata,
          owner: owner.publicKey,
          seller: seller.publicKey,
          config,
          proof: wlNft.proof,
          minPrice: new BN(expectedLamports),
        });

        // Selling into pool should trigger error.
        await expect(
          buildAndSendTx({
            ixs,
            extraSigners: [seller],
            debug: true,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("InsufficientSolEscrowBalance"));
      })
    );
  });

  it("alternate deposits & sells", async () => {
    const numSells = 10;
    const [traderA, traderB] = await makeNTraders(2);
    await Promise.all(
      cartesian(
        [PoolTypeAnchor.Token, PoolTypeAnchor.Trade],
        [CurveTypeAnchor.Linear, CurveTypeAnchor.Exponential]
      ).map(async ([poolType, curveType]) => {
        const config: PoolConfigAnchor = {
          poolType,
          curveType,
          // ~1.2 SOL (prime #)
          startingPrice: new BN(1_238_923_843),
          delta:
            curveType === CurveTypeAnchor.Linear
              ? new BN(1_238_923_843 / numSells)
              : // 10.21% (prime #)
                new BN(10_21),
          honorRoyalties: true,
          mmFeeBps: poolType === PoolTypeAnchor.Trade ? 0 : null,
        };

        //prepare multiple nfts
        const nfts = await Promise.all(
          new Array(numSells).fill(null).map(async () => {
            const {
              mint,
              ata: ataB,
              otherAta: ataA,
            } = await makeMintTwoAta(traderB, traderA);
            return { mint, ataA, ataB };
          })
        );

        //prepare tree & pool
        const { proofs, whitelist } = await makeWhitelist(
          nfts.map((nft) => nft.mint)
        );
        await testMakePool({ tswap, owner: traderA, whitelist, config });

        // This determines the sequence in which we do deposits & sells.
        // This should be length numSells.
        const sellWhenDepCount = [1, 3, 5, 5, 5, 7, 9, 10, 10, 10];
        const nftsToSell = [...nfts];
        let depCount = 0;
        let sellCount = 0;

        // deposit # nfts times.
        for (const _ of nfts) {
          const currDeposit = computeTakerPrice({
            config,
            buyCount: 0,
            sellCount: depCount,
            takerSide: TakerSide.Sell,
            // Reverse slippage when depositing (we want to deposit more, not less).
            slippage: curveType === CurveTypeAnchor.Linear ? 0 : -0.005,
          });

          const {
            tx: { ixs },
          } = await swapSdk.depositSol({
            whitelist,
            owner: traderA.publicKey,
            config: config,
            lamports: currDeposit,
          });
          await buildAndSendTx({
            ixs,
            extraSigners: [traderA],
          });
          depCount++;

          // Sell.
          while (
            sellCount < numSells &&
            sellWhenDepCount[sellCount] === depCount
          ) {
            const currPrice = computeTakerPrice({
              config,
              buyCount: 0,
              sellCount,
              takerSide: TakerSide.Sell,
            });
            sellCount++;

            // Sample a random NFT to sell.
            const targNft = nftsToSell.splice(
              Math.floor(Math.random() * nftsToSell.length),
              1
            )[0];

            const proof = proofs.find((p) => p.mint === targNft.mint)!.proof;
            await testInitUpdateMintProof({
              user: traderB,
              mint: targNft.mint,
              whitelist,
              proof,
            });

            const {
              tx: { ixs },
            } = await swapSdk.sellNft({
              type:
                config.poolType === PoolTypeAnchor.Trade ? "trade" : "token",
              whitelist,
              nftMint: targNft.mint,
              nftSellerAcc: targNft.ataB,
              owner: traderA.publicKey,
              seller: traderB.publicKey,
              config: config,
              proof,
              minPrice: currPrice,
            });
            await buildAndSendTx({
              ixs,
              extraSigners: [traderB],
            });
            console.debug(
              `sold nft (count: ${sellCount}, dep: ${depCount}) at ${currPrice.toNumber()}`
            );
          }
        }

        // Check NFTs have all been transferred.

        await Promise.all(
          nfts.map(async (nft) => {
            const traderAccB = await getAccount(nft.ataB);
            expect(traderAccB.amount.toString()).eq("0");
            // Just Token pools will send NFT directly to owner.
            if (poolType === PoolTypeAnchor.Token) {
              const traderAccA = await getAccount(nft.ataA);
              expect(traderAccA.amount.toString()).eq("1");
            }
          })
        );
      })
    );
  });

  it("sell a ton with default exponential curve + tolerance", async () => {
    // prime #
    const numSells = 109;

    const [traderA, traderB] = await makeNTraders(2, 1_000_000);
    const config: PoolConfigAnchor = {
      poolType: PoolTypeAnchor.Token,
      curveType: CurveTypeAnchor.Exponential,
      // ~2 SOL (prime #)
      startingPrice: new BN(2_083_195_757),
      // 17.21% (prime #)
      delta: new BN(17_21),
      honorRoyalties: true,
      mmFeeBps: null,
    };

    //prepare multiple nfts
    const nfts = await Promise.all(
      new Array(numSells).fill(null).map(async () => {
        const {
          mint,
          ata: ataB,
          otherAta: ataA,
        } = await makeMintTwoAta(traderB, traderA);
        return { mint, ataA, ataB };
      })
    );

    //prepare tree & pool
    const { proofs, whitelist } = await makeWhitelist(
      nfts.map((nft) => nft.mint)
    );
    await testMakePool({ tswap, owner: traderA, whitelist, config });

    // deposit enough SOL.
    const depositAmount = computeDepositAmount({
      config,
      nftCount: numSells,
    });
    const {
      tx: { ixs },
    } = await swapSdk.depositSol({
      whitelist,
      owner: traderA.publicKey,
      config,
      lamports: depositAmount,
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [traderA],
    });

    // sell NFTs (sequentially).
    for (const [sellCount, nft] of nfts.entries()) {
      const currPrice = computeTakerPrice({
        config,
        buyCount: 0,
        sellCount,
        takerSide: TakerSide.Sell,
      });

      const proof = proofs.find((p) => p.mint === nft.mint)!.proof;
      await testInitUpdateMintProof({
        user: traderB,
        mint: nft.mint,
        whitelist,
        proof,
        expectedProofLen: 8,
      });

      const {
        tx: { ixs },
      } = await swapSdk.sellNft({
        type: "token",
        whitelist,
        nftMint: nft.mint,
        nftSellerAcc: nft.ataB,
        owner: traderA.publicKey,
        seller: traderB.publicKey,
        config: config,
        proof,
        minPrice: currPrice,
      });
      await buildAndSendTx({
        ixs,
        extraSigners: [traderB],
      });
      console.debug(
        `sold nft (count: ${sellCount}) at ${currPrice.toNumber()}`
      );
    }

    // Check NFTs have all been transferred.
    await Promise.all(
      nfts.map(async (nft) => {
        const traderAccB = await getAccount(nft.ataB);
        expect(traderAccB.amount.toString()).eq("0");
        const traderAccA = await getAccount(nft.ataA);
        expect(traderAccA.amount.toString()).eq("1");
      })
    );
  });

  it("properly parses raw sell tx", async () => {
    const [owner, seller] = await makeNTraders(2);

    for (const { config, name } of [
      { config: tradePoolConfig, name: "sellNftTradePool" },
      { config: tokenPoolConfig, name: "sellNftTokenPool" },
    ]) {
      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);
      const minLamports = adjustSellMinLamports(isToken, expectedLamports);

      const { sellSig, wlNft, whitelist, poolPda, solEscrowPda, nftReceipt } =
        await testMakePoolSellNft({
          sellType: config === tradePoolConfig ? "trade" : "token",
          tswap,
          owner,
          seller,
          config,
          expectedLamports,
          minLamports,
          commitment: "confirmed",
          royaltyBps: 69,
        });

      const tx = (await TEST_PROVIDER.connection.getTransaction(sellSig, {
        commitment: "confirmed",
      }))!;
      expect(tx).not.null;
      const ixs = swapSdk.parseIxs(tx);
      expect(ixs).length(1);

      const ix = ixs[0];
      expect(ix.ix.name).eq(name);
      expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
        JSON.stringify(castPoolConfigAnchor(config))
      );
      expect(swapSdk.getSolAmount(ix)?.toNumber()).eq(
        expectedLamports -
          Math.trunc((expectedLamports * (config.mmFeeBps ?? 0)) / 1e4)
      );
      expect(swapSdk.getFeeAmount(ix)?.toNumber()).eq(
        Math.trunc(expectedLamports * TSWAP_FEE) +
          Math.trunc((expectedLamports * 69) / 1e4)
      );

      if (config === tradePoolConfig)
        expect(
          swapSdk.getAccountByName(ix, "Nft Receipt")?.pubkey.toBase58()
        ).eq(nftReceipt.toBase58());

      expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
        poolPda.toBase58()
      );
      expect(swapSdk.getAccountByName(ix, "Sol Escrow")?.pubkey.toBase58()).eq(
        solEscrowPda.toBase58()
      );
      expect(swapSdk.getAccountByName(ix, "Nft Mint")?.pubkey.toBase58()).eq(
        wlNft.mint.toBase58()
      );
      expect(swapSdk.getAccountByName(ix, "Seller")?.pubkey.toBase58()).eq(
        seller.publicKey.toBase58()
      );
      expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
        owner.publicKey.toBase58()
      );
      expect(swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()).eq(
        whitelist.toBase58()
      );
    }
  });
});

import { BN, LangErrorCode } from "@project-serum/anchor";
import { closeAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  CurveTypeAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  hexCode,
  TakerSide,
} from "../../src";
import {
  buildAndSendTx,
  cartesian,
  INTEGER_OVERFLOW_ERR,
  swapSdk,
  TEST_PROVIDER,
} from "../shared";
import {
  beforeHook,
  computeCurrentPrice,
  computeDepositAmount,
  createAndFundATA,
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
} from "./common";

describe("tswap sell", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  it("sells nft into token/trade pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        // Selling is 1 tick lower than start price for trade pools.
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
      });
    }
  });

  it("sell nft at lower min price works (a steal!)", async () => {
    const [owner, seller] = await makeNTraders(2);

    // needs to be serial ugh
    for (const [config, price] of cartesian(
      [tokenPoolConfig, tradePoolConfig],
      [0.99 * LAMPORTS_PER_SOL, 0.01 * LAMPORTS_PER_SOL]
    )) {
      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        minLamports: config === tokenPoolConfig ? price : price - 1234,
      });
    }
  });

  it("sell nft into token pool inits owner's ATA", async () => {
    const [owner, seller] = await makeNTraders(2);
    const config = tokenPoolConfig;

    const { mint, ata } = await createAndFundATA(seller);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeWhitelist([mint]);
    const poolPda = await testMakePool({ tswap, owner, whitelist, config });
    await testDepositSol({
      pool: poolPda,
      config,
      owner,
      lamports: LAMPORTS_PER_SOL,
      whitelist,
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
      provider: TEST_PROVIDER,
      ixs,
      extraSigners: [seller],
    });
    // Owner should have ATA now.
    expect((await getAccount(ownerAtaAcc)).amount.toString()).eq("1");
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

  it("sell nft at higher price fails", async () => {
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

        // All:
        // 1) non-WL mint + bad ATA
        // 2) non-WL mint + good ATA
        // 3) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: badAta,
            err: swapSdk.getErrorCodeHex("InvalidProof"),
          },
          {
            currMint: badMint,
            currAta: ata,
            err: hexCode(LangErrorCode.ConstraintTokenMint),
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
              config === tokenPoolConfig
                ? LAMPORTS_PER_SOL
                : LAMPORTS_PER_SOL - 1234
            ),
          });

          await expect(
            buildAndSendTx({
              provider: TEST_PROVIDER,
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
      honorRoyalties: false,
      mmFeeBps: 0,
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
        const currConfig = { ...config, poolType };
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
            proof: proofs.find((p) => p.mint === nft.mint)!.proof,
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
          honorRoyalties: false,
          mmFeeBps: 0,
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
          const currDeposit = computeCurrentPrice({
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
            const currPrice = computeCurrentPrice({
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
              proof: proofs.find((p) => p.mint === targNft.mint)!.proof,
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
      honorRoyalties: false,
      mmFeeBps: 0,
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
    const depositAmount = computeDepositAmount({ config, nftCount: numSells });
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
      const currPrice = computeCurrentPrice({
        config,
        buyCount: 0,
        sellCount,
        takerSide: TakerSide.Sell,
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
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
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
});

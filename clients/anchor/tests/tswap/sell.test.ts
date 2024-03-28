import { BN, LangErrorCode } from "@coral-xyz/anchor";
import { closeAccount, TokenAccountNotFoundError, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getTransactionConvertedToLegacy,
  hexCode,
} from "@tensor-hq/tensor-common";
import { expect } from "chai";
import { castPoolTypeAnchor, findNftEscrowPDA, PoolType } from "../../src";
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  COMMON_INSUFFICIENT_FUNDS_ERR,
  createTokenAuthorizationRules,
  CurveTypeAnchor,
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
  createAndFundAta,
  defaultSellExpectedLamports,
  fundTestWallets,
  getAccount,
  makeFvcWhitelist,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  MAKER_REBATE_PCT,
  makeVocWhitelist,
  nftPoolConfig,
  TAKER_FEE_PCT,
  testDepositSol,
  testMakePool,
  testMakePoolSellNft,
  testSellNft,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap sell", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("sell into token/trade pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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

  it("sell into token/trade pool (pay taker broker)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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
      const takerBroker = Keypair.generate().publicKey;
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
        takerBroker,
      });
    }
  });

  it("sell into token/trade pool (pay optional royalties)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const [optionalRoyaltyPct, config] of cartesian(
      [null, 0, 33, 50, 100],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const expectedLamports = defaultSellExpectedLamports(
        config === tokenPoolConfig
      );
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      if (optionalRoyaltyPct && optionalRoyaltyPct > 100) {
        await expect(
          testMakePoolSellNft({
            sellType: config === tradePoolConfig ? "trade" : "token",
            tswap,
            owner: traderA,
            seller: traderB,
            config,
            expectedLamports,
            minLamports: adjustSellMinLamports(
              config === tokenPoolConfig,
              expectedLamports
            ),
            optionalRoyaltyPct,
            creators,
            royaltyBps: 1000,
            lookupTableAccount,
          })
        ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadRoyaltiesPct"));
        return;
      }
      await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner: traderA,
        seller: traderB,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(
          config === tokenPoolConfig,
          expectedLamports
        ),
        optionalRoyaltyPct,
        creators,
        royaltyBps: 1000,
        lookupTableAccount,
      });
    }
  });

  it("sell into cosigned token pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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
        // TODO snipe: currently cosigning only for token pools
        isCosigned: config !== tradePoolConfig,
      });
    }
  });

  it("fails to sell into a cosigned pool w/ fake cosigner", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const config = tokenPoolConfig;
    const { mint, ata } = await makeMintTwoAta({ owner: seller, other: owner });
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeProofWhitelist([mint], 100);

    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      whitelist,
      config,
      isCosigned: true, //<--make a cosigned pool
    });

    await testDepositSol({
      pool: poolPda,
      config,
      owner,
      lamports: LAMPORTS_PER_SOL,
      whitelist,
    });

    await expect(
      testSellNft({
        whitelist,
        wlNft,
        nftMint: mint,
        ata,
        nftAuthPda,
        poolPda,
        sellType: "token",
        owner,
        seller,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        minLamports: LAMPORTS_PER_SOL,
        treeSize: 100,
        isCosigned: true,
        cosigner: Keypair.generate(), // fake cosigner
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadCosigner"));
  });

  it("sell at lower min price works (a steal!)", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

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
    const [owner, seller] = await makeNTraders({ n: 2 });
    const config = tokenPoolConfig;

    const { mint, ata } = await createAndFundAta({ owner: seller });
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeProofWhitelist([mint]);
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
      minPrice: new BN(LAMPORTS_PER_SOL),
      tokenProgram: TOKEN_PROGRAM_ID,
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
    const [owner, seller] = await makeNTraders({ n: 2 });

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
        lookupTableAccount, //<-- make it a v0
      });
    }
  });

  it("sell into token/trade pool works with royalties (check for InsufficientFundsForRent)", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

    // Intentionally do this serially (o/w balances will race).
    for (const [royaltyBps, config] of cartesian([50], [tokenPoolConfig])) {
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
        lookupTableAccount, //<-- make it a v0
      });
    }
  });

  // We add this test since <= v0.1.29 we passed in mint proof in the ix.
  // > v0.1.29 we use a mint proof PDA.
  it("sell nft with creators + long proof works", async () => {
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      const [owner, seller] = await makeNTraders({ n: 2 });

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
        lookupTableAccount,
      });
    }
  });

  it("sell into nft pool fails", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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
    const [traderA, traderB] = await makeNTraders({ n: 2 });

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
    const [owner, seller] = await makeNTraders({ n: 2 });
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

  it("sell non-WL nft fails (MP)", async () => {
    await Promise.all(
      [tradePoolConfig, tokenPoolConfig].map(async (config) => {
        const [owner, seller] = await makeNTraders({ n: 2 });
        const { mint, ata } = await makeMintTwoAta({
          owner: seller,
          other: owner,
        });
        const { mint: badMint, ata: badAta } = await makeMintTwoAta({
          owner: seller,
          other: owner,
        });
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint]);
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
            err: swapSdk.getErrorCodeHex("BadMintProof"),
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
            minPrice: new BN(
              adjustSellMinLamports(
                config === tokenPoolConfig,
                defaultSellExpectedLamports(config === tokenPoolConfig)
              )
            ),
            tokenProgram: TOKEN_PROGRAM_ID
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

  it("sell nft whitelisted using FVC", async () => {
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      const [owner, seller] = await makeNTraders({ n: 2 });
      const creator = Keypair.generate();
      const creators = [
        { address: creator.publicKey, share: 100, authority: creator },
      ];
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 10000,
        creators,
      });
      const { whitelist } = await makeFvcWhitelist(creator.publicKey);

      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      const { poolPda, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });

      await testDepositSol({
        pool: poolPda,
        config,
        owner,
        lamports: expectedLamports,
        whitelist,
      });

      await testSellNft({
        whitelist,
        nftMint: mint,
        ata,
        nftAuthPda,
        poolPda,
        sellType: isToken ? "token" : "trade",
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(isToken, expectedLamports),
        royaltyBps: 10000,
        creators,
      });
    }
  });

  it("fail to sell an FVC-whitelisted NFT with unverified creator", async () => {
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      const [owner, seller] = await makeNTraders({ n: 2 });
      const creator = Keypair.generate();
      const creators = [
        { address: creator.publicKey, share: 100 }, //unverified
      ];
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 10000,
        creators,
      });
      const { whitelist } = await makeFvcWhitelist(creator.publicKey);

      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      const { poolPda, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });

      await testDepositSol({
        pool: poolPda,
        config,
        owner,
        lamports: expectedLamports,
        whitelist,
      });

      await expect(
        testSellNft({
          whitelist,
          nftMint: mint,
          ata,
          nftAuthPda,
          poolPda,
          sellType: isToken ? "token" : "trade",
          owner,
          seller,
          config,
          expectedLamports,
          minLamports: adjustSellMinLamports(isToken, expectedLamports),
          royaltyBps: 10000,
          creators,
        })
      ).to.be.rejectedWith("0x1777");
    }
  });

  it("sell nft whitelisted using VOC", async () => {
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      const [owner, seller] = await makeNTraders({ n: 2 });
      const collection = Keypair.generate();
      const { mint, ata } = await makeMintTwoAta({
        owner: seller,
        other: owner,
        royaltyBps: 10000,
        collection,
        collectionVerified: true,
      });
      const { whitelist } = await makeVocWhitelist(collection.publicKey);

      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      const { poolPda, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist,
        config,
      });

      await testDepositSol({
        pool: poolPda,
        config,
        owner,
        lamports: expectedLamports,
        whitelist,
      });

      await testSellNft({
        whitelist,
        nftMint: mint,
        ata,
        nftAuthPda,
        poolPda,
        sellType: isToken ? "token" : "trade",
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(isToken, expectedLamports),
      });
    }
  });

  it("fail to sell a MP-whitelisted NFT into a VOC pool", async () => {
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      const [owner, seller] = await makeNTraders({ n: 2 });
      const collection = Keypair.generate();
      const { mint, ata } = await makeMintTwoAta(
        { owner: seller, other: owner, royaltyBps: 10000, creators: undefined } //intentionally NOT adding collection, ie mint doesn't belong to it
      );
      const { whitelist } = await makeVocWhitelist(collection.publicKey);

      const isToken = config === tokenPoolConfig;
      const expectedLamports = defaultSellExpectedLamports(isToken);

      //make a proof to pass in even though we're not actually using merkle-based whitelisting
      const {
        proofs: [wlNft],
        whitelist: whitelist2,
      } = await makeProofWhitelist([mint]);

      await testInitUpdateMintProof({
        user: seller,
        mint,
        whitelist: whitelist2, //<-- note we're using the MP whitelist
        proof: wlNft.proof,
        expectedProofLen: Math.trunc(Math.log2(100)) + 1,
      });

      const { poolPda, nftAuthPda } = await testMakePool({
        tswap,
        owner,
        whitelist, //<-- note we're using the VOC whitelist
        config,
      });

      await testDepositSol({
        pool: poolPda,
        config,
        owner,
        lamports: expectedLamports,
        whitelist,
      });

      await expect(
        testSellNft({
          whitelist, //<-- note we're using the VOC whitelist
          nftMint: mint,
          ata,
          nftAuthPda,
          poolPda,
          sellType: isToken ? "token" : "trade",
          owner,
          seller,
          config,
          expectedLamports,
          minLamports: adjustSellMinLamports(isToken, expectedLamports),
          treeSize: 100,
        })
      ).to.be.rejectedWith("0x1776");
    }
  });

  it("sell below 0 is not possible", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2, sol: 450_000 });

    const numSells = 5;
    const baseConfig = {
      startingPrice: new BN(2),
      mmCompoundFees: true,
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
            } = await makeMintTwoAta({ owner: traderB, other: traderA });
            return { mint, ataA, ataB };
          })
        );

        //prepare tree & pool
        const { proofs, whitelist } = await makeProofWhitelist(
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
            minPrice: new BN(0),
            tokenProgram: TOKEN_PROGRAM_ID
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
    const [owner, seller] = await makeNTraders({ n: 2 });
    const { mint, ata } = await createAndFundAta({ owner: seller });
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeProofWhitelist([mint]);

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
          lamports: expectedLamports * (1 - MAKER_REBATE_PCT) - 100,
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
          minPrice: new BN(expectedLamports),
          tokenProgram: TOKEN_PROGRAM_ID
        });

        // Selling into pool should trigger error.
        await expect(
          buildAndSendTx({
            ixs,
            extraSigners: [seller],
            debug: true,
          })
        ).rejectedWith(COMMON_INSUFFICIENT_FUNDS_ERR);
      })
    );
  });

  it("alternate deposits & sells", async () => {
    const numSells = 10;
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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
          mmCompoundFees: true,
          mmFeeBps: poolType === PoolTypeAnchor.Trade ? 0 : null,
        };

        //prepare multiple nfts
        const nfts = await Promise.all(
          new Array(numSells).fill(null).map(async () => {
            const {
              mint,
              ata: ataB,
              otherAta: ataA,
            } = await makeMintTwoAta({ owner: traderB, other: traderA });
            return { mint, ataA, ataB };
          })
        );

        //prepare tree & pool
        const { proofs, whitelist } = await makeProofWhitelist(
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
              minPrice: currPrice,
              tokenProgram: TOKEN_PROGRAM_ID
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

  it("properly parses raw sell tx", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });

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
          royaltyBps: 69,
        });

      const tx = await getTransactionConvertedToLegacy(
        TEST_PROVIDER.connection,
        sellSig,
        "confirmed"
      );
      expect(tx).not.null;
      const ixs = swapSdk.parseIxs(tx!);
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
        Math.trunc(expectedLamports * TAKER_FEE_PCT)
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

  it("sell pNft into token/trade pool (no rulesets)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
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
        creators,
        royaltyBps: 500,
        programmable: true,
        lookupTableAccount,
      });
    }
  });

  it("sell pNft into token/trade pool (1 ruleset)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    const ruleSetAddr = await createTokenAuthorizationRules({ payer: traderA });

    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const isTrade = castPoolTypeAnchor(config.poolType) === PoolType.Trade;

      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const expectedLamports = defaultSellExpectedLamports(
        config === tokenPoolConfig
      );
      const { mint } = await testMakePoolSellNft({
        sellType: isTrade ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(!isTrade, expectedLamports),
        programmable: true,
        ruleSetAddr,
        creators,
        royaltyBps: 1000,
        lookupTableAccount,
      });

      if (!isTrade) {
        //expect the temp escrow to be closed
        const [escrowPda] = findNftEscrowPDA({ nftMint: mint });
        expect(await TEST_PROVIDER.connection.getAccountInfo(escrowPda)).to.be
          .null;
      }

      //make sure can transact again (since we created a temp escrow account and deleted it)
      //intentionally reverse pool type
      const reversedConfig =
        config === tradePoolConfig ? tokenPoolConfig : tradePoolConfig; //<-- reverse intentionally
      const reversedExpectedLamports = defaultSellExpectedLamports(
        reversedConfig === tokenPoolConfig
      );
      const isTradeReversed = !isTrade;

      await testMakePoolSellNft({
        sellType: isTradeReversed ? "trade" : "token",
        tswap,
        owner: seller,
        seller: owner,
        config: reversedConfig,
        expectedLamports: reversedExpectedLamports,
        minLamports: adjustSellMinLamports(
          !isTradeReversed,
          reversedExpectedLamports
        ),
        programmable: true,
        ruleSetAddr,
        creators,
        royaltyBps: 1000,
        lookupTableAccount,
        //won't take into account previous creator balance
        skipCreatorBalanceCheck: true,
      });

      //and again
      await testMakePoolSellNft({
        sellType: isTrade ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(!isTrade, expectedLamports),
        programmable: true,
        ruleSetAddr,
        creators,
        royaltyBps: 1000,
        lookupTableAccount,
        //won't take into account previous creator balance
        skipCreatorBalanceCheck: true,
      });
    }
  });
});

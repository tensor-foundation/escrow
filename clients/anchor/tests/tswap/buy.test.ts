import { BN, LangErrorCode } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  COMMON_BAD_ROYALTY_ERR,
  createTokenAuthorizationRules,
  CurveTypeAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  swapSdk,
  TakerSide,
  TEST_PROVIDER,
} from "../shared";
import {
  beforeHook,
  computeTakerPrice,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  TAKER_FEE_PCT,
  testDepositNft,
  testMakePool,
  testMakePoolBuyNft,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap buy", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("buy from nft pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("buy from nft pool (pay taker broker)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      const takerBroker = Keypair.generate().publicKey;
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        takerBroker,
      });
    }
  });

  it("buy from nft pool (pay optional royalties)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const optionalRoyaltyPct of [null, 0, 33, 50, 100, 105]) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      if (optionalRoyaltyPct && optionalRoyaltyPct > 100) {
        await expect(
          testMakePoolBuyNft({
            tswap,
            owner: traderA,
            buyer: traderB,
            config: nftPoolConfig,
            expectedLamports: LAMPORTS_PER_SOL,
            optionalRoyaltyPct,
            creators,
            royaltyBps: 1000,
          })
        ).to.be.rejectedWith(COMMON_BAD_ROYALTY_ERR);
        return;
      }
      await testMakePoolBuyNft({
        tswap,
        owner: traderA,
        buyer: traderB,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        optionalRoyaltyPct,
        creators,
        royaltyBps: 1000,
      });
    }
  });

  it("buy from trade pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: tradePoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("buy from nft/trade pool works with royalties (both < & > 0.9%)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });

    // Intentionally do this serially (o/w balances will race).
    for (const [royaltyBps, config] of cartesian(
      [50, 1000],
      [nftPoolConfig, tradePoolConfig]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        royaltyBps,
        creators,
      });
    }
  });

  it("buy from nft/trade pool works with royalties (check for InsufficientFundsForRent)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });

    // Intentionally do this serially (o/w balances will race).
    for (const [royaltyBps, config] of cartesian([50], [nftPoolConfig])) {
      //want tiny royalties to cause error
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 1 }));
      creators[0].share = 96;

      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config,
        expectedLamports: LAMPORTS_PER_SOL,
        royaltyBps,
        creators,
      });
    }
  });

  // TODO: proof ignored (so this works).
  it("buy from nft pool works with 5 creators (max) and large proofs", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });

    // Intentionally do this serially (o/w balances will race).
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));

    await testMakePoolBuyNft({
      tswap,
      owner,
      buyer,
      config: nftPoolConfig,
      expectedLamports: LAMPORTS_PER_SOL,
      royaltyBps: 50,
      creators,
      treeSize: 10_000,
    });
  });

  it("buy from token pool fails", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    await expect(
      testMakePoolBuyNft({
        tswap,
        owner: traderA,
        buyer: traderB,
        config: tokenPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });

  it("buy at higher max price works (a steal!)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });

    // needs to be serial ugh
    for (const [config, price] of cartesian(
      [nftPoolConfig, tradePoolConfig],
      [1.01 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL]
    )) {
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config,
        // The lamports exchanged is still the current price.
        expectedLamports: LAMPORTS_PER_SOL,
        maxLamports: price,
      });
    }
  });

  it("buy at lower max price fails", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    await Promise.all(
      cartesian(
        [
          { owner: traderA, buyer: traderB },
          { owner: traderB, buyer: traderA },
        ],
        [nftPoolConfig, tradePoolConfig],
        [0.5 * LAMPORTS_PER_SOL, 0.99 * LAMPORTS_PER_SOL]
      ).map(async ([{ owner, buyer }, config, price]) => {
        await expect(
          testMakePoolBuyNft({
            tswap,
            owner,
            buyer,
            config,
            expectedLamports: price,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));
      })
    );
  });

  it("buy non-WL nft fails", async () => {
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const [owner, buyer] = await makeNTraders({ n: 2 });
        const {
          mint,
          ata,
          otherAta: buyerAta,
        } = await makeMintTwoAta({ owner, other: buyer });
        const { mint: badMint, otherAta: badBuyerAta } = await makeMintTwoAta({
          owner,
          other: buyer,
        });
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint]);
        const { poolPda, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          whitelist,
          config,
        });

        await testDepositNft({
          pool: poolPda,
          nftAuthPda,
          owner,
          config,
          ata,
          wlNft,
          whitelist,
        });

        // All:
        // 1) non-WL mint + bad ATA
        // 2) non-WL mint + good ATA
        // 3) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: badBuyerAta,
            // NotInitialized vs InvalidProof since nft escrow for bad mint does not exist.
            err: hexCode(LangErrorCode.AccountNotInitialized),
          },
          {
            currMint: badMint,
            currAta: buyerAta,
            // NotInitialized vs Constraint since nft escrow for bad mint does not exist.
            err: hexCode(LangErrorCode.AccountNotInitialized),
          },
          {
            currMint: mint,
            currAta: badBuyerAta,
            err: hexCode(LangErrorCode.ConstraintTokenMint),
          },
        ]) {
          const {
            tx: { ixs },
          } = await swapSdk.buyNft({
            whitelist,
            nftMint: currMint,
            nftBuyerAcc: currAta,
            owner: owner.publicKey,
            buyer: buyer.publicKey,
            config,
            maxPrice: new BN(LAMPORTS_PER_SOL),
            tokenProgram: TOKEN_PROGRAM_ID
          });

          await expect(
            buildAndSendTx({
              ixs,
              extraSigners: [buyer],
            })
          ).rejectedWith(err);
        }
      })
    );
  });

  // TODO: this passes because we disabled proofs for buying.
  // it("buy formerly deposited now non-WL mint fails, can withdraw though", async () => {
  //   await Promise.all(
  //     [nftPoolConfig, tradePoolConfig].map(async (config) => {
  //       const [owner, buyer] = await makeNTraders(2);
  //       const { mint, ata } = await makeMintTwoAta(owner, buyer);
  //       const {
  //         mint: badMint,
  //         ata: badAta,
  //         otherAta: badBuyerAta,
  //       } = await makeMintTwoAta(owner, buyer);
  //       const {
  //         proofs: [wlNft, badWlNft],
  //         whitelist,
  //       } = await makeWhitelist([mint, badMint]);
  //       const { poolPda } = await testMakePool({
  //         tswap,
  //         owner,
  //         whitelist,
  //         config,
  //       });

  //       // Deposit both good and (soon-to-be) bad mints.
  //       for (const { nft, currAta } of [
  //         { nft: wlNft, currAta: ata },
  //         { nft: badWlNft, currAta: badAta },
  //       ]) {
  //         await testDepositNft({
  //           pool: poolPda,
  //           owner,
  //           config,
  //           ata: currAta,
  //           wlNft: nft,
  //           whitelist,
  //         });
  //       }

  //       // Now update whitelist to just contain first mint.
  //       const { root: newRoot } = generateTreeOfSize(100, [mint]);
  //       const wlAcc = await wlSdk.fetchWhitelist(whitelist);
  //       const {
  //         tx: { ixs: updateWlIxs },
  //       } = await wlSdk.initUpdateWhitelist({
  //         owner: TEST_PROVIDER.publicKey,
  //         uuid: wlAcc.uuid,
  //         rootHash: newRoot,
  //       });
  //       await buildAndSendTx({ ixs: updateWlIxs });

  //       // Cannot buy non-WL nft anymore.
  //       const {
  //         tx: { ixs },
  //       } = await swapSdk.buyNft({
  //         whitelist,
  //         nftMint: badMint,
  //         nftBuyerAcc: badBuyerAta,
  //         owner: owner.publicKey,
  //         buyer: buyer.publicKey,
  //         config,
  //         proof: wlNft.proof,
  //         maxPrice: new BN(LAMPORTS_PER_SOL),
  //       });

  //       await expect(
  //         buildAndSendTx({
  //           ixs,
  //           extraSigners: [buyer],
  //         })
  //       ).rejectedWith(swapSdk.getErrorCodeHex("InvalidProof"));

  //       // todo test withdraw
  //     })
  //   );
  // });

  it("buy nft from another pool fails", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    for (const config of [nftPoolConfig, tradePoolConfig]) {
      const { mint: mintA, ata: ataA } = await makeMintTwoAta({
        owner: traderA,
        other: traderB,
      });
      const { mint: mintB, ata: ataB } = await makeMintTwoAta({
        owner: traderB,
        other: traderA,
      });

      // Reuse whitelist fine.
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      // Deposit into 2 pools.
      const { poolPda: poolA, nftAuthPda: nftAuthPdaA } = await testMakePool({
        tswap,
        owner: traderA,
        config,
        whitelist,
      });
      const { poolPda: poolB, nftAuthPda: nftAuthPdaB } = await testMakePool({
        tswap,
        owner: traderB,
        config,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda: nftAuthPdaA,
        pool: poolA,
        config,
        owner: traderA,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda: nftAuthPdaB,
        pool: poolB,
        config,
        owner: traderB,
        ata: ataB,
        wlNft: wlNftB,
        whitelist,
      });

      // Try buying from each other's pool.

      // PoolA has nft A, NOT nft B.
      const {
        tx: { ixs: ixsA },
      } = await swapSdk.buyNft({
        config,
        owner: traderA.publicKey,
        buyer: traderB.publicKey,
        nftBuyerAcc: ataB,
        whitelist,
        nftMint: wlNftB.mint,
        maxPrice: new BN(LAMPORTS_PER_SOL),
        tokenProgram: TOKEN_PROGRAM_ID
      });
      await expect(
        buildAndSendTx({ ixs: ixsA, extraSigners: [traderB] })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPool"));

      // Pool B has nft B, NOT nft A.
      const {
        tx: { ixs: ixsB },
      } = await swapSdk.buyNft({
        config,
        owner: traderB.publicKey,
        buyer: traderA.publicKey,
        nftBuyerAcc: ataA,
        whitelist,
        nftMint: wlNftA.mint,
        maxPrice: new BN(LAMPORTS_PER_SOL),
        tokenProgram: TOKEN_PROGRAM_ID
      });
      await expect(
        buildAndSendTx({ ixs: ixsB, extraSigners: [traderA] })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPool"));
    }
  });

  it("alternate deposits & buys", async () => {
    const numBuys = 10;
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    await Promise.all(
      cartesian(
        [PoolTypeAnchor.NFT, PoolTypeAnchor.Trade],
        [CurveTypeAnchor.Linear, CurveTypeAnchor.Exponential]
      ).map(async ([poolType, curveType]) => {
        const config: PoolConfigAnchor = {
          poolType,
          curveType,
          // ~1.2 SOL (prime #)
          startingPrice: new BN(1_238_923_843),
          delta:
            curveType === CurveTypeAnchor.Linear
              ? new BN(1_238_923_843 / numBuys)
              : // 10.21% (prime #)
                new BN(10_21),
          mmCompoundFees: true,
          mmFeeBps: poolType === PoolTypeAnchor.Trade ? 0 : null,
        };

        //prepare multiple nfts
        const nfts = await Promise.all(
          new Array(numBuys).fill(null).map(async () => {
            const {
              mint,
              ata: ataA,
              otherAta: ataB,
            } = await makeMintTwoAta({ owner: traderA, other: traderB });
            return { mint, ataA, ataB };
          })
        );

        //prepare tree & pool
        const { proofs, whitelist } = await makeProofWhitelist(
          nfts.map((nft) => nft.mint)
        );
        const { poolPda, nftAuthPda } = await testMakePool({
          tswap,
          owner: traderA,
          whitelist,
          config,
        });

        // This determines the sequence in which we do deposits & buys.
        // This should be length numBuys.
        const buyWhenDepCount = [1, 3, 5, 5, 5, 7, 9, 10, 10, 10];
        const depositedNfts: typeof nfts = [];
        let depCount = 0;
        let buyCount = 0;

        // deposit all NFTs.
        for (const nft of nfts) {
          await testDepositNft({
            pool: poolPda,
            nftAuthPda,
            owner: traderA,
            config,
            ata: nfts.find((n) => n.mint === nft.mint)!.ataA,
            wlNft: proofs.find((p) => p.mint === nft.mint),
            whitelist,
          });

          depositedNfts.push(nft);
          depCount++;

          // Buy.
          while (buyCount < numBuys && buyWhenDepCount[buyCount] === depCount) {
            const currPrice = computeTakerPrice({
              config,
              buyCount,
              sellCount: 0,
              takerSide: TakerSide.Buy,
            });
            buyCount++;

            // Sample a random deposited NFT to buy.
            const targNft = depositedNfts.splice(
              Math.floor(Math.random() * depositedNfts.length),
              1
            )[0];

            const {
              tx: { ixs },
            } = await swapSdk.buyNft({
              whitelist,
              nftMint: targNft.mint,
              nftBuyerAcc: targNft.ataB,
              owner: traderA.publicKey,
              buyer: traderB.publicKey,
              config: config,
              maxPrice: currPrice,
              tokenProgram: TOKEN_PROGRAM_ID
            });
            await buildAndSendTx({
              ixs,
              extraSigners: [traderB],
            });
            console.debug(
              `bought nft (count: ${buyCount}, dep: ${depCount}) at ${currPrice.toNumber()}`
            );
          }
        }

        // Check NFTs have all been transferred.

        await Promise.all(
          nfts.map(async (nft) => {
            const traderAccA = await getAccount(nft.ataA);
            expect(traderAccA.amount.toString()).eq("0");
            const traderAccB = await getAccount(nft.ataB);
            expect(traderAccB.amount.toString()).eq("1");
          })
        );
      })
    );
  });

  it("buy a ton with default exponential curve + tolerance", async () => {
    // prime #
    const numBuys = 109;

    const [traderA, traderB] = await makeNTraders({ n: 2, sol: 450_000 });
    const config: PoolConfigAnchor = {
      poolType: PoolTypeAnchor.NFT,
      curveType: CurveTypeAnchor.Exponential,
      // ~2 SOL (prime #)
      startingPrice: new BN(2_083_195_757),
      // 8.77% (prime #)
      delta: new BN(8_77),
      mmCompoundFees: true,
      mmFeeBps: null,
    };

    //prepare multiple nfts
    const nfts = await Promise.all(
      new Array(numBuys).fill(null).map(async () => {
        const {
          mint,
          ata: ataA,
          otherAta: ataB,
        } = await makeMintTwoAta({ owner: traderA, other: traderB });
        return { mint, ataA, ataB };
      })
    );

    //prepare tree & pool
    const { proofs, whitelist } = await makeProofWhitelist(
      nfts.map((nft) => nft.mint)
    );
    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner: traderA,
      whitelist,
      config,
    });

    // deposit all NFTs.
    await Promise.all(
      nfts.map(async (nft) => {
        await testDepositNft({
          pool: poolPda,
          nftAuthPda,
          owner: traderA,
          config,
          ata: nfts.find((n) => n.mint === nft.mint)!.ataA,
          wlNft: proofs.find((p) => p.mint === nft.mint),
          whitelist,
          skipPoolAccounting: true,
        });
      })
    );

    // buy NFTs (sequentially).
    for (const [buyCount, nft] of nfts.entries()) {
      const currPrice = computeTakerPrice({
        config,
        buyCount,
        sellCount: 0,
        takerSide: TakerSide.Buy,
      });

      const {
        tx: { ixs },
      } = await swapSdk.buyNft({
        whitelist,
        nftMint: nft.mint,
        nftBuyerAcc: nft.ataB,
        owner: traderA.publicKey,
        buyer: traderB.publicKey,
        config: config,
        maxPrice: currPrice,
        tokenProgram: TOKEN_PROGRAM_ID
      });
      await buildAndSendTx({
        ixs,
        extraSigners: [traderB],
      });
      console.debug(
        `bought nft (count: ${buyCount}) at ${currPrice.toNumber()}`
      );
    }

    // Check NFTs have all been transferred.
    await Promise.all(
      nfts.map(async (nft) => {
        const traderAccA = await getAccount(nft.ataA);
        expect(traderAccA.amount.toString()).eq("0");
        const traderAccB = await getAccount(nft.ataB);
        expect(traderAccB.amount.toString()).eq("1");
      })
    );
  });

  it("properly parses raw buy tx", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });

    const expectedLamports = nftPoolConfig.startingPrice.toNumber();
    const { buySig, wlNft, whitelist, pool, solEscrowPda } =
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports,
        royaltyBps: 50,
      });

    const tx = await getTransactionConvertedToLegacy(
      TEST_PROVIDER.connection,
      buySig,
      "confirmed"
    );
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx!);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("buyNft");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(nftPoolConfig))
    );
    expect(swapSdk.getSolAmount(ix)?.toNumber()).eq(expectedLamports);
    expect(swapSdk.getFeeAmount(ix)?.toNumber()).eq(
      Math.trunc(expectedLamports * TAKER_FEE_PCT)
    );

    expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
      pool.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Sol Escrow")?.pubkey.toBase58()).eq(
      solEscrowPda.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Nft Mint")?.pubkey.toBase58()).eq(
      wlNft.mint.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Buyer")?.pubkey.toBase58()).eq(
      buyer.publicKey.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
      owner.publicKey.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()).eq(
      whitelist.toBase58()
    );
  });

  it("buy pNft from nft pool (no ruleset)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
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
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        programmable: true,
        creators,
        royaltyBps: 500,
        lookupTableAccount,
      });
    }
  });

  it("buy pNft from trade pool (1 ruleset) (should NOT require LUT)", async () => {
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
  });

  it("MAX ACC CHECK: buy pNft from trade pool (1 ruleset) (should require LUT) (margin)", async () => {
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
        marginated: true,
        lookupTableAccount, //<-- make it a v0
      });
    }
  });
});

import { CurveType, PoolConfig, PoolType, TSWAP_FEE_ACC } from "../src";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  ACCT_NOT_EXISTS_ERR,
  buildAndSendTx,
  cartesian,
  createAndFundATA,
  createATA,
  createFundedWallet,
  generateTreeOfSize,
  getLamports,
  stringifyPKsAndBNs,
  swapSdk,
  testInitWLAuthority,
  TEST_PROVIDER,
  withLamports,
  wlSdk,
} from "./shared";
import {
  getAccount,
  getMinimumBalanceForRentExemptAccount,
  TokenAccountNotFoundError,
} from "@solana/spl-token";

chai.use(chaiAsPromised);

const TSWAP_FEE = 0.005;

const LINEAR_CONFIG: Omit<PoolConfig, "poolType"> = {
  curveType: CurveType.Linear,
  startingPrice: new BN(LAMPORTS_PER_SOL),
  delta: new BN(1234),
  honorRoyalties: false,
  mmFeeBps: 0,
};

type WhitelistedNft = { mint: PublicKey; proof: Buffer[] };

describe("tensorswap", () => {
  const nftPoolConfig: PoolConfig = {
    poolType: PoolType.NFT,
    ...LINEAR_CONFIG,
  };
  const tokenPoolConfig: PoolConfig = {
    poolType: PoolType.Token,
    ...LINEAR_CONFIG,
  };
  const tradePoolConfig: PoolConfig = {
    poolType: PoolType.Trade,
    ...LINEAR_CONFIG,
    mmFeeBps: 300,
  };

  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let expSellerRentForTokenPool: number;
  let expSellerRentForTradePool: number;

  //#region Helper functions (no expects run).

  // Creates a mint + 2 ATAs. The `owner` will have the mint initially.
  const makeMintTwoAta = async (owner: Keypair, other: Keypair) => {
    const { mint, ata } = await createAndFundATA(TEST_PROVIDER, 1, owner);

    const { ata: otherAta } = await createATA(TEST_PROVIDER, mint, other);

    return { mint, ata, otherAta };
  };

  const makeNTraders = async (n: number, sol?: number) => {
    return await Promise.all(
      Array(n)
        .fill(null)
        .map(async () => await createFundedWallet(TEST_PROVIDER, sol))
    );
  };

  const makeWhitelist = async (mints: PublicKey[]) => {
    const { root, proofs } = generateTreeOfSize(100, mints);
    const uuid = wlSdk.genWhitelistUUID();
    const name = "hello_world";
    const {
      tx: { ixs: wlIxs },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist({
      owner: TEST_PROVIDER.publicKey,
      uuid: Buffer.from(uuid).toJSON().data,
      rootHash: root,
      name: Buffer.from(name.padEnd(32, "\0")).toJSON().data,
    });
    await buildAndSendTx({ provider: TEST_PROVIDER, ixs: wlIxs });

    return { proofs, whitelist: whitelistPda };
  };

  //#endregion

  //#region Helper fns that also runs expect statements.

  // Can be run async.
  const testMakePool = async ({
    owner,
    whitelist,
    config,
  }: {
    owner: Keypair;
    whitelist: PublicKey;
    config: PoolConfig;
  }) => {
    const {
      tx: { ixs },
      poolPda,
      solEscrowPda,
    } = await swapSdk.initPool({
      owner: owner.publicKey,
      whitelist,
      config,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs,
      extraSigners: [owner],
    });

    const poolAcc = await swapSdk.fetchPool(poolPda);
    expect(poolAcc.owner.toBase58()).eq(owner.publicKey.toBase58());
    expect(poolAcc.tswap.toBase58()).eq(tswap.toBase58());
    expect(poolAcc.whitelist.toBase58()).eq(whitelist.toBase58());
    expect(poolAcc.takerBuyCount).eq(0);
    expect(poolAcc.takerSellCount).eq(0);
    expect(poolAcc.nftsHeld).eq(0);
    expect(poolAcc.solFunding.toNumber()).eq(0);

    const accConfig = poolAcc.config as PoolConfig;
    expect(Object.keys(config.poolType)[0] in accConfig.poolType).true;
    expect(JSON.stringify(accConfig.curveType)).eq(
      JSON.stringify(CurveType.Linear)
    );
    expect(accConfig.startingPrice.toNumber()).eq(LAMPORTS_PER_SOL);
    expect(accConfig.delta.toNumber()).eq(1234);
    expect(accConfig.honorRoyalties).eq(false);
    if (config.poolType === PoolType.Trade) {
      expect(accConfig.mmFeeBps).eq(300);
    } else {
      expect(accConfig.mmFeeBps).eq(0);
    }

    await swapSdk.fetchSolEscrow(solEscrowPda);
    expect(await getLamports(solEscrowPda)).eq(
      await swapSdk.getSolEscrowRent()
    );

    return poolPda;
  };

  // Can be run async.
  const testClosePool = async ({
    owner,
    whitelist,
    config,
  }: {
    owner: Keypair;
    whitelist: PublicKey;
    config: PoolConfig;
  }) => {
    const {
      tx: { ixs },
      poolPda,
      tswapPda,
      solEscrowPda,
    } = await swapSdk.closePool({
      owner: owner.publicKey,
      whitelist,
      config,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs,
      extraSigners: [owner],
    });

    // These should no longer exist.
    await expect(swapSdk.fetchPool(poolPda)).rejectedWith(ACCT_NOT_EXISTS_ERR);
    await expect(swapSdk.fetchSolEscrow(solEscrowPda)).rejectedWith(
      ACCT_NOT_EXISTS_ERR
    );

    // These should still exist.
    await swapSdk.fetchTSwap(tswapPda);
    await wlSdk.fetchWhitelist(whitelist);

    return poolPda;
  };

  // Can be run async.
  const testDepositNft = async ({
    pool,
    config,
    owner,
    ata,
    wlNft,
    whitelist,
  }: {
    pool: PublicKey;
    config: PoolConfig;
    owner: Keypair;
    ata: PublicKey;
    wlNft: WhitelistedNft;
    whitelist: PublicKey;
  }) => {
    let {
      tx: { ixs },
      receiptPda,
      escrowPda,
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: wlNft.mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: wlNft.proof,
    });
    const prevPoolAcc = await swapSdk.fetchPool(pool);

    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs,
      extraSigners: [owner],
    });

    //NFT moved from trader to escrow
    let traderAcc = await getAccount(TEST_PROVIDER.connection, ata);
    expect(traderAcc.amount.toString()).eq("0");
    let escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
    expect(escrowAcc.amount.toString()).eq("1");
    const poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.nftsHeld - prevPoolAcc.nftsHeld).eq(1);
    expect(poolAcc.solFunding.sub(prevPoolAcc.solFunding).toNumber()).eq(0);

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).eq(pool.toBase58());
    expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
    expect(receipt.nftEscrow.toBase58()).eq(escrowPda.toBase58());
  };

  // Can be run async.
  const testDepositSol = async ({
    pool,
    whitelist,
    config,
    owner,
    lamports,
  }: {
    pool: PublicKey;
    whitelist: PublicKey;
    config: PoolConfig;
    owner: Keypair;
    lamports: number;
  }) => {
    let {
      tx: { ixs },
      solEscrowPda,
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(lamports),
    });
    const prevPoolAcc = await swapSdk.fetchPool(pool);
    await withLamports(
      { prevEscrowLamports: solEscrowPda },
      async ({ prevEscrowLamports }) => {
        await buildAndSendTx({
          provider: TEST_PROVIDER,
          ixs,
          extraSigners: [owner],
        });

        let currEscrowLamports = await getLamports(solEscrowPda);
        expect(currEscrowLamports! - prevEscrowLamports!).eq(lamports);
        const poolAcc = await swapSdk.fetchPool(pool);
        expect(
          poolAcc.solFunding.toNumber() - prevPoolAcc.solFunding.toNumber()
        ).eq(lamports);
        expect(poolAcc.nftsHeld - prevPoolAcc.nftsHeld).eq(0);
      }
    );
  };

  // CANNOT be run async (swap fee check + trader fee check).
  const testBuyNft = async ({
    owner,
    buyer,
    config,
    expectedLamports,
  }: {
    owner: Keypair;
    buyer: Keypair;
    config: PoolConfig;
    expectedLamports: number;
  }) => {
    const { mint, ata, otherAta } = await makeMintTwoAta(owner, buyer);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeWhitelist([mint]);
    const pool = await testMakePool({ owner, whitelist, config });

    await testDepositNft({
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.buyNft({
      whitelist,
      nftMint: wlNft.mint,
      nftBuyerAcc: otherAta,
      owner: owner.publicKey,
      buyer: buyer.publicKey,
      config,
      proof: wlNft.proof,
      price: new BN(expectedLamports),
    });

    await withLamports(
      {
        prevFeeAccLamports: TSWAP_FEE_ACC,
        prevSellerLamports: owner.publicKey,
        prevBuyerLamports: buyer.publicKey,
        prevEscrowLamports: solEscrowPda,
      },
      async ({
        prevFeeAccLamports,
        prevSellerLamports,
        prevBuyerLamports,
        prevEscrowLamports,
      }) => {
        await buildAndSendTx({
          provider: TEST_PROVIDER,
          ixs,
          extraSigners: [buyer],
        });

        //NFT moved from escrow to trader
        const traderAcc = await getAccount(TEST_PROVIDER.connection, otherAta);
        expect(traderAcc.amount.toString()).eq("1");
        // Escrow closed.
        await expect(
          getAccount(TEST_PROVIDER.connection, escrowPda)
        ).rejectedWith(TokenAccountNotFoundError);

        //paid tswap fees (NB: fee account may be un-init before).
        const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
        const feeDiff = feeAccLamports! - (prevFeeAccLamports ?? 0);
        // todo: why is this not exactly 5%? where is rent coming from?
        expect(feeDiff).gte(expectedLamports * TSWAP_FEE);
        expect(feeDiff).lt(expectedLamports * 2 * TSWAP_FEE);

        // Buyer pays full amount.
        const currBuyerLamports = await getLamports(buyer.publicKey);
        expect(prevBuyerLamports! - currBuyerLamports!).eq(expectedLamports);

        // Depending on the pool type:
        // (1) Trade = amount sent to escrow, NOT owner
        // (1) NFT = amount sent to owner, NOT escrow
        const grossAmount = expectedLamports * (1 - TSWAP_FEE);
        const expOwnerAmount =
          (config.poolType === PoolType.Trade ? 0 : grossAmount) +
          // The owner gets back the rent costs.
          (await swapSdk.getNftDepositReceiptRent()) +
          (await swapSdk.getNftEscrowRent());
        const expEscrowAmount =
          config.poolType === PoolType.Trade ? grossAmount : 0;
        // amount sent to owner's wallet
        const currSellerLamports = await getLamports(owner.publicKey);
        expect(currSellerLamports! - prevSellerLamports!).eq(expOwnerAmount);
        // amount sent to escrow
        const currSolEscrowLamports = await getLamports(solEscrowPda);
        expect(currSolEscrowLamports! - prevEscrowLamports!).eq(
          expEscrowAmount
        );

        const poolAcc = await swapSdk.fetchPool(pool);
        expect(poolAcc.nftsHeld).eq(0);
        expect(poolAcc.takerBuyCount).eq(1);
        expect(poolAcc.takerSellCount).eq(0);

        //receipt should have gotten closed
        await expect(swapSdk.fetchReceipt(receiptPda)).rejectedWith(
          ACCT_NOT_EXISTS_ERR
        );
      }
    );
  };

  // CANNOT be run async (swap fee check + trader fee check).
  const testSellNft = async ({
    owner,
    seller,
    config,
    expectedLamports,
    expectedRentBySeller,
  }: {
    owner: Keypair;
    seller: Keypair;
    config: PoolConfig;
    expectedLamports: number;
    expectedRentBySeller: number;
  }) => {
    const { mint, ata } = await makeMintTwoAta(seller, owner);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeWhitelist([mint]);
    const poolPda = await testMakePool({ owner, whitelist, config });

    await testDepositSol({
      pool: poolPda,
      config,
      owner,
      lamports: expectedLamports,
      whitelist,
    });

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.sellNft({
      whitelist,
      nftMint: wlNft.mint,
      nftSellerAcc: ata,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      proof: wlNft.proof,
      price: new BN(expectedLamports),
    });

    return await withLamports(
      {
        prevFeeAccLamports: TSWAP_FEE_ACC,
        prevSellerLamports: seller.publicKey,
        prevBuyerLamports: owner.publicKey,
        prevEscrowLamports: solEscrowPda,
      },
      async ({
        prevFeeAccLamports,
        prevSellerLamports,
        prevBuyerLamports,
        prevEscrowLamports,
      }) => {
        await buildAndSendTx({
          provider: TEST_PROVIDER,
          ixs,
          extraSigners: [seller],
        });

        //NFT moved from trader to escrow
        const traderAcc = await getAccount(TEST_PROVIDER.connection, ata);
        expect(traderAcc.amount.toString()).eq("0");
        const escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
        expect(escrowAcc.amount.toString()).eq("1");

        //paid tswap fees (NB: fee account may be un-init before).
        const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
        const feeDiff = feeAccLamports! - (prevFeeAccLamports ?? 0);
        // todo: why is this not exactly 5%? where is rent coming from?
        expect(feeDiff).gte(Math.trunc(expectedLamports * TSWAP_FEE));
        expect(feeDiff).lt(Math.trunc(expectedLamports * 2 * TSWAP_FEE));

        const mmFees = Math.trunc((expectedLamports * config.mmFeeBps) / 1e4);

        //paid full amount to seller
        const currSellerLamports = await getLamports(seller.publicKey);
        expect(currSellerLamports! - prevSellerLamports!).eq(
          expectedLamports -
            Math.trunc(expectedLamports * TSWAP_FEE) -
            mmFees -
            expectedRentBySeller
        );

        // buyer should not have balance change
        const currBuyerLamports = await getLamports(owner.publicKey);
        expect(currBuyerLamports! - prevBuyerLamports!).equal(0);

        // Sol escrow should have the NFT cost deducted (minus mm fees owner gets back).
        const currEscrowLamports = await getLamports(solEscrowPda);
        expect(prevEscrowLamports! - currEscrowLamports!).eq(
          expectedLamports - mmFees
        );

        const poolAcc = await swapSdk.fetchPool(poolPda);
        expect(poolAcc.nftsHeld).eq(1);
        expect(poolAcc.takerSellCount).eq(1);
        expect(poolAcc.takerBuyCount).eq(0);

        return { escrowPda, receiptPda, poolPda, wlNft, whitelist };
      }
    );
  };

  //#endregion

  // All tests need these before they start.
  before(async () => {
    //keypairs (have a lot of sol for many tests that re-use these keypairs)
    // WL authority
    await testInitWLAuthority();

    // Tswap
    const {
      tx: { ixs },
      tswapPda,
    } = await swapSdk.initTSwap(TEST_PROVIDER.publicKey);
    tswap = tswapPda;
    await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

    const swapAcc = await swapSdk.fetchTSwap(tswap);
    expect(swapAcc.owner.toBase58()).eq(TEST_PROVIDER.publicKey.toBase58());

    // Initialize fees.

    // Seller pays rent only for escrow account.
    expSellerRentForTokenPool = await swapSdk.getNftEscrowRent();
    // Seller pays rent for:
    // (1) NFT escrow account
    // (2) NFT deposit receipt
    expSellerRentForTradePool =
      (await swapSdk.getNftEscrowRent()) +
      (await swapSdk.getNftDepositReceiptRent());

    console.log(
      "debug accs",
      stringifyPKsAndBNs({
        tswap,
      })
    );
  });

  //#region Close pool.

  it("close pool roundtrips fees", async () => {
    await Promise.all(
      cartesian(await makeNTraders(2), [nftPoolConfig, tradePoolConfig]).map(
        async ([owner, config]) => {
          const { mint } = await createAndFundATA(TEST_PROVIDER, 1, owner);
          const { whitelist } = await makeWhitelist([mint]);

          await withLamports(
            { prevLamports: owner.publicKey },
            async ({ prevLamports }) => {
              await testMakePool({ owner, config, whitelist });
              await testClosePool({ owner, whitelist, config });

              const currLamports = await getLamports(owner.publicKey);
              expect(currLamports! - prevLamports!).eq(0);
            }
          );
        }
      )
    );
  });

  it("close pool fails if nfts still deposited", async () => {
    await Promise.all(
      cartesian(await makeNTraders(2), [nftPoolConfig, tradePoolConfig]).map(
        async ([owner, config]) => {
          const { mint, ata } = await createAndFundATA(TEST_PROVIDER, 1, owner);
          const {
            proofs: [wlNft],
            whitelist,
          } = await makeWhitelist([mint]);

          const pool = await testMakePool({ owner, config, whitelist });
          await testDepositNft({ pool, config, owner, ata, wlNft, whitelist });

          await expect(
            testClosePool({ owner, whitelist, config })
          ).rejectedWith("0x177d");
        }
      )
    );
  });

  it("close pool fails if someone sold nfts into it", async () => {
    const [owner, seller] = await makeNTraders(2);
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      // Cannot run async.
      const { whitelist } = await testSellNft({
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        // Seller pays rent for NFT escrow account
        expectedRentBySeller:
          config === tokenPoolConfig
            ? expSellerRentForTokenPool
            : expSellerRentForTradePool,
      });

      await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
        "0x177d"
      );
    }
  });

  //#endregion

  //#region Deposits/withdrawals.

  it("deposit WL nft w/ non-WL ata", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundATA(TEST_PROVIDER, 1, owner);
    const { proofs, whitelist } = await makeWhitelist([mint]);
    const { mint: badMint, ata: badAta } = await createAndFundATA(
      TEST_PROVIDER,
      1,
      owner
    );
    await testMakePool({ owner, config, whitelist });

    // Bad mint.
    const {
      tx: { ixs: badIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: badMint,
      nftSource: badAta,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await expect(
      buildAndSendTx({
        provider: TEST_PROVIDER,
        ixs: badIxs,
        extraSigners: [owner],
      })
    ).rejectedWith("0x1770");

    // Good mint
    const {
      tx: { ixs: goodIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs: goodIxs,
      extraSigners: [owner],
    });
  });

  it("deposit non-WL nft", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundATA(TEST_PROVIDER, 1, owner);
    const { proofs, whitelist } = await makeWhitelist([mint]);
    const { mint: badMint, ata: badAta } = await createAndFundATA(
      TEST_PROVIDER,
      1,
      owner
    );
    await testMakePool({ owner, config, whitelist });

    // Bad mint.
    const {
      tx: { ixs: badIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: badMint,
      nftSource: badAta,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await expect(
      buildAndSendTx({
        provider: TEST_PROVIDER,
        ixs: badIxs,
        extraSigners: [owner],
      })
    ).rejectedWith("0x1770");

    // Good mint
    const {
      tx: { ixs: goodIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs: goodIxs,
      extraSigners: [owner],
    });
  });

  //#endregion

  //#region Buying NFTs.

  it("buys nft from nft pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testBuyNft({
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("buys nft from trade pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testBuyNft({
        owner,
        buyer,
        config: tradePoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("buy from token pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    await expect(
      testBuyNft({
        owner: traderA,
        buyer: traderB,
        config: tokenPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      })
    ).rejectedWith("0x1773");
  });

  it("buy nft at wrong price fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

    await Promise.all(
      cartesian(
        [
          { owner: traderA, buyer: traderB },
          { owner: traderB, buyer: traderA },
        ],
        [nftPoolConfig, tradePoolConfig]
      ).map(async ([{ owner, buyer }, config]) => {
        await expect(
          testBuyNft({
            owner,
            buyer,
            config,
            // Give bad price
            expectedLamports: 0.5 * LAMPORTS_PER_SOL,
          })
        ).rejectedWith("0x177c");
      })
    );
  });

  it("deposits/buys multiple", async () => {
    //todo once optimize the ix, try increasing
    const MAX_IXS = 1;
    const [traderA, traderB] = await makeNTraders(2);

    //prepare multiple nfts
    const nfts: {
      mint: PublicKey;
      ataA: PublicKey;
      ataB: PublicKey;
      depositIxs?: TransactionInstruction[];
      buyIxs?: TransactionInstruction[];
    }[] = [];

    for (let i = 0; i < MAX_IXS; i++) {
      const {
        mint,
        ata: ataA,
        otherAta: ataB,
      } = await makeMintTwoAta(traderA, traderB);
      nfts.push({ mint, ataA, ataB });
    }

    //prepare tree & pool
    const { proofs, whitelist } = await makeWhitelist(
      nfts.map((nft) => nft.mint)
    );

    const config: PoolConfig = {
      poolType: PoolType.NFT,
      curveType: CurveType.Linear,
      startingPrice: new BN(LAMPORTS_PER_SOL),
      delta: new BN(LAMPORTS_PER_SOL / 10),
      honorRoyalties: false,
      mmFeeBps: 0,
    };

    // Run txs.

    const {
      tx: { ixs: poolIxs },
    } = await swapSdk.initPool({
      owner: traderA.publicKey,
      whitelist,
      config: config,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs: poolIxs,
      extraSigners: [traderA],
    });

    let currPrice = new BN(config.startingPrice);

    for (const nft of nfts) {
      const {
        tx: { ixs: depositIxs },
      } = await swapSdk.depositNft({
        whitelist,
        nftMint: nft.mint,
        nftSource: nft.ataA,
        owner: traderA.publicKey,
        config: config,
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
      });
      nft.depositIxs = depositIxs;

      const {
        tx: { ixs: buyIxs },
      } = await swapSdk.buyNft({
        whitelist,
        nftMint: nft.mint,
        nftBuyerAcc: nft.ataB,
        owner: traderA.publicKey,
        buyer: traderB.publicKey,
        config: config,
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
        price: currPrice,
      });
      nft.buyIxs = buyIxs;
      currPrice = currPrice.sub(config.delta);
    }

    // amazing table for debugging
    // const tx = new TransactionEnvelope(
    //   new SolanaAugmentedProvider(
    //     SolanaProvider.init({
    //       connection: TEST_PROVIDER.connection,
    //       wallet: TEST_PROVIDER.wallet,
    //       opts: TEST_PROVIDER.opts,
    //     })
    //   ),
    //   nfts.map((n) => n.ixs).flat() as TransactionInstruction[],
    //   [traderA]
    // );
    // await tx.simulateTable().catch(console.log);

    //deposit
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs: nfts.map((n) => n.depositIxs).flat() as TransactionInstruction[],
      extraSigners: [traderA],
    });

    //buy
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs: nfts.map((n) => n.buyIxs).flat() as TransactionInstruction[],
      extraSigners: [traderB],
    });

    //check one of the accounts
    const traderAccA = await getAccount(TEST_PROVIDER.connection, nfts[0].ataA);
    expect(traderAccA.amount.toString()).eq("0");
    const traderAccB = await getAccount(TEST_PROVIDER.connection, nfts[0].ataB);
    expect(traderAccB.amount.toString()).eq("1");
  });

  //#endregion

  //#region Selling NFTs.

  it("sells nft into token pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, seller } of [
      { owner: traderA, seller: traderB },
      { owner: traderB, seller: traderA },
    ]) {
      const { receiptPda } = await testSellNft({
        owner,
        seller,
        config: tokenPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        expectedRentBySeller: expSellerRentForTokenPool,
      });

      //no deposit receipt when selling into a Token pool.
      await expect(swapSdk.fetchReceipt(receiptPda)).rejectedWith(
        ACCT_NOT_EXISTS_ERR
      );
    }
  });

  it("sells nft into trade pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, seller } of [
      { owner: traderA, seller: traderB },
      { owner: traderB, seller: traderA },
    ]) {
      const { escrowPda, receiptPda, poolPda, wlNft } = await testSellNft({
        config: tradePoolConfig,
        // Selling is 1 tick lower than start price.
        expectedLamports: LAMPORTS_PER_SOL - tokenPoolConfig.delta.toNumber(),
        owner,
        seller,
        expectedRentBySeller: expSellerRentForTradePool,
      });

      const receipt = await swapSdk.fetchReceipt(receiptPda);
      expect(receipt.pool.toBase58()).eq(poolPda.toBase58());
      expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
      expect(receipt.nftEscrow.toBase58()).eq(escrowPda.toBase58());
    }
  });

  it("sell into nft pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    await expect(
      testSellNft({
        owner: traderA,
        seller: traderB,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        expectedRentBySeller: 0,
      })
    ).rejectedWith("0x1773");
  });

  it("sell nft at wrong price fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

    await Promise.all(
      cartesian(
        [
          { owner: traderA, seller: traderB },
          { owner: traderB, seller: traderA },
        ],
        [tokenPoolConfig, tradePoolConfig]
      ).map(async ([{ owner, seller }, config]) => {
        await expect(
          testSellNft({
            owner,
            seller,
            config,
            // Give bad price
            expectedLamports: 0.5 * LAMPORTS_PER_SOL,
            expectedRentBySeller: 0, // doesn't matter
          })
        ).rejectedWith("0x177c");
      })
    );
  });

  //#endregion
});

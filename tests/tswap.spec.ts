import {
  CurveType,
  PoolConfig,
  PoolType,
  TensorSwapSDK,
  TSwapConfig,
  TSWAP_FEE_ACC,
} from "../src";
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
  hexCode,
  stringifyPKsAndBNs,
  swapSdk,
  testInitWLAuthority,
  TEST_PROVIDER,
  TOKEN_ACCT_WRONG_MINT_ERR,
  withLamports,
  wlSdk,
} from "./shared";
import { getAccount, TokenAccountNotFoundError } from "@solana/spl-token";
import { AnchorError, LangErrorCode } from "@project-serum/anchor";

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

type PoolAcc = Awaited<ReturnType<typeof swapSdk.fetchPool>>;
const expectPoolAccounting = (
  currPool: PoolAcc,
  prevPool: PoolAcc,
  diffs: { nfts: number; sell: number; buy: number }
) => {
  expect(currPool.nftsHeld - prevPool.nftsHeld).eq(diffs.nfts);
  expect(currPool.takerSellCount - prevPool.takerSellCount).eq(diffs.sell);
  expect(currPool.takerBuyCount - prevPool.takerBuyCount).eq(diffs.buy);
};

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
  let expSellerRent: number;

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
    expect(swapAcc.feeVault.toBase58()).eq(TSWAP_FEE_ACC.toBase58());
    expect((swapAcc.config as TSwapConfig).feeBps).eq(TSWAP_FEE * 1e4);

    // Initialize fees.

    // Seller pays rent for:
    // (1) NFT escrow account
    // (2) NFT deposit receipt
    expSellerRent =
      (await swapSdk.getNftEscrowRent()) +
      (await swapSdk.getNftDepositReceiptRent());

    console.log(
      "debug accs",
      stringifyPKsAndBNs({
        tswap,
      })
    );
  });

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
      tx: { ixs },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist({
      owner: TEST_PROVIDER.publicKey,
      uuid: Buffer.from(uuid).toJSON().data,
      rootHash: root,
      name: Buffer.from(name.padEnd(32, "\0")).toJSON().data,
    });
    await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

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

  // CANNOT be run async w/ same pool (nftsHeld check).
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
    expectPoolAccounting(poolAcc, prevPoolAcc, { nfts: 1, sell: 0, buy: 0 });

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).eq(pool.toBase58());
    expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
    expect(receipt.nftEscrow.toBase58()).eq(escrowPda.toBase58());
  };

  // CANNOT be run async w/ same pool (sol escrow balance check).
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
        expectPoolAccounting(poolAcc, prevPoolAcc, {
          nfts: 0,
          sell: 0,
          buy: 0,
        });
      }
    );
  };

  // CANNOT be run async (swap fee check + trader fee check).
  const testBuyNft = async ({
    owner,
    buyer,
    config,
    expectedLamports,
    maxLamports = expectedLamports,
  }: {
    owner: Keypair;
    buyer: Keypair;
    config: PoolConfig;
    expectedLamports: number;
    // If specified, uses this as the maxPrice for the buy instr.
    // All expects will still use expectedLamports.
    maxLamports?: number;
  }) => {
    const { mint, ata, otherAta } = await makeMintTwoAta(owner, buyer);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeWhitelist([mint]);
    const poolPda = await testMakePool({ owner, whitelist, config });

    await testDepositNft({
      pool: poolPda,
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
      maxPrice: new BN(maxLamports),
    });

    const prevPoolAcc = await swapSdk.fetchPool(poolPda);

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
        expect(currBuyerLamports! - prevBuyerLamports!).eq(
          -1 * expectedLamports
        );

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

        const poolAcc = await swapSdk.fetchPool(poolPda);
        expectPoolAccounting(poolAcc, prevPoolAcc, {
          nfts: -1,
          sell: 0,
          buy: 1,
        });

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
    expectedRentBySeller,
    expectedLamports,
    minLamports = expectedLamports,
  }: {
    owner: Keypair;
    seller: Keypair;
    config: PoolConfig;
    expectedRentBySeller: number;
    expectedLamports: number;
    // If specified, uses this as the minPrice for the sell instr.
    // All expects will still use expectedLamports.
    minLamports?: number;
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

    const prevPoolAcc = await swapSdk.fetchPool(poolPda);

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
      minPrice: new BN(minLamports),
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
        expect(currEscrowLamports! - prevEscrowLamports!).eq(
          -1 * (expectedLamports - mmFees)
        );

        const poolAcc = await swapSdk.fetchPool(poolPda);
        expectPoolAccounting(poolAcc, prevPoolAcc, {
          nfts: 1,
          sell: 1,
          buy: 0,
        });

        const receipt = await swapSdk.fetchReceipt(receiptPda);
        expect(receipt.pool.toBase58()).eq(poolPda.toBase58());
        expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
        expect(receipt.nftEscrow.toBase58()).eq(escrowPda.toBase58());

        return { escrowPda, receiptPda, poolPda, wlNft, whitelist };
      }
    );
  };

  //#endregion

  //#region Create pool.

  it.only("cannot init pool with royalties", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(TEST_PROVIDER, 1, owner);
        const { whitelist } = await makeWhitelist([mint]);

        await expect(
          testMakePool({
            owner,
            config: {
              ...config,
              honorRoyalties: true,
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("RoyaltiesDisabled"));
      })
    );
  });

  //#endregion

  //#region Close pool.

  it("close pool roundtrips fees", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
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
      })
    );
  });

  it("close pool fails if nfts still deposited", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundATA(TEST_PROVIDER, 1, owner);
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);

        const pool = await testMakePool({ owner, config, whitelist });
        await testDepositNft({ pool, config, owner, ata, wlNft, whitelist });

        await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
          swapSdk.getErrorCodeHex("ExistingNfts")
        );
      })
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
        expectedRentBySeller: expSellerRent,
      });

      await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
        swapSdk.getErrorCodeHex("ExistingNfts")
      );
    }
  });

  //#endregion

  //#region Deposits.

  it("deposit non-WL nft fails", async () => {
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

    // Bad mint (w/ good + bad ATAs passed).
    for (const currAta of [ata, badAta]) {
      const {
        tx: { ixs },
      } = await swapSdk.depositNft({
        whitelist,
        nftMint: badMint,
        nftSource: currAta,
        owner: owner.publicKey,
        config,
        proof: proofs[0].proof,
      });
      await expect(
        buildAndSendTx({
          provider: TEST_PROVIDER,
          ixs,
          extraSigners: [owner],
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("InvalidProof"));
    }

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

  it("deposit WL nft w/ non-WL ata fails", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint } = await createAndFundATA(TEST_PROVIDER, 1, owner);
    const { proofs, whitelist } = await makeWhitelist([mint]);
    const { ata: badAta } = await createAndFundATA(TEST_PROVIDER, 1, owner);
    await testMakePool({ owner, config, whitelist });

    const {
      tx: { ixs },
    } = await swapSdk.depositNft({
      whitelist,
      // Good mint
      nftMint: mint,
      // Bad ATA
      nftSource: badAta,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await expect(
      buildAndSendTx({
        provider: TEST_PROVIDER,
        ixs,
        extraSigners: [owner],
      })
    ).rejectedWith(TOKEN_ACCT_WRONG_MINT_ERR);
  });

  //#endregion

  //#region Withdrawals.

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
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });

  it("buy nft at higher max price works (a steal!)", async () => {
    const [owner, buyer] = await makeNTraders(2);

    // needs to be serial ugh
    for (const [config, price] of cartesian(
      [nftPoolConfig, tradePoolConfig],
      [1.01 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL]
    )) {
      await testBuyNft({
        owner,
        buyer,
        config,
        // The lamports exchanged is still the current price.
        expectedLamports: LAMPORTS_PER_SOL,
        maxLamports: price,
      });
    }
  });

  it("buy nft at lower max price fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

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
          testBuyNft({
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
        const [owner, buyer] = await makeNTraders(2);
        const { mint, ata } = await makeMintTwoAta(owner, buyer);
        const { mint: badMint, ata: badAta } = await makeMintTwoAta(
          owner,
          buyer
        );
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);
        const poolPda = await testMakePool({ owner, whitelist, config });

        await testDepositNft({
          pool: poolPda,
          owner,
          config,
          ata,
          wlNft,
          whitelist,
        });

        // Both:
        // 1) non-WL mint + good ATA
        // 2) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: ata,
            err: hexCode(LangErrorCode.AccountNotInitialized),
          },
          { currMint: mint, currAta: badAta, err: TOKEN_ACCT_WRONG_MINT_ERR },
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
            proof: wlNft.proof,
            maxPrice: new BN(LAMPORTS_PER_SOL),
          });

          await expect(
            buildAndSendTx({
              provider: TEST_PROVIDER,
              ixs,
              extraSigners: [buyer],
            })
          ).rejectedWith(err);
        }
      })
    );
  });

  it("buy formerly deposited now non-WL mint fails, can withdraw though", async () => {
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const [owner, buyer] = await makeNTraders(2);
        const { mint, ata } = await makeMintTwoAta(owner, buyer);
        const { mint: badMint, ata: badAta } = await makeMintTwoAta(
          owner,
          buyer
        );
        const {
          proofs: [wlNft, badWlNft],
          whitelist,
        } = await makeWhitelist([mint, badMint]);
        const poolPda = await testMakePool({ owner, whitelist, config });

        // Deposit both good and (soon-to-be) bad mints.
        for (const { nft, currAta } of [
          { nft: wlNft, currAta: ata },
          { nft: badWlNft, currAta: badAta },
        ]) {
          await testDepositNft({
            pool: poolPda,
            owner,
            config,
            ata: currAta,
            wlNft: nft,
            whitelist,
          });
        }

        // Now update whitelist to just contain first mint.
        const { root: newRoot } = generateTreeOfSize(100, [mint]);
        const wlAcc = await wlSdk.fetchWhitelist(whitelist);
        const {
          tx: { ixs: updateWlIxs },
        } = await wlSdk.initUpdateWhitelist({
          owner: TEST_PROVIDER.publicKey,
          uuid: wlAcc.uuid,
          rootHash: newRoot,
        });
        await buildAndSendTx({ provider: TEST_PROVIDER, ixs: updateWlIxs });

        // Cannot buy non-WL nft anymore.
        const {
          tx: { ixs },
        } = await swapSdk.buyNft({
          whitelist,
          nftMint: badMint,
          nftBuyerAcc: badAta,
          owner: owner.publicKey,
          buyer: buyer.publicKey,
          config,
          proof: wlNft.proof,
          maxPrice: new BN(LAMPORTS_PER_SOL),
        });

        await expect(
          buildAndSendTx({
            provider: TEST_PROVIDER,
            ixs,
            extraSigners: [buyer],
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("InvalidProof"));

        // todo test withdraw
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
        maxPrice: currPrice,
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
      await testSellNft({
        owner,
        seller,
        config,
        // Selling is 1 tick lower than start price for trade pools.
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        expectedRentBySeller: expSellerRent,
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
      await testSellNft({
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        minLamports: config === tokenPoolConfig ? price : price - 1234,
        expectedRentBySeller: expSellerRent,
      });
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
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
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
          testSellNft({
            owner,
            seller,
            config,
            expectedLamports: config === tokenPoolConfig ? price : price - 1234,
            expectedRentBySeller: 0, // doesn't matter
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
        await testMakePool({ owner, whitelist, config });

        // Both:
        // 1) non-WL mint + good ATA
        // 2) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: ata,
            err: swapSdk.getErrorCodeHex("InvalidProof"),
          },
          { currMint: mint, currAta: badAta, err: TOKEN_ACCT_WRONG_MINT_ERR },
        ]) {
          const {
            tx: { ixs },
          } = await swapSdk.sellNft({
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

  //#endregion
});

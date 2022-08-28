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
  buildAndSendTx,
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
//(!) KEEP THIS IMPORT. It ensures ordering of tests (WL -> swap), otherwise both will fail
import "./twhitelist.spec";
import {
  getAccount,
  getMinimumBalanceForRentExemptAccount,
} from "@solana/spl-token";

chai.use(chaiAsPromised);

const TSWAP_FEE = 0.005;

const LINEAR_CONFIG: Omit<PoolConfig, "poolType"> = {
  curveType: CurveType.Linear,
  startingPrice: new BN(LAMPORTS_PER_SOL),
  delta: new BN(1234),
  honorRoyalties: true,
  mmFeeBps: 0,
  mmFeeVault: null,
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
  let tradePoolConfig: PoolConfig = {
    poolType: PoolType.Trade,
    ...LINEAR_CONFIG,
    mmFeeBps: 300,
    // Generated below.
    mmFeeVault: null,
  };

  let tswap: PublicKey;
  // trader A owns
  let tokenPool: PublicKey;
  // trader B owns
  let nftPool: PublicKey;
  // trader A owns
  let tradePool: PublicKey;

  let traderA: Keypair;
  let traderB: Keypair;
  let mmFeeVault: Keypair;
  let whitelist: PublicKey;

  let wlNftA: WhitelistedNft;
  let wlNftB: WhitelistedNft;
  let wlNftAAtaTraderA: PublicKey;
  let wlNftAAtaTraderB: PublicKey;
  let wlNftBAtaTraderB: PublicKey;

  let NOTwlNft: PublicKey;
  let NOTwlNftAta: PublicKey;

  let root: number[];

  const testDepositNft = async (
    targPool: PublicKey,
    config: PoolConfig,
    owner: Keypair,
    ata: PublicKey
  ) => {
    let {
      tx: { ixs },
      receiptPda,
      escrowPda,
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: wlNftA.mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: wlNftA.proof,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs,
      extraSigners: [owner],
    });

    //NFT moved from trader to escrow
    let traderAcc = await getAccount(TEST_PROVIDER.connection, ata);
    expect(traderAcc.amount.toString()).to.eq("0");
    let escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
    expect(escrowAcc.amount.toString()).to.eq("1");
    const poolAcc = await swapSdk.fetchPool(targPool);
    expect(poolAcc.nftsHeld).to.eq(1);

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(targPool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(wlNftA.mint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());
  };

  const testDepositSol = async (
    targPool: PublicKey,
    config: PoolConfig,
    owner: Keypair,
    lamports: number
  ) => {
    let {
      tx: { ixs },
      solEscrowPda,
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(lamports),
    });
    const prevPoolAcc = await swapSdk.fetchPool(targPool);
    await withLamports(
      { prevEscrowLamports: solEscrowPda },
      async ({ prevEscrowLamports }) => {
        await buildAndSendTx({
          provider: TEST_PROVIDER,
          ixs,
          extraSigners: [owner],
        });

        let currEscrowLamports = await getLamports(solEscrowPda);
        expect(currEscrowLamports! - prevEscrowLamports!).to.eq(lamports);
        const poolAcc = await swapSdk.fetchPool(targPool);
        expect(
          poolAcc.solFunding.toNumber() - prevPoolAcc.solFunding.toNumber()
        ).to.eq(lamports);
        expect(poolAcc.nftsHeld - prevPoolAcc.nftsHeld).to.eq(0);
      }
    );
  };

  const testSellNft = async ({
    pool,
    config,
    expectedLamports,
    owner,
    seller,
    sellerAta,
    wlNft,
    expectedRentBySeller,
  }: {
    pool: PublicKey;
    config: PoolConfig;
    expectedLamports: number;
    owner: Keypair;
    seller: Keypair;
    sellerAta: PublicKey;
    wlNft: WhitelistedNft;
    expectedRentBySeller: number;
  }) => {
    await testDepositSol(pool, config, owner, expectedLamports);

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.sellNft({
      whitelist,
      nftMint: wlNft.mint,
      nftSellerAcc: sellerAta,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      proof: wlNft.proof,
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
          debug: true,
        });

        //NFT moved from trader to escrow
        const traderAcc = await getAccount(TEST_PROVIDER.connection, sellerAta);
        expect(traderAcc.amount.toString()).to.eq("0");
        const escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
        expect(escrowAcc.amount.toString()).to.eq("1");

        //paid tswap fees (NB: fee account may be un-init before).
        const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
        const feeDiff = feeAccLamports! - (prevFeeAccLamports ?? 0);
        // todo: why is this not exactly 5%? where is rent coming from?
        expect(feeDiff).gte(LAMPORTS_PER_SOL * TSWAP_FEE);
        expect(feeDiff).lt(LAMPORTS_PER_SOL * 2 * TSWAP_FEE);

        //paid full amount to seller
        const currSellerLamports = await getLamports(seller.publicKey);
        // expect(currSellerLamports! - prevSellerLamports!).to.be.eq(
        //   expectedLamports * (1 - TSWAP_FEE) - expectedRentBySeller
        // );

        // buyer should not have balance change
        const currBuyerLamports = await getLamports(owner.publicKey);
        // expect(currBuyerLamports! - prevBuyerLamports!).to.be.equal(0);

        // Sol escrow should have the NFT cost deducted.
        const currEscrowLamports = await getLamports(solEscrowPda);
        // expect(prevEscrowLamports! - currEscrowLamports!).to.be.eq(
        //   expectedLamports
        // );

        console.log(
          currSellerLamports! - prevSellerLamports!,
          prevEscrowLamports! - currEscrowLamports!,
          currBuyerLamports! - prevBuyerLamports!
        );

        const poolAcc = await swapSdk.fetchPool(pool);
        expect(poolAcc.nftsHeld).to.eq(1);
        expect(poolAcc.poolNftPurchaseCount).to.eq(1);
        expect(poolAcc.poolNftSaleCount).to.eq(0);

        return { escrowPda, receiptPda };
      }
    );
  };

  before(async () => {
    //#region WL + mints + traders.

    //keypairs
    traderA = await createFundedWallet(TEST_PROVIDER);
    traderB = await createFundedWallet(TEST_PROVIDER);
    mmFeeVault = await createFundedWallet(TEST_PROVIDER);

    tradePoolConfig.mmFeeVault = mmFeeVault.publicKey;

    //token accounts
    const { mint: mintA, ata: ataA } = await createAndFundATA(
      TEST_PROVIDER,
      1,
      traderA
    );
    wlNftAAtaTraderA = ataA;
    const { mint: mintB, ata: ataB } = await createAndFundATA(
      TEST_PROVIDER,
      1,
      traderB
    );
    wlNftBAtaTraderB = ataB;
    ({ mint: NOTwlNft, ata: NOTwlNftAta } = await createAndFundATA(
      TEST_PROVIDER,
      1,
      traderA
    ));
    ({ ata: wlNftAAtaTraderB } = await createATA(
      TEST_PROVIDER,
      mintA,
      traderB
    ));

    // WL authority
    await testInitWLAuthority();

    //whitelist
    const { root, proofs } = generateTreeOfSize(100, [mintA, mintB]);
    [wlNftA, wlNftB] = proofs;
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
    whitelist = whitelistPda;
    await buildAndSendTx({ provider: TEST_PROVIDER, ixs: wlIxs });

    //#endregion

    //#region Initialize swap + pools

    //swap
    const {
      tx: { ixs },
      tswapPda,
    } = await swapSdk.initTSwap(TEST_PROVIDER.publicKey);
    tswap = tswapPda;
    await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

    const swapAcc = await swapSdk.fetchTSwap(tswap);
    expect(swapAcc.owner.toBase58()).to.be.eq(
      TEST_PROVIDER.publicKey.toBase58()
    );

    // pools
    const pools = await Promise.all(
      [
        { config: nftPoolConfig, type: "nft" as const, owner: traderA },
        { config: tokenPoolConfig, type: "token" as const, owner: traderB },
        { config: tradePoolConfig, type: "trade" as const, owner: traderA },
      ].map(async ({ config, type, owner }) => {
        const {
          tx: { ixs: poolIxs },
          poolPda,
        } = await swapSdk.initPool({
          owner: owner.publicKey,
          whitelist,
          config,
        });
        await buildAndSendTx({
          provider: TEST_PROVIDER,
          ixs: poolIxs,
          extraSigners: [owner],
        });

        let poolAcc = await swapSdk.fetchPool(poolPda);
        expect(poolAcc.owner.toBase58()).to.eq(owner.publicKey.toBase58());
        expect(poolAcc.tswap.toBase58()).to.eq(tswap.toBase58());
        expect(poolAcc.whitelist.toBase58()).to.eq(whitelist.toBase58());
        expect(poolAcc.poolNftSaleCount).to.eq(0);
        expect(poolAcc.poolNftPurchaseCount).to.eq(0);
        expect(poolAcc.nftsHeld).to.eq(0);
        expect(poolAcc.solFunding.toNumber()).to.eq(0);

        const accConfig = poolAcc.config as PoolConfig;
        expect(type in accConfig.poolType).to.be.true;
        expect(JSON.stringify(accConfig.curveType)).to.eq(
          JSON.stringify(CurveType.Linear)
        );
        expect(accConfig.startingPrice.toNumber()).to.eq(LAMPORTS_PER_SOL);
        expect(accConfig.delta.toNumber()).to.eq(1234);
        expect(accConfig.honorRoyalties).to.eq(true);
        if (type === "trade") {
          expect(accConfig.mmFeeBps).to.eq(300);
          expect(accConfig.mmFeeVault?.toBase58()).to.eq(
            mmFeeVault.publicKey.toBase58()
          );
        } else {
          expect(accConfig.mmFeeBps).to.eq(0);
          expect(accConfig.mmFeeVault).to.be.null;
        }

        return poolPda;
      })
    );
    [nftPool, tokenPool, tradePool] = pools;

    //#endregion

    console.log(
      "debug accs",
      stringifyPKsAndBNs({
        tswap,
        tokenPool,
        nftPool,
        tradePool,
        traderA: traderA.publicKey,
        traderB: traderB.publicKey,
        whitelist,
        wlNftA,
        wlNftB,
        wlNftAAtaTraderA,
        wlNftAAtaTraderB,
        wlNftBAtaTraderB,
        NOTwlNft,
        NOTwlNftAta,
      })
    );
  });

  it("initialize trade pool without fee", async () => {
    const {
      tx: { ixs: poolIxs },
    } = await swapSdk.initPool({
      owner: traderA.publicKey,
      whitelist,
      // Need diff price since other pool exists.
      config: {
        ...tradePoolConfig,
        startingPrice: new BN(2345),
        mmFeeVault: null,
      },
    });
    await expect(
      buildAndSendTx({
        provider: TEST_PROVIDER,
        ixs: poolIxs,
        extraSigners: [traderA],
      })
    ).to.be.rejectedWith("0x1776");
  });

  it("deposit non-WL nft", async () => {
    //bad
    const {
      tx: { ixs: badIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: NOTwlNft,
      nftSource: NOTwlNftAta,
      owner: traderA.publicKey,
      config: nftPoolConfig,
      proof: wlNftA.proof,
    });
    await expect(
      buildAndSendTx({
        provider: TEST_PROVIDER,
        ixs: badIxs,
        extraSigners: [traderA],
      })
    ).to.be.rejectedWith("0x1770");
  });

  it("buys nft from nft pool", async () => {
    const pool = nftPool;
    const config = nftPoolConfig;
    await testDepositNft(pool, config, traderA, wlNftAAtaTraderA);

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.buyNft({
      whitelist,
      nftMint: wlNftA.mint,
      nftBuyerAcc: wlNftAAtaTraderB,
      owner: traderA.publicKey,
      buyer: traderB.publicKey,
      config,
      proof: wlNftA.proof,
    });

    await withLamports(
      {
        prevFeeAccLamports: TSWAP_FEE_ACC,
        prevSellerLamports: traderA.publicKey,
        prevBuyerLamports: traderB.publicKey,
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
          extraSigners: [traderB],
        });

        //NFT moved from escrow to trader
        const traderAcc = await getAccount(
          TEST_PROVIDER.connection,
          wlNftAAtaTraderB
        );
        expect(traderAcc.amount.toString()).to.eq("1");
        const escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
        expect(escrowAcc.amount.toString()).to.eq("0");

        //paid tswap fees (NB: fee account may be un-init before).
        const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
        const feeDiff = feeAccLamports! - (prevFeeAccLamports ?? 0);
        // todo: why is this not exactly 5%? where is rent coming from?
        expect(feeDiff).gte(LAMPORTS_PER_SOL * TSWAP_FEE);
        expect(feeDiff).lt(LAMPORTS_PER_SOL * 2 * TSWAP_FEE);

        //paid full amount to owner
        const currSellerLamports = await getLamports(traderA.publicKey);
        const currBuyerLamports = await getLamports(traderB.publicKey);
        expect(currSellerLamports! - prevSellerLamports!).to.be.eq(
          LAMPORTS_PER_SOL * (1 - TSWAP_FEE)
        );
        expect(prevBuyerLamports! - currBuyerLamports!).to.be.eq(
          LAMPORTS_PER_SOL
        );

        // Sol escrow just has rent ($ goes directly to owner)
        const currSolEscrowLamports = await getLamports(solEscrowPda);
        expect(currSolEscrowLamports! - prevEscrowLamports!).to.be.eq(0);

        const poolAcc = await swapSdk.fetchPool(pool);
        expect(poolAcc.nftsHeld).to.eq(0);
        expect(poolAcc.poolNftSaleCount).to.eq(1);
        expect(poolAcc.poolNftPurchaseCount).to.eq(0);

        //receipt should have gotten closed
        await expect(swapSdk.fetchReceipt(receiptPda)).to.be.rejected;
      }
    );
  });

  it("sells nft into token pool", async () => {
    const { receiptPda } = await testSellNft({
      pool: tokenPool,
      config: tokenPoolConfig,
      expectedLamports: LAMPORTS_PER_SOL,
      owner: traderB,
      seller: traderA,
      sellerAta: wlNftAAtaTraderA,
      wlNft: wlNftA,
      // Seller pays rent for NFT escrow account
      expectedRentBySeller: await getMinimumBalanceForRentExemptAccount(
        TEST_PROVIDER.connection
      ),
    });

    //no deposit receipt when selling into a Token pool.
    await expect(swapSdk.fetchReceipt(receiptPda)).to.be.rejected;
  });

  it.only("sells nft into trade pool", async () => {
    const { escrowPda, receiptPda } = await testSellNft({
      pool: tradePool,
      config: tradePoolConfig,
      expectedLamports: LAMPORTS_PER_SOL - LINEAR_CONFIG.delta.toNumber(),
      owner: traderA,
      seller: traderB,
      sellerAta: wlNftBAtaTraderB,
      wlNft: wlNftB,
      // Seller pays rent for:
      // (1) NFT escrow account
      // (2) NFT deposit receipt
      expectedRentBySeller:
        (await getMinimumBalanceForRentExemptAccount(
          TEST_PROVIDER.connection
        )) + (await swapSdk.getNftDepositReceiptRent()),
    });

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(tokenPool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(wlNftA.mint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());
  });

  it("deposits/buys multiple", async () => {
    //todo once optimize the ix, try increasing
    const MAX_IXS = 1;

    //prepare multiple nfts
    const nfts: {
      mint: PublicKey;
      ataA: PublicKey;
      ataB: PublicKey;
      depositIxs?: TransactionInstruction[];
      buyIxs?: TransactionInstruction[];
    }[] = [];

    for (let i = 0; i < MAX_IXS; i++) {
      const { mint, ata: ataA } = await createAndFundATA(
        TEST_PROVIDER,
        1,
        traderA
      );
      const { ata: ataB } = await createATA(TEST_PROVIDER, mint, traderB);
      nfts.push({ mint, ataA, ataB });
    }

    //prepare tree & pool
    const { root, proofs } = generateTreeOfSize(
      100,
      nfts.map((nft) => nft.mint)
    );
    const uuid = wlSdk.genWhitelistUUID(); //todo make random
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

    const poolConfig2: PoolConfig = {
      poolType: PoolType.NFT,
      curveType: CurveType.Linear,
      startingPrice: new BN(LAMPORTS_PER_SOL),
      delta: new BN(LAMPORTS_PER_SOL / 10),
      honorRoyalties: true,
      mmFeeBps: 0,
      mmFeeVault: null,
    };
    const {
      tx: { ixs: poolIxs },
    } = await swapSdk.initPool({
      owner: traderA.publicKey,
      whitelist: whitelistPda,
      config: poolConfig2,
    });
    await buildAndSendTx({
      provider: TEST_PROVIDER,
      ixs: poolIxs,
      extraSigners: [traderA],
    });

    for (const nft of nfts) {
      const {
        tx: { ixs: depositIxs },
      } = await swapSdk.depositNft({
        whitelist: whitelistPda,
        nftMint: nft.mint,
        nftSource: nft.ataA,
        owner: traderA.publicKey,
        config: poolConfig2,
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
      });
      nft.depositIxs = depositIxs;

      const {
        tx: { ixs: buyIxs },
      } = await swapSdk.buyNft({
        whitelist: whitelistPda,
        nftMint: nft.mint,
        nftBuyerAcc: nft.ataB,
        owner: traderA.publicKey,
        buyer: traderB.publicKey,
        config: poolConfig2,
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
      });
      nft.buyIxs = buyIxs;
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
    expect(traderAccA.amount.toString()).to.eq("0");
    const traderAccB = await getAccount(TEST_PROVIDER.connection, nfts[0].ataB);
    expect(traderAccB.amount.toString()).to.eq("1");
  });
});

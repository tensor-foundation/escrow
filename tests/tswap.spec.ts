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
  getAccountRent,
  stringifyPKsAndBNs,
  swapSdk,
  testInitWLAuthority,
  TEST_PROVIDER,
  wlSdk,
} from "./shared";
//(!) KEEP THIS IMPORT. It ensures ordering of tests (WL -> swap), otherwise both will fail
import "./twhitelist.spec";
import { MerkleTree } from "merkletreejs";
import { getAccount } from "@solana/spl-token";
import {
  PendingTransaction,
  SolanaAugmentedProvider,
  Provider,
  TransactionEnvelope,
  SolanaProvider,
} from "@saberhq/solana-contrib";

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

describe("tensorswap", () => {
  const sellPoolConfig: PoolConfig = {
    poolType: PoolType.NFT,
    ...LINEAR_CONFIG,
  };
  const buyPoolConfig: PoolConfig = {
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
  let buyPool: PublicKey;
  // trader B owns
  let sellPool: PublicKey;
  // trader A owns
  let tradePool: PublicKey;

  let traderA: Keypair;
  let traderB: Keypair;
  let mmFeeVault: Keypair;
  let whitelist: PublicKey;

  let whitelistedNftMint: PublicKey;
  let whitelistedMintProof: Buffer[];
  let whitelistedNftAtaTraderA: PublicKey;
  let whitelistedNftAtaTraderB: PublicKey;

  let NOTwhitelistedNftMint: PublicKey;
  let NOTwhitelistedNftAta: PublicKey;

  let root: number[];

  const testDepositNFT = async (
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
      nftMint: whitelistedNftMint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: whitelistedMintProof,
    });
    await buildAndSendTx(TEST_PROVIDER, ixs, [owner]);

    //NFT moved from trader to escrow
    let traderAcc = await getAccount(TEST_PROVIDER.connection, ata);
    expect(traderAcc.amount.toString()).to.eq("0");
    let escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
    expect(escrowAcc.amount.toString()).to.eq("1");
    const poolAcc = await swapSdk.fetchPool(targPool);
    expect(poolAcc.nftsHeld).to.eq(1);

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(targPool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(whitelistedNftMint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());
  };

  const testDepositSOL = async (
    targPool: PublicKey,
    config: PoolConfig,
    owner: Keypair
  ) => {
    const lamports = 3 * LAMPORTS_PER_SOL;
    let {
      tx: { ixs },
      solEscrowPda,
    } = await swapSdk.depositSol({
      whitelist,
      owner: owner.publicKey,
      config,
      lamports: new BN(lamports),
    });
    await buildAndSendTx(TEST_PROVIDER, ixs, [owner]);

    let solEscrowAcc = await TEST_PROVIDER.connection.getAccountInfo(
      solEscrowPda
    );
    expect(solEscrowAcc?.lamports).to.eq(
      lamports + (await swapSdk.getSolEscrowRent(TEST_PROVIDER))
    );
    const poolAcc = await swapSdk.fetchPool(targPool);
    expect(poolAcc.solFunding.toNumber()).to.eq(lamports);
    expect(poolAcc.nftsHeld).to.eq(0);
  };

  before(async () => {
    //#region WL + mints + traders.

    //keypairs
    traderA = await createFundedWallet(TEST_PROVIDER);
    traderB = await createFundedWallet(TEST_PROVIDER);
    mmFeeVault = await createFundedWallet(TEST_PROVIDER);

    tradePoolConfig.mmFeeVault = mmFeeVault.publicKey;

    //token accounts
    ({ mint: whitelistedNftMint, ata: whitelistedNftAtaTraderA } =
      await createAndFundATA(TEST_PROVIDER, 1, traderA));
    ({ mint: NOTwhitelistedNftMint, ata: NOTwhitelistedNftAta } =
      await createAndFundATA(TEST_PROVIDER, 1, traderA));
    ({ ata: whitelistedNftAtaTraderB } = await createATA(
      TEST_PROVIDER,
      whitelistedNftMint,
      traderB
    ));

    // WL authority
    await testInitWLAuthority();

    //whitelist
    const { root, proofs } = generateTreeOfSize(100, [whitelistedNftMint]);
    whitelistedMintProof = proofs[0].proof;
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
    await buildAndSendTx(TEST_PROVIDER, wlIxs);

    //#endregion

    //#region Initialize swap + pools

    //swap
    const {
      tx: { ixs },
      tswapPda,
    } = await swapSdk.initTSwap(TEST_PROVIDER.publicKey);
    tswap = tswapPda;
    await buildAndSendTx(TEST_PROVIDER, ixs);

    const swapAcc = await swapSdk.fetchTSwap(tswap);
    expect(swapAcc.owner.toBase58()).to.be.eq(
      TEST_PROVIDER.publicKey.toBase58()
    );

    // pools
    const pools = await Promise.all(
      [
        { config: sellPoolConfig, type: "nft" as const, owner: traderA },
        { config: buyPoolConfig, type: "token" as const, owner: traderB },
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
        await buildAndSendTx(TEST_PROVIDER, poolIxs, [owner]);

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
    [sellPool, buyPool, tradePool] = pools;

    //#endregion

    console.log(
      "debug accs",
      stringifyPKsAndBNs({
        tswap,
        buyPool,
        sellPool,
        tradePool,
        traderA: traderA.publicKey,
        traderB: traderB.publicKey,
        whitelist,
        whitelistedNftMint,
        whitelistedNftAtaTraderA,
        whitelistedNftAtaTraderB,
        NOTwhitelistedNftMint,
        NOTwhitelistedNftAta,
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
      buildAndSendTx(TEST_PROVIDER, poolIxs, [traderA])
    ).to.be.rejectedWith("0x1776");
  });

  it("deposit non-WL nft", async () => {
    //bad
    const {
      tx: { ixs: badIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: NOTwhitelistedNftMint,
      nftSource: NOTwhitelistedNftAta,
      owner: traderA.publicKey,
      config: sellPoolConfig,
      proof: whitelistedMintProof,
    });
    await expect(
      buildAndSendTx(TEST_PROVIDER, badIxs, [traderA])
    ).to.be.rejectedWith("0x1770");
  });

  it("buys nft", async () => {
    const pool = sellPool;
    const config = sellPoolConfig;

    await testDepositNFT(pool, config, traderA, whitelistedNftAtaTraderA);

    const startingSellerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderA.publicKey)
    )?.lamports;
    const startingBuyerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderB.publicKey)
    )?.lamports;

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.buyNft({
      whitelist,
      nftMint: whitelistedNftMint,
      nftBuyerAcc: whitelistedNftAtaTraderB,
      owner: traderA.publicKey,
      buyer: traderB.publicKey,
      config,
      proof: whitelistedMintProof,
    });
    await buildAndSendTx(TEST_PROVIDER, ixs, [traderB]);

    //NFT moved from escrow to trader
    const traderAcc = await getAccount(
      TEST_PROVIDER.connection,
      whitelistedNftAtaTraderB
    );
    expect(traderAcc.amount.toString()).to.eq("1");
    const escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
    expect(escrowAcc.amount.toString()).to.eq("0");

    //paid tswap fees
    const feeAcc = await TEST_PROVIDER.connection.getAccountInfo(TSWAP_FEE_ACC);
    expect(feeAcc?.lamports).to.be.gte(LAMPORTS_PER_SOL * TSWAP_FEE);
    expect(feeAcc?.lamports).to.be.lt(LAMPORTS_PER_SOL * 2 * TSWAP_FEE); //rent

    //paid full amount to owner
    const endingSellerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderA.publicKey)
    )?.lamports;
    const endingBuyerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderB.publicKey)
    )?.lamports;
    const sellerDiff = endingSellerLamports! - startingSellerLamports!;
    const buyerDiff = startingBuyerLamports! - endingBuyerLamports!;
    expect(sellerDiff).to.be.eq(LAMPORTS_PER_SOL * (1 - TSWAP_FEE));
    expect(buyerDiff).to.be.eq(LAMPORTS_PER_SOL);

    // Sol escrow just has rent ($ goes directly to owner)
    const solEscrowAcc = await TEST_PROVIDER.connection.getAccountInfo(
      solEscrowPda
    );
    expect(solEscrowAcc?.lamports).to.be.eq(
      await swapSdk.getSolEscrowRent(TEST_PROVIDER)
    );

    const poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.nftsHeld).to.eq(0);
    expect(poolAcc.poolNftSaleCount).to.eq(1);
    expect(poolAcc.poolNftPurchaseCount).to.eq(0);

    //receipt should have gotten closed
    await expect(swapSdk.fetchReceipt(receiptPda)).to.be.rejected;
  });

  it.only("sells nft", async () => {
    const pool = buyPool;
    const config = buyPoolConfig;

    await testDepositSOL(pool, config, traderB);

    const startingSellerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderA.publicKey)
    )?.lamports;
    const startingBuyerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderB.publicKey)
    )?.lamports;

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.sellNft({
      whitelist,
      nftMint: whitelistedNftMint,
      nftSellerAcc: whitelistedNftAtaTraderA,
      owner: traderB.publicKey,
      seller: traderA.publicKey,
      config,
      proof: whitelistedMintProof,
    });
    await buildAndSendTx(TEST_PROVIDER, ixs, [traderA]);

    const startingEscrowBalance = (
      await TEST_PROVIDER.connection.getAccountInfo(solEscrowPda)
    )?.lamports;

    //NFT moved from trader to escrow
    const traderAcc = await getAccount(
      TEST_PROVIDER.connection,
      whitelistedNftAtaTraderA
    );
    expect(traderAcc.amount.toString()).to.eq("0");
    const escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
    expect(escrowAcc.amount.toString()).to.eq("1");

    //paid tswap fees
    const feeAcc = await TEST_PROVIDER.connection.getAccountInfo(TSWAP_FEE_ACC);
    expect(feeAcc?.lamports).to.be.gte(LAMPORTS_PER_SOL * TSWAP_FEE);
    expect(feeAcc?.lamports).to.be.lt(LAMPORTS_PER_SOL * 2 * TSWAP_FEE); //rent

    //paid full amount to seller
    const endingSellerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderA.publicKey)
    )?.lamports;
    const diff = endingSellerLamports! - startingSellerLamports!;
    expect(diff).to.be.eq(LAMPORTS_PER_SOL * (1 - TSWAP_FEE));

    // buyer should not have balance change
    const endingBuyerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderB.publicKey)
    )?.lamports;
    expect(startingBuyerLamports!).to.be.equal(endingBuyerLamports!);

    // Sol escrow should have the NFT cost less fees.
    const endingEscrowBalance = (
      await TEST_PROVIDER.connection.getAccountInfo(solEscrowPda)
    )?.lamports;
    const escrowDiff = endingEscrowBalance! - startingEscrowBalance!;
    expect(escrowDiff).to.be.eq(LAMPORTS_PER_SOL * (1 - TSWAP_FEE));

    const poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.nftsHeld).to.eq(1);
    expect(poolAcc.poolNftPurchaseCount).to.eq(1);
    expect(poolAcc.poolNftSaleCount).to.eq(0);

    //no deposit receipt
    await expect(swapSdk.fetchReceipt(receiptPda)).to.be.rejected;
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
    await buildAndSendTx(TEST_PROVIDER, wlIxs);

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
    await buildAndSendTx(TEST_PROVIDER, poolIxs, [traderA]);

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
    await buildAndSendTx(
      TEST_PROVIDER,
      nfts.map((n) => n.depositIxs).flat() as TransactionInstruction[],
      [traderA]
    );

    //buy
    await buildAndSendTx(
      TEST_PROVIDER,
      nfts.map((n) => n.buyIxs).flat() as TransactionInstruction[],
      [traderB]
    );

    //check one of the accounts
    const traderAccA = await getAccount(TEST_PROVIDER.connection, nfts[0].ataA);
    expect(traderAccA.amount.toString()).to.eq("0");
    const traderAccB = await getAccount(TEST_PROVIDER.connection, nfts[0].ataB);
    expect(traderAccB.amount.toString()).to.eq("1");
  });
});

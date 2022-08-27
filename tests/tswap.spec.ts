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

describe("tensorswap", () => {
  const poolConfig: PoolConfig = {
    poolType: PoolType.NFT,
    curveType: CurveType.Linear,
    startingPrice: new BN(LAMPORTS_PER_SOL),
    delta: new BN(1234),
    honorRoyalties: true,
    mmFeeBps: 0,
    mmFeeVault: null,
  };

  let tswap: PublicKey;
  let pool: PublicKey;

  let traderA: Keypair;
  let traderB: Keypair;
  let whitelist: PublicKey;

  let whitelistedNftMint: PublicKey;
  let whitelistedNftAtaTraderA: PublicKey;
  let whitelistedNftAtaTraderB: PublicKey;

  let NOTwhitelistedNftMint: PublicKey;
  let NOTwhitelistedNftAta: PublicKey;

  let tree: MerkleTree;
  let root: number[];
  let proof: Buffer[];

  before(async () => {
    //#region WL + mints + traders.

    //keypairs
    traderA = await createFundedWallet(TEST_PROVIDER);
    traderB = await createFundedWallet(TEST_PROVIDER);

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
    ({
      tree,
      root,
      proofs: [{ proof }],
    } = generateTreeOfSize(100, [whitelistedNftMint]));
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

    console.log(
      "debug accs",
      stringifyPKsAndBNs({
        pool,
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

    //#endregion

    //#region Initialize swap + pool

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

    //pool
    const {
      tx: { ixs: poolIxs },
      poolPda,
    } = await swapSdk.initPool(traderA.publicKey, whitelist, poolConfig);
    pool = poolPda;
    await buildAndSendTx(TEST_PROVIDER, poolIxs, [traderA]);

    let poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.owner.toBase58()).to.eq(traderA.publicKey.toBase58());

    //#endregion

    //#region Deposit NFT.

    //good
    const {
      tx: { ixs: goodIxs },
      receiptPda,
      escrowPda,
    } = await swapSdk.depositNft(
      whitelist,
      whitelistedNftMint,
      whitelistedNftAtaTraderA,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await buildAndSendTx(TEST_PROVIDER, goodIxs, [traderA]);

    //NFT moved from trader to escrow
    const traderAcc = await getAccount(
      TEST_PROVIDER.connection,
      whitelistedNftAtaTraderA
    );
    expect(traderAcc.amount.toString()).to.eq("0");
    const escrowAcc = await getAccount(TEST_PROVIDER.connection, escrowPda);
    expect(escrowAcc.amount.toString()).to.eq("1");
    poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.nftsHeld).to.eq(1);

    const receipt = await swapSdk.fetchReceipt(receiptPda);
    expect(receipt.pool.toBase58()).to.eq(pool.toBase58());
    expect(receipt.nftMint.toBase58()).to.eq(whitelistedNftMint.toBase58());
    expect(receipt.nftEscrow.toBase58()).to.eq(escrowPda.toBase58());

    //#endregion
  });

  it("deposit non-WL nft", async () => {
    //bad
    const {
      tx: { ixs: badIxs },
    } = await swapSdk.depositNft(
      whitelist,
      NOTwhitelistedNftMint,
      NOTwhitelistedNftAta,
      traderA.publicKey,
      poolConfig,
      proof
    );
    await expect(
      buildAndSendTx(TEST_PROVIDER, badIxs, [traderA])
    ).to.be.rejectedWith("0x1770");
  });

  it("buys nft", async () => {
    const startingSellerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderA.publicKey)
    )?.lamports;

    const {
      tx: { ixs },
      receiptPda,
      escrowPda,
      solEscrowPda,
    } = await swapSdk.buyNft(
      whitelist,
      whitelistedNftMint,
      whitelistedNftAtaTraderB,
      traderA.publicKey,
      traderB.publicKey,
      poolConfig,
      proof
    );
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

    //paid full amount to seller
    const endingSellerLamports = (
      await TEST_PROVIDER.connection.getAccountInfo(traderA.publicKey)
    )?.lamports;
    const diff = endingSellerLamports! - startingSellerLamports!;
    expect(diff).to.be.eq(LAMPORTS_PER_SOL * (1 - TSWAP_FEE));

    // Sol escrow should not have anything (goes to seller)
    const solEscrowAcc = await TEST_PROVIDER.connection.getAccountInfo(
      solEscrowPda
    );
    expect(solEscrowAcc?.lamports).to.be.eq(
      await getAccountRent(TEST_PROVIDER, swapSdk.program.account.solEscrow)
    );

    const poolAcc = await swapSdk.fetchPool(pool);
    expect(poolAcc.nftsHeld).to.eq(0);
    expect(poolAcc.poolNftSaleCount).to.eq(1);

    //receipt should have gotten closed
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
    const { tree, root, proofs } = generateTreeOfSize(
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
    } = await swapSdk.initPool(traderA.publicKey, whitelistPda, poolConfig2);
    await buildAndSendTx(TEST_PROVIDER, poolIxs, [traderA]);

    for (const nft of nfts) {
      const {
        tx: { ixs: depositIxs },
      } = await swapSdk.depositNft(
        whitelistPda,
        nft.mint,
        nft.ataA,
        traderA.publicKey,
        poolConfig2,
        proofs.find((p) => p.mint === nft.mint)!.proof
      );
      nft.depositIxs = depositIxs;

      const {
        tx: { ixs: buyIxs },
      } = await swapSdk.buyNft(
        whitelistPda,
        nft.mint,
        nft.ataB,
        traderA.publicKey,
        traderB.publicKey,
        poolConfig2,
        proofs.find((p) => p.mint === nft.mint)!.proof
      );
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

import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAccount as _getAccount,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import chai, { expect } from "chai";
import {
  CurveTypeAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  TakerSide,
  TSwapConfig,
  TSWAP_FEE_ACC,
  computeCurrentPrice as computeCurrentPrice_,
  computeDepositAmount as computeDepositAmount_,
  CurveType,
  PoolType,
  PoolConfig,
} from "../../src";
import {
  ACCT_NOT_EXISTS_ERR,
  buildAndSendTx,
  generateTreeOfSize,
  getLamports,
  stringifyPKsAndBNs,
  swapSdk,
  testInitWLAuthority,
  TEST_PROVIDER,
  withLamports,
  wlSdk,
} from "../shared";
import { AnchorProvider } from "@project-serum/anchor";
import chaiAsPromised from "chai-as-promised";
import Big from "big.js";

// Enables rejectedWith.
chai.use(chaiAsPromised);

//#region Test constants/types.

export const TSWAP_FEE = 0.005;

export const LINEAR_CONFIG: Omit<PoolConfigAnchor, "poolType"> = {
  curveType: CurveTypeAnchor.Linear,
  startingPrice: new BN(LAMPORTS_PER_SOL),
  delta: new BN(1234),
  honorRoyalties: false,
  mmFeeBps: 0,
};
export const nftPoolConfig: PoolConfigAnchor = {
  poolType: PoolTypeAnchor.NFT,
  ...LINEAR_CONFIG,
};
export const tokenPoolConfig: PoolConfigAnchor = {
  poolType: PoolTypeAnchor.Token,
  ...LINEAR_CONFIG,
};
export const tradePoolConfig: PoolConfigAnchor = {
  poolType: PoolTypeAnchor.Trade,
  ...LINEAR_CONFIG,
  mmFeeBps: 300,
};

type WhitelistedNft = { mint: PublicKey; proof: Buffer[] };

//#endregion

//#region Test fixtures.

export const beforeHook = async () => {
  //keypairs (have a lot of sol for many tests that re-use these keypairs)
  // WL authority
  await testInitWLAuthority();

  // Tswap
  const {
    tx: { ixs },
    tswapPda,
  } = await swapSdk.initUpdateTSwap(TEST_PROVIDER.publicKey, TSWAP_FEE_ACC);
  await buildAndSendTx({ ixs });

  const swapAcc = await swapSdk.fetchTSwap(tswapPda);
  expect(swapAcc.owner.toBase58()).eq(TEST_PROVIDER.publicKey.toBase58());
  expect(swapAcc.feeVault.toBase58()).eq(TSWAP_FEE_ACC.toBase58());
  expect((swapAcc.config as TSwapConfig).feeBps).eq(TSWAP_FEE * 1e4);

  // Initialize fees.

  console.log(
    "debug accs",
    stringifyPKsAndBNs({
      tswapPda,
    })
  );

  return { tswapPda };
};

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

//#endregion

//#region ATA/wallet helper functions.

const _createFundedWallet = async (
  provider: AnchorProvider,
  sol: number = 1000
): Promise<Keypair> => {
  const keypair = Keypair.generate();
  //airdrops are funky, best to move from provider wallet
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: keypair.publicKey,
      lamports: sol * LAMPORTS_PER_SOL,
    })
  );
  await buildAndSendTx({ provider, ixs: tx.instructions });
  return keypair;
};

const _createATA = async (
  provider: AnchorProvider,
  mint: PublicKey,
  owner: Keypair
) => {
  const ata = await getAssociatedTokenAddress(mint, owner.publicKey);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    owner.publicKey,
    ata,
    owner.publicKey,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  await buildAndSendTx({ provider, ixs: [createAtaIx], extraSigners: [owner] });
  return { mint, owner, ata };
};

const _createAndFundATA = async (
  provider: AnchorProvider,
  amount: number,
  owner?: Keypair
): Promise<{ mint: PublicKey; ata: PublicKey; owner: Keypair }> => {
  const usedOwner = owner ?? (await _createFundedWallet(provider));
  const mint = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptMint(
    provider.connection
  );
  const createMintAccIx = SystemProgram.createAccount({
    fromPubkey: usedOwner.publicKey,
    newAccountPubkey: mint.publicKey,
    space: MINT_SIZE,
    lamports,
    programId: TOKEN_PROGRAM_ID,
  });
  const createMintIx = createInitializeMintInstruction(
    mint.publicKey,
    0,
    usedOwner.publicKey,
    usedOwner.publicKey
  );
  const ata = await getAssociatedTokenAddress(
    mint.publicKey,
    usedOwner.publicKey
  );
  const createAtaIx = createAssociatedTokenAccountInstruction(
    usedOwner.publicKey,
    ata,
    usedOwner.publicKey,
    mint.publicKey
  );
  const mintIx = createMintToInstruction(
    mint.publicKey,
    ata,
    usedOwner.publicKey,
    amount
  );

  const ixs = [createMintAccIx, createMintIx, createAtaIx];
  if (amount > 0) {
    ixs.push(mintIx);
  }

  await buildAndSendTx({ provider, ixs, extraSigners: [usedOwner, mint] });
  return { mint: mint.publicKey, ata, owner: usedOwner };
};

export const createFundedWallet = (sol?: number) =>
  _createFundedWallet(TEST_PROVIDER, sol);
export const createATA = (mint: PublicKey, owner: Keypair) =>
  _createATA(TEST_PROVIDER, mint, owner);
export const createAndFundATA = (owner?: Keypair) =>
  _createAndFundATA(TEST_PROVIDER, 1, owner);
export const getAccount = (acct: PublicKey) =>
  _getAccount(TEST_PROVIDER.connection, acct);

//#endregion

//#region Non-expect helper functions (no expects run).

// Creates a mint + 2 ATAs. The `owner` will have the mint initially.
export const makeMintTwoAta = async (owner: Keypair, other: Keypair) => {
  const { mint, ata } = await createAndFundATA(owner);

  const { ata: otherAta } = await createATA(mint, other);

  return { mint, ata, otherAta };
};

export const makeNTraders = async (n: number, sol?: number) => {
  return await Promise.all(
    Array(n)
      .fill(null)
      .map(async () => await createFundedWallet(sol))
  );
};

export const makeWhitelist = async (mints: PublicKey[]) => {
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

const _castConfig = (config: PoolConfigAnchor): PoolConfig => {
  return {
    poolType:
      config.poolType === PoolTypeAnchor.NFT
        ? PoolType.NFT
        : config.poolType === PoolTypeAnchor.Token
        ? PoolType.Token
        : PoolType.Trade,
    curveType:
      config.curveType === CurveTypeAnchor.Linear
        ? CurveType.Linear
        : CurveType.Exponential,
    startingPrice: new Big(config.startingPrice.toString()),
    delta: new Big(config.delta.toString()),
  };
};

export const computeDepositAmount = ({
  config,
  nftCount,
}: {
  config: PoolConfigAnchor;
  nftCount: number;
}): BN =>
  new BN(
    computeDepositAmount_({
      config: _castConfig(config),
      nftCount,
    }).toNumber()
  );

export const computeCurrentPrice = ({
  config,
  buyCount,
  sellCount,
  takerSide,
  slippage,
}: {
  config: PoolConfigAnchor;
  buyCount: number;
  sellCount: number;
  takerSide: TakerSide;
  slippage?: number;
}): BN =>
  new BN(
    computeCurrentPrice_({
      config: _castConfig(config),
      takerBuyCount: buyCount,
      takerSellCount: sellCount,
      takerSide,
      extraNFTsSelected: 0,
      slippage,
    }).toNumber()
  );

//#endregion

//#region Helper fns with expect statements.

// Can be run async.
export const testMakePool = async ({
  tswap,
  owner,
  whitelist,
  config,
}: {
  tswap: PublicKey;
  owner: Keypair;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
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

  const accConfig = poolAcc.config as PoolConfigAnchor;
  expect(Object.keys(config.poolType)[0] in accConfig.poolType).true;
  expect(JSON.stringify(accConfig.curveType)).eq(
    JSON.stringify(config.curveType)
  );
  expect(accConfig.startingPrice.toNumber()).eq(
    config.startingPrice.toNumber()
  );
  expect(accConfig.delta.toNumber()).eq(config.delta.toNumber());
  expect(accConfig.honorRoyalties).eq(false);
  if (config.poolType === PoolTypeAnchor.Trade) {
    expect(accConfig.mmFeeBps).eq(config.mmFeeBps);
  } else {
    expect(accConfig.mmFeeBps).eq(0);
  }

  await swapSdk.fetchSolEscrow(solEscrowPda);
  expect(await getLamports(solEscrowPda)).eq(await swapSdk.getSolEscrowRent());

  return poolPda;
};

// Can be run async.
export const testClosePool = async ({
  owner,
  whitelist,
  config,
}: {
  owner: Keypair;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
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
export const testDepositNft = async ({
  pool,
  config,
  owner,
  ata,
  wlNft,
  whitelist,
}: {
  pool: PublicKey;
  config: PoolConfigAnchor;
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
  let traderAcc = await getAccount(ata);
  expect(traderAcc.amount.toString()).eq("0");
  let escrowAcc = await getAccount(escrowPda);
  expect(escrowAcc.amount.toString()).eq("1");
  const poolAcc = await swapSdk.fetchPool(pool);
  expectPoolAccounting(poolAcc, prevPoolAcc, { nfts: 1, sell: 0, buy: 0 });

  const receipt = await swapSdk.fetchReceipt(receiptPda);
  expect(receipt.pool.toBase58()).eq(pool.toBase58());
  expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
  expect(receipt.nftEscrow.toBase58()).eq(escrowPda.toBase58());
};

// CANNOT be run async w/ same pool (sol escrow balance check).
export const testDepositSol = async ({
  pool,
  whitelist,
  config,
  owner,
  lamports,
}: {
  pool: PublicKey;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
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

// CANNOT be run async w/ same pool (nftsHeld check).
export const testWithdrawNft = async ({
  pool,
  config,
  owner,
  ata,
  wlNft,
  whitelist,
}: {
  pool: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  ata: PublicKey;
  wlNft: WhitelistedNft;
  whitelist: PublicKey;
}) => {
  let {
    tx: { ixs },
    receiptPda,
    escrowPda,
  } = await swapSdk.withdrawNft({
    whitelist,
    nftMint: wlNft.mint,
    nftDest: ata,
    owner: owner.publicKey,
    config,
  });
  const prevPoolAcc = await swapSdk.fetchPool(pool);

  await buildAndSendTx({
    provider: TEST_PROVIDER,
    ixs,
    extraSigners: [owner],
  });

  //NFT moved from escrow to trader
  let traderAcc = await getAccount(ata);
  expect(traderAcc.amount.toString()).eq("1");
  // Escrow closed.
  await expect(getAccount(escrowPda)).rejectedWith(TokenAccountNotFoundError);

  const poolAcc = await swapSdk.fetchPool(pool);
  expectPoolAccounting(poolAcc, prevPoolAcc, { nfts: -1, sell: 0, buy: 0 });

  // Receipt closed.
  await expect(swapSdk.fetchReceipt(receiptPda)).rejectedWith(
    ACCT_NOT_EXISTS_ERR
  );
};

// CANNOT be run async w/ same pool (sol escrow balance check).
export const testWithdrawSol = async ({
  pool,
  whitelist,
  config,
  owner,
  lamports,
}: {
  pool: PublicKey;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  lamports: number;
}) => {
  let {
    tx: { ixs },
    solEscrowPda,
  } = await swapSdk.withdrawSol({
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
      expect(currEscrowLamports! - prevEscrowLamports!).eq(-1 * lamports);
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
export const testMakePoolBuyNft = async ({
  tswap,
  owner,
  buyer,
  config,
  expectedLamports,
  maxLamports = expectedLamports,
}: {
  tswap: PublicKey;
  owner: Keypair;
  buyer: Keypair;
  config: PoolConfigAnchor;
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
  const pool = await testMakePool({ tswap, owner, whitelist, config });

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
    maxPrice: new BN(maxLamports),
  });

  const prevPoolAcc = await swapSdk.fetchPool(pool);

  return await withLamports(
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
      const traderAcc = await getAccount(otherAta);
      expect(traderAcc.amount.toString()).eq("1");
      // Escrow closed.
      await expect(getAccount(escrowPda)).rejectedWith(
        TokenAccountNotFoundError
      );

      //paid tswap fees (NB: fee account may be un-init before).
      const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
      const feeDiff = feeAccLamports! - (prevFeeAccLamports ?? 0);
      // todo: why is this not exactly 5%? where is rent coming from?
      expect(feeDiff).gte(expectedLamports * TSWAP_FEE);
      expect(feeDiff).lt(expectedLamports * 2 * TSWAP_FEE);

      // Buyer pays full amount.
      const currBuyerLamports = await getLamports(buyer.publicKey);
      expect(currBuyerLamports! - prevBuyerLamports!).eq(-1 * expectedLamports);

      // Depending on the pool type:
      // (1) Trade = amount sent to escrow, NOT owner
      // (1) NFT = amount sent to owner, NOT escrow
      const grossAmount = expectedLamports * (1 - TSWAP_FEE);
      const expOwnerAmount =
        (config.poolType === PoolTypeAnchor.Trade ? 0 : grossAmount) +
        // The owner gets back the rent costs.
        (await swapSdk.getNftDepositReceiptRent()) +
        (await swapSdk.getTokenAcctRent());
      const expEscrowAmount =
        config.poolType === PoolTypeAnchor.Trade ? grossAmount : 0;
      // amount sent to owner's wallet
      const currSellerLamports = await getLamports(owner.publicKey);
      expect(currSellerLamports! - prevSellerLamports!).eq(expOwnerAmount);
      // amount sent to escrow
      const currSolEscrowLamports = await getLamports(solEscrowPda);
      expect(currSolEscrowLamports! - prevEscrowLamports!).eq(expEscrowAmount);

      const poolAcc = await swapSdk.fetchPool(pool);
      expectPoolAccounting(poolAcc, prevPoolAcc, {
        nfts: -1,
        sell: 0,
        buy: 1,
      });

      //receipt should have gotten closed
      await expect(swapSdk.fetchReceipt(receiptPda)).rejectedWith(
        ACCT_NOT_EXISTS_ERR
      );

      return {
        pool,
        whitelist,
        ata,
        wlNft,
        receiptPda,
        solEscrowPda,
        escrowPda,
      };
    }
  );
};

// CANNOT be run async (swap fee check + trader fee check).
export const testMakePoolSellNft = async ({
  sellType,
  tswap,
  owner,
  seller,
  config,
  expectedLamports,
  minLamports = expectedLamports,
}: {
  sellType: "trade" | "token";
  tswap: PublicKey;
  owner: Keypair;
  seller: Keypair;
  config: PoolConfigAnchor;
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
  const poolPda = await testMakePool({ tswap, owner, whitelist, config });

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
    solEscrowPda,
    escrowPda: nftEscrow,
    ownerAtaAcc,
    receiptPda: nftReceipt,
  } = await swapSdk.sellNft({
    type: sellType,
    whitelist,
    nftMint: wlNft.mint,
    nftSellerAcc: ata,
    owner: owner.publicKey,
    seller: seller.publicKey,
    config,
    proof: wlNft.proof,
    minPrice: new BN(minLamports),
  });

  const _checkDestAcc = async (amount: string) => {
    const acc = sellType === "trade" ? nftEscrow : ownerAtaAcc;
    // For trade pools, we expect the NFT escrow to not be initialized.
    if (sellType === "trade" && amount === "0")
      return await expect(getAccount(acc)).rejectedWith(
        TokenAccountNotFoundError
      );
    // Owner should have ATA b/c we call makeMintTwoAta.
    expect((await getAccount(acc)).amount.toString()).eq(amount);
  };

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
      // Trader initially has mint.
      let traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("1");
      await _checkDestAcc("0");

      await buildAndSendTx({
        provider: TEST_PROVIDER,
        ixs,
        extraSigners: [seller],
      });

      //NFT moved from trader to escrow
      traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("0");
      await _checkDestAcc("1");

      //paid tswap fees (NB: fee account may be un-init before).
      const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
      const feeDiff = feeAccLamports! - (prevFeeAccLamports ?? 0);
      // todo: why is this not exactly 5%? where is rent coming from?
      expect(feeDiff).gte(Math.trunc(expectedLamports * TSWAP_FEE));
      expect(feeDiff).lt(Math.trunc(expectedLamports * 2 * TSWAP_FEE));

      const mmFees = Math.trunc((expectedLamports * config.mmFeeBps) / 1e4);

      //paid full amount to seller
      const expectedRentBySeller =
        sellType === "trade"
          ? // Seller pays rent for:
            // (1) NFT escrow account
            // (2) NFT deposit receipt
            (await swapSdk.getTokenAcctRent()) +
            (await swapSdk.getNftDepositReceiptRent())
          : // owner ATA always exists (b/c we initialize it above)
            0;
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
        // NFTs held does not change for Token pool (goes directly to owner).
        nfts: sellType === "trade" ? 1 : 0,
        sell: 1,
        buy: 0,
      });

      if (sellType === "trade") {
        const receipt = await swapSdk.fetchReceipt(nftReceipt);
        expect(receipt.pool.toBase58()).eq(poolPda.toBase58());
        expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
        expect(receipt.nftEscrow.toBase58()).eq(nftEscrow.toBase58());
      } else {
        // No receipt: goes directly to owner.
        await expect(swapSdk.fetchReceipt(nftReceipt)).rejectedWith(
          ACCT_NOT_EXISTS_ERR
        );
      }

      return { poolPda, wlNft, whitelist, ownerAtaAcc };
    }
  );
};

//#endregion

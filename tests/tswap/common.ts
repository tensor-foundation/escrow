import {
  Commitment,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount as _getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import {
  keypairIdentity,
  Metaplex,
  toBigNumber,
} from "@metaplex-foundation/js";
import BN from "bn.js";
import chai, { expect } from "chai";
import {
  castPoolConfigAnchor,
  computeCurrentPrice as computeCurrentPrice_,
  computeMakerAmountCount,
  CurveTypeAnchor,
  PoolAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  TakerSide,
  TensorWhitelistSDK,
  TSWAP_FEE_ACC,
  TSwapConfigAnchor,
} from "../../src";
import {
  ACCT_NOT_EXISTS_ERR,
  buildAndSendTx,
  generateTreeOfSize,
  getLamports,
  stringifyPKsAndBNs,
  swapSdk,
  TEST_PROVIDER,
  testInitWLAuthority,
  withLamports,
  wlSdk,
} from "../shared";
import { AnchorProvider } from "@project-serum/anchor";
import chaiAsPromised from "chai-as-promised";
import { testInitUpdateMintProof } from "../twhitelist/common";

// Enables rejectedWith.
chai.use(chaiAsPromised);

//#region Test constants/types.

//this has to match the current version in state.rs
export const CURRENT_POOL_VERSION = 2;

export const TSWAP_CONFIG: TSwapConfigAnchor = {
  feeBps: 500,
};
export const TSWAP_FEE = TSWAP_CONFIG.feeBps / 1e4;
export const MAX_CREATORS_FEE = 90 / 1e4;

export const LINEAR_CONFIG: Omit<PoolConfigAnchor, "poolType"> = {
  curveType: CurveTypeAnchor.Linear,
  startingPrice: new BN(LAMPORTS_PER_SOL),
  delta: new BN(1234),
  honorRoyalties: true,
  mmFeeBps: null,
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

export type WhitelistedNft = { mint: PublicKey; proof: Buffer[] };

//#endregion

//#region Test fixtures.

export const beforeHook = async () => {
  // WL authority
  await testInitWLAuthority();

  // Tswap
  const {
    tx: { ixs },
    tswapPda,
  } = await swapSdk.initUpdateTSwap({
    owner: TEST_PROVIDER.publicKey,
    newOwner: TEST_PROVIDER.publicKey,
    feeVault: TSWAP_FEE_ACC,
    config: TSWAP_CONFIG,
  });

  await buildAndSendTx({ ixs });

  const swapAcc = await swapSdk.fetchTSwap(tswapPda);
  expect(swapAcc.version).eq(1);
  expect(swapAcc.owner.toBase58()).eq(TEST_PROVIDER.publicKey.toBase58());
  expect(swapAcc.cosigner.toBase58()).eq(TEST_PROVIDER.publicKey.toBase58());
  expect(swapAcc.feeVault.toBase58()).eq(TSWAP_FEE_ACC.toBase58());
  expect((swapAcc.config as TSwapConfigAnchor).feeBps).eq(TSWAP_FEE * 1e4);

  // Initialize fees.

  console.log(
    "debug accs",
    stringifyPKsAndBNs({
      tswapPda,
    })
  );

  return { tswapPda };
};

const expectPoolAccounting = (
  currPool: PoolAnchor,
  prevPool: PoolAnchor,
  diffs: { nfts: number; sell: number; buy: number }
) => {
  expect(currPool.nftsHeld - prevPool.nftsHeld).eq(diffs.nfts);
  expect(currPool.takerSellCount - prevPool.takerSellCount).eq(diffs.sell);
  expect(currPool.takerBuyCount - prevPool.takerBuyCount).eq(diffs.buy);
  if (currPool.version > 1) {
    expect(currPool.stats.takerSellCount - prevPool.stats.takerSellCount).eq(
      diffs.sell
    );
    expect(currPool.stats.takerBuyCount - prevPool.stats.takerBuyCount).eq(
      diffs.buy
    );
  }
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

export type CreatorInput = {
  address: PublicKey;
  share: number;
  authority?: Signer;
};

const _createAndFundATA = async ({
  provider,
  owner,
  mint,
  royaltyBps,
  creators,
}: {
  provider: AnchorProvider;
  owner?: Keypair;
  mint?: Keypair;
  royaltyBps?: number;
  creators?: CreatorInput[];
}): Promise<{
  mint: PublicKey;
  ata: PublicKey;
  owner: Keypair;
  metadata: PublicKey;
  masterEdition: PublicKey;
}> => {
  const usedOwner = owner ?? (await _createFundedWallet(provider));
  const usedMint = mint ?? Keypair.generate();

  const mplex = new Metaplex(provider.connection).use(
    keypairIdentity(usedOwner)
  );

  const { metadataAddress, tokenAddress, masterEditionAddress } = await mplex
    .nfts()
    .create({
      useNewMint: usedMint,
      tokenOwner: usedOwner.publicKey,
      uri: "https://www.tensor.trade",
      name: "Whatever",
      sellerFeeBasisPoints: royaltyBps ?? 0,
      creators,
      maxSupply: toBigNumber(1),
    })
    .run();

  return {
    mint: usedMint.publicKey,
    ata: tokenAddress,
    owner: usedOwner,
    metadata: metadataAddress,
    masterEdition: masterEditionAddress,
  };
};

export const createFundedWallet = (sol?: number) =>
  _createFundedWallet(TEST_PROVIDER, sol);
export const createATA = (mint: PublicKey, owner: Keypair) =>
  _createATA(TEST_PROVIDER, mint, owner);
export const createAndFundATA = (
  owner?: Keypair,
  mint?: Keypair,
  royaltyBps?: number,
  creators?: CreatorInput[]
) =>
  _createAndFundATA({
    provider: TEST_PROVIDER,
    owner,
    mint,
    royaltyBps,
    creators,
  });
export const getAccount = (acct: PublicKey) =>
  _getAccount(TEST_PROVIDER.connection, acct);

//#endregion

//#region Non-expect helper functions (no expects run).

// Creates a mint + 2 ATAs. The `owner` will have the mint initially.
export const makeMintTwoAta = async (
  owner: Keypair,
  other: Keypair,
  royaltyBps?: number,
  creators?: CreatorInput[]
) => {
  const { mint, ata, metadata, masterEdition } = await createAndFundATA(
    owner,
    undefined,
    royaltyBps,
    creators
  );

  const { ata: otherAta } = await createATA(mint, other);

  return { mint, metadata, ata, otherAta, masterEdition };
};

export const makeNTraders = async (n: number, sol?: number) => {
  return await Promise.all(
    Array(n)
      .fill(null)
      .map(async () => await createFundedWallet(sol))
  );
};

export const makeWhitelist = async (
  mints: PublicKey[],
  treeSize: number = 100
) => {
  const { root, proofs } = generateTreeOfSize(treeSize, mints);
  const uuid = wlSdk.genWhitelistUUID();
  const name = "hello_world";
  const {
    tx: { ixs },
    whitelistPda,
  } = await wlSdk.initUpdateWhitelist({
    owner: TEST_PROVIDER.publicKey,
    uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
    rootHash: root,
    name: Buffer.from(name.padEnd(32, "\0")).toJSON().data,
  });
  await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

  return { proofs, whitelist: whitelistPda };
};

export const computeDepositAmount = ({
  config,
  nftCount,
}: {
  config: PoolConfigAnchor;
  nftCount: number;
}): BN =>
  new BN(
    computeMakerAmountCount({
      config: castPoolConfigAnchor(config),
      desired: { count: nftCount },
      takerSide: TakerSide.Sell,
      takerBuyCount: 0,
      takerSellCount: 0,
      extraNFTsSelected: 0,
    }).totalAmount.toNumber()
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
      config: castPoolConfigAnchor(config),
      takerBuyCount: buyCount,
      takerSellCount: sellCount,
      takerSide,
      extraNFTsSelected: 0,
      slippage,
    })!.toNumber()
  );

//#endregion

//#region Helper fns with expect statements.

// Can be run async.
export const testMakePool = async ({
  tswap,
  owner,
  whitelist,
  config,
  commitment,
}: {
  tswap: PublicKey;
  owner: Keypair;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
  commitment?: Commitment;
  customAuthSeed?: number[];
}) => {
  const {
    tx: { ixs },
    poolPda,
    solEscrowPda,
    nftAuthPda,
    authSeed,
  } = await swapSdk.initPool({
    owner: owner.publicKey,
    whitelist,
    config,
  });
  const sig = await buildAndSendTx({
    ixs,
    extraSigners: [owner],
    opts: { commitment },
  });

  const poolAcc = await swapSdk.fetchPool(poolPda);
  expect(poolAcc.version).eq(CURRENT_POOL_VERSION);
  expect(poolAcc.owner.toBase58()).eq(owner.publicKey.toBase58());
  expect(poolAcc.tswap.toBase58()).eq(tswap.toBase58());
  expect(poolAcc.whitelist.toBase58()).eq(whitelist.toBase58());
  expect(poolAcc.takerBuyCount).eq(0);
  expect(poolAcc.takerSellCount).eq(0);
  expect(poolAcc.nftsHeld).eq(0);
  //v2
  expect(poolAcc.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());
  //stats
  expect(poolAcc.stats.takerBuyCount).eq(0);
  expect(poolAcc.stats.takerSellCount).eq(0);
  expect(poolAcc.stats.accumulatedMmProfit.toNumber()).eq(0);

  const accConfig = poolAcc.config as PoolConfigAnchor;
  expect(Object.keys(config.poolType)[0] in accConfig.poolType).true;
  expect(JSON.stringify(accConfig.curveType)).eq(
    JSON.stringify(config.curveType)
  );
  expect(accConfig.startingPrice.toNumber()).eq(
    config.startingPrice.toNumber()
  );
  expect(accConfig.delta.toNumber()).eq(config.delta.toNumber());
  // Royalties enforced atm.
  expect(accConfig.honorRoyalties).eq(true);
  if (config.poolType === PoolTypeAnchor.Trade) {
    expect(accConfig.mmFeeBps).eq(config.mmFeeBps);
  } else {
    expect(accConfig.mmFeeBps).eq(null);
  }

  await swapSdk.fetchSolEscrow(solEscrowPda);
  expect(await getLamports(solEscrowPda)).eq(await swapSdk.getSolEscrowRent());

  const authAcc = await swapSdk.fetchNftAuthority(nftAuthPda);
  expect(authAcc.pool.toBase58()).eq(poolPda.toBase58());
  expect(authAcc.randomSeed).deep.eq(authSeed);

  return { poolPda, sig, nftAuthPda, authSeed, solEscrowPda };
};

// Can be run async.
export const testClosePool = async ({
  owner,
  whitelist,
  config,
  commitment,
}: {
  owner: Keypair;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
  commitment?: Commitment;
}) => {
  const {
    tx: { ixs },
    poolPda,
    tswapPda,
    solEscrowPda,
    nftAuthPda,
  } = await swapSdk.closePool({
    owner: owner.publicKey,
    whitelist,
    config,
  });
  const sig = await buildAndSendTx({
    ixs,
    extraSigners: [owner],
    opts: { commitment },
  });

  // These should no longer exist.
  await expect(swapSdk.fetchPool(poolPda)).rejectedWith(ACCT_NOT_EXISTS_ERR);
  await expect(swapSdk.fetchSolEscrow(solEscrowPda)).rejectedWith(
    ACCT_NOT_EXISTS_ERR
  );
  await expect(swapSdk.fetchNftAuthority(nftAuthPda)).rejectedWith(
    ACCT_NOT_EXISTS_ERR
  );

  // These should still exist.
  await swapSdk.fetchTSwap(tswapPda);
  await wlSdk.fetchWhitelist(whitelist);

  return { poolPda, sig };
};

// Can be run async.
export const testEditPool = async ({
  tswap,
  owner,
  whitelist,
  oldConfig,
  newConfig,
  commitment,
}: {
  tswap: PublicKey;
  owner: Keypair;
  whitelist: PublicKey;
  oldConfig: PoolConfigAnchor;
  newConfig: PoolConfigAnchor;
  commitment?: Commitment;
}) => {
  const {
    tx: { ixs },
    oldPoolPda,
    oldSolEscrowPda,
    newPoolPda,
    newSolEscrowPda,
    nftAuthPda,
  } = await swapSdk.editPool({
    owner: owner.publicKey,
    whitelist,
    oldConfig,
    newConfig,
  });

  //collect data from old pool which we're about to close
  const oldPool = await swapSdk.fetchPool(oldPoolPda);
  const prevBuys = oldPool.stats.takerBuyCount;
  const prevSells = oldPool.stats.takerSellCount;
  const prevMmProfit = oldPool.stats.accumulatedMmProfit;
  const prevNfts = oldPool.nftsHeld;
  const prevDepositedLamports =
    (await getLamports(oldSolEscrowPda))! - (await swapSdk.getSolEscrowRent());

  const sig = await buildAndSendTx({
    ixs,
    extraSigners: [owner],
    opts: { commitment },
  });

  // Old should be closed
  await expect(swapSdk.fetchPool(oldPoolPda)).rejectedWith(ACCT_NOT_EXISTS_ERR);
  await expect(swapSdk.fetchSolEscrow(oldSolEscrowPda)).rejectedWith(
    ACCT_NOT_EXISTS_ERR
  );

  // New should be open
  const newPoolAcc = await swapSdk.fetchPool(newPoolPda);
  expect(newPoolAcc.version).eq(CURRENT_POOL_VERSION);
  expect(newPoolAcc.owner.toBase58()).eq(owner.publicKey.toBase58());
  expect(newPoolAcc.tswap.toBase58()).eq(tswap.toBase58());
  expect(newPoolAcc.whitelist.toBase58()).eq(whitelist.toBase58());
  expect(newPoolAcc.takerBuyCount).eq(0);
  expect(newPoolAcc.takerSellCount).eq(0);
  expect(newPoolAcc.nftsHeld).eq(prevNfts);
  //v2 - check new pool is pointing to authority
  expect(newPoolAcc.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());
  //stats
  expect(newPoolAcc.stats.takerBuyCount).eq(prevBuys);
  expect(newPoolAcc.stats.takerSellCount).eq(prevSells);
  expect(newPoolAcc.stats.accumulatedMmProfit.toNumber()).eq(
    prevMmProfit.toNumber()
  );
  expect(newPoolAcc.createdUnixSeconds.toNumber()).eq(
    oldPool.createdUnixSeconds.toNumber()
  );

  const accConfig = newPoolAcc.config as PoolConfigAnchor;
  expect(Object.keys(newConfig.poolType)[0] in accConfig.poolType).true;
  expect(JSON.stringify(accConfig.curveType)).eq(
    JSON.stringify(newConfig.curveType)
  );
  expect(accConfig.startingPrice.toNumber()).eq(
    newConfig.startingPrice.toNumber()
  );
  expect(accConfig.delta.toNumber()).eq(newConfig.delta.toNumber());
  // Royalties enforced atm.
  expect(accConfig.honorRoyalties).eq(true);
  if (newConfig.poolType === PoolTypeAnchor.Trade) {
    expect(accConfig.mmFeeBps).eq(newConfig.mmFeeBps);
  } else {
    expect(accConfig.mmFeeBps).eq(null);
  }

  expect(await getLamports(newSolEscrowPda)).eq(
    (await swapSdk.getSolEscrowRent()) + prevDepositedLamports
  );

  //check authority is pointing to new pool
  const authAcc = await swapSdk.fetchNftAuthority(nftAuthPda);
  expect(authAcc.pool.toBase58()).eq(newPoolPda.toBase58());

  return {
    sig,
    oldPoolPda,
    newPoolPda,
    newPoolAcc,
    nftAuthPda,
    newSolEscrowPda,
  };
};

// CANNOT be run async w/ same pool (nftsHeld check).
export const testDepositNft = async ({
  pool,
  nftAuthPda,
  config,
  owner,
  ata,
  wlNft,
  whitelist,
  commitment,
}: {
  pool: PublicKey;
  nftAuthPda: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  ata: PublicKey;
  wlNft: WhitelistedNft;
  whitelist: PublicKey;
  commitment?: Commitment;
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

  const depSig = await buildAndSendTx({
    ixs,
    extraSigners: [owner],
    opts: { commitment },
  });

  //NFT moved from trader to escrow
  let traderAcc = await getAccount(ata);
  expect(traderAcc.amount.toString()).eq("0");
  let escrowAcc = await getAccount(escrowPda);
  expect(escrowAcc.amount.toString()).eq("1");
  const poolAcc = await swapSdk.fetchPool(pool);
  expectPoolAccounting(poolAcc, prevPoolAcc, { nfts: 1, sell: 0, buy: 0 });

  const receipt = await swapSdk.fetchReceipt(receiptPda);
  expect(receipt.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());
  expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
  expect(receipt.nftEscrow.toBase58()).eq(escrowPda.toBase58());

  return { depSig, receiptPda };
};

// CANNOT be run async w/ same pool (sol escrow balance check).
export const testDepositSol = async ({
  pool,
  whitelist,
  config,
  owner,
  lamports,
  commitment,
}: {
  pool: PublicKey;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  lamports: number;
  commitment?: Commitment;
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
  return await withLamports(
    { prevEscrowLamports: solEscrowPda },
    async ({ prevEscrowLamports }) => {
      const depSig = await buildAndSendTx({
        ixs,
        extraSigners: [owner],
        opts: { commitment },
      });

      let currEscrowLamports = await getLamports(solEscrowPda);
      expect(currEscrowLamports! - prevEscrowLamports!).eq(lamports);
      const poolAcc = await swapSdk.fetchPool(pool);
      expectPoolAccounting(poolAcc, prevPoolAcc, {
        nfts: 0,
        sell: 0,
        buy: 0,
      });

      return { depSig, solEscrowPda };
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
  commitment,
}: {
  pool: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  ata: PublicKey;
  wlNft: WhitelistedNft;
  whitelist: PublicKey;
  commitment?: Commitment;
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

  const withdrawSig = await buildAndSendTx({
    ixs,
    extraSigners: [owner],
    opts: { commitment },
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

  return { withdrawSig, receiptPda };
};

// CANNOT be run async w/ same pool (sol escrow balance check).
export const testWithdrawSol = async ({
  pool,
  whitelist,
  config,
  owner,
  lamports,
  commitment,
}: {
  pool: PublicKey;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  lamports: number;
  commitment?: Commitment;
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
  return await withLamports(
    { prevEscrowLamports: solEscrowPda },
    async ({ prevEscrowLamports }) => {
      const withdrawSig = await buildAndSendTx({
        ixs,
        extraSigners: [owner],
        opts: { commitment },
      });

      let currEscrowLamports = await getLamports(solEscrowPda);
      expect(currEscrowLamports! - prevEscrowLamports!).eq(-1 * lamports);
      const poolAcc = await swapSdk.fetchPool(pool);
      expectPoolAccounting(poolAcc, prevPoolAcc, {
        nfts: 0,
        sell: 0,
        buy: 0,
      });

      return { withdrawSig, solEscrowPda };
    }
  );
};

//taker buys, pool sells
export const testBuyNft = async ({
  whitelist,
  pool,
  wlNft,
  otherAta,
  owner,
  buyer,
  config,
  expectedLamports,
  maxLamports = expectedLamports,
  commitment,
  royaltyBps,
  creators,
}: {
  whitelist: PublicKey;
  pool: PublicKey;
  wlNft: WhitelistedNft;
  otherAta: PublicKey;
  owner: Keypair;
  buyer: Keypair;
  config: PoolConfigAnchor;
  expectedLamports: number;
  // If specified, uses this as the maxPrice for the buy instr.
  // All expects will still use expectedLamports.
  maxLamports?: number;
  commitment?: Commitment;
  royaltyBps?: number;
  creators?: CreatorInput[];
}) => {
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
      const buySig = await buildAndSendTx({
        ixs,
        extraSigners: [buyer],
        opts: {
          commitment,
        },
      });

      //NFT moved from escrow to trader
      const traderAcc = await getAccount(otherAta);
      expect(traderAcc.amount.toString()).eq("1");
      // Escrow closed.
      await expect(getAccount(escrowPda)).rejectedWith(
        TokenAccountNotFoundError
      );

      const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
      const tswapFee = Math.trunc(expectedLamports * TSWAP_FEE);
      //paid tswap fees (NB: fee account may be un-init before).
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(tswapFee);

      // Check creators' balances.
      const isTrade = config.poolType === PoolTypeAnchor.Trade;
      let creatorsFee = 0;
      // Trade pools (when being bought from) charge no royalties.
      if (!!creators?.length && royaltyBps && !isTrade) {
        creatorsFee = Math.trunc(
          Math.min(MAX_CREATORS_FEE, royaltyBps / 1e4) * expectedLamports
        );
        for (const c of creators) {
          const cBal = await getLamports(c.address);
          expect(cBal).eq(Math.trunc((creatorsFee * c.share) / 100));
        }
      }

      // Buyer pays full amount.
      const currBuyerLamports = await getLamports(buyer.publicKey);
      expect(currBuyerLamports! - prevBuyerLamports!).eq(-1 * expectedLamports);

      // Depending on the pool type:
      // (1) Trade = amount sent to escrow, NOT owner
      // (1) NFT = amount sent to owner, NOT escrow
      const grossAmount = expectedLamports * (1 - TSWAP_FEE) - creatorsFee;
      const expOwnerAmount =
        (isTrade ? 0 : grossAmount) +
        // The owner gets back the rent costs.
        (await swapSdk.getNftDepositReceiptRent()) +
        (await swapSdk.getTokenAcctRent());
      const expEscrowAmount = isTrade ? grossAmount : 0;
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
        receiptPda,
        solEscrowPda,
        escrowPda,
        buySig,
        poolAcc,
      };
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
  commitment,
  royaltyBps,
  creators,
  treeSize,
}: {
  tswap: PublicKey;
  owner: Keypair;
  buyer: Keypair;
  config: PoolConfigAnchor;
  expectedLamports: number;
  // If specified, uses this as the maxPrice for the buy instr.
  // All expects will still use expectedLamports.
  maxLamports?: number;
  commitment?: Commitment;
  royaltyBps?: number;
  creators?: CreatorInput[];
  treeSize?: number;
}) => {
  const { mint, ata, otherAta, metadata, masterEdition } = await makeMintTwoAta(
    owner,
    buyer,
    royaltyBps,
    creators
  );
  const {
    proofs: [wlNft],
    whitelist,
  } = await makeWhitelist([mint], treeSize);
  const { poolPda: pool, nftAuthPda } = await testMakePool({
    tswap,
    owner,
    whitelist,
    config,
  });

  await testDepositNft({
    nftAuthPda,
    pool,
    config,
    owner,
    ata,
    wlNft,
    whitelist,
  });

  return {
    ...(await testBuyNft({
      pool,
      wlNft,
      whitelist,
      otherAta,
      owner,
      buyer,
      config,
      expectedLamports,
      maxLamports,
      commitment,
      royaltyBps,
      creators,
    })),
    pool,
    whitelist,
    ata,
    wlNft,
    metadata,
    masterEdition,
  };
};

export const testSellNft = async ({
  mint,
  whitelist,
  wlNft,
  ata,
  poolPda,
  nftAuthPda,
  sellType,
  owner,
  seller,
  config,
  expectedLamports,
  minLamports = expectedLamports,
  commitment,
  royaltyBps,
  creators,
  treeSize,
}: {
  sellType: "trade" | "token";
  mint: PublicKey;
  whitelist: PublicKey;
  poolPda: PublicKey;
  nftAuthPda: PublicKey;
  wlNft: WhitelistedNft;
  ata: PublicKey;
  owner: Keypair;
  seller: Keypair;
  config: PoolConfigAnchor;
  expectedLamports: number;
  // If specified, uses this as the minPrice for the sell instr.
  // All expects will still use expectedLamports.
  minLamports?: number;
  commitment?: Commitment;
  royaltyBps?: number;
  creators?: CreatorInput[];
  treeSize?: number;
}) => {
  const prevPoolAcc = await swapSdk.fetchPool(poolPda);

  // Need to create mint proof first before being able to sell.
  await testInitUpdateMintProof({
    user: seller,
    mint,
    whitelist,
    proof: wlNft.proof,
    expectedProofLen: Math.trunc(Math.log2(treeSize ?? 100)) + 1,
  });

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

      const sellSig = await buildAndSendTx({
        ixs,
        extraSigners: [seller],
        opts: { commitment },
      });

      //NFT moved from trader to escrow
      traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("0");
      await _checkDestAcc("1");

      const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
      const tswapFee = Math.trunc(expectedLamports * TSWAP_FEE);
      //paid tswap fees (NB: fee account may be un-init before).
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(tswapFee);

      // Check creators' balances.
      let creatorsFee = 0;
      if (!!creators?.length && royaltyBps) {
        const temp = Math.trunc(
          Math.min(MAX_CREATORS_FEE, royaltyBps / 1e4) * expectedLamports
        );

        // Need to accumulate b/c of dust.
        for (const c of creators) {
          const cBal = await getLamports(c.address);
          const expected = Math.trunc((temp * c.share) / 100);
          expect(cBal).eq(expected);
          creatorsFee += expected;
        }
      }

      const mmFees = Math.trunc(
        (expectedLamports * (config.mmFeeBps ?? 0)) / 1e4
      );

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
        // Seller gets back original price minus:
        // (1) TSwap fees
        // (2) MM fees (if trade pool)
        // (3) any rent paid by seller
        expectedLamports -
          tswapFee -
          mmFees -
          expectedRentBySeller -
          creatorsFee
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
        expect(receipt.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());
        expect(receipt.nftMint.toBase58()).eq(wlNft.mint.toBase58());
        expect(receipt.nftEscrow.toBase58()).eq(nftEscrow.toBase58());
      } else {
        // No receipt: goes directly to owner.
        await expect(swapSdk.fetchReceipt(nftReceipt)).rejectedWith(
          ACCT_NOT_EXISTS_ERR
        );
      }

      return {
        sellSig,
        poolPda,
        poolAcc,
        wlNft,
        whitelist,
        ownerAtaAcc,
        solEscrowPda,
        nftReceipt,
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
  commitment,
  royaltyBps,
  creators,
  treeSize,
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
  commitment?: Commitment;
  royaltyBps?: number;
  creators?: CreatorInput[];
  treeSize?: number;
}) => {
  const { mint, ata } = await makeMintTwoAta(
    seller,
    owner,
    royaltyBps,
    creators
  );
  const {
    proofs: [wlNft],
    whitelist,
  } = await makeWhitelist([mint], treeSize);

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

  return {
    ...(await testSellNft({
      whitelist,
      wlNft,
      mint,
      ata,
      nftAuthPda,
      poolPda,
      sellType,
      owner,
      seller,
      config,
      expectedLamports,
      minLamports,
      commitment,
      royaltyBps,
      creators,
      treeSize,
    })),
    poolPda,
    wlNft,
    whitelist,
  };
};

//#endregion

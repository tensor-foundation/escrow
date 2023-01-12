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
  computeMakerAmountCount,
  computeTakerPrice as computeTakerPrice_,
  CurveTypeAnchor,
  findMarginPDA,
  OrderType,
  PoolAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  SNIPE_FEE_BPS,
  SNIPE_MIN_FEE,
  SNIPE_PROFIT_SHARE_BPS,
  STANDARD_FEE_BPS,
  TakerSide,
  TensorWhitelistSDK,
  TSWAP_FEE_ACC,
  TSwapConfigAnchor,
} from "../../src";
import {
  ACCT_NOT_EXISTS_ERR,
  buildAndSendTx,
  calcMinRent,
  generateTreeOfSize,
  getLamports,
  HUNDRED_PCT_BPS,
  swapSdk,
  TEST_PROVIDER,
  testInitWLAuthority,
  withLamports,
  wlSdk,
} from "../shared";
import { AnchorProvider, Wallet } from "@project-serum/anchor";
import chaiAsPromised from "chai-as-promised";
import { testInitUpdateMintProof } from "../twhitelist/common";
import { isNullLike, MINUTES } from "@tensor-hq/tensor-common";
import {
  SingleConnectionBroadcaster,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";

// Enables rejectedWith.
chai.use(chaiAsPromised);

//#region Test constants/types.

//this has to match the current version in state.rs
export const CURRENT_POOL_VERSION = 2;

export const TSWAP_CONFIG: TSwapConfigAnchor = {
  feeBps: STANDARD_FEE_BPS,
};
export const TSWAP_FEE_PCT = TSWAP_CONFIG.feeBps / 1e4;
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

export const TEST_COSIGNER = Keypair.generate();

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
    cosigner: TEST_COSIGNER.publicKey,
  });

  await buildAndSendTx({ ixs, extraSigners: [TEST_COSIGNER] });

  const swapAcc = await swapSdk.fetchTSwap(tswapPda);
  expect(swapAcc.version).eq(1);
  expect(swapAcc.owner.toBase58()).eq(TEST_PROVIDER.publicKey.toBase58());
  expect(swapAcc.cosigner.toBase58()).eq(TEST_COSIGNER.publicKey.toBase58());
  expect(swapAcc.feeVault.toBase58()).eq(TSWAP_FEE_ACC.toBase58());
  expect((swapAcc.config as TSwapConfigAnchor).feeBps).eq(TSWAP_FEE_PCT * 1e4);

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
  collection,
  collectionVerified,
}: {
  provider: AnchorProvider;
  owner?: Keypair;
  mint?: Keypair;
  royaltyBps?: number;
  creators?: CreatorInput[];
  collection?: Keypair;
  collectionVerified?: boolean;
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

  //create a verified collection
  if (collection) {
    await mplex.nfts().create({
      useNewMint: collection,
      tokenOwner: usedOwner.publicKey,
      uri: "https://www.tensor.trade",
      name: "Whatever",
      sellerFeeBasisPoints: royaltyBps ?? 0,
      isCollection: true,
      collectionIsSized: true,
    });

    // console.log(
    //   "coll",
    //   await mplex.nfts().findByMint({ mintAddress: collection.publicKey })
    // );
  }

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
      collection: collection?.publicKey,
    });

  if (collection && collectionVerified) {
    await mplex.nfts().verifyCollection({
      mintAddress: usedMint.publicKey,
      collectionMintAddress: collection.publicKey,
    });
  }

  // console.log(
  //   "nft",
  //   await mplex.nfts().findByMint({ mintAddress: usedMint.publicKey })
  // );

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
  creators?: CreatorInput[],
  collection?: Keypair,
  collectionVerified?: boolean
) =>
  _createAndFundATA({
    provider: TEST_PROVIDER,
    owner,
    mint,
    royaltyBps,
    creators,
    collection,
    collectionVerified,
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
  creators?: CreatorInput[],
  collection?: Keypair,
  collectionVerified?: boolean
) => {
  const { mint, ata, metadata, masterEdition } = await createAndFundATA(
    owner,
    undefined,
    royaltyBps,
    creators,
    collection,
    collectionVerified
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

export const makeProofWhitelist = async (
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
    cosigner: TEST_PROVIDER.publicKey,
    uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
    rootHash: root,
    name: TensorWhitelistSDK.nameToBuffer(name),
  });
  await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

  return { proofs, whitelist: whitelistPda };
};

export const makeFvcWhitelist = async (fvc: PublicKey) => {
  const uuid = wlSdk.genWhitelistUUID();
  const name = "hello_world";
  const {
    tx: { ixs },
    whitelistPda,
  } = await wlSdk.initUpdateWhitelist({
    cosigner: TEST_PROVIDER.publicKey,
    uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
    name: TensorWhitelistSDK.nameToBuffer(name),
    fvc,
  });
  await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

  return { fvc, whitelist: whitelistPda };
};

export const makeVocWhitelist = async (voc: PublicKey) => {
  const uuid = wlSdk.genWhitelistUUID();
  const name = "hello_world";
  const {
    tx: { ixs },
    whitelistPda,
  } = await wlSdk.initUpdateWhitelist({
    cosigner: TEST_PROVIDER.publicKey,
    uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
    name: TensorWhitelistSDK.nameToBuffer(name),
    voc,
  });
  await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

  return { voc, whitelist: whitelistPda };
};

export const makeEverythingWhitelist = async (
  mints: PublicKey[],
  treeSize: number = 100,
  voc?: PublicKey,
  fvc?: PublicKey
) => {
  const { root, proofs } = generateTreeOfSize(treeSize, mints);
  const uuid = wlSdk.genWhitelistUUID();
  const name = "hello_world";
  const {
    tx: { ixs },
    whitelistPda,
  } = await wlSdk.initUpdateWhitelist({
    cosigner: TEST_PROVIDER.publicKey,
    uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
    rootHash: root,
    name: TensorWhitelistSDK.nameToBuffer(name),
    voc,
    fvc,
  });
  await buildAndSendTx({ provider: TEST_PROVIDER, ixs });

  return { proofs, whitelist: whitelistPda, voc, fvc };
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

export const computeTakerPrice = ({
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
    computeTakerPrice_({
      config: castPoolConfigAnchor(config),
      takerBuyCount: buyCount,
      takerSellCount: sellCount,
      takerSide,
      extraNFTsSelected: 0,
      slippage,
    })!.toNumber()
  );

export const defaultSellExpectedLamports = (isToken: boolean) => {
  // Selling is 1 tick lower than start price for trade pools.
  return isToken ? LAMPORTS_PER_SOL : LAMPORTS_PER_SOL - 1234;
};

export const calcSnipeFee = (bid: number) =>
  Math.max(Math.round(bid * (SNIPE_FEE_BPS / HUNDRED_PCT_BPS)), SNIPE_MIN_FEE);

export const calcSnipeBidWithFee = (bid: number) => bid + calcSnipeFee(bid);

export const adjustSellMinLamports = (
  isToken: boolean,
  expectedLamports: number
) => {
  // Min price needs to be adjusted for MM fees for trade pools.
  return isToken
    ? expectedLamports
    : expectedLamports -
        Math.trunc(
          (expectedLamports * tradePoolConfig.mmFeeBps!) / HUNDRED_PCT_BPS
        );
};

//#endregion

//#region Helper fns with expect statements.

export const testMakeMargin = async ({ owner }: { owner: Keypair }) => {
  const name = "hello_world";
  const nameBuffer = TensorWhitelistSDK.nameToBuffer(name);
  const {
    tx: { ixs },
    marginPda,
    marginBump,
    marginNr,
  } = await swapSdk.initMarginAcc({
    owner: owner.publicKey,
    name: nameBuffer,
  });
  await buildAndSendTx({
    ixs,
    provider: TEST_PROVIDER,
    extraSigners: [owner],
  });
  //state
  const marginAcc = await swapSdk.fetchMarginAccount(marginPda);
  expect(marginAcc.owner.toBase58()).to.eq(owner.publicKey.toBase58());
  expect(marginAcc.name).to.deep.eq(nameBuffer);
  expect(marginAcc.nr).to.eq(marginNr);
  expect(marginAcc.bump).to.deep.eq([marginBump]);
  //rent
  const lamports = await getLamports(marginPda);
  const rent = await swapSdk.getMarginAccountRent();
  expect(lamports).to.eq(rent);

  return { marginPda, marginBump, marginNr, marginRent: rent, marginAcc, ixs };
};

export const testAttachPoolToMargin = async ({
  owner,
  config,
  whitelist,
  marginNr,
  poolsAttached = 1,
}: {
  owner: Keypair;
  config: PoolConfigAnchor;
  whitelist: PublicKey;
  marginNr: number;
  poolsAttached?: number;
}) => {
  const {
    tx: { ixs },
    poolPda,
    marginPda,
  } = await swapSdk.attachPoolMargin({
    config,
    marginNr,
    owner: owner.publicKey,
    whitelist,
  });
  await buildAndSendTx({ ixs, extraSigners: [owner] });

  const pool = await swapSdk.fetchPool(poolPda);
  expect(pool.margin!.toBase58()).to.eq(marginPda.toBase58());

  const margin = await swapSdk.fetchMarginAccount(marginPda);
  expect(margin.poolsAttached).to.eq(poolsAttached);

  return { marginPda };
};

export const testDetachPoolFromMargin = async ({
  owner,
  config,
  whitelist,
  marginNr,
  poolsAttached = 0,
  amount,
}: {
  owner: Keypair;
  config: PoolConfigAnchor;
  whitelist: PublicKey;
  marginNr: number;
  poolsAttached?: number;
  amount?: BN;
}) => {
  const {
    tx: { ixs },
    poolPda,
    marginPda,
  } = await swapSdk.detachPoolMargin({
    config,
    marginNr,
    owner: owner.publicKey,
    whitelist,
    amount,
  });
  await buildAndSendTx({ ixs, extraSigners: [owner] });

  const pool = await swapSdk.fetchPool(poolPda);
  expect(pool.margin).to.be.null;

  const margin = await swapSdk.fetchMarginAccount(marginPda);
  expect(margin.poolsAttached).to.eq(poolsAttached);
};

export const testDepositIntoMargin = async ({
  owner,
  marginNr,
  marginPda,
  amount,
  expectedLamports = amount,
}: {
  owner: Keypair;
  marginNr: number;
  marginPda: PublicKey;
  amount: number;
  expectedLamports?: number;
}) => {
  const {
    tx: { ixs },
  } = await swapSdk.depositMarginAcc({
    owner: owner.publicKey,
    marginNr: marginNr,
    amount: new BN(Math.round(amount)),
  });
  await buildAndSendTx({
    ixs,
    provider: TEST_PROVIDER,
    extraSigners: [owner],
  });
  const marginRent = await swapSdk.getMarginAccountRent();
  const lamports = await getLamports(marginPda);
  expect(lamports).to.eq(Math.round(marginRent + expectedLamports));
};

export const testWithdrawFromMargin = async ({
  owner,
  marginNr,
  marginPda,
  amount,
  expectedLamports = 0,
}: {
  owner: Keypair;
  marginNr: number;
  marginPda: PublicKey;
  amount: number;
  expectedLamports?: number;
}) => {
  const {
    tx: { ixs },
  } = await swapSdk.withdrawMarginAcc({
    owner: owner.publicKey,
    marginNr: marginNr,
    amount: new BN(Math.round(amount)),
  });
  await buildAndSendTx({
    ixs,
    provider: TEST_PROVIDER,
    extraSigners: [owner],
  });
  const marginRent = await swapSdk.getMarginAccountRent();
  const lamports = await getLamports(marginPda);
  expect(lamports).to.eq(Math.round(marginRent + expectedLamports));
};

export const testSetFreeze = async ({
  owner,
  config,
  whitelist,
  marginNr,
  fullBidAmount,
  freeze,
  cosigner,
  skipMarginBalanceCheck = false,
}: {
  owner: PublicKey;
  config: PoolConfigAnchor;
  whitelist: PublicKey;
  marginNr: number;
  fullBidAmount: number;
  freeze: boolean;
  cosigner?: Keypair;
  skipMarginBalanceCheck?: boolean;
}) => {
  const {
    poolPda,
    solEscrowPda,
    marginPda,
    tx: { ixs },
  } = await swapSdk.setPoolFreeze({
    whitelist,
    owner,
    config,
    marginNr,
    freeze,
    cosigner: cosigner ? cosigner.publicKey : TEST_COSIGNER.publicKey,
  });
  await buildAndSendTx({ ixs, extraSigners: [cosigner ?? TEST_COSIGNER] });
  const pool = await swapSdk.fetchPool(poolPda);
  const escrowBalance = await getLamports(solEscrowPda);
  const marginBalance = await getLamports(marginPda);
  if (freeze) {
    expect(pool.frozen!.amount.toString()).to.eq(fullBidAmount.toString());
    expect(pool.frozen!.time.toNumber()).to.be.gt(
      (+new Date() - MINUTES) / 1000
    );
    expect(escrowBalance).to.eq(
      fullBidAmount + (await swapSdk.getSolEscrowRent())
    );
    if (!skipMarginBalanceCheck) {
      expect(marginBalance).to.eq(await swapSdk.getMarginAccountRent());
    }
  } else {
    expect(pool.frozen).to.be.null;
    expect(escrowBalance).to.eq(await swapSdk.getSolEscrowRent());
    if (!skipMarginBalanceCheck) {
      expect(marginBalance).to.eq(
        fullBidAmount + (await swapSdk.getMarginAccountRent())
      );
    }
  }
};

// Can be run async.
export const testMakePool = async ({
  tswap,
  owner,
  whitelist,
  config,
  commitment,
  isCosigned = false,
  orderType = OrderType.Standard,
}: {
  tswap: PublicKey;
  owner: Keypair;
  whitelist: PublicKey;
  config: PoolConfigAnchor;
  commitment?: Commitment;
  customAuthSeed?: number[];
  isCosigned?: boolean;
  orderType?: OrderType;
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
    orderType,
    isCosigned,
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
  //v0.3
  expect(poolAcc.nftAuthority.toBase58()).eq(nftAuthPda.toBase58());
  //stats
  expect(poolAcc.stats.takerBuyCount).eq(0);
  expect(poolAcc.stats.takerSellCount).eq(0);
  expect(poolAcc.stats.accumulatedMmProfit.toNumber()).eq(0);
  //v1.0
  //token only
  expect(poolAcc.isCosigned).to.eq(isCosigned);
  expect(poolAcc.orderType).to.eq(orderType);
  expect(poolAcc.frozen).to.be.null;
  expect(poolAcc.margin).to.be.null;

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
  isCosigned = null,
}: {
  tswap: PublicKey;
  owner: Keypair;
  whitelist: PublicKey;
  oldConfig: PoolConfigAnchor;
  newConfig: PoolConfigAnchor;
  commitment?: Commitment;
  isCosigned?: null | boolean;
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
    isCosigned,
  });

  //collect data from old pool which we're about to close
  const oldPool = await swapSdk.fetchPool(oldPoolPda);
  const prevBuys = oldPool.stats.takerBuyCount;
  const prevSells = oldPool.stats.takerSellCount;
  const prevMmProfit = oldPool.stats.accumulatedMmProfit;
  const prevNfts = oldPool.nftsHeld;
  const prevDepositedLamports =
    (await getLamports(oldSolEscrowPda))! - (await swapSdk.getSolEscrowRent());
  const prevCosigned = oldPool.isCosigned;
  const prevOrderType = oldPool.orderType;
  const prevFrozen = oldPool.frozen;
  const prevMargin = oldPool.margin;

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
  //v0.3 - check new pool is pointing to authority
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

  //v1
  expect(newPoolAcc.isCosigned).to.eq(isCosigned ?? prevCosigned);
  expect(newPoolAcc.orderType).to.eq(prevOrderType);
  expect(newPoolAcc.frozen).to.eq(prevFrozen);
  expect(newPoolAcc.margin).to.deep.eq(prevMargin);

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
  nftMint,
  whitelist,
  commitment,
  nftMetadata,
}: {
  pool: PublicKey;
  nftAuthPda: PublicKey;
  config: PoolConfigAnchor;
  owner: Keypair;
  ata: PublicKey;
  wlNft?: WhitelistedNft;
  nftMint?: PublicKey;
  whitelist: PublicKey;
  commitment?: Commitment;
  nftMetadata?: PublicKey;
}) => {
  if (!wlNft?.mint && !nftMint) {
    throw new Error("nft mint missing");
  }
  const mint = wlNft?.mint ?? nftMint!;

  let {
    tx: { ixs },
    receiptPda,
    escrowPda,
  } = await swapSdk.depositNft({
    whitelist,
    nftMint: mint,
    nftSource: ata,
    owner: owner.publicKey,
    config,
    proof: wlNft?.proof,
    nftMetadata,
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
  expect(receipt.nftMint.toBase58()).eq(mint.toBase58());
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
      const tswapFee = Math.trunc(expectedLamports * TSWAP_FEE_PCT);
      //paid tswap fees (NB: fee account may be un-init before).
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(tswapFee);

      const isTrade = config.poolType === PoolTypeAnchor.Trade;

      // Check creators' balances.
      let creatorsFee = 0;
      // Trade pools (when being bought from) charge no royalties.
      if (!!creators?.length && royaltyBps && !isTrade) {
        //skip creators when royalties not enough to cover rent
        let skippedCreators = 0;
        for (const c of creators) {
          if (c.share <= 1) {
            skippedCreators++;
          }
        }

        creatorsFee = Math.trunc(
          Math.min(MAX_CREATORS_FEE, royaltyBps / 1e4) *
            expectedLamports *
            (1 - skippedCreators / 100)
        );

        for (const c of creators) {
          const cBal = await getLamports(c.address);
          //only run the test if share > 1, else it's skipped
          if (c.share > 1) {
            expect(cBal).eq(
              Math.trunc(
                ((creatorsFee / (1 - skippedCreators / 100)) * c.share) / 100
              )
            );
          }
        }
      }

      // Buyer pays full amount.
      const currBuyerLamports = await getLamports(buyer.publicKey);
      expect(currBuyerLamports! - prevBuyerLamports!).eq(-1 * expectedLamports);
      // Depending on the pool type:
      // (1) Trade = amount sent to escrow, NOT owner
      // (1) NFT = amount sent to owner, NOT escrow

      const grossAmount = expectedLamports * (1 - TSWAP_FEE_PCT) - creatorsFee;
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
      //transacted within last 60s & greater than before
      expect(poolAcc.lastTransactedSeconds.toNumber()).to.be.gte(
        +new Date() / 1000 - 60
      );
      expect(poolAcc.lastTransactedSeconds.toNumber()).to.be.gte(
        prevPoolAcc.lastTransactedSeconds.toNumber()
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
  } = await makeProofWhitelist([mint], treeSize);
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
  nftMint,
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
  isCosigned = false,
  marginNr = null,
  isSniping = false,
}: {
  sellType: "trade" | "token";
  nftMint?: PublicKey;
  whitelist: PublicKey;
  poolPda: PublicKey;
  nftAuthPda?: PublicKey;
  wlNft?: WhitelistedNft;
  ata: PublicKey;
  owner: Keypair;
  seller: Keypair;
  config: PoolConfigAnchor;
  // Expected value for the current/base price.
  expectedLamports: number;
  // If specified, uses this as the minPrice for the sell instr.
  // All expects will still use expectedLamports.
  minLamports?: number;
  commitment?: Commitment;
  royaltyBps?: number;
  creators?: CreatorInput[];
  treeSize?: number;
  isCosigned?: boolean;
  marginNr?: null | number;
  isSniping?: boolean;
}) => {
  if (!wlNft?.mint && !nftMint) {
    throw new Error("missing mint");
  }
  const mint = wlNft?.mint ?? nftMint!;

  const prevPoolAcc = await swapSdk.fetchPool(poolPda);

  if (wlNft?.proof) {
    // Need to create mint proof first before being able to sell.
    await testInitUpdateMintProof({
      user: seller,
      mint,
      whitelist,
      proof: wlNft.proof,
      expectedProofLen: Math.trunc(Math.log2(treeSize ?? 100)) + 1,
    });
  }

  const {
    tx: { ixs },
    solEscrowPda,
    escrowPda: nftEscrow,
    ownerAtaAcc,
    receiptPda: nftReceipt,
    marginPda,
  } = await swapSdk.sellNft({
    type: sellType,
    whitelist,
    nftMint: mint,
    nftSellerAcc: ata,
    owner: owner.publicKey,
    seller: seller.publicKey,
    config,
    minPrice: new BN(minLamports),
    isCosigned,
    cosigner: TEST_COSIGNER.publicKey,
    marginNr,
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
      //have to pass something for the case when margin doesn't exist
      prevMarginLamports: marginPda ?? solEscrowPda,
    },
    async ({
      prevFeeAccLamports,
      prevSellerLamports,
      prevBuyerLamports,
      prevEscrowLamports,
      prevMarginLamports,
    }) => {
      // Trader initially has mint.
      let traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("1");
      await _checkDestAcc("0");

      const sellSig = await buildAndSendTx({
        ixs,
        extraSigners: isCosigned ? [seller, TEST_COSIGNER] : [seller],
        opts: { commitment },
      });

      //NFT moved from trader to escrow
      traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("0");
      await _checkDestAcc("1");

      const feeAccLamports = await getLamports(TSWAP_FEE_ACC);
      const tswapFee = Math.trunc(
        isSniping
          ? calcSnipeFee(expectedLamports)
          : expectedLamports * TSWAP_FEE_PCT
      );
      //paid tswap fees (NB: fee account may be un-init before).
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(tswapFee);

      const mmFees = Math.trunc(
        (expectedLamports * (config.mmFeeBps ?? 0)) / 1e4
      );

      // Check creators' balances.
      let creatorsFee = 0;
      if (!!creators?.length && royaltyBps) {
        //skip creators when royalties not enough to cover rent
        let skippedCreators = 0;
        const temp = Math.trunc(
          Math.min(MAX_CREATORS_FEE, royaltyBps / 1e4) *
            expectedLamports *
            (1 - skippedCreators / 100)
        );

        // Need to accumulate b/c of dust.
        for (const c of creators) {
          const cBal = await getLamports(c.address);
          if (c.share > 1) {
            const expected = Math.trunc((temp * c.share) / 100);
            expect(cBal).eq(expected);
            creatorsFee += expected;
          }
        }
      }

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
      if (!isNullLike(marginNr)) {
        const currMarginLamports = await getLamports(marginPda!);
        expect(currMarginLamports! - prevMarginLamports!).eq(
          -1 * (expectedLamports - mmFees)
        );
      } else {
        const currEscrowLamports = await getLamports(solEscrowPda);
        expect(currEscrowLamports! - prevEscrowLamports!).eq(
          -1 * (expectedLamports - mmFees)
        );
      }

      const poolAcc = await swapSdk.fetchPool(poolPda);
      expectPoolAccounting(poolAcc, prevPoolAcc, {
        // NFTs held does not change for Token pool (goes directly to owner).
        nfts: sellType === "trade" ? 1 : 0,
        sell: 1,
        buy: 0,
      });
      //transacted within last 60s & greated than before
      expect(poolAcc.lastTransactedSeconds.toNumber()).to.be.gt(
        +new Date() / 1000 - 60
      );
      expect(poolAcc.lastTransactedSeconds.toNumber()).to.be.gte(
        prevPoolAcc.lastTransactedSeconds.toNumber()
      );

      if (sellType === "trade") {
        const receipt = await swapSdk.fetchReceipt(nftReceipt);
        expect(receipt.nftAuthority.toBase58()).eq(nftAuthPda!.toBase58());
        expect(receipt.nftMint.toBase58()).eq(mint.toBase58());
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
  isCosigned = false,
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
  isCosigned?: boolean;
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
  } = await makeProofWhitelist([mint], treeSize);

  const { poolPda, nftAuthPda } = await testMakePool({
    tswap,
    owner,
    whitelist,
    config,
    isCosigned,
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
      nftMint: mint,
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
      isCosigned,
    })),
    poolPda,
    wlNft,
    whitelist,
  };
};

export const testTakeSnipe = async ({
  nftMint,
  whitelist,
  wlNft,
  ata,
  poolPda,
  owner,
  seller,
  config,
  initialBidAmount,
  actualSnipeAmount,
  commitment,
  treeSize,
  marginNr,
  frozen,
  cosigner = TEST_COSIGNER,
}: {
  nftMint?: PublicKey;
  whitelist: PublicKey;
  poolPda: PublicKey;
  wlNft?: WhitelistedNft;
  ata: PublicKey;
  owner: Keypair;
  seller: Keypair;
  config: PoolConfigAnchor;
  // Expected value for the current/base price.
  initialBidAmount: number;
  actualSnipeAmount: number;
  commitment?: Commitment;
  treeSize?: number;
  marginNr: number;
  // Whether we're "taking" a frozen order
  frozen: boolean;
  cosigner?: Keypair;
}) => {
  if (!wlNft?.mint && !nftMint) {
    throw new Error("missing mint");
  }
  const mint = wlNft?.mint ?? nftMint!;

  const prevPoolAcc = await swapSdk.fetchPool(poolPda);

  if (wlNft?.proof) {
    // Need to create mint proof first before being able to sell.
    await testInitUpdateMintProof({
      user: seller,
      mint,
      whitelist,
      proof: wlNft.proof,
      expectedProofLen: Math.trunc(Math.log2(treeSize ?? 100)) + 1,
    });
  }

  const {
    tx: { ixs },
    solEscrowPda,
    marginPda,
    ownerAtaAcc,
  } = await swapSdk.takeSnipe({
    whitelist,
    nftMint: mint,
    marginNr,
    config,
    owner: owner.publicKey,
    seller: seller.publicKey,
    nftSellerAcc: ata,
    actualPrice: new BN(actualSnipeAmount),
    cosigner: cosigner.publicKey,
  });

  const _checkDestAcc = async (amount: string) => {
    // Owner should have ATA b/c we call makeMintTwoAta.
    expect((await getAccount(ownerAtaAcc)).amount.toString()).eq(amount);
  };

  return await withLamports(
    {
      prevFeeAccLamports: TSWAP_FEE_ACC,
      prevSellerLamports: seller.publicKey,
      prevBuyerLamports: owner.publicKey,
      prevEscrowLamports: solEscrowPda,
      prevMarginLamports: marginPda,
    },
    async ({
      prevFeeAccLamports,
      prevSellerLamports,
      prevBuyerLamports,
      prevEscrowLamports,
      prevMarginLamports,
    }) => {
      // Trader initially has mint.
      let traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("1");
      await _checkDestAcc("0");

      const snipeSig = await buildAndSendTx({
        ixs,
        extraSigners: [seller, cosigner],
        opts: { commitment },
      });

      //NFT moved from trader to escrow
      traderAcc = await getAccount(ata);
      expect(traderAcc.amount.toString()).eq("0");
      await _checkDestAcc("1");

      const feeAccLamports = await getLamports(TSWAP_FEE_ACC);

      //snipe fee sent correctly
      const snipeBaseFee = Math.trunc(calcSnipeFee(initialBidAmount));
      const snipeProfitFee = Math.trunc(
        ((initialBidAmount - actualSnipeAmount) * SNIPE_PROFIT_SHARE_BPS) /
          HUNDRED_PCT_BPS
      );
      const totalSnipeFee = snipeBaseFee + snipeProfitFee;
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(totalSnipeFee);

      //seller paid correctly
      const currSellerLamports = await getLamports(seller.publicKey);
      expect(currSellerLamports! - prevSellerLamports!).eq(actualSnipeAmount);

      //rest moved to margin account
      const actualPaidBySniper = actualSnipeAmount + totalSnipeFee;
      //uploaded by sniper less what they actually paid
      const remainder = initialBidAmount + snipeBaseFee - actualPaidBySniper;
      const currMarginLamports = await getLamports(marginPda);
      expect(currMarginLamports! - prevMarginLamports!).eq(
        frozen ? remainder : -1 * actualPaidBySniper
      );

      // buyer should not have balance change
      const currBuyerLamports = await getLamports(owner.publicKey);
      expect(currBuyerLamports! - prevBuyerLamports!).equal(0);

      // Sol escrow should have the NFT cost deducted (minus mm fees owner gets back).
      const currEscrowLamports = await getLamports(solEscrowPda);
      expect(currEscrowLamports! - prevEscrowLamports!).eq(
        //for non-frozen orders we never use the escrow
        frozen ? -1 * (initialBidAmount + snipeBaseFee) : 0
      );

      const poolAcc = await swapSdk.fetchPool(poolPda);
      expectPoolAccounting(poolAcc, prevPoolAcc, {
        // NFTs held does not change for Token pool (goes directly to owner).
        nfts: 0,
        sell: 1,
        buy: 0,
      });
      // either way we unfreeze the order in the end
      expect(poolAcc.frozen).to.be.null;

      return {
        sellSig: snipeSig,
        poolPda,
        poolAcc,
        wlNft,
        whitelist,
        solEscrowPda,
      };
    }
  );
};

//#endregion

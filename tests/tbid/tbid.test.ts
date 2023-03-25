import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  bidSdk,
  buildAndSendTx,
  cartesian,
  createTokenAuthorizationRules,
  getLamports,
  INTEGER_OVERFLOW_ERR,
  swapSdk,
  TEST_PROVIDER,
  waitMS,
  withLamports,
} from "../shared";
import {
  beforeHook,
  CreatorInput,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  TEST_COSIGNER,
  testDepositIntoMargin,
  testMakeMargin,
  testWithdrawFromMargin,
  TSWAP_FEE_PCT,
} from "../tswap/common";
import BN from "bn.js";
import {
  CURRENT_TBID_VERSION,
  MAX_EXPIRY_SEC,
  TBID_ADDR,
  TBID_FEE_BPS,
} from "../../src/tensor_bid";
import {
  DAYS,
  HOURS,
  isNullLike,
  MINUTES,
  SECONDS,
  TAKER_BROKER_PCT,
} from "../../src";

chai.use(chaiAsPromised);

const testBid = async ({
  bidder,
  mint,
  margin,
  bidAmount,
  prevBidAmount,
  expireIn,
}: {
  bidder: Keypair;
  mint: PublicKey;
  margin?: PublicKey | null;
  bidAmount: number;
  prevBidAmount?: number | null;
  expireIn?: number | null;
}) => {
  const {
    tx: { ixs },
    bidState,
    bidStateBump,
  } = await bidSdk.bid({
    bidder: bidder.publicKey,
    margin,
    nftMint: mint,
    lamports: new BN(bidAmount),
    expireIn: !isNullLike(expireIn) ? new BN(expireIn) : null,
  });
  return await withLamports(
    {
      prevBidderLamports: bidder.publicKey,
      prevBidStateLamports: bidState,
      ...(margin ? { prevMarginLamports: margin } : {}),
    },
    async ({
      prevBidderLamports,
      prevBidStateLamports,
      prevMarginLamports,
    }) => {
      await buildAndSendTx({ ixs, extraSigners: [bidder] });

      const bidAcc = await bidSdk.fetchBidState(bidState);
      expect(bidAcc.version).to.eq(CURRENT_TBID_VERSION);
      expect(bidAcc.bidAmount.toString()).to.eq(bidAmount.toString());
      expect(bidAcc.nftMint).to.deep.eq(mint);
      expect(bidAcc.bidder).to.deep.eq(bidder.publicKey);
      expect(bidAcc.bump[0]).to.eq(bidStateBump);
      if (!isNullLike(margin)) {
        expect(bidAcc.margin).to.deep.eq(margin);
      }
      expect(bidAcc.expiry.toNumber()).approximately(
        +new Date() / 1000 + (expireIn ?? 0),
        MINUTES
      );

      const currBidderLamports = await getLamports(bidder.publicKey);
      const currBidStateLamports = await getLamports(bidState);

      if (margin) {
        //check bid acc final
        expect(currBidStateLamports).to.eq(await bidSdk.getBidStateRent());
        //can't check diff, since need more state to calc toUpload
      } else {
        const bidRent = await bidSdk.getBidStateRent();
        const bidDiff = bidAmount - (prevBidAmount ?? 0);

        //check bidder diff
        expect(currBidderLamports! - prevBidderLamports!).to.eq(
          -(bidDiff + (isNullLike(prevBidStateLamports) ? bidRent : 0))
        );
        //check bid acc diff
        expect(currBidStateLamports! - (prevBidStateLamports ?? 0)).to.eq(
          bidDiff + (isNullLike(prevBidStateLamports) ? bidRent : 0)
        );
        //check bid acc final
        expect(currBidStateLamports).to.eq(bidRent + bidAmount);
      }

      return { bidState };
    }
  );
};

const testTakeBid = async ({
  bidder,
  seller,
  mint,
  ata,
  margin,
  bidAmount,
  creators,
  royaltyBps,
  programmable,
  optionalRoyaltyPct = null,
  takerBroker = null,
  lookupTableAccount = null,
}: {
  bidder: Keypair;
  seller: Keypair;
  mint: PublicKey;
  ata: PublicKey;
  margin: PublicKey | null;
  bidAmount: number;
  creators?: CreatorInput[];
  royaltyBps?: number;
  programmable?: boolean;
  optionalRoyaltyPct?: number | null;
  takerBroker?: PublicKey | null;
  lookupTableAccount?: AddressLookupTableAccount | null;
}) => {
  const {
    tx: { ixs: takeIxs },
    bidState,
    tswapPda,
    nftbidderAcc,
  } = await bidSdk.takeBid({
    bidder: bidder.publicKey,
    margin,
    nftMint: mint,
    lamports: new BN(bidAmount),
    seller: seller.publicKey,
    nftSellerAcc: ata,
    optionalRoyaltyPct,
    takerBroker,
  });
  return await withLamports(
    {
      prevBidderLamports: bidder.publicKey,
      prevBidStateLamports: bidState,
      ...(margin ? { prevMarginLamports: margin } : {}),
      ...(takerBroker ? { prevTakerBroker: takerBroker } : {}),
      prevFeeAccLamports: tswapPda,
      prevSellerLamports: seller.publicKey,
    },
    async ({
      prevBidderLamports,
      prevBidStateLamports,
      prevMarginLamports,
      prevTakerBroker,
      prevFeeAccLamports,
      prevSellerLamports,
    }) => {
      // Seller initially has the nft
      let sellerAcc = await getAccount(ata);
      let bidderAcc = await getAccount(nftbidderAcc);
      expect(sellerAcc.amount.toString()).eq("1");
      expect(bidderAcc.amount.toString()).eq("0");

      await buildAndSendTx({
        ixs: takeIxs,
        extraSigners: [seller],
        lookupTableAccounts: lookupTableAccount
          ? [lookupTableAccount]
          : undefined,
      });

      // Bidder eventually has the nft
      sellerAcc = await getAccount(ata);
      bidderAcc = await getAccount(nftbidderAcc);
      expect(sellerAcc.amount.toString()).eq("0");
      expect(bidderAcc.amount.toString()).eq("1");

      //fee for tswap and broker
      const feeAccLamports = await getLamports(tswapPda);
      const tswapFee = Math.trunc((bidAmount * TBID_FEE_BPS) / 1e4);

      const tswapFeeLessBroker = takerBroker
        ? Math.trunc((tswapFee * (100 - TAKER_BROKER_PCT)) / 100)
        : tswapFee;
      const brokerFee = takerBroker
        ? Math.trunc((tswapFee * TAKER_BROKER_PCT) / 100)
        : 0;

      //paid tswap fees (NB: fee account may be un-init before).
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(
        tswapFeeLessBroker
      );

      //paid broker
      if (!isNullLike(takerBroker) && TAKER_BROKER_PCT > 0) {
        const brokerLamports = await getLamports(takerBroker);
        expect(brokerLamports! - (prevTakerBroker ?? 0)).eq(brokerFee);
      }

      // Check creators' balances.
      let creatorsFee = 0;
      if (!!creators?.length && royaltyBps) {
        //skip creators when royalties not enough to cover rent
        let skippedCreators = 0;
        const temp = Math.trunc(
          (programmable
            ? royaltyBps / 1e4
            : !isNullLike(optionalRoyaltyPct)
            ? ((royaltyBps / 1e4) * optionalRoyaltyPct) / 100
            : 0) *
            bidAmount *
            (1 - skippedCreators / 100)
        );

        // Need to accumulate b/c of dust.
        for (const c of creators) {
          const cBal = await getLamports(c.address);
          //only run the test if share > 1, else it's skipped && cBal exists (it wont if 0 royalties were paid)
          if (c.share > 1 && !isNullLike(cBal)) {
            const expected = Math.trunc((temp * c.share) / 100);
            expect(cBal).eq(expected);
            creatorsFee += expected;
          }
        }
      }

      //paid full amount to seller
      const currSellerLamports = await getLamports(seller.publicKey);
      //skip check for programmable, since you create additional PDAs that cost lamports (not worth tracking)
      if (!programmable) {
        expect(currSellerLamports! - prevSellerLamports!).eq(
          bidAmount - tswapFee - creatorsFee
        );
      } else {
        //check roughly correct (their acc is a few mm)
        expect(currSellerLamports! - prevSellerLamports!).gt(
          bidAmount - tswapFee - creatorsFee - 3_000_000
        );
      }

      // bidder gets back rent
      const currBidderLamports = await getLamports(bidder.publicKey);
      expect(currBidderLamports! - prevBidderLamports!).equal(
        await bidSdk.getBidStateRent()
      );

      // Sol escrow should have the NFT cost deducted (minus mm fees owner gets back).
      if (!isNullLike(margin)) {
        const currMarginLamports = await getLamports(margin);
        expect(currMarginLamports! - prevMarginLamports!).eq(-1 * bidAmount);
      } else {
        const currBidStateLamports = await getLamports(bidState);
        expect((currBidStateLamports ?? 0) - prevBidStateLamports!).eq(
          -1 * (bidAmount + (await bidSdk.getBidStateRent()))
        );
      }

      await expect(bidSdk.fetchBidState(bidState)).to.be.rejectedWith(
        "does not exist"
      );
    }
  );
};

const testCancelCloseBid = async ({
  bidder,
  mint,
  bidAmount,
  margin,
  closeWithCosigner = false,
}: {
  bidder: Keypair;
  mint: PublicKey;
  bidAmount: number;
  margin?: PublicKey | null;
  closeWithCosigner?: boolean;
}) => {
  let ixs: TransactionInstruction[];
  let bidState: PublicKey;

  if (closeWithCosigner) {
    ({
      tx: { ixs },
      bidState,
    } = await bidSdk.closeExpiredBid({
      bidder: bidder.publicKey,
      nftMint: mint,
      cosigner: TEST_COSIGNER.publicKey,
    }));
  } else {
    ({
      tx: { ixs },
      bidState,
    } = await bidSdk.cancelBid({
      bidder: bidder.publicKey,
      nftMint: mint,
    }));
  }

  return await withLamports(
    {
      prevBidderLamports: bidder.publicKey,
      prevBidStateLamports: bidState,
      ...(margin ? { prevMarginLamports: margin } : {}),
    },
    async ({
      prevBidderLamports,
      prevBidStateLamports,
      prevMarginLamports,
    }) => {
      await buildAndSendTx({
        ixs,
        extraSigners: [closeWithCosigner ? TEST_COSIGNER : bidder],
      });

      await expect(bidSdk.fetchBidState(bidState)).to.be.rejectedWith(
        "does not exist"
      );

      const currBidderLamports = await getLamports(bidder.publicKey);
      const currBidStateLamports = (await getLamports(bidState)) ?? 0;

      //no more bidState
      expect(currBidStateLamports).to.eq(0);

      if (margin) {
        //no change in margin acc
        const currMarginLamports = await getLamports(margin);
        expect(currMarginLamports).to.eq(prevMarginLamports);
        //rent back
        expect(currBidderLamports! - prevBidderLamports!).to.eq(
          await bidSdk.getBidStateRent()
        );
      } else {
        const bidRent = await bidSdk.getBidStateRent();
        const toGetBack = bidAmount;
        //check bidder diff
        expect(currBidderLamports! - prevBidderLamports!).to.eq(
          toGetBack + bidRent
        );
        //check bid acc diff
        expect((currBidStateLamports ?? 0) - prevBidStateLamports!).to.eq(
          -(toGetBack + bidRent)
        );
      }
    }
  );
};

describe("tensor bid", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("happy path (bid -> take bid)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });
      await testTakeBid({
        bidder,
        seller,
        mint,
        ata,
        margin,
        bidAmount: amount,
        programmable,
        creators,
        royaltyBps,
        lookupTableAccount,
      });
    }
  });

  it("happy path (bid -> take bid, TAKER BROKER)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;
    const takerBroker = Keypair.generate().publicKey;

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });
      await testTakeBid({
        bidder,
        seller,
        mint,
        ata,
        margin,
        bidAmount: amount,
        programmable,
        creators,
        royaltyBps,
        takerBroker,
        lookupTableAccount,
      });
    }
  });

  it("happy path (bid -> take bid, CUSTOM ROYALTIES)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });
      await testTakeBid({
        bidder,
        seller,
        mint,
        ata,
        margin,
        bidAmount: amount,
        programmable,
        creators,
        royaltyBps,
        optionalRoyaltyPct: 50,
        lookupTableAccount,
      });
    }
  });

  it("happy path (bid -> edit -> take bid)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount: amount * 2, //<-- has to match final 2 sol, since we no longer auto top up margin
        });
        margin = marginPda;
      }

      //initial bid
      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });
      // down
      await testBid({
        bidder,
        mint,
        margin,
        bidAmount: 0.5 * amount,
        expireIn,
        prevBidAmount: amount,
      });
      // up
      await testBid({
        bidder,
        mint,
        margin,
        bidAmount: 1.5 * amount,
        expireIn,
        prevBidAmount: 0.5 * amount,
      });
      // flat
      await testBid({
        bidder,
        mint,
        margin,
        bidAmount: 1.5 * amount,
        expireIn,
        prevBidAmount: 1.5 * amount,
      });
      // down
      await testBid({
        bidder,
        mint,
        margin,
        bidAmount: 1.4321 * amount,
        expireIn,
        prevBidAmount: 1.5 * amount,
      });
      // up
      await testBid({
        bidder,
        mint,
        margin,
        bidAmount: 2 * amount,
        expireIn,
        prevBidAmount: 1.4321 * amount,
      });

      await testTakeBid({
        bidder,
        seller,
        mint,
        ata,
        margin,
        bidAmount: 2 * amount,
        programmable,
        creators,
        royaltyBps,
        lookupTableAccount,
      });
    }
  });

  it("happy path (bid -> cancel bid)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        1000,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      const amount = LAMPORTS_PER_SOL;
      const expireIn = HOURS / 1000;

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });
      await testCancelCloseBid({ bidder, mint, bidAmount: amount, margin });
    }
  });

  it("happy path (bid -> close expired bid)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        1000,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      const amount = LAMPORTS_PER_SOL;
      const expireIn = (5 * SECONDS) / 1000;

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });

      //try to force close too early, fails
      await expect(
        testCancelCloseBid({
          bidder,
          mint,
          bidAmount: amount,
          margin,
          closeWithCosigner: true,
        })
      ).to.be.rejectedWith(bidSdk.getErrorCodeHex("BidNotYetExpired"));

      //wait then try again, succeeds
      await waitMS(10000);

      await testCancelCloseBid({
        bidder,
        mint,
        bidAmount: amount,
        margin,
        closeWithCosigner: true,
      });
    }
  });

  it("edge case (margin balance insufficient)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;

    for (const [programmable, initialMarginDeposit] of cartesian(
      [true, false],
      [0.5 * amount, amount]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      const { marginPda, marginNr, marginRent } = await testMakeMargin({
        owner: bidder,
      });
      await testDepositIntoMargin({
        owner: bidder,
        marginNr,
        marginPda,
        amount: initialMarginDeposit,
      });

      await testBid({
        bidder,
        mint,
        margin: marginPda,
        bidAmount: amount,
        expireIn,
      });

      //intentionally withdraw
      await testWithdrawFromMargin({
        owner: bidder,
        marginNr,
        marginPda,
        amount: 0.3 * LAMPORTS_PER_SOL,
        expectedLamports: initialMarginDeposit - 0.3 * LAMPORTS_PER_SOL,
      });

      await expect(
        testTakeBid({
          bidder,
          seller,
          mint,
          ata,
          margin: marginPda,
          bidAmount: amount,
          programmable,
          creators,
          royaltyBps,
          lookupTableAccount,
        })
      ).to.be.rejectedWith(INTEGER_OVERFLOW_ERR);
    }
  });

  it("edge case (bid/take with someone else's margin / with wrong amount)", async () => {
    const [bidder, seller, rando] = await makeNTraders(3);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;

    for (const [programmable, initialMarginDeposit] of cartesian(
      [true, false],
      [2 * amount, amount]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      const { marginPda: marginBad, marginNr: marginNrBad } =
        await testMakeMargin({
          owner: rando,
        });

      // --------------------------------------- bid w/ good margin

      const { marginPda, marginNr, marginRent } = await testMakeMargin({
        owner: bidder,
      });
      await testDepositIntoMargin({
        owner: bidder,
        marginNr,
        marginPda,
        amount: initialMarginDeposit,
      });

      await testBid({
        bidder,
        mint,
        margin: marginPda,
        bidAmount: amount,
        expireIn,
      });

      //create a 2nd margin that wont be used
      const { marginPda: marginPda2, marginNr: marginNr2 } =
        await testMakeMargin({
          owner: bidder,
        });
      await testDepositIntoMargin({
        owner: bidder,
        marginNr: marginNr2,
        marginPda: marginPda2,
        amount: initialMarginDeposit,
      });

      // --------------------------------------- take w/ bad margin

      await expect(
        testTakeBid({
          bidder,
          seller,
          mint,
          ata,
          margin: marginBad,
          bidAmount: amount,
          programmable,
          creators,
          royaltyBps,
          lookupTableAccount,
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadMargin"));

      // --------------------------------------- take w/ margin by the same user, but other margin account

      await expect(
        testTakeBid({
          bidder,
          seller,
          mint,
          ata,
          margin: marginPda2,
          bidAmount: amount,
          programmable,
          creators,
          royaltyBps,
          lookupTableAccount,
        })
      ).to.be.rejectedWith(bidSdk.getErrorCodeHex("BadMargin"));

      // --------------------------------------- take w/ bad amount

      await expect(
        testTakeBid({
          bidder,
          seller,
          mint,
          ata,
          margin: marginPda,
          bidAmount: amount / 2,
          programmable,
          creators,
          royaltyBps,
          lookupTableAccount,
        })
      ).to.be.rejectedWith(bidSdk.getErrorCodeHex("PriceMismatch"));

      // --------------------------------------- take w/ good margin

      await testTakeBid({
        bidder,
        seller,
        mint,
        ata,
        margin: marginPda,
        bidAmount: amount,
        programmable,
        creators,
        royaltyBps,
        lookupTableAccount,
      });
    }
  });

  it("edge case (bid expires)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = SECONDS / 1000; //1 second

    for (const [programmable, marginated] of cartesian(
      [true, false],
      [true, false]
    )) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await testBid({ bidder, mint, margin, bidAmount: amount, expireIn });

      //wait for the bid to expire
      await waitMS(3000);

      await expect(
        testTakeBid({
          bidder,
          seller,
          mint,
          ata,
          margin,
          bidAmount: amount,
          programmable,
          creators,
          royaltyBps,
          lookupTableAccount,
        })
      ).to.be.rejectedWith(bidSdk.getErrorCodeHex("BidExpired"));
    }
  });

  it("edge case (expiry too large)", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;

    for (const [programmable, marginated] of cartesian([true], [true, false])) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      let margin = null;
      if (marginated) {
        const { marginPda, marginNr, marginRent } = await testMakeMargin({
          owner: bidder,
        });
        await testDepositIntoMargin({
          owner: bidder,
          marginNr,
          marginPda,
          amount,
        });
        margin = marginPda;
      }

      await expect(
        testBid({
          bidder,
          mint,
          margin,
          bidAmount: amount,
          expireIn: MAX_EXPIRY_SEC + 1, //1sec more than allowed
        })
      ).to.be.rejectedWith(bidSdk.getErrorCodeHex("ExpiryTooLarge"));
    }
  });

  it("edit: switch between marginated and not bids", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;
    const expireIn = HOURS / 1000;

    for (const programmable of [true, false]) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata } = await makeMintTwoAta(
        seller,
        bidder,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        programmable ? ruleSetAddr : undefined
      );

      const { marginPda, marginNr, marginRent } = await testMakeMargin({
        owner: bidder,
      });
      await testDepositIntoMargin({
        owner: bidder,
        marginNr,
        marginPda,
        amount,
      });

      //initial bid (NOT marginated)
      await testBid({
        bidder,
        mint,
        margin: null,
        bidAmount: amount,
        expireIn,
      });

      //edit bid (marginated)
      const bidderLamports1 = await getLamports(bidder.publicKey);
      await testBid({
        bidder,
        mint,
        margin: marginPda,
        bidAmount: amount,
        expireIn,
      });
      const bidderLamports2 = await getLamports(bidder.publicKey);
      //the amount that got initially deposited is returned to the bidder, since the order is now marginated
      expect(bidderLamports2! - bidderLamports1!).to.eq(amount);

      //edit bid (NOT marginated)
      await testBid({
        bidder,
        mint,
        margin: null,
        bidAmount: amount,
        expireIn,
      });
      const bidderLamports3 = await getLamports(bidder.publicKey);
      //editing a bid to be non-marginated once again deposits lamports
      expect(bidderLamports3! - bidderLamports2!).to.eq(-amount);
    }
  });

  it("edit: expiry date", async () => {
    const [bidder, seller] = await makeNTraders(2);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      seller,
      undefined,
      undefined,
      TBID_ADDR
    );

    const royaltyBps = 1000;
    const amount = LAMPORTS_PER_SOL;

    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await makeMintTwoAta(
      seller,
      bidder,
      royaltyBps,
      creators,
      undefined,
      undefined,
      false,
      undefined
    );

    //initial bid
    const { bidState } = await testBid({
      bidder,
      mint,
      margin: null,
      bidAmount: amount + 1,
      expireIn: HOURS / 1000,
    });
    const originalExpireTime = (await bidSdk.fetchBidState(bidState)).expiry;

    //leave expiry time unchanged
    await testBid({
      bidder,
      mint,
      margin: null,
      bidAmount: amount,
      prevBidAmount: amount + 1,
      expireIn: null,
    });
    const unchangedExpireTime = (await bidSdk.fetchBidState(bidState)).expiry;
    expect(originalExpireTime.toNumber()).to.eq(unchangedExpireTime.toNumber());

    //set it to 0
    await testBid({
      bidder,
      mint,
      margin: null,
      bidAmount: amount,
      prevBidAmount: amount,
      expireIn: 0,
    });
    const zeroExpireTime = (await bidSdk.fetchBidState(bidState)).expiry;
    expect(zeroExpireTime.toNumber()).to.be.lt(originalExpireTime.toNumber());

    //set it to max
    await testBid({
      bidder,
      mint,
      margin: null,
      bidAmount: amount,
      prevBidAmount: amount,
      expireIn: MAX_EXPIRY_SEC,
    });
    const maxExpireTime = (await bidSdk.fetchBidState(bidState)).expiry;
    expect(maxExpireTime.toNumber()).to.be.gt(originalExpireTime.toNumber());

    await waitMS(3000);

    //set it to max again
    await testBid({
      bidder,
      mint,
      margin: null,
      bidAmount: amount,
      prevBidAmount: amount,
      expireIn: MAX_EXPIRY_SEC,
    });
    const maxExpireTime2 = (await bidSdk.fetchBidState(bidState)).expiry;
    expect(maxExpireTime2.toNumber()).to.be.gt(maxExpireTime.toNumber());

    //try to set too large
    await expect(
      testBid({
        bidder,
        mint,
        margin: null,
        bidAmount: amount,
        prevBidAmount: amount,
        expireIn: MAX_EXPIRY_SEC + 1, //1sec more than allowed
      })
    ).to.be.rejectedWith(bidSdk.getErrorCodeHex("ExpiryTooLarge"));
  });
});
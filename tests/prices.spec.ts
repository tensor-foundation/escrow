import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Big from "big.js";
import BN from "bn.js";
import { expect } from "chai";
import {
  computeCurrentPrice,
  computeMakerAmountCount,
  CurveType,
  PoolType,
  TakerSide,
  computeTakerDisplayPrice,
} from "../src";
import { cartesian } from "./shared";

describe("prices helper functions", () => {
  it("computeTakerDisplayPrice works as intended for trade pools", async () => {
    const startingPrice = new Big(2 * LAMPORTS_PER_SOL);
    const delta = new Big(0.1 * LAMPORTS_PER_SOL);

    for (const { mmFeeBps, expected, takerSide } of [
      // 1 tick lower, but no fees.
      {
        mmFeeBps: 0,
        expected: new Big(1.9 * LAMPORTS_PER_SOL),
        takerSide: TakerSide.Sell,
      },
      // 1 tick lower + mm fees (2.5%).
      {
        mmFeeBps: 250,
        expected: new Big(1.8525 * LAMPORTS_PER_SOL),
        takerSide: TakerSide.Sell,
      },
      // MM fees has no effect on buys.
      { mmFeeBps: 0, expected: startingPrice, takerSide: TakerSide.Buy },
      { mmFeeBps: 250, expected: startingPrice, takerSide: TakerSide.Buy },
    ]) {
      const price = computeTakerDisplayPrice({
        config: {
          poolType: PoolType.Trade,
          curveType: CurveType.Linear,
          startingPrice,
          delta,
          mmFeeBps,
          honorRoyalties: true,
        },
        takerSellCount: 0,
        takerBuyCount: 0,
        takerSide,
        extraNFTsSelected: 0,
      });

      expect(price!.toString()).eq(expected.toString());
    }
  });

  it("computeTakerDisplayPrice is equal to computeCurrentPrice for NFT/token pools", async () => {
    const startingPrice = new Big(2 * LAMPORTS_PER_SOL);
    const delta = new Big(0.1 * LAMPORTS_PER_SOL);
    const mmFeeBps = 250;

    for (const [takerSide, poolType] of cartesian(
      [TakerSide.Buy, TakerSide.Sell],
      [PoolType.NFT, PoolType.Token]
    )) {
      const args = {
        config: {
          poolType,
          curveType: CurveType.Linear,
          startingPrice,
          delta,
          mmFeeBps,
          honorRoyalties: true,
        },
        takerSellCount: 0,
        takerBuyCount: 0,
        takerSide,
        extraNFTsSelected: 0,
      };
      const price = computeTakerDisplayPrice(args);
      expect(price!.toString()).eq(computeCurrentPrice(args)!.toString());
    }
  });

  // todo: add more computeMakerAmountCount tests.
  it("computeMakerAmountCount works for selling into trade pool", async () => {
    // Compute amount for 3 NFTs selling into trade pool (most complex).
    const baseConfig = {
      desired: { count: 3 },
      config: {
        poolType: PoolType.Trade,
        curveType: CurveType.Linear,
        startingPrice: new Big(2 * LAMPORTS_PER_SOL),
        delta: new Big(0.1 * LAMPORTS_PER_SOL),
        mmFeeBps: 340,
        honorRoyalties: true,
      },
      takerBuyCount: 0,
      takerSellCount: 0,
      takerSide: TakerSide.Sell,
      extraNFTsSelected: 0,
    };
    let { totalAmount, allowedCount, initialPrice } =
      computeMakerAmountCount(baseConfig);
    // 1.9*0.966 + 1.8*0.966 + 1.7*0.966
    expect(totalAmount.toNumber()).eq(5.2164 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(3);
    // 1.9*0.966
    expect(initialPrice!.toNumber()).eq(1.8354 * LAMPORTS_PER_SOL);

    // 0.0001 lamport less than required for 3.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { total: new BN(5.2163 * LAMPORTS_PER_SOL) },
    }));
    // 1.9*0.966 + 1.8*0.966
    expect(totalAmount.toNumber()).eq(3.5742 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(2);
    // 1.9*0.966
    expect(initialPrice!.toNumber()).eq(1.8354 * LAMPORTS_PER_SOL);

    // 0.0001 lamport more than required for 3.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { total: new BN(5.2165 * LAMPORTS_PER_SOL) },
    }));
    // 1.9*0.966 + 1.8*0.966 + 1.7*0.966
    expect(totalAmount.toNumber()).eq(5.2164 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(3);
    // 1.9*0.966
    expect(initialPrice!.toNumber()).eq(1.8354 * LAMPORTS_PER_SOL);

    // ---- non-zero taker counts

    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      // Start price should now be 2 - 2*0.1 = 1.8
      takerSellCount: 5,
      takerBuyCount: 3,
    }));
    // 1.7*0.966 + 1.6*0.966 + 1.5*0.966
    expect(totalAmount.toNumber()).eq(4.6368 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(3);
    // 1.7*0.966
    expect(initialPrice!.toNumber()).eq(1.6422 * LAMPORTS_PER_SOL);

    // With total now
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { total: new BN(4 * LAMPORTS_PER_SOL) },
      // Start price should now be 2 - 2*0.1 = 1.8
      takerSellCount: 5,
      takerBuyCount: 3,
    }));
    expect(totalAmount.toNumber()).eq(3.1878 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(2);
    // 1.7*0.966
    expect(initialPrice!.toNumber()).eq(1.6422 * LAMPORTS_PER_SOL);
  });

  it("computeMakerAmountCount behaves fine with 0 and negative prices", async () => {
    // Compute amount for 3 NFTs selling into trade pool (most complex).
    const baseConfig = {
      desired: { total: new BN(2 * LAMPORTS_PER_SOL) },
      config: {
        poolType: PoolType.Token,
        curveType: CurveType.Linear,
        startingPrice: new Big(0.1 * LAMPORTS_PER_SOL),
        delta: new Big(0.1 * LAMPORTS_PER_SOL),
        mmFeeBps: null,
        honorRoyalties: true,
      },
      takerBuyCount: 0,
      takerSellCount: 0,
      takerSide: TakerSide.Sell,
      extraNFTsSelected: 0,
    };

    // No sells: 0.1 start price, can sell twice.
    let { totalAmount, allowedCount, initialPrice } =
      computeMakerAmountCount(baseConfig);
    expect(totalAmount.toNumber()).eq(0.1 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(0.1 * LAMPORTS_PER_SOL);

    // 1 sell, 0 current price, 1 more sell.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      takerSellCount: 1,
    }));
    expect(totalAmount.toNumber()).eq(0 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(1);
    expect(initialPrice!.toNumber()).eq(0);

    // 2 sells, null current price, no more sells.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      takerSellCount: 2,
    }));
    expect(totalAmount.toNumber()).eq(0 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(0);
    expect(initialPrice).null;
  });

  it("computeMakerAmountCount adds small negative slippage for exponential curves", async () => {
    const baseConfig = {
      desired: { count: 2 },
      config: {
        poolType: PoolType.Trade,
        curveType: CurveType.Exponential,
        startingPrice: new Big(1 * LAMPORTS_PER_SOL),
        delta: new Big(1000),
        mmFeeBps: 1000,
        honorRoyalties: true,
      },
      takerBuyCount: 0,
      takerSellCount: 0,
      takerSide: TakerSide.Sell,
      extraNFTsSelected: 0,
    };
    let { totalAmount, allowedCount, initialPrice } =
      computeMakerAmountCount(baseConfig);
    // 1/1.1 * 0.9 * 1.001 + 1/1.1^2 * 0.9 * 1.001
    expect(totalAmount.toNumber()).eq(1563545455);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(0.819 * LAMPORTS_PER_SOL);

    // Now inverse (specify amount) should give the same amount.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { total: new BN(1563545455) },
    }));
    expect(totalAmount.toNumber()).eq(1563545455);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(0.819 * LAMPORTS_PER_SOL);
  });
});

it("computeMakerAmountCount max count works for infinite expo sell curve", async () => {
  const baseConfig = {
    desired: { total: new BN(0) },
    config: {
      poolType: PoolType.Token,
      curveType: CurveType.Exponential,
      // This can buy at 0 infinitely.
      startingPrice: new Big(0 * LAMPORTS_PER_SOL),
      delta: new Big(1000),
      mmFeeBps: null,
      honorRoyalties: true,
    },
    takerBuyCount: 0,
    takerSellCount: 0,
    takerSide: TakerSide.Sell,
    extraNFTsSelected: 0,
    // Check that this works.
    maxCount: 691,
  };
  let { totalAmount, allowedCount, initialPrice } =
    computeMakerAmountCount(baseConfig);
  expect(totalAmount.toNumber()).eq(0);
  expect(allowedCount).eq(691);
  expect(initialPrice!.toNumber()).eq(0);
});

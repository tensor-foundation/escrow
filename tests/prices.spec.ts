import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Big from "big.js";
import BN from "bn.js";
import { expect } from "chai";
import {
  computeMakerAmountCount,
  computeTakerDisplayPrice,
  computeTakerPrice,
  CurveType,
  evalMathExpr,
  PoolType,
  TakerSide,
  TSwapIDL_latest,
  TSWAP_TAKER_FEE_BPS,
} from "../src";
import { cartesian } from "./shared";

const common = {
  takerSellCount: 0,
  takerBuyCount: 0,
  extraNFTsSelected: 0,
  statsTakerSellCount: 0,
  maxTakerSellCount: 0,
  statsTakerBuyCount: 0,
};

type MakerAmountArgs = Parameters<typeof computeMakerAmountCount>[0];

describe("Tensorswap constants", () => {
  it("Asserts TSWAP_TAKER_FEE_BPS equals in IDL and SDK", () => {
    const idlTswapTakerFeeBps = evalMathExpr(
      TSwapIDL_latest.constants.find((c) => c.name === "TSWAP_TAKER_FEE_BPS")!
        .value
    );

    expect(TSWAP_TAKER_FEE_BPS).to.eq(
      idlTswapTakerFeeBps,
      "TSWAP_TAKER_FEE_BPS in lib.rs does not equal constants.ts. Did you update one but not the other?"
    );
  });
});

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
        ...common,
        config: {
          poolType: PoolType.Trade,
          curveType: CurveType.Linear,
          startingPrice,
          delta,
          mmFeeBps,
          mmCompoundFees: true,
        },
        takerSide,
        marginated: true,
      });

      expect(price!.toNumber()).eq(expected.toNumber());
    }
  });

  it("computeTakerDisplayPrice is equal to computeTakerPrice for NFT/token pools", async () => {
    const startingPrice = new Big(2 * LAMPORTS_PER_SOL);
    const delta = new Big(0.1 * LAMPORTS_PER_SOL);
    const mmFeeBps = 250;

    for (const [takerSide, poolType] of cartesian(
      [TakerSide.Buy, TakerSide.Sell],
      [PoolType.NFT, PoolType.Token]
    )) {
      const args = {
        ...common,
        config: {
          poolType,
          curveType: CurveType.Linear,
          startingPrice,
          delta,
          mmFeeBps,
          mmCompoundFees: true,
        },
        takerSide,
        marginated: true,
      };
      const price = computeTakerDisplayPrice(args);
      expect(price!.toNumber()).eq(computeTakerPrice(args)!.toNumber());
    }
  });

  it("computeTakerPrice/computeTakerDisplayPrice/computeMakerAmountCount respects maxTakerSellCount", async () => {
    const startingPrice = new Big(2 * LAMPORTS_PER_SOL);
    const delta = new Big(0.1 * LAMPORTS_PER_SOL);

    // Respects for both token + trade pools.
    for (const poolType of [PoolType.Token, PoolType.Trade]) {
      const base = {
        ...common,
        config: {
          poolType,
          curveType: CurveType.Linear,
          startingPrice,
          delta,
          mmFeeBps: null,
          mmCompoundFees: true,
        },
        takerSide: TakerSide.Sell,
        marginated: true,
      };

      const expectedPrice =
        poolType === PoolType.Token
          ? startingPrice.toNumber()
          : startingPrice.minus(delta).toNumber();

      // Can sell 1.
      for (const config of [
        base,
        { ...base, statsTakerSellCount: 3, maxTakerSellCount: 4 },
        {
          ...base,
          statsTakerSellCount: 4,
          statsTakerBuyCount: 1,
          maxTakerSellCount: 4,
        },
        {
          ...base,
          statsTakerSellCount: 1,
          statsTakerBuyCount: 1,
          maxTakerSellCount: 1,
        },
      ]) {
        expect(computeTakerPrice(config)!.toNumber()).eq(expectedPrice);
        expect(computeTakerDisplayPrice(config)!.toNumber()).eq(expectedPrice);
        {
          const { totalAmount, allowedCount, initialPrice } =
            computeMakerAmountCount({ ...config, desired: { count: 1 } });
          expect(totalAmount.toNumber()).eq(expectedPrice);
          expect(allowedCount).eq(1);
          expect(initialPrice!.toNumber()).eq(expectedPrice);
        }
      }

      // Can only sell 1 more.
      const { totalAmount, allowedCount, initialPrice } =
        computeMakerAmountCount({
          ...base,
          desired: { count: 2 },
          statsTakerSellCount: 3,
          maxTakerSellCount: 4,
        });
      expect(totalAmount.toNumber()).eq(expectedPrice);
      expect(allowedCount).eq(1);
      expect(initialPrice!.toNumber()).eq(expectedPrice);

      // Cannot sell any more.
      for (const maxedConfig of [
        {
          ...base,
          statsTakerSellCount: 1,
          maxTakerSellCount: 1,
        },
        {
          ...base,
          statsTakerSellCount: 2,
          statsTakerBuyCount: 1,
          maxTakerSellCount: 1,
        },
      ]) {
        expect(computeTakerPrice(maxedConfig)).null;
        expect(computeTakerDisplayPrice(maxedConfig)).null;
        {
          const { totalAmount, allowedCount, initialPrice } =
            computeMakerAmountCount({ ...maxedConfig, desired: { count: 1 } });
          expect(totalAmount.toNumber()).eq(0);
          expect(allowedCount).eq(0);
          expect(initialPrice).null;
        }
      }
    }
  });

  it("extraNFTsSelected works", async () => {
    const startingPrice = new Big(2 * LAMPORTS_PER_SOL);
    const delta = new Big(0.1 * LAMPORTS_PER_SOL);

    for (const { poolType, takerSide, expectedPrice } of [
      {
        poolType: PoolType.Token,
        takerSide: TakerSide.Sell,
        expectedPrice: startingPrice.minus(delta).toNumber(),
      },
      {
        poolType: PoolType.NFT,
        takerSide: TakerSide.Buy,
        expectedPrice: startingPrice.plus(delta).toNumber(),
      },
      {
        poolType: PoolType.Trade,
        takerSide: TakerSide.Buy,
        expectedPrice: startingPrice.plus(delta).toNumber(),
      },
      {
        poolType: PoolType.Trade,
        takerSide: TakerSide.Sell,
        // Since this started @ startingPrice - delta
        expectedPrice: startingPrice.minus(delta.mul(2)).toNumber(),
      },
    ]) {
      const config = {
        ...common,
        config: {
          poolType,
          curveType: CurveType.Linear,
          startingPrice,
          delta,
          mmFeeBps: null,
          mmCompoundFees: true,
        },
        takerSide,
        extraNFTsSelected: 1,
        marginated: true,
      };
      expect(computeTakerPrice(config)!.toNumber()).eq(expectedPrice);
      expect(computeTakerDisplayPrice(config)!.toNumber()).eq(expectedPrice);
      {
        const { totalAmount, allowedCount, initialPrice } =
          computeMakerAmountCount({ ...config, desired: { count: 1 } });
        expect(totalAmount.toNumber()).eq(expectedPrice);
        expect(allowedCount).eq(1);
        expect(initialPrice!.toNumber()).eq(expectedPrice);
      }
    }
  });

  /*
  computeMakerAmountCount test cases (for all, test both count + total method):

  For sells, make sure to test before + beyond max cap (ie into neagtive prices):
  (1) Sell x linear x trade (mm fee)
  (2) Sell x linear x token
  (3) Sell x exp x trade (mm fee)
  (4) Sell x exp x token

  (1) Buy x linear x NFT/trade
  (2) Buy x exp x NFT/trade
  */

  // ================= Sell taker side =================

  it("computeMakerAmountCount degenerate exponential (delta = 0)", async () => {
    const baseArgs: MakerAmountArgs = {
      ...common,
      desired: { total: new BN(0.01 * LAMPORTS_PER_SOL) },
      config: {
        poolType: PoolType.Token,
        curveType: CurveType.Exponential,
        startingPrice: new Big(0.01 * LAMPORTS_PER_SOL),
        // This is a degenerate linear curve basically.
        delta: new Big(0 * LAMPORTS_PER_SOL),
        mmFeeBps: null,
        mmCompoundFees: true,
      },
      takerSide: TakerSide.Sell,
      maxTakerSellCount: 1,
      marginated: true,
    };
    const { totalAmount, allowedCount, initialPrice } =
      computeMakerAmountCount(baseArgs);
    expect(totalAmount.toNumber()).eq(0.01 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(1);
    expect(initialPrice!.toNumber()).eq(0.01 * LAMPORTS_PER_SOL);

    // By count.
    {
      const { totalAmount, allowedCount, initialPrice } =
        computeMakerAmountCount({
          ...baseArgs,
          desired: { count: 1 },
        });
      expect(totalAmount.toNumber()).eq(0.01 * LAMPORTS_PER_SOL);
      expect(allowedCount).eq(1);
      expect(initialPrice!.toNumber()).eq(0.01 * LAMPORTS_PER_SOL);
    }
  });

  it("(1) computeMakerAmountCount works for selling into trade pool", async () => {
    // Compute amount for 3 NFTs selling into trade pool (most complex).
    const baseArgs: MakerAmountArgs = {
      ...common,
      desired: { count: 3 },
      config: {
        poolType: PoolType.Trade,
        curveType: CurveType.Linear,
        startingPrice: new Big(2 * LAMPORTS_PER_SOL),
        delta: new Big(0.1 * LAMPORTS_PER_SOL),
        mmFeeBps: 340,
        mmCompoundFees: true,
      },
      takerSide: TakerSide.Sell,
      marginated: true,
    };
    // startSellPrice * mm Fee = 1.9*0.966
    const startPrice = 1.8354 * LAMPORTS_PER_SOL;

    let { totalAmount, allowedCount, initialPrice } =
      computeMakerAmountCount(baseArgs);
    // 3 sells: 1.9*0.966 + 1.8*0.966 + 1.7*0.966
    expect(totalAmount.toNumber()).eq(5.2164 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(3);
    expect(initialPrice!.toNumber()).eq(startPrice);

    // 0.0001 lamport less than required for 3.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseArgs,
      desired: { total: new BN(5.2163 * LAMPORTS_PER_SOL) },
    }));
    // Just 2 sells: 1.9*0.966 + 1.8*0.966
    expect(totalAmount.toNumber()).eq(3.5742 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(startPrice);

    // 0.0001 lamport more than required = still 3.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseArgs,
      desired: { total: new BN(5.2165 * LAMPORTS_PER_SOL) },
    }));
    // 3 sells: 1.9*0.966 + 1.8*0.966 + 1.7*0.966
    expect(totalAmount.toNumber()).eq(5.2164 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(3);
    expect(initialPrice!.toNumber()).eq(startPrice);

    // ---- non-zero taker counts ----

    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseArgs,
      // Start price should now be 2 - 2*0.1 = 1.8
      takerSellCount: 5,
      takerBuyCount: 3,
    }));
    // 3 sells at lower prices: 1.7*0.966 + 1.6*0.966 + 1.5*0.966
    expect(totalAmount.toNumber()).eq(4.6368 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(3);
    // new start price: 1.7*0.966
    expect(initialPrice!.toNumber()).eq(1.6422 * LAMPORTS_PER_SOL);

    // With total now
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseArgs,
      desired: { total: new BN(4 * LAMPORTS_PER_SOL) },
      takerSellCount: 5,
      takerBuyCount: 3,
    }));
    expect(totalAmount.toNumber()).eq(3.1878 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(1.6422 * LAMPORTS_PER_SOL);

    // ---- sell beyond max amount ----
    {
      // Sell from 1.9, 1.8, ...: 0.966 * (0 + ... + 1.9) = 0.966 * 19 = 18.354
      const total = 18.354 * LAMPORTS_PER_SOL;

      ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
        ...baseArgs,
        desired: { total: new BN(10000 * LAMPORTS_PER_SOL) },
      }));
      expect(totalAmount.toNumber()).eq(total);
      expect(allowedCount).eq(20);
      expect(initialPrice!.toNumber()).eq(startPrice);

      ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
        ...baseArgs,
        desired: { count: 21 },
      }));
      expect(totalAmount.toNumber()).eq(total);
      expect(allowedCount).eq(20);
      expect(initialPrice!.toNumber()).eq(startPrice);
    }
  });

  it("(2) computeMakerAmountCount behaves fine with 0 and negative prices", async () => {
    const baseConfig = {
      ...common,
      desired: { total: new BN(2 * LAMPORTS_PER_SOL) },
      config: {
        poolType: PoolType.Token,
        curveType: CurveType.Linear,
        startingPrice: new Big(0.1 * LAMPORTS_PER_SOL),
        delta: new Big(0.1 * LAMPORTS_PER_SOL),
        mmFeeBps: null,
        mmCompoundFees: true,
      },
      takerSide: TakerSide.Sell,
      marginated: true,
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

    // ---- sell beyond max amount ----
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { count: 3 },
    }));
    expect(totalAmount.toNumber()).eq(0.1 * LAMPORTS_PER_SOL);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(0.1 * LAMPORTS_PER_SOL);

    // ---- 0 price + delta ----
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      config: {
        ...baseConfig.config,
        // 0 for both.
        startingPrice: new Big(0),
        delta: new Big(0),
      },
      maxCountWhenInfinite: 123,
    }));
    expect(totalAmount.toNumber()).eq(0);
    expect(allowedCount).eq(123);
    expect(initialPrice!.toNumber()).eq(0);

    // ---- 0 delta ----
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      config: {
        ...baseConfig.config,
        // super low price.
        startingPrice: new Big(1),
        delta: new Big(0),
      },
      maxCountWhenInfinite: 123,
    }));
    expect(totalAmount.toNumber()).eq(123);
    expect(allowedCount).eq(123);
    expect(initialPrice!.toNumber()).eq(1);
  });

  it("(3) computeMakerAmountCount adds small negative slippage for exponential curves", async () => {
    const baseConfig = {
      ...common,
      desired: { count: 2 },
      config: {
        poolType: PoolType.Trade,
        curveType: CurveType.Exponential,
        startingPrice: new Big(1 * LAMPORTS_PER_SOL),
        delta: new Big(1000),
        mmFeeBps: 1000,
        mmCompoundFees: true,
      },
      takerSide: TakerSide.Sell,
      marginated: true,
    };
    // sell price * mm fee = 1/1.1 * 0.9
    const startPrice = 818181818;

    let { totalAmount, allowedCount, initialPrice } =
      computeMakerAmountCount(baseConfig);
    // 3 sells: 1/1.1 * 0.9 * 1.001 + 1/1.1^2 * 0.9 * 1.001
    expect(totalAmount.toNumber()).eq(1563545455);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(startPrice);

    // Now inverse (specify amount) should give the same amount.
    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { total: new BN(1563545455) },
    }));
    expect(totalAmount.toNumber()).eq(1563545455);
    expect(allowedCount).eq(2);
    expect(initialPrice!.toNumber()).eq(startPrice);

    // ---- sell beyond max amount ----

    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { count: 1234 },
      maxCountWhenInfinite: 691,
    }));
    expect(totalAmount.toNumber()).eq(9009000000);
    // This works because we're using count.
    expect(allowedCount).eq(1234);
    expect(initialPrice!.toNumber()).eq(startPrice);

    ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
      ...baseConfig,
      desired: { total: new BN(1000 * LAMPORTS_PER_SOL) },
      maxCountWhenInfinite: 691,
    }));
    expect(totalAmount.toNumber()).eq(9009000000);
    // Capped out b/c price is 0.
    expect(allowedCount).eq(691);
    expect(initialPrice!.toNumber()).eq(startPrice);
  });
});

it("(4) computeMakerAmountCount max count works for infinite expo sell curve", async () => {
  const maxCount = 691;
  const baseArgs: MakerAmountArgs = {
    ...common,
    desired: { total: new BN(0) },
    config: {
      poolType: PoolType.Token,
      curveType: CurveType.Exponential,
      // This can buy at 0 infinitely.
      startingPrice: new Big(0 * LAMPORTS_PER_SOL),
      delta: new Big(1000),
      mmFeeBps: null,
      mmCompoundFees: true,
    },
    takerSide: TakerSide.Sell,
    // Check that this works.
    maxCountWhenInfinite: maxCount,
    marginated: true,
  };
  let { totalAmount, allowedCount, initialPrice } =
    computeMakerAmountCount(baseArgs);
  expect(totalAmount.toNumber()).eq(0);
  expect(allowedCount).eq(maxCount);
  expect(initialPrice!.toNumber()).eq(0);

  ({ totalAmount, allowedCount, initialPrice } = computeMakerAmountCount({
    ...baseArgs,
    desired: { total: new BN(123) },
    config: {
      ...baseArgs.config,
      startingPrice: new Big(5),
    },
  }));
  // We keep selling with 1/1.1 exponential decay: 5 * \sum n = 0 to infinity, 1/1.1^n
  expect(totalAmount.toNumber()).eq(55);
  expect(allowedCount).eq(691);
  expect(initialPrice!.toNumber()).eq(5);
});

// ================= Buy taker side =================

it("(5)/(6) computeMakerAmountCount works for buy from token/trade", async () => {
  // ---- Linear ----
  for (const poolType of [PoolType.Token, PoolType.Trade]) {
    const startingPrice = new Big(10 * LAMPORTS_PER_SOL);
    {
      const baseConfig = {
        ...common,
        desired: { count: 5 },
        config: {
          poolType,
          curveType: CurveType.Linear,
          startingPrice,
          delta: new Big(1 * LAMPORTS_PER_SOL),
          // NB: no fee charged!
          mmFeeBps: poolType === PoolType.Token ? null : 500,
          mmCompoundFees: true,
        },
        takerSide: TakerSide.Buy,
        marginated: true,
      };

      {
        const { totalAmount, allowedCount, initialPrice } =
          computeMakerAmountCount(baseConfig);
        // 5 buys: 10 + 11 + 12 + 13 + 14
        expect(totalAmount.toNumber()).eq(60 * LAMPORTS_PER_SOL);
        expect(allowedCount).eq(5);
        expect(initialPrice!.toNumber()).eq(startingPrice.toNumber());
      }

      // Works with amount.
      {
        for (const amount of [60, 61, 74]) {
          const { totalAmount, allowedCount, initialPrice } =
            computeMakerAmountCount({
              ...baseConfig,
              desired: { total: new BN(amount * LAMPORTS_PER_SOL) },
            });
          expect(totalAmount.toNumber()).eq(60 * LAMPORTS_PER_SOL);
          expect(allowedCount).eq(5);
          expect(initialPrice!.toNumber()).eq(startingPrice.toNumber());
        }
      }

      // ---- 0 price + delta ----
      {
        const { totalAmount, allowedCount, initialPrice } =
          computeMakerAmountCount({
            ...baseConfig,
            desired: { total: new BN(1000) },
            config: {
              ...baseConfig.config,
              // 0 for both.
              startingPrice: new Big(0),
              delta: new Big(0),
            },
            maxCountWhenInfinite: 123,
          });
        expect(totalAmount.toNumber()).eq(0);
        expect(allowedCount).eq(123);
        expect(initialPrice!.toNumber()).eq(0);
      }

      // ---- 0 delta ----
      {
        const { totalAmount, allowedCount, initialPrice } =
          computeMakerAmountCount({
            ...baseConfig,
            desired: { total: new BN(2000) },
            config: {
              ...baseConfig.config,
              // super low price.
              startingPrice: new Big(1),
              delta: new Big(0),
            },
            // Ignored: can keep buying.
            maxCountWhenInfinite: 123,
          });
        expect(totalAmount.toNumber()).eq(2000);
        expect(allowedCount).eq(2000);
        expect(initialPrice!.toNumber()).eq(1);
      }
    }

    // ---- Exp ----
    const baseConfig = {
      ...common,
      desired: { count: 5 },
      config: {
        poolType,
        curveType: CurveType.Exponential,
        startingPrice,
        delta: new Big(1000),
        // NB: no fee charged!
        mmFeeBps: poolType === PoolType.Token ? null : 500,
        mmCompoundFees: true,
      },
      takerSide: TakerSide.Buy,
      marginated: true,
    };
    // Negative slippage!
    // 0.1% negative slippage * 5 buys: 1.001 * (10 + 10*1.1 + 10*1.1^2 + 10*1.1^3 + 10*1.1^4)
    const expectedTotal = 61.112051 * LAMPORTS_PER_SOL;

    {
      const { totalAmount, allowedCount, initialPrice } =
        computeMakerAmountCount(baseConfig);
      expect(totalAmount.toNumber()).eq(expectedTotal);
      expect(allowedCount).eq(5);
      expect(initialPrice!.toNumber()).eq(startingPrice.toNumber());
    }

    // Works with amount.
    {
      for (const amount of [61.112051, 61.112052, 77.156]) {
        const { totalAmount, allowedCount, initialPrice } =
          computeMakerAmountCount({
            ...baseConfig,
            desired: { total: new BN(amount * LAMPORTS_PER_SOL) },
          });
        expect(totalAmount.toNumber()).eq(expectedTotal);
        expect(allowedCount).eq(5);
        expect(initialPrice!.toNumber()).eq(startingPrice.toNumber());
      }
    }
  }
});

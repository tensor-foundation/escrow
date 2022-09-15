import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import Big from "big.js";
import { expect } from "chai";
import {
  computeCurrentPrice,
  computeTakerDisplayPrice,
  CurveType,
  PoolType,
  TakerSide,
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
      const { displayPrice: actual } = computeTakerDisplayPrice({
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
        slippage: 0,
      });

      expect(actual.toString()).eq(expected.toString());
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
        slippage: 0,
      };
      const { displayPrice: actual } = computeTakerDisplayPrice(args);
      expect(actual.toString()).eq(computeCurrentPrice(args).toString());
    }
  });
});

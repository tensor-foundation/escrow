import { TakerSide, CurveType, PoolType } from "../types";
import Big from "big.js";
import BN from "bn.js";

export const HUNDRED_PCT_BPS = 100_00;
// 0.1% seems to be enough to deal with truncation divergence b/w off-chain and on-chain.
const EXPO_SLIPPAGE = 0.001;

export type PoolConfig = {
  poolType: PoolType;
  curveType: CurveType;
  startingPrice: Big;
  delta: Big;
};

// Computes how much needs to be deposited to purchase an additional N # of NFTs.
export const computeDepositAmount = ({
  config,
  nftCount,
  currentTakerSellCount = 0,
  currentTakerBuyCount = 0,
}: {
  config: PoolConfig;
  nftCount: number;
  currentTakerSellCount?: number;
  currentTakerBuyCount?: number;
}) => {
  let amount = new Big(0);
  // We could analytically compute this summation, but we choose to iterate to reduce amount of code.
  for (let count = 0; count < nftCount; count++) {
    amount = amount.add(
      computeCurrentPrice({
        config,
        takerSellCount: currentTakerSellCount + count,
        takerBuyCount: currentTakerBuyCount,
        takerSide: TakerSide.Sell,
        extraNFTsSelected: 0,
        // NB: negative slippage for exponential so we overestimate instead of underestimate.
        slippage:
          config.curveType === CurveType.Linear ? 0 : -1 * EXPO_SLIPPAGE,
      })
    );
  }

  return amount;
};

// Computes the current price of a pool, optionally with slippage (so minPrice for Sell, maxPrice for Buy).
// Note even w/ 0 slippage this price will differ from the on-chain current price for Exponential curves
// b/c of rounding differences.
export const computeCurrentPrice = ({
  config,
  takerSellCount,
  takerBuyCount,
  takerSide,
  extraNFTsSelected,
  // Default small tolerance for exponential curves.
  slippage = config.curveType === CurveType.Linear ? 0 : EXPO_SLIPPAGE,
}: {
  config: PoolConfig;
  takerSellCount: number;
  takerBuyCount: number;
  takerSide: TakerSide;
  //single "extra" selection field, instead of 2 (nftsSelectedToBuy / nftsSelectedToSell)
  //that's because for Trade pools we don't want user's selection in buy tab to influence price in sell tab and vv
  //takerSide basically decides which way we add it
  extraNFTsSelected: number;

  // In addition to your standard slippage,
  // for exponential prices, we MUST add a small tolerance/slippage
  // since on-chain and off-chain rounding is not exactly the same.
  // 0.01 = 1%.
  slippage?: number;
}): Big => {
  let basePrice = (() => {
    switch (config.poolType) {
      case PoolType.Token:
        return _shiftPriceByDelta(
          config.curveType,
          config.startingPrice,
          config.delta,
          "down",
          takerSellCount + extraNFTsSelected
        );
      case PoolType.NFT:
        return _shiftPriceByDelta(
          config.curveType,
          config.startingPrice,
          config.delta,
          "up",
          takerBuyCount + extraNFTsSelected
        );
      case PoolType.Trade:
        const isSelling = takerSide === TakerSide.Sell;
        const offset = isSelling ? 1 : 0;
        const modSellCount =
          takerSellCount + offset + +isSelling * extraNFTsSelected;
        const modBuyCount =
          takerBuyCount + (1 - +isSelling) * extraNFTsSelected;
        if (modBuyCount > modSellCount) {
          return _shiftPriceByDelta(
            config.curveType,
            config.startingPrice,
            config.delta,
            "up",
            modBuyCount - modSellCount
          );
        } else {
          return _shiftPriceByDelta(
            config.curveType,
            config.startingPrice,
            config.delta,
            "down",
            modSellCount - modBuyCount
          );
        }
    }
  })();

  basePrice = basePrice.mul(
    1 + (takerSide === TakerSide.Buy ? 1 : -1) * slippage
  );

  return basePrice;
};

const _shiftPriceByDelta = (
  curveType: CurveType,
  startingPrice: Big,
  delta: Big,
  direction: "up" | "down",
  times: number
): Big => {
  switch (curveType) {
    case CurveType.Exponential:
      switch (direction) {
        // price * (1 + delta)^trade_count
        case "up":
          return startingPrice.mul(new Big(1).add(delta.div(10000)).pow(times));
        case "down":
          return startingPrice.div(new Big(1).add(delta.div(10000)).pow(times));
      }
      break;
    case CurveType.Linear:
      switch (direction) {
        case "up":
          return startingPrice.add(delta.mul(times));
        case "down":
          return startingPrice.sub(delta.mul(times));
      }
      break;
  }
};

//todo in theory could dedupe with above function
export const calcCurveTotalCount = (
  desiredCount: number,
  // These should be in native units (no decimals) .
  startPrice: BN,
  // For exp: this is in bps (1/100th of a percent, so 50% = 5000).
  normedCurveIncr: BN,
  curveType: CurveType,
  takerSide: TakerSide
) => {
  let total = new BN(0);
  let allowedCount = 0;
  let curPrice = startPrice;
  // When the taker is buying, they want the price to decrease and vice versa
  let sign = new BN(takerSide === TakerSide.Buy ? -1 : 1);
  const linFactor = normedCurveIncr.mul(sign);
  // 1 - curveIncrement or 1 + curveIncrement.
  const expFactorBps = new BN(HUNDRED_PCT_BPS).add(normedCurveIncr.mul(sign));

  while (allowedCount < desiredCount && curPrice.gt(new BN(0))) {
    total = total.add(curPrice);
    allowedCount++;
    switch (curveType) {
      case CurveType.Linear:
        curPrice = curPrice.add(linFactor);
        break;
      case CurveType.Exponential:
        // Multiply then divide to avoid early truncation by BN!
        curPrice = curPrice.mul(expFactorBps).div(new BN(HUNDRED_PCT_BPS));
        break;
      default:
        throw new Error(`unknown curve type ${curveType}`);
    }
  }

  return { total, allowedCount };
};

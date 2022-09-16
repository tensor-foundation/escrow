import { CurveType, PoolConfig, PoolType, TakerSide } from "../types";
import Big from "big.js";
import BN from "bn.js";

export const HUNDRED_PCT_BPS = 100_00;
// 0.1% seems to be enough to deal with truncation divergence b/w off-chain and on-chain.
const EXPO_SLIPPAGE = 0.001;

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
      computeTakerWithMMFeesPrice({
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

export type ComputePriceArgs = {
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
};

// This is what should be displayed to the user ((!) no slippage, since slippage is only used for rounding errors).
// In contrast, computeCurrentPrice is what should be passed to the ix itself
// (doesn't take into account tswap/mm fees).
export const computeTakerDisplayPrice = (args: ComputePriceArgs) => {
  // Explicitly set slippage to 0.
  return computeTakerWithMMFeesPrice({ ...args, slippage: 0 });
};

// This includes MM fees (when taker is selling).
// This should be used when computing deposit amounts + display (see computeTakerDisplayPrice) and nothing else.
// In contrast, computeCurrentPrice is what should be passed to the ix itself
// (doesn't take into account tswap/mm fees).
export const computeTakerWithMMFeesPrice = (args: ComputePriceArgs): Big => {
  let currentPrice = computeCurrentPrice(args);

  let priceWithMMFees = currentPrice;
  if (
    args.config.poolType === PoolType.Trade &&
    args.takerSide === TakerSide.Sell
  ) {
    priceWithMMFees = priceWithMMFees.sub(
      priceWithMMFees.mul(args.config.mmFeeBps ?? 0).div(HUNDRED_PCT_BPS)
    );
  }

  return priceWithMMFees;
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
}: ComputePriceArgs): Big => {
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

//takes into account pool type: for trade pool reduces starting price by 1 delta
export const calcCurveTotalCount = ({
  desired,
  startPrice,
  normedCurveIncr,
  curveType,
  takerSide,
  isTradePool = false,
}: {
  desired: { count: number } | { total: BN };
  // These should be in native units (no decimals) .
  startPrice: BN;
  // For exp: this is in bps (1/100th of a percent, so 50% = 5000).
  normedCurveIncr: BN;
  curveType: CurveType;
  // Reverse of pool side. Keeping for consistency with the rest of the app.
  takerSide: TakerSide;
  isTradePool?: boolean;
}): { total: BN; allowedCount: number; oneNotchDownStartPrice: BN } => {
  let total = new BN(0);
  let allowedCount = 0;
  let curPrice = startPrice;

  // When the taker is buying (pool is selling), price goes up. With each sale pools gets more expensive.
  let sign = new BN(takerSide === TakerSide.Buy ? 1 : -1);
  const linFactor = normedCurveIncr.mul(sign);
  //always add, never sub, or price will be wrong on the way down
  const expFactorBps = new BN(HUNDRED_PCT_BPS).add(normedCurveIncr);

  const _shiftPriceOnce = () => {
    switch (curveType) {
      case CurveType.Linear:
        curPrice = curPrice.add(linFactor);
        break;
      case CurveType.Exponential:
        if (takerSide === TakerSide.Buy) {
          //taker buys = pool sells = price goes up
          curPrice = curPrice.mul(expFactorBps).div(new BN(HUNDRED_PCT_BPS));
        } else {
          //taker sells = pool buys = price goes down
          curPrice = curPrice.div(expFactorBps).mul(new BN(HUNDRED_PCT_BPS));
        }
        break;
      default:
        throw new Error(`unknown curve type ${curveType}`);
    }
  };

  //if trade pool & pool is buying (taker is selling) -> need to move one notch down
  let oneNotchDownStartPrice = startPrice;
  if (isTradePool && takerSide === TakerSide.Sell) {
    _shiftPriceOnce();
    oneNotchDownStartPrice = curPrice;
  }

  while (
    (("count" in desired && allowedCount < desired.count) ||
      ("total" in desired && total.lte(desired.total.sub(curPrice)))) &&
    curPrice.gt(new BN(0))
  ) {
    total = total.add(curPrice);
    allowedCount++;
    _shiftPriceOnce();
  }

  return { total, allowedCount, oneNotchDownStartPrice };
};

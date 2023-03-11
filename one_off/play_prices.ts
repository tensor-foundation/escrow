import {
  castPoolConfig,
  computeTakerPrice,
  CurveType,
  PoolConfig,
  PoolType,
  TakerSide,
} from "../src";
import Big from "big.js";

const config: PoolConfig = {
  poolType: PoolType.Trade,
  mmCompoundFees: true,
  mmFeeBps: 500,
  delta: new Big(0),
  curveType: CurveType.Exponential,
  startingPrice: new Big(100),
};
const r = computeTakerPrice({
  config,
  takerSide: TakerSide.Sell,
  extraNFTsSelected: 1,
  maxTakerSellCount: 0,
  statsTakerSellCount: 0,
  statsTakerBuyCount: 0,
  takerBuyCount: 0,
  takerSellCount: 0,
  slippage: 0,
});
console.log("taker sells at", r?.toNumber());

const r2 = computeTakerPrice({
  config,
  takerSide: TakerSide.Buy,
  extraNFTsSelected: 1,
  maxTakerSellCount: 0,
  statsTakerSellCount: 0,
  statsTakerBuyCount: 0,
  takerBuyCount: 0,
  takerSellCount: 0,
  slippage: 0,
});
console.log("taker buys at", r2?.toNumber());

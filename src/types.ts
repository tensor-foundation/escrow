import Big from "big.js";

//the side of the trade that the trader is taking
export enum TakerSide {
  Buy = "Buy",
  Sell = "Sell",
}

export enum PoolType {
  NFT = "NFT",
  Token = "Token",
  Trade = "Trade",
}

export enum CurveType {
  Linear = "Linear",
  Exponential = "Exponential",
}

export type PoolConfig = {
  poolType: PoolType;
  curveType: CurveType;
  startingPrice: Big;
  delta: Big;
  honorRoyalties: boolean;
  mmFeeBps: number | null; // null for non-trade pools
};

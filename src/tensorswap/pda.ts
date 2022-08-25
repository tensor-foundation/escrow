import { PublicKey } from "@solana/web3.js";
import { TENSORSWAP_ADDR } from "./constants";
import { BN } from "@project-serum/anchor";

export const findPoolPDA = async ({
  program,
  tSwap,
  creator,
  whitelist,
  poolType,
  curveType,
  startingPrice,
  delta,
}: {
  program?: PublicKey;
  tSwap: PublicKey;
  creator: PublicKey;
  whitelist: PublicKey;
  poolType: number;
  curveType: number;
  startingPrice: BN;
  delta: BN;
}): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      tSwap.toBytes(),
      creator.toBytes(),
      whitelist.toBytes(),
      Buffer.from([poolType]),
      Buffer.from([curveType]),
      startingPrice.toBuffer("le", 8),
      delta.toBuffer("le", 8),
    ],
    program ?? TENSORSWAP_ADDR
  );
};

export const findSwapAuthPDA = async ({
  program,
  tSwap,
}: {
  program?: PublicKey;
  tSwap: PublicKey;
}) => {
  return PublicKey.findProgramAddress(
    [tSwap.toBytes()],
    program ?? TENSORSWAP_ADDR
  );
};

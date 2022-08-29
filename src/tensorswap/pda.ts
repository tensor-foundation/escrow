import { PublicKey } from "@solana/web3.js";
import { TENSORSWAP_ADDR } from "./constants";
import { BN } from "@project-serum/anchor";

export const findPoolPDA = async ({
  program,
  tswap,
  owner,
  whitelist,
  poolType,
  curveType,
  startingPrice,
  delta,
}: {
  program?: PublicKey;
  tswap: PublicKey;
  owner: PublicKey;
  whitelist: PublicKey;
  poolType: number;
  curveType: number;
  startingPrice: BN;
  delta: BN;
}): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      tswap.toBytes(),
      owner.toBytes(),
      whitelist.toBytes(),
      //u8s, hence 1 byte each
      new BN(poolType).toBuffer("le", 1),
      new BN(curveType).toBuffer("le", 1),
      //u64s, hence 8 bytes each
      startingPrice.toBuffer("le", 8),
      delta.toBuffer("le", 8),
    ],
    program ?? TENSORSWAP_ADDR
  );
};

export const findTSwapPDA = async ({ program }: { program?: PublicKey }) => {
  return PublicKey.findProgramAddress([], program ?? TENSORSWAP_ADDR);
};

export const findNftEscrowPDA = async ({
  program,
  nftMint,
}: {
  program?: PublicKey;
  nftMint: PublicKey;
}) => {
  return PublicKey.findProgramAddress(
    [Buffer.from("nft_escrow"), nftMint.toBytes()],
    program ?? TENSORSWAP_ADDR
  );
};

export const findNftDepositReceiptPDA = async ({
  program,
  nftMint,
}: {
  program?: PublicKey;
  nftMint: PublicKey;
}) => {
  return PublicKey.findProgramAddress(
    [Buffer.from("nft_receipt"), nftMint.toBytes()],
    program ?? TENSORSWAP_ADDR
  );
};

export const findSolEscrowPDA = async ({
  program,
  pool,
}: {
  program?: PublicKey;
  pool: PublicKey;
}) => {
  return PublicKey.findProgramAddress(
    [Buffer.from("sol_escrow"), pool.toBytes()],
    program ?? TENSORSWAP_ADDR
  );
};

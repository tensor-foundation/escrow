import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Coder, Program, Provider } from "@project-serum/anchor";
import { IDL, Tensorswap } from "./idl/tensorswap";
import { TENSORSWAP_ADDR } from "./constants";
import { findAuthPDA, findPoolPDA } from "./pda";
import { BN } from "@project-serum/anchor";

export const PoolType = {
  Token: { token: {} },
  NFT: { nft: {} },
  Trade: { trade: {} },
};
export const poolTypeU8 = (
  poolType: typeof PoolType[keyof typeof PoolType]
): number => {
  const order: Record<string, number> = {
    token: 0,
    nft: 1,
    trade: 2,
  };
  return order[Object.keys(poolType)[0]];
};

export const CurveType = {
  Linear: { linear: {} },
  Exponential: { exponential: {} },
};
export const curveTypeU8 = (
  curveType: typeof CurveType[keyof typeof CurveType]
): number => {
  const order: Record<string, number> = {
    linear: 0,
    exponential: 1,
  };
  return order[Object.keys(curveType)[0]];
};

export interface PoolConfig {
  poolType: typeof PoolType[keyof typeof PoolType];
  curveType: typeof CurveType[keyof typeof CurveType];
  startingPrice: BN;
  delta: BN;
  honorRoyalties: boolean;
  feeBps: number; //set to 0 if not present, for some reason setting to null causes anchor to crash
  feeVault: PublicKey | null;
}

//decided to NOT build the tx inside the sdk (too much coupling - should not care about blockhash)
export class TSwapSDK {
  program: Program<Tensorswap>;

  //can build ixs without provider, but need provider for
  constructor({
    idl = IDL,
    addr = TENSORSWAP_ADDR,
    provider,
    coder,
  }: {
    idl?: any; //todo better typing
    addr?: PublicKey;
    provider?: Provider;
    coder?: Coder;
  }) {
    this.program = new Program<Tensorswap>(idl, addr, provider, coder);
  }

  // --------------------------------------- fetchers

  async fetchTSwap(tswap: PublicKey) {
    return this.program.account.tSwap.fetch(tswap);
  }

  async fetchPool(pool: PublicKey) {
    return this.program.account.pool.fetch(pool);
  }

  // --------------------------------------- finders

  // --------------------------------------- tswap methods

  //main signature: owner
  async initTSwap(owner: PublicKey, tSwap?: Keypair) {
    const usedTSwap = tSwap ?? Keypair.generate();
    const extraSigners = [usedTSwap];

    const [authPda, authPdaBump] = await findAuthPDA({
      tSwap: usedTSwap.publicKey,
    });

    const ix = await this.program.methods
      .initTswap(authPdaBump)
      .accounts({
        tswap: usedTSwap.publicKey,
        authority: authPda,
        owner,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners },
      tSwap: usedTSwap,
      authPda,
      authPdaBump,
    };
  }

  // --------------------------------------- pool methods

  //main signature: creator
  async initPool(
    tSwap: PublicKey,
    creator: PublicKey,
    config: PoolConfig,
    rootHash: number[]
  ) {
    const [authPda, authPdaBump] = await findAuthPDA({
      tSwap,
    });

    const [poolPda, poolPdaBump] = await findPoolPDA({
      tSwap,
      creator,
      delta: config.delta,
      startingPrice: config.startingPrice,
      curveType: poolTypeU8(config.poolType),
      poolType: curveTypeU8(config.curveType),
      hash: rootHash,
    });

    const ix = await this.program.methods
      .initPool(authPdaBump, poolPdaBump, rootHash, config as any)
      .accounts({
        tswap: tSwap,
        pool: poolPda,
        authority: authPda,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners: [] },
      authPda,
      authPdaBump,
      poolPda,
      poolPdaBump,
    };
  }

  async addNft(
    tSwap: PublicKey,
    creator: PublicKey,
    config: PoolConfig,
    rootHash: number[],
    proof: Buffer[],
    nftMint: PublicKey
  ) {
    const [authPda, authPdaBump] = await findAuthPDA({
      tSwap,
    });

    const [poolPda, poolPdaBump] = await findPoolPDA({
      tSwap,
      creator,
      delta: config.delta,
      startingPrice: config.startingPrice,
      curveType: poolTypeU8(config.poolType),
      poolType: curveTypeU8(config.curveType),
      hash: rootHash,
    });

    const ix = await this.program.methods
      .addNft(authPdaBump, poolPdaBump, rootHash, config as any, proof)
      .accounts({
        tswap: tSwap,
        pool: poolPda,
        authority: authPda,
        creator,
        nftMint,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners: [] },
      authPda,
      authPdaBump,
      poolPda,
      poolPdaBump,
    };
  }
}

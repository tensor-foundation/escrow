import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Coder, Program, Provider } from "@project-serum/anchor";
import { IDL, Tensorswap } from "./idl/tensorswap";
import { TENSORSWAP_ADDR } from "./constants";
import {
  findSwapAuthPDA,
  findPoolPDA,
  findNftEscrowPDA,
  findNftDepositReceiptPDA,
} from "./pda";
import { BN } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { stringifyPKsAndBNs } from "../../tests/shared";

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
  mmFeeBps: number; //set to 0 if not present, for some reason setting to null causes anchor to crash
  mmFeeVault: PublicKey | null;
}

//decided to NOT build the tx inside the sdk (too much coupling - should not care about blockhash)
export class TensorSwapSDK {
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

  async fetchReceipt(receipt: PublicKey) {
    return this.program.account.nftDepositReceipt.fetch(receipt);
  }

  // --------------------------------------- finders

  // --------------------------------------- tswap methods

  //main signature: owner
  async initTSwap(owner: PublicKey, tSwap?: Keypair) {
    const usedTSwap = tSwap ?? Keypair.generate();
    const extraSigners = [usedTSwap];

    const [authPda, authPdaBump] = await findSwapAuthPDA({
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
    whitelist: PublicKey,
    config: PoolConfig
  ) {
    const [poolPda, poolPdaBump] = await findPoolPDA({
      tSwap,
      creator,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      curveType: poolTypeU8(config.poolType),
      poolType: curveTypeU8(config.curveType),
    });

    const ix = await this.program.methods
      .initPool(poolPdaBump, config as any)
      .accounts({
        tswap: tSwap,
        pool: poolPda,
        whitelist,
        creator,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners: [] },
      poolPda,
      poolPdaBump,
    };
  }

  // main signature: owner
  async depositNft(
    tSwap: PublicKey,
    whitelist: PublicKey,
    nftMint: PublicKey,
    nftSource: PublicKey,
    owner: PublicKey,
    config: PoolConfig,
    proof: Buffer[]
  ) {
    const [authPda, authPdaBump] = await findSwapAuthPDA({
      tSwap,
    });

    const [poolPda, poolPdaBump] = await findPoolPDA({
      tSwap,
      creator: owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      curveType: poolTypeU8(config.poolType),
      poolType: curveTypeU8(config.curveType),
    });

    const [escrowPda, escrowPdaBump] = await findNftEscrowPDA({ nftMint });
    const [receiptPda, receiptPdaBump] = await findNftDepositReceiptPDA({
      nftMint,
    });

    const ix = await this.program.methods
      .depositNft(authPdaBump, poolPdaBump, config as any, proof)
      .accounts({
        tswap: tSwap,
        pool: poolPda,
        authority: authPda,
        whitelist,
        nftMint,
        nftSource,
        nftEscrow: escrowPda,
        nftReceipt: receiptPda,
        owner,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners: [] },
      authPda,
      authPdaBump,
      poolPda,
      poolPdaBump,
      escrowPda,
      escrowPdaBump,
      receiptPda,
      receiptPdaBump,
    };
  }

  //main signature: buyer
  async buyNft(
    tSwap: PublicKey,
    whitelist: PublicKey,
    nftMint: PublicKey,
    nftBuyerAcc: PublicKey,
    seller: PublicKey,
    buyer: PublicKey,
    config: PoolConfig,
    proof: Buffer[]
  ) {
    const [authPda, authPdaBump] = await findSwapAuthPDA({
      tSwap,
    });

    const [poolPda, poolPdaBump] = await findPoolPDA({
      tSwap,
      creator: seller,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      curveType: poolTypeU8(config.poolType),
      poolType: curveTypeU8(config.curveType),
    });

    const [escrowPda, escrowPdaBump] = await findNftEscrowPDA({ nftMint });
    const [receiptPda, receiptPdaBump] = await findNftDepositReceiptPDA({
      nftMint,
    });

    const tSwapAcc = await this.fetchTSwap(tSwap);

    console.log(
      stringifyPKsAndBNs({
        tswap: tSwap,
        pool: poolPda,
        authority: authPda,
        whitelist,
        nftMint,
        nftBuyerAcc,
        nftEscrow: escrowPda,
        nftReceipt: receiptPda,
        seller,
        buyer,
        feeVault: tSwapAcc.feeVault,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
    );

    const ix = await this.program.methods
      .buyNft(
        authPdaBump,
        poolPdaBump,
        receiptPdaBump,
        escrowPdaBump,
        config as any,
        proof
      )
      .accounts({
        tswap: tSwap,
        pool: poolPda,
        authority: authPda,
        whitelist,
        nftMint,
        nftBuyerAcc,
        nftEscrow: escrowPda,
        nftReceipt: receiptPda,
        seller,
        buyer,
        feeVault: tSwapAcc.feeVault,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return {
      tx: { ixs: [ix], extraSigners: [] },
      authPda,
      authPdaBump,
      poolPda,
      poolPdaBump,
      escrowPda,
      escrowPdaBump,
      receiptPda,
      receiptPdaBump,
    };
  }
}

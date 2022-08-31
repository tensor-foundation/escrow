import {
  Commitment,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { AnchorProvider, BN, Coder, Program } from "@project-serum/anchor";
import { IDL, Tensorswap } from "./idl/tensorswap";
import { TENSORSWAP_ADDR } from "./constants";
import {
  findNftDepositReceiptPDA,
  findNftEscrowPDA,
  findPoolPDA,
  findSolEscrowPDA,
  findTSwapPDA,
} from "./pda";
import {
  getMinimumBalanceForRentExemptAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  getAccountRent,
  hexCode,
  stringifyPKsAndBNs,
  TEST_PROVIDER,
} from "../../tests/shared";

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
}

export interface TSwapConfig {
  feeBps: number;
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
    provider?: AnchorProvider;
    coder?: Coder;
  }) {
    this.program = new Program<Tensorswap>(idl, addr, provider, coder);
  }

  // --------------------------------------- fetchers

  async fetchTSwap(tswap: PublicKey, commitment?: Commitment) {
    return this.program.account.tSwap.fetch(tswap, commitment);
  }

  async fetchPool(pool: PublicKey, commitment?: Commitment) {
    return this.program.account.pool.fetch(pool, commitment);
  }

  async fetchReceipt(receipt: PublicKey, commitment?: Commitment) {
    return this.program.account.nftDepositReceipt.fetch(receipt, commitment);
  }

  async fetchSolEscrow(escrow: PublicKey, commitment?: Commitment) {
    return this.program.account.solEscrow.fetch(escrow, commitment);
  }

  // --------------------------------------- finders

  // --------------------------------------- tswap methods

  //main signature: owner
  async initTSwap(owner: PublicKey) {
    const [tswapPda] = await findTSwapPDA({});

    const builder = this.program.methods.initTswap().accounts({
      tswap: tswapPda,
      owner,
      systemProgram: SystemProgram.programId,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()] },
      tswapPda,
    };
  }

  // --------------------------------------- pool methods

  //main signature: owner
  async initPool({
    owner,
    whitelist,
    config,
  }: {
    owner: PublicKey;
    whitelist: PublicKey;
    config: PoolConfig;
  }) {
    const [tswapPda] = await findTSwapPDA({});
    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });
    const [solEscrowPda] = await findSolEscrowPDA({ pool: poolPda });

    const builder = this.program.methods.initPool(config as any).accounts({
      tswap: tswapPda,
      pool: poolPda,
      solEscrow: solEscrowPda,
      whitelist,
      owner,
      systemProgram: SystemProgram.programId,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      solEscrowPda,
    };
  }

  //main signature: owner
  async closePool({
    owner,
    whitelist,
    config,
  }: {
    owner: PublicKey;
    whitelist: PublicKey;
    config: PoolConfig;
  }) {
    const [tswapPda] = await findTSwapPDA({});
    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });
    const [solEscrowPda] = await findSolEscrowPDA({ pool: poolPda });

    const builder = this.program.methods.closePool(config as any).accounts({
      tswap: tswapPda,
      pool: poolPda,
      solEscrow: solEscrowPda,
      whitelist,
      owner,
      systemProgram: SystemProgram.programId,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      solEscrowPda,
      tswapPda,
    };
  }

  // --------------------------------------- deposit/withdraw methods

  // main signature: owner
  async depositNft({
    whitelist,
    nftMint,
    nftSource,
    owner,
    config,
    proof,
  }: {
    whitelist: PublicKey;
    nftMint: PublicKey;
    nftSource: PublicKey;
    owner: PublicKey;
    config: PoolConfig;
    proof: Buffer[];
  }) {
    const [tswapPda] = await findTSwapPDA({});
    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda] = await findNftEscrowPDA({ nftMint });
    const [receiptPda] = await findNftDepositReceiptPDA({
      nftMint,
    });

    const builder = this.program.methods
      .depositNft(config as any, proof)
      .accounts({
        tswap: tswapPda,
        pool: poolPda,
        whitelist,
        nftMint,
        nftSource,
        nftEscrow: escrowPda,
        nftReceipt: receiptPda,
        owner,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      escrowPda,
      receiptPda,
    };
  }

  // main signature: owner
  async depositSol({
    whitelist,
    owner,
    config,
    lamports,
  }: {
    whitelist: PublicKey;
    owner: PublicKey;
    config: PoolConfig;
    lamports: BN;
  }) {
    const [tswapPda] = await findTSwapPDA({});
    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [solEscrowPda] = await findSolEscrowPDA({ pool: poolPda });

    const builder = this.program.methods
      .depositSol(config as any, lamports)
      .accounts({
        tswap: tswapPda,
        pool: poolPda,
        whitelist,
        solEscrow: solEscrowPda,
        owner,
        systemProgram: SystemProgram.programId,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      solEscrowPda,
    };
  }

  // main signature: owner
  async withdrawNft({
    whitelist,
    nftMint,
    nftDest,
    owner,
    config,
  }: {
    whitelist: PublicKey;
    nftMint: PublicKey;
    nftDest: PublicKey;
    owner: PublicKey;
    config: PoolConfig;
  }) {
    const [tswapPda] = await findTSwapPDA({});
    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda] = await findNftEscrowPDA({ nftMint });
    const [receiptPda] = await findNftDepositReceiptPDA({
      nftMint,
    });

    const builder = this.program.methods.withdrawNft(config as any).accounts({
      tswap: tswapPda,
      pool: poolPda,
      whitelist,
      nftMint,
      nftDest,
      nftEscrow: escrowPda,
      nftReceipt: receiptPda,
      owner,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      escrowPda,
      receiptPda,
    };
  }

  // main signature: owner
  async withdrawSol({
    whitelist,
    owner,
    config,
    lamports,
  }: {
    whitelist: PublicKey;
    owner: PublicKey;
    config: PoolConfig;
    lamports: BN;
  }) {
    const [tswapPda] = await findTSwapPDA({});
    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [solEscrowPda] = await findSolEscrowPDA({ pool: poolPda });

    const builder = this.program.methods
      .withdrawSol(config as any, lamports)
      .accounts({
        tswap: tswapPda,
        pool: poolPda,
        whitelist,
        solEscrow: solEscrowPda,
        owner,
        systemProgram: SystemProgram.programId,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      solEscrowPda,
    };
  }

  // --------------------------------------- trade (buy/sell) methods

  //main signature: buyer
  async buyNft({
    whitelist,
    nftMint,
    nftBuyerAcc,
    owner,
    buyer,
    config,
    proof,
    maxPrice,
  }: {
    whitelist: PublicKey;
    nftMint: PublicKey;
    nftBuyerAcc: PublicKey;
    owner: PublicKey;
    buyer: PublicKey;
    config: PoolConfig;
    proof: Buffer[];
    maxPrice: BN;
  }) {
    const [tswapPda] = await findTSwapPDA({});

    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda] = await findNftEscrowPDA({ nftMint });
    const [solEscrowPda] = await findSolEscrowPDA({ pool: poolPda });
    const [receiptPda] = await findNftDepositReceiptPDA({
      nftMint,
    });

    const tSwapAcc = await this.fetchTSwap(tswapPda);

    const builder = this.program.methods
      .buyNft(config as any, proof, maxPrice)
      .accounts({
        tswap: tswapPda,
        feeVault: tSwapAcc.feeVault,
        pool: poolPda,
        whitelist,
        nftMint,
        nftBuyerAcc,
        nftEscrow: escrowPda,
        nftReceipt: receiptPda,
        solEscrow: solEscrowPda,
        owner,
        buyer,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      escrowPda,
      solEscrowPda,
      receiptPda,
    };
  }

  //main signature: seller
  async sellNft({
    whitelist,
    nftMint,
    nftSellerAcc,
    owner,
    seller,
    config,
    proof,
    minPrice,
  }: {
    whitelist: PublicKey;
    nftMint: PublicKey;
    nftSellerAcc: PublicKey;
    owner: PublicKey;
    seller: PublicKey;
    config: PoolConfig;
    proof: Buffer[];
    minPrice: BN;
  }) {
    const [tswapPda] = await findTSwapPDA({});

    const [poolPda] = await findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda] = await findNftEscrowPDA({ nftMint });
    const [solEscrowPda] = await findSolEscrowPDA({ pool: poolPda });
    const [receiptPda] = await findNftDepositReceiptPDA({
      nftMint,
    });

    const tSwapAcc = await this.fetchTSwap(tswapPda);

    const builder = this.program.methods
      .sellNft(config as any, proof, minPrice)
      .accounts({
        tswap: tswapPda,
        feeVault: tSwapAcc.feeVault,
        pool: poolPda,
        whitelist,
        nftMint,
        nftSellerAcc,
        nftEscrow: escrowPda,
        nftReceipt: receiptPda,
        solEscrow: solEscrowPda,
        owner,
        seller,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      poolPda,
      escrowPda,
      solEscrowPda,
      receiptPda,
    };
  }

  // --------------------------------------- helper methods

  async getSolEscrowRent() {
    return await getAccountRent(this.program.account.solEscrow);
  }

  async getNftDepositReceiptRent() {
    return await getAccountRent(this.program.account.nftDepositReceipt);
  }

  async getNftEscrowRent() {
    return await getMinimumBalanceForRentExemptAccount(
      TEST_PROVIDER.connection
    );
  }

  getError(
    name: typeof IDL["errors"][number]["name"]
  ): typeof IDL["errors"][number] {
    return this.program.idl.errors.find((e) => e.name === name)!;
  }

  getErrorCodeHex(name: typeof IDL["errors"][number]["name"]): string {
    return hexCode(this.getError(name).code);
  }
}

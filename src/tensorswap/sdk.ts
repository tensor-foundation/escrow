import {
  Commitment,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { AnchorProvider, BN, Coder, Program } from "@project-serum/anchor";
import { IDL, Tensorswap } from "./idl/tensorswap";
import { TENSORSWAP_ADDR, TSWAP_FEE_ACC } from "./constants";
import {
  findNftDepositReceiptPDA,
  findNftEscrowPDA,
  findPoolPDA,
  findSolEscrowPDA,
  findTSwapPDA,
} from "./pda";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAccountRent, hexCode } from "../common";
import { TEST_PROVIDER } from "../../tests/shared";

export const PoolTypeAnchor = {
  Token: { token: {} },
  NFT: { nft: {} },
  Trade: { trade: {} },
};

export const poolTypeU8 = (
  poolType: typeof PoolTypeAnchor[keyof typeof PoolTypeAnchor]
): number => {
  const order: Record<string, number> = {
    token: 0,
    nft: 1,
    trade: 2,
  };
  return order[Object.keys(poolType)[0]];
};

export const CurveTypeAnchor = {
  Linear: { linear: {} },
  Exponential: { exponential: {} },
};
export const curveTypeU8 = (
  curveType: typeof CurveTypeAnchor[keyof typeof CurveTypeAnchor]
): number => {
  const order: Record<string, number> = {
    linear: 0,
    exponential: 1,
  };
  return order[Object.keys(curveType)[0]];
};

export interface PoolConfigAnchor {
  poolType: typeof PoolTypeAnchor[keyof typeof PoolTypeAnchor];
  curveType: typeof CurveTypeAnchor[keyof typeof CurveTypeAnchor];
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
  async initUpdateTSwap(owner: PublicKey, feeVault: PublicKey = TSWAP_FEE_ACC) {
    const [tswapPda, tswapBump] = findTSwapPDA({});

    const builder = this.program.methods.initUpdateTswap().accounts({
      tswap: tswapPda,
      owner,
      feeVault,
      systemProgram: SystemProgram.programId,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()] },
      tswapPda,
      tswapBump,
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
    config: PoolConfigAnchor;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });
    const [solEscrowPda, solEscrowBump] = findSolEscrowPDA({ pool: poolPda });

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
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      solEscrowPda,
      solEscrowBump,
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
    config: PoolConfigAnchor;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });
    const [solEscrowPda, solEscrowBump] = findSolEscrowPDA({ pool: poolPda });

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
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      solEscrowPda,
      solEscrowBump,
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
    config: PoolConfigAnchor;
    proof: Buffer[];
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda, escrowBump] = findNftEscrowPDA({ nftMint });
    const [receiptPda, receiptBump] = findNftDepositReceiptPDA({
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
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      escrowPda,
      escrowBump,
      receiptPda,
      receiptBump,
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
    config: PoolConfigAnchor;
    lamports: BN;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [solEscrowPda, solEscrowBump] = findSolEscrowPDA({ pool: poolPda });

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
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      solEscrowPda,
      solEscrowBump,
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
    config: PoolConfigAnchor;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda, escrowBump] = findNftEscrowPDA({ nftMint });
    const [receiptPda, receiptBump] = findNftDepositReceiptPDA({
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
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      escrowPda,
      escrowBump,
      receiptPda,
      receiptBump,
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
    config: PoolConfigAnchor;
    lamports: BN;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [solEscrowPda, solEscrowBump] = findSolEscrowPDA({ pool: poolPda });

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
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      solEscrowPda,
      solEscrowBump,
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
    config: PoolConfigAnchor;
    proof: Buffer[];
    maxPrice: BN;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });

    const [escrowPda, escrowBump] = findNftEscrowPDA({ nftMint });
    const [solEscrowPda, solEscrowBump] = findSolEscrowPDA({ pool: poolPda });
    const [receiptPda, receiptBump] = findNftDepositReceiptPDA({
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
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      escrowPda,
      escrowBump,
      solEscrowPda,
      solEscrowBump,
      receiptPda,
      receiptBump,
    };
  }

  //main signature: seller
  async sellNft({
    type,
    whitelist,
    nftMint,
    nftSellerAcc,
    owner,
    seller,
    config,
    proof,
    minPrice,
  }: {
    type: "trade" | "token";
    whitelist: PublicKey;
    nftMint: PublicKey;
    nftSellerAcc: PublicKey;
    owner: PublicKey;
    seller: PublicKey;
    config: PoolConfigAnchor;
    proof: Buffer[];
    minPrice: BN;
  }) {
    const [tswapPda, tswapBump] = findTSwapPDA({});
    const [poolPda, poolBump] = findPoolPDA({
      tswap: tswapPda,
      owner,
      whitelist,
      delta: config.delta,
      startingPrice: config.startingPrice,
      poolType: poolTypeU8(config.poolType),
      curveType: curveTypeU8(config.curveType),
    });
    const [solEscrowPda, solEscrowBump] = findSolEscrowPDA({ pool: poolPda });
    const ownerAtaAcc = await getAssociatedTokenAddress(nftMint, owner);
    const [escrowPda, escrowBump] = findNftEscrowPDA({ nftMint });
    const [receiptPda, receiptBump] = findNftDepositReceiptPDA({ nftMint });
    const tSwapAcc = await this.fetchTSwap(tswapPda);
    const shared = {
      tswap: tswapPda,
      feeVault: tSwapAcc.feeVault,
      pool: poolPda,
      whitelist,
      nftMint,
      nftSellerAcc,
      solEscrow: solEscrowPda,
      owner,
      seller,
      cosigner: TEST_PROVIDER.publicKey,
    };

    const { method, accounts } =
      type === "trade"
        ? {
            method: this.program.methods.sellNftTradePool,
            accounts: {
              nftEscrow: escrowPda,
              nftReceipt: receiptPda,
            },
          }
        : {
            method: this.program.methods.sellNftTokenPool,
            accounts: {
              ownerAtaAcc,
              associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            },
          };

    const builder = method(config as any, proof, minPrice).accounts({
      shared,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      ...accounts,
    });

    return {
      builder,
      tx: { ixs: [await builder.instruction()], extraSigners: [] },
      tswapPda,
      tswapBump,
      poolPda,
      poolBump,
      solEscrowPda,
      solEscrowBump,
      ownerAtaAcc,
      escrowPda,
      escrowBump,
      receiptPda,
      receiptBump,
    };
  }

  // --------------------------------------- helper methods

  async getSolEscrowRent() {
    return await getAccountRent(
      this.program.provider.connection,
      this.program.account.solEscrow
    );
  }

  async getNftDepositReceiptRent() {
    return await getAccountRent(
      this.program.provider.connection,
      this.program.account.nftDepositReceipt
    );
  }

  async getTokenAcctRent() {
    return await getMinimumBalanceForRentExemptAccount(
      this.program.provider.connection
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

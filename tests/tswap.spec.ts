import * as anchor from "@project-serum/anchor";
import { CurveType, PoolConfig, PoolType, TSwapSDK } from "../src";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import { buildTx } from "@tensor-hq/tensor-common/dist/solana_contrib";
import BN from "bn.js";
import { expect } from "chai";

const provider = anchor.AnchorProvider.env();
const sdk = new TSwapSDK({ provider });

const buildAndSendTx = async (
  ixs: TransactionInstruction[],
  extraSigners: Signer[]
): Promise<string> => {
  const { tx } = await buildTx({
    connections: [provider.connection],
    instructions: ixs,
    additionalSigners: extraSigners,
    feePayer: provider.publicKey,
  });
  await provider.wallet.signTransaction(tx);
  return await provider.connection.sendRawTransaction(tx.serialize());
};

describe("tensorswap", () => {
  const tSwap = Keypair.generate();
  let pool: PublicKey;
  const creator = Keypair.generate();

  beforeEach("configure accs", async () => {
    await provider.connection.requestAirdrop(
      creator.publicKey,
      LAMPORTS_PER_SOL
    );

    //tSwap
    const {
      tx: { ixs, extraSigners },
    } = await sdk.initTSwap(provider.publicKey, tSwap);
    await buildAndSendTx(ixs, extraSigners);
    await waitMS(2000);

    //poool
    const rootHash = Array(32).fill(0);
    const poolConfig: PoolConfig = {
      poolType: PoolType.NFT,
      curveType: CurveType.Exponential,
      startingPrice: new BN(1),
      delta: new BN(1),
      honorRoyalties: true,
      feeBps: 0,
      feeVault: null,
    };
    const {
      tx: { ixs: poolIxs },
      poolPda,
    } = await sdk.initPool(
      tSwap.publicKey,
      creator.publicKey,
      poolConfig,
      rootHash
    );
    pool = poolPda;
    await buildAndSendTx(poolIxs, [creator]);
    await waitMS(2000);
  });

  it("inits tswap/pool", async () => {
    const swapAcc = await sdk.fetchTSwap(tSwap.publicKey);
    expect(swapAcc).to.be.not.null;
    expect(swapAcc.owner.toBase58()).to.be.eq(provider.publicKey.toBase58());

    const poolAcc = await sdk.fetchPool(pool);
    expect(poolAcc).to.be.not.null;
    expect(poolAcc.creator.toBase58()).to.eq(creator.publicKey.toBase58());
  });
});

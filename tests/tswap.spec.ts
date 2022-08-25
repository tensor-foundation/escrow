import * as anchor from "@project-serum/anchor";
import {
  CurveType,
  PoolConfig,
  PoolType,
  TensorSwapSDK,
  TensorWhitelistSDK,
} from "../src";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import BN from "bn.js";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { buildAndSendTx, generateTreeOfSize } from "./shared";

chai.use(chaiAsPromised);

const provider = anchor.AnchorProvider.env();
const sdk = new TensorSwapSDK({ provider });
const wlSdk = new TensorWhitelistSDK({ provider });

describe.only("tensorswap", () => {
  const whitelistedMint = new PublicKey(
    "27f3pdgwC9sCR7RUxZxxaE57cACCcoJGb6Nu4fhEiKh6"
  );
  const NOTwhitelistedMint = new PublicKey(
    "EQohfmuH9FVKGwgn2JR9bcV2MEeCogmMMeRpxaosGGcW"
  );
  const poolConfig: PoolConfig = {
    poolType: PoolType.NFT,
    curveType: CurveType.Exponential,
    startingPrice: new BN(1),
    delta: new BN(1),
    honorRoyalties: true,
    feeBps: 0,
    feeVault: null,
  };
  const { tree, root, proof } = generateTreeOfSize(100, whitelistedMint);

  let tSwap: Keypair;
  let pool: PublicKey;
  let creator: Keypair;
  let whitelist: PublicKey;

  beforeEach("configure accs", async () => {
    tSwap = Keypair.generate();
    creator = Keypair.generate();
    await provider.connection.requestAirdrop(
      creator.publicKey,
      LAMPORTS_PER_SOL
    );

    //init wl authority
    const {
      tx: { ixs: wlAuthIxs },
    } = await wlSdk.initUpdateAuthority(provider.publicKey, provider.publicKey);
    await buildAndSendTx(provider, wlAuthIxs);
    await waitMS(2000);

    //init wl pda
    const uuid = "0001c1a567594e34aeebccf4b49e73f8";
    const name = "hello_world";
    const {
      tx: { ixs: wlIxs },
      whitelistPda,
    } = await wlSdk.initUpdateWhitelist(
      provider.publicKey,
      Buffer.from(uuid).toJSON().data,
      root,
      Buffer.from(name.padEnd(32, "\0")).toJSON().data
    );
    whitelist = whitelistPda;
    await buildAndSendTx(provider, wlIxs);

    //tSwap
    const {
      tx: { ixs, extraSigners },
    } = await sdk.initTSwap(provider.publicKey, tSwap);
    await buildAndSendTx(provider, ixs, extraSigners);
    await waitMS(2000);

    //pool
    const {
      tx: { ixs: poolIxs },
      poolPda,
    } = await sdk.initPool(
      tSwap.publicKey,
      creator.publicKey,
      whitelist,
      poolConfig
    );
    pool = poolPda;
    await buildAndSendTx(provider, poolIxs, [creator]);
    await waitMS(2000);
  });

  it("happy path", async () => {
    //swap
    const swapAcc = await sdk.fetchTSwap(tSwap.publicKey);
    expect(swapAcc).to.be.not.null;
    expect(swapAcc.owner.toBase58()).to.be.eq(provider.publicKey.toBase58());

    //pool
    const poolAcc = await sdk.fetchPool(pool);
    expect(poolAcc).to.be.not.null;
    expect(poolAcc.creator.toBase58()).to.eq(creator.publicKey.toBase58());

    //nft
    const {
      tx: { ixs: goodIxs },
    } = await sdk.addNft(
      tSwap.publicKey,
      creator.publicKey,
      whitelist,
      poolConfig,
      proof,
      whitelistedMint
    );
    await buildAndSendTx(provider, goodIxs);

    const {
      tx: { ixs: badIxs },
    } = await sdk.addNft(
      tSwap.publicKey,
      creator.publicKey,
      whitelist,
      poolConfig,
      proof,
      NOTwhitelistedMint //<-- (!)
    );

    await expect(buildAndSendTx(provider, badIxs)).to.be.rejectedWith("0x1770");
  });
});

/*
Instructions:

At the top level (ie tensorswap/), run:

0. `yarn build:test`
1. `solana config set --url localhost`
2. `solana-test-validator`
3. `anchor deploy --provider.cluster localnet`, note down program IDs (also `anchor keys list`)
4. Modify program IDs in `lib.rs` `declare_id!`s and `Anchor.toml` for both programs
5. 
6. 
    ```
    ANCHOR_WALLET=~/.config/solana/id.json \
    TENSORSWAP_ADDR=<tswap program id> \
    TWHITELIST_ADDR=<twhitelist program id> \
    TSWAP_FEE_ACC=$(solana address) \
        yarn ts-node localnet/setup_data.ts`
*/
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { readFileSync } from "fs";
import {
  CurveTypeAnchor,
  findWhitelistPDA,
  PoolTypeAnchor,
  PoolConfigAnchor,
  TensorWhitelistSDK,
} from "../src";
import {
  buildAndSendTx,
  getLamports,
  swapSdk,
  TEST_PROVIDER,
  wlSdk,
} from "../tests/shared";
import { createAndFundATA } from "../tests/tswap/common";

const _readKP = (file: string) =>
  Keypair.fromSeed(
    Uint8Array.from(JSON.parse(readFileSync(file).toString())).slice(0, 32)
  );

const traderA = _readKP("localnet/keypairs/traderA.json");
const traderB = _readKP("localnet/keypairs/traderB.json");
const traders = [traderA, traderB];
console.log(
  "traders",
  traders.map((t) => t.publicKey.toBase58())
);

const BASE_CONFIG: PoolConfigAnchor = {
  poolType: PoolTypeAnchor.NFT,
  curveType: CurveTypeAnchor.Linear,
  startingPrice: new BN(5 * LAMPORTS_PER_SOL),
  delta: new BN(0.25 * LAMPORTS_PER_SOL),
  honorRoyalties: false,
  mmFeeBps: null,
};

const mockMints = Array(5)
  .fill(null)
  .map((_, idx) => _readKP(`localnet/keypairs/mints/${idx}.json`));
console.log(
  "mints",
  mockMints.map((m) => m.publicKey.toBase58())
);
const mockColl1 = {
  mints: mockMints.slice(0, 2),
  uuid: "f8ce11a8-1696-4cc6-bdb5-13236b86e4c3",
  name: "mock_coll1",
};
const mockColl2 = {
  mints: mockMints.slice(2, 5),
  uuid: "1d62ea74-0656-4980-9346-e39908531bdb",
  name: "mock_coll2",
};
const coll1Tree = TensorWhitelistSDK.createTreeForMints(
  mockColl1.mints.map((m) => m.publicKey)
);
const coll2Tree = TensorWhitelistSDK.createTreeForMints(
  mockColl2.mints.map((m) => m.publicKey)
);

const _getProof = (mint: PublicKey) => {
  const coll1Res = coll1Tree.proofs.find((p) => p.mint.equals(mint));
  if (coll1Res) return coll1Res;

  return coll2Tree.proofs.find((p) => p.mint.equals(mint))!;
};

const traderMints = [
  {
    trader: traderA,
    mints: [...mockColl1.mints.slice(0, 1), ...mockColl2.mints.slice(2)],
  },
  {
    trader: traderB,
    mints: [...mockColl1.mints.slice(1), ...mockColl2.mints.slice(0, 2)],
  },
];

const mockConfigs: (PoolConfigAnchor & {
  coll: typeof mockColl1;
  trader: Keypair;
  depMints?: Keypair[];
  depSol?: number;
})[] = [
  // 1 NFT pool.
  {
    ...BASE_CONFIG,
    coll: mockColl1,
    trader: traderA,
    depMints: mockColl1.mints.slice(0, 1),
  },
  // Funded Token Pool.
  {
    ...BASE_CONFIG,
    poolType: PoolTypeAnchor.Token,
    coll: mockColl2,
    trader: traderA,
    startingPrice: new BN(12.5 * LAMPORTS_PER_SOL),
    depSol: 50 * LAMPORTS_PER_SOL,
  },
  //  Only SOL trade pool.
  {
    ...BASE_CONFIG,
    poolType: PoolTypeAnchor.Trade,
    mmFeeBps: 269,
    coll: mockColl1,
    trader: traderB,
    depSol: 20 * LAMPORTS_PER_SOL,
  },
  // 2 NFT pool.
  {
    ...BASE_CONFIG,
    curveType: CurveTypeAnchor.Exponential,
    delta: new BN(100),
    coll: mockColl2,
    trader: traderB,
    depMints: mockColl2.mints.slice(0, 2),
  },
  // Unfunded Token Pool.
  {
    ...BASE_CONFIG,
    poolType: PoolTypeAnchor.Token,
    curveType: CurveTypeAnchor.Exponential,
    delta: new BN(250),
    coll: mockColl1,
    trader: traderB,
  },
  // Only SOL trade pool
  {
    ...BASE_CONFIG,
    poolType: PoolTypeAnchor.Trade,
    curveType: CurveTypeAnchor.Exponential,
    delta: new BN(125),
    mmFeeBps: 0,
    coll: mockColl2,
    trader: traderA,
    depSol: 1337 * LAMPORTS_PER_SOL,
  },
];

const idempotentTxs = async () => {
  // Init WL + TSwap authorities.
  {
    const {
      tx: { ixs },
    } = await wlSdk.initUpdateAuthority(
      TEST_PROVIDER.publicKey,
      TEST_PROVIDER.publicKey
    );
    await buildAndSendTx({ ixs });
  }

  {
    const {
      tx: { ixs },
    } = await swapSdk.initUpdateTSwap({
      owner: TEST_PROVIDER.publicKey,
    });
    await buildAndSendTx({ ixs });
  }

  // Init whitelists.

  await Promise.all(
    [
      { ...mockColl1, tree: coll1Tree },
      { ...mockColl2, tree: coll2Tree },
    ].map(async ({ tree, uuid, name }) => {
      const {
        tx: { ixs },
      } = await wlSdk.initUpdateWhitelist({
        owner: TEST_PROVIDER.publicKey,
        uuid: TensorWhitelistSDK.uuidToBuffer(uuid),
        rootHash: tree.root,
        name: TensorWhitelistSDK.nameToBuffer(name),
      });
      await buildAndSendTx({ ixs });
    })
  );
};

const initWalletMints = async () => {
  const lamports = 10_000 * LAMPORTS_PER_SOL;
  await Promise.all(
    traders.map(async (trader) => {
      if ((await getLamports(trader.publicKey))! > 0.5 * lamports) return;
      console.log(`funding trader ${trader.publicKey.toBase58()}`);
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: TEST_PROVIDER.publicKey,
          toPubkey: trader.publicKey,
          lamports,
        })
      );
      await buildAndSendTx({ ixs: tx.instructions });
    })
  );

  await Promise.all(
    traderMints.map(async ({ trader, mints }) => {
      await Promise.all(
        mints.map(async (mint) => {
          // Create mint + ATA for trader.
          try {
            const ata = await getAssociatedTokenAddress(
              mint.publicKey,
              trader.publicKey
            );
            await getAccount(TEST_PROVIDER.connection, ata);
          } catch (err) {
            if (!(err instanceof TokenAccountNotFoundError)) throw err;

            console.log(
              `creating ata for trader ${trader.publicKey.toBase58()} mint ${mint.publicKey.toBase58()}`
            );
            await createAndFundATA(trader, mint);
          }

          //   Create ATA for other traders.
          await Promise.all(
            traders.map(async (other) => {
              if (other === trader) return;
              await getOrCreateAssociatedTokenAccount(
                TEST_PROVIDER.connection,
                other,
                mint.publicKey,
                other.publicKey
              );
            })
          );
        })
      );
    })
  );
};

const oneTimeTxs = async () => {
  mockConfigs.map(async (config) => {
    const { coll, trader, depMints, depSol, ...poolConfig } = config;
    const [whitelist] = findWhitelistPDA({
      uuid: TensorWhitelistSDK.uuidToBuffer(coll.uuid),
    });

    // Create pool.
    const {
      tx: { ixs },
    } = await swapSdk.initPool({
      owner: trader.publicKey,
      whitelist,
      config: poolConfig,
    });
    await buildAndSendTx({ ixs, extraSigners: [trader] });

    // Deposit mints.
    await Promise.all(
      (depMints ?? []).map(async (mint) => {
        const ata = await getAssociatedTokenAddress(
          mint.publicKey,
          trader.publicKey
        );

        const {
          tx: { ixs },
        } = await swapSdk.depositNft({
          whitelist,
          nftMint: mint.publicKey,
          nftSource: ata,
          owner: trader.publicKey,
          config: poolConfig,
          proof: _getProof(mint.publicKey).proof,
        });
        await buildAndSendTx({ ixs, extraSigners: [trader] });
      })
    );

    // Deposit SOL.
    if (depSol) {
      const {
        tx: { ixs },
      } = await swapSdk.depositSol({
        whitelist,
        owner: trader.publicKey,
        config: poolConfig,
        lamports: new BN(depSol),
      });
      await buildAndSendTx({ ixs, extraSigners: [trader] });
    }
  });
};

const _randomChoice = <T>(choices: T[]) => {
  const idx = Math.floor(Math.random() * choices.length);
  return choices[idx];
};

const _genRandomPoolConfig = () => {
  const curveType = _randomChoice([
    CurveTypeAnchor.Exponential,
    CurveTypeAnchor.Linear,
  ]);
  const poolType = _randomChoice([
    PoolTypeAnchor.NFT,
    PoolTypeAnchor.Token,
    PoolTypeAnchor.Trade,
  ]);
  return {
    ...BASE_CONFIG,
    poolType,
    curveType,
    startingPrice: new BN(Math.round(Math.random() * 100 * LAMPORTS_PER_SOL)),
    delta:
      curveType === CurveTypeAnchor.Exponential
        ? new BN(Math.round(Math.random() * 9999))
        : new BN(Math.round(Math.random() * 5 * LAMPORTS_PER_SOL)),
    mmFeeBps:
      poolType === PoolTypeAnchor.Trade
        ? Math.round(Math.random() * 2500)
        : null,
  };
};

const generateRandomPools = async (n: number) => {
  await Promise.all(
    Array(n)
      .fill(null)
      .map(async () => {
        const [whitelist] = findWhitelistPDA({
          uuid: TensorWhitelistSDK.uuidToBuffer(
            _randomChoice([mockColl1, mockColl2]).uuid
          ),
        });
        const trader = _randomChoice(traders);
        const {
          tx: { ixs },
        } = await swapSdk.initPool({
          owner: trader.publicKey,
          whitelist,
          config: _genRandomPoolConfig(),
        });
        await buildAndSendTx({ ixs, extraSigners: [trader] });
      })
  );
  console.log(`created ${n} random pools`);
};

(async () => {
  console.log("begin idempt...");
  await idempotentTxs();
  console.log("done idempt, begin init wallet/mints...");
  await initWalletMints();
  console.log("done init wallet/mints, begin one time txs...");

  //   await oneTimeTxs();
  //   console.log("done one time txs");
  console.log("gen random pools...");
  await generateRandomPools(1000);
  console.log("done gen random pools");
})();

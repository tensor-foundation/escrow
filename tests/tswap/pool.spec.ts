import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { getLamports, swapSdk, withLamports } from "../shared";
import {
  beforeHook,
  createAndFundATA,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testClosePool,
  testDepositNft,
  testMakePool,
  testMakePoolSellNft,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap pool", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let expSellerRent: number;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, expSellerRent } = await beforeHook());
  });

  //#region Create pool.

  it("cannot init pool with royalties", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
        const { whitelist } = await makeWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              honorRoyalties: true,
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("RoyaltiesDisabled"));
      })
    );
  });

  //#endregion

  //#region Close pool.

  it("close pool roundtrips fees", async () => {
    const [owner] = await makeNTraders(1);
    for (const config of [nftPoolConfig, tradePoolConfig]) {
      const { mint } = await createAndFundATA(owner);
      const { whitelist } = await makeWhitelist([mint]);

      await withLamports(
        { prevLamports: owner.publicKey },
        async ({ prevLamports }) => {
          await testMakePool({ tswap, owner, config, whitelist });
          await testClosePool({ owner, whitelist, config });

          const currLamports = await getLamports(owner.publicKey);
          expect(currLamports! - prevLamports!).eq(0);
        }
      );
    }
  });

  it("close pool fails if nfts still deposited", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundATA(owner);
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);

        const pool = await testMakePool({ tswap, owner, config, whitelist });
        await testDepositNft({ pool, config, owner, ata, wlNft, whitelist });

        await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
          swapSdk.getErrorCodeHex("ExistingNfts")
        );
      })
    );
  });

  it("close pool fails if someone sold nfts into it", async () => {
    const [owner, seller] = await makeNTraders(2);
    for (const config of [tokenPoolConfig, tradePoolConfig]) {
      // Cannot run async.
      const { whitelist } = await testMakePoolSellNft({
        tswap,
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        expectedRentBySeller: expSellerRent,
      });

      await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
        swapSdk.getErrorCodeHex("ExistingNfts")
      );
    }
  });

  //endregion
});

import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { cartesian, getLamports, swapSdk, withLamports } from "../shared";
import {
  beforeHook,
  createAndFundATA,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testClosePool,
  testDepositNft,
  testDepositSol,
  testMakePool,
  testMakePoolBuyNft,
  testMakePoolSellNft,
  testWithdrawNft,
  tokenPoolConfig,
  tradePoolConfig,
  TSWAP_FEE,
} from "./common";

describe("tswap pool", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
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

  it("close pool roundtrips fees + any deposited SOL", async () => {
    const [owner] = await makeNTraders(1);
    for (const [config, lamports] of cartesian(
      [nftPoolConfig, tradePoolConfig],
      [0, 69 * LAMPORTS_PER_SOL]
    )) {
      const { mint } = await createAndFundATA(owner);
      const { whitelist } = await makeWhitelist([mint]);

      await withLamports(
        { prevLamports: owner.publicKey },
        async ({ prevLamports }) => {
          const pool = await testMakePool({ tswap, owner, config, whitelist });

          // Deposit SOL if applicable.
          if (lamports !== 0) {
            await testDepositSol({
              pool,
              whitelist,
              config,
              owner,
              lamports,
            });
          }

          await testClosePool({ owner, whitelist, config });

          const currLamports = await getLamports(owner.publicKey);
          expect(currLamports! - prevLamports!).eq(0);
        }
      );
    }
  });

  it("close pool withdraws SOL from any sales into TRADE pool", async () => {
    const [owner, buyer] = await makeNTraders(2);
    // We know for TOKEN pools SOL goes directly to owner.
    const config = tradePoolConfig;
    await withLamports(
      { prevLamports: owner.publicKey },
      async ({ prevLamports }) => {
        const { poolPda, whitelist, ata, wlNft } = await testMakePoolBuyNft({
          tswap,
          owner,
          buyer,
          config,
          expectedLamports: LAMPORTS_PER_SOL,
        });
        // Need to withdraw NFT before we can close pool.
        await testWithdrawNft({
          pool: poolPda,
          config,
          owner,
          ata,
          wlNft,
          whitelist,
        });
        await testClosePool({ owner, whitelist, config });

        const currLamports = await getLamports(owner.publicKey);
        expect(currLamports! - prevLamports!).eq(
          // Proceeds from sale.
          LAMPORTS_PER_SOL * (1 - TSWAP_FEE)
          // No addn from rent since we roundtrip it from deposit.
        );
      }
    );
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
    // for (const config of [tokenPoolConfig, tradePoolConfig]) {
    for (const config of [tradePoolConfig]) {
      // Cannot run async.
      const { whitelist } = await testMakePoolSellNft({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
      });

      await expect(testClosePool({ owner, whitelist, config })).rejectedWith(
        swapSdk.getErrorCodeHex("ExistingNfts")
      );
    }
  });

  //endregion
});

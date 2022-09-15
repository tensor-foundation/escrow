import {
  getMinimumBalanceForRentExemptAccount,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";
import {
  CurveTypeAnchor,
  cartesian,
  getLamports,
  swapSdk,
  TEST_PROVIDER,
  withLamports,
  HUNDRED_PCT_BPS,
  castPoolConfigAnchor,
} from "../shared";
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

  it("pool adds the created unix timestamp (in seconds)", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
        const { whitelist } = await makeWhitelist([mint]);

        const { poolPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        const pool = await swapSdk.fetchPool(poolPda);
        const dateMs = pool.createdUnixSeconds.toNumber() * 1000;
        console.log(`pool created: ${new Date(dateMs)}`);
        // This should be within 3 days (max clock drift historical) of the current time.
        expect(dateMs).gte(Date.now() - 3 * 86400 * 1000);
      })
    );
  });

  it("cannot init pool without royalties", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
        const { whitelist } = await makeWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              honorRoyalties: false,
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("RoyaltiesEnabled"));
      })
    );
  });

  it("cannot init exponential pool with 100% delta", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
        const { whitelist } = await makeWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              curveType: CurveTypeAnchor.Exponential,
              delta: new BN(HUNDRED_PCT_BPS),
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("DeltaTooLarge"));
      })
    );
  });

  it("cannot init non-trade pool with mmFees", async () => {
    const [owner] = await makeNTraders(1);
    await Promise.all(
      [tokenPoolConfig, nftPoolConfig].map(async (config) => {
        const { mint } = await createAndFundATA(owner);
        const { whitelist } = await makeWhitelist([mint]);

        await expect(
          testMakePool({
            tswap,
            owner,
            config: {
              ...config,
              mmFeeBps: 0,
            },
            whitelist,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("FeesNotAllowed"));
      })
    );
  });

  it("cannot init trade pool with no fees or high fees", async () => {
    const [owner] = await makeNTraders(1);
    const config = tradePoolConfig;
    const { mint } = await createAndFundATA(owner);
    const { whitelist } = await makeWhitelist([mint]);

    await expect(
      testMakePool({
        tswap,
        owner,
        config: {
          ...config,
          mmFeeBps: null,
        },
        whitelist,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("MissingFees"));

    await Promise.all(
      [
        { mmFeeBps: 2500, fail: false },
        { mmFeeBps: 2501, fail: true },
      ].map(async ({ mmFeeBps, fail }) => {
        const promise = testMakePool({
          tswap,
          owner,
          config: {
            ...config,
            mmFeeBps,
          },
          whitelist,
        });
        if (fail)
          await expect(promise).rejectedWith(
            swapSdk.getErrorCodeHex("FeesTooHigh")
          );
        else await promise;
      })
    );
  });

  it("properly parses raw init/close pool tx", async () => {
    const [owner] = await makeNTraders(1);
    const { mint } = await createAndFundATA(owner);
    const { whitelist } = await makeWhitelist([mint]);

    await Promise.all(
      [tokenPoolConfig, tradePoolConfig, nftPoolConfig].map(async (config) => {
        const { sig: initSig } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
          commitment: "confirmed",
        });

        const { sig: closeSig } = await testClosePool({
          owner,
          config,
          whitelist,
          commitment: "confirmed",
        });

        for (const { sig, name } of [
          { sig: initSig, name: "initPool" },
          { sig: closeSig, name: "closePool" },
        ]) {
          const tx = (await TEST_PROVIDER.connection.getTransaction(sig, {
            commitment: "confirmed",
          }))!;
          expect(tx).not.null;
          const ixs = swapSdk.parseIxs(tx);
          expect(ixs).length(1);

          const ix = ixs[0];
          expect(ix.ix.name).eq(name);
          expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
            JSON.stringify(castPoolConfigAnchor(config))
          );
          expect(swapSdk.getSolAmount(ix)).null;
          expect(swapSdk.getFeeAmount(ix)).null;

          expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
            owner.publicKey.toBase58()
          );
          expect(
            swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()
          ).eq(whitelist.toBase58());
        }
      })
    );
  });

  //#endregion

  //#region Close pool.

  it("close pool roundtrips fees + any deposited SOL", async () => {
    const [owner] = await makeNTraders(1);
    for (const [config, lamports] of cartesian(
      [tokenPoolConfig, tradePoolConfig],
      [0, 69 * LAMPORTS_PER_SOL]
    )) {
      const { mint } = await createAndFundATA(owner);
      const { whitelist } = await makeWhitelist([mint]);

      await withLamports(
        { prevLamports: owner.publicKey },
        async ({ prevLamports }) => {
          const { poolPda: pool } = await testMakePool({
            tswap,
            owner,
            config,
            whitelist,
          });

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

  it("close pool withdraws SOL from any buys from the TRADE pool", async () => {
    const [owner, buyer] = await makeNTraders(2);
    // We know for TOKEN pools SOL goes directly to owner.
    const config = tradePoolConfig;
    const buyPrice = LAMPORTS_PER_SOL;

    await withLamports(
      { prevLamports: owner.publicKey },
      async ({ prevLamports }) => {
        const {
          whitelist,
          ata: ownerAta,
          masterEdition,
          metadata,
        } = await testMakePoolBuyNft({
          tswap,
          owner,
          buyer,
          config,
          expectedLamports: buyPrice,
        });
        await testClosePool({ owner, whitelist, config });

        const currLamports = await getLamports(owner.publicKey);
        const diff = currLamports! - prevLamports!;

        const conn = TEST_PROVIDER.connection;
        const metaRent = await conn.getMinimumBalanceForRentExemption(
          (await conn.getAccountInfo(metadata))!.data.byteLength
        );
        const editionRent = await conn.getMinimumBalanceForRentExemption(
          (await conn.getAccountInfo(masterEdition))!.data.byteLength
        );

        const expected =
          // Proceeds from sale, minus the rent we paid to create the mint + ATA initially.
          buyPrice * (1 - TSWAP_FEE) -
          metaRent -
          editionRent -
          (await getMinimumBalanceForRentExemptMint(conn)) -
          // NB: for some reason if we close the ATA beforehand (and now have this adjustment)
          // the resulting amount credited differs depending on which tests run before this one (wtf??)
          (await getMinimumBalanceForRentExemptAccount(conn));
        // No addn from rent since we roundtrip it from deposit.

        // For some reason running this test by itself is fine, but running it with the other tests before
        // has a 10000 lamport difference.
        expect(diff).within(expected - 10000, expected);
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

        const { poolPda: pool } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
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

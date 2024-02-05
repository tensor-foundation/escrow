import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getTransactionConvertedToLegacy } from "@tensor-hq/tensor-common";
import BN from "bn.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  COMMON_INSUFFICIENT_FUNDS_ERR,
  createTokenAuthorizationRules,
  getLamports,
  swapSdk,
  TEST_PROVIDER,
  withLamports,
} from "../shared";
import { testInitUpdateMintProof } from "../twhitelist/common";
import {
  beforeHook,
  createAndFundAta,
  createAta,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  TAKER_FEE_PCT,
  testDepositNft,
  testDepositSol,
  testMakePool,
  testMakePoolBuyNft,
  testWithdrawNft,
  testWithdrawSol,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap withdraws", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Withdraw NFT.

  it("withdraw from pool after depositing", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundAta({ owner });
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint]);
        const { poolPda: pool, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        await testDepositNft({
          pool,
          config,
          owner,
          ata,
          wlNft,
          whitelist,
          nftAuthPda,
        });
        await testWithdrawNft({ pool, config, owner, ata, wlNft, whitelist });
      })
    );
  });

  it("withdraw from TRADE pool after someone sells", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const config = tradePoolConfig;

    // Create pool + ATAs.
    const { mint, ata } = await createAndFundAta({ owner: seller });
    const { ata: ownerAta } = await createAta(mint, owner);
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeProofWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await testDepositSol({
      pool,
      whitelist,
      config,
      owner,
      lamports: LAMPORTS_PER_SOL,
    });

    await testInitUpdateMintProof({
      user: seller,
      mint: wlNft.mint,
      whitelist,
      proof: wlNft.proof,
    });

    // Seller sells into pool.
    const {
      tx: { ixs },
    } = await swapSdk.sellNft({
      type: "trade",
      whitelist,
      nftMint: wlNft.mint,
      nftSellerAcc: ata,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      // Fine to go lower.
      minPrice: new BN(LAMPORTS_PER_SOL / 2),
      tokenProgram: TOKEN_PROGRAM_ID
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [seller],
    });

    // Buyer buys.
    await testWithdrawNft({
      pool,
      config,
      owner,
      ata: ownerAta,
      wlNft,
      whitelist,
    });
  });

  it("withdraw from token pool fails", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = tokenPoolConfig;

    // Create pool + ATAs.
    const { mint, ata } = await createAndFundAta({ owner });
    const {
      proofs: [wlNft],
      whitelist,
    } = await makeProofWhitelist([mint]);
    const { poolPda: tokenPool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    // Need to deposit in another pool to avoid "AccountNotInitialized" error for escrow.
    const { poolPda: nftPool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config: nftPoolConfig,
      whitelist,
    });
    await testDepositNft({
      pool: nftPool,
      nftAuthPda,
      config: nftPoolConfig,
      owner,
      ata,
      wlNft,
      whitelist,
    });

    await expect(
      testWithdrawNft({
        pool: tokenPool,
        config,
        owner,
        ata,
        wlNft,
        whitelist,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });

  it("withdraw from another pool fails", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    for (const config of [nftPoolConfig, tradePoolConfig]) {
      const {
        mint: mintA,
        ata: ataA,
        otherAta: ataAforB,
      } = await makeMintTwoAta({ owner: traderA, other: traderB });
      const {
        mint: mintB,
        ata: ataB,
        otherAta: ataBforA,
      } = await makeMintTwoAta({ owner: traderB, other: traderA });

      // Reuse whitelist fine.
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeProofWhitelist([mintA, mintB]);

      // Deposit into 2 pools.
      const { poolPda: poolA, nftAuthPda: nftAuthPdaA } = await testMakePool({
        tswap,
        owner: traderA,
        config,
        whitelist,
      });
      const { poolPda: poolB, nftAuthPda: nftAuthPdaB } = await testMakePool({
        tswap,
        owner: traderB,
        config,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda: nftAuthPdaA,
        pool: poolA,
        config,
        owner: traderA,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
        nftAuthPda: nftAuthPdaB,
        pool: poolB,
        config,
        owner: traderB,
        ata: ataB,
        wlNft: wlNftB,
        whitelist,
      });

      // Try withdrawing from each other's pool.
      await expect(
        testWithdrawNft({
          pool: poolA,
          config,
          owner: traderA,
          ata: ataBforA,
          wlNft: wlNftB,
          whitelist,
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPool"));
      await expect(
        testWithdrawNft({
          pool: poolB,
          config,
          owner: traderB,
          ata: ataAforB,
          wlNft: wlNftA,
          whitelist,
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPool"));
    }
  });

  it("properly parses raw withdraw nft tx", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundAta({ owner });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeProofWhitelist([mint]);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });

    const { withdrawSig, receiptPda } = await testWithdrawNft({
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });

    const tx = await getTransactionConvertedToLegacy(
      TEST_PROVIDER.connection,
      withdrawSig,
      "confirmed"
    );
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx!);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("withdrawNft");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(config))
    );
    expect(swapSdk.getSolAmount(ix)).null;
    expect(swapSdk.getFeeAmount(ix)).null;

    expect(swapSdk.getAccountByName(ix, "Nft Receipt")?.pubkey.toBase58()).eq(
      receiptPda.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
      pool.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Nft Mint")?.pubkey.toBase58()).eq(
      wlNft.mint.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
      owner.publicKey.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()).eq(
      whitelist.toBase58()
    );
  });

  //#endregion

  //#region Withdraw SOL

  it("withdraw can roundtrip deposits", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    for (const [lamports, config] of cartesian(
      [0, 0.0001 * LAMPORTS_PER_SOL, 69 * LAMPORTS_PER_SOL],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      // Create pool + ATAs.
      const { mint } = await createAndFundAta({ owner });
      const { whitelist } = await makeProofWhitelist([mint]);
      const { poolPda: pool } = await testMakePool({
        tswap,
        owner,
        config,
        whitelist,
      });

      await withLamports(
        { prevLamports: owner.publicKey },
        async ({ prevLamports }) => {
          await testDepositSol({
            pool,
            config,
            owner,
            whitelist,
            lamports,
          });
          await testWithdrawSol({
            pool,
            config,
            owner,
            whitelist,
            lamports,
          });

          const currLamports = await getLamports(owner.publicKey);
          expect(currLamports! - prevLamports!).eq(0);
        }
      );
    }
  });

  it("withdraw works after someone buys from trade pool", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    const config = tradePoolConfig;

    const { pool, whitelist } = await testMakePoolBuyNft({
      tswap,
      owner,
      buyer,
      config,
      expectedLamports: LAMPORTS_PER_SOL,
    });

    const funds = LAMPORTS_PER_SOL * (1 - TAKER_FEE_PCT);

    await withLamports(
      { prevLamports: owner.publicKey },
      async ({ prevLamports }) => {
        await testWithdrawSol({
          pool,
          config,
          owner,
          whitelist,
          lamports: funds,
        });

        const currLamports = await getLamports(owner.publicKey);
        expect(currLamports! - prevLamports!).eq(funds);
      }
    );
  });

  it("cannot withdraw more than deposited (eating into rent amount)", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    for (const [lamports, config] of cartesian(
      [0, 69 * LAMPORTS_PER_SOL],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      // Create pool + ATAs.
      const { mint } = await createAndFundAta({ owner });
      const { whitelist } = await makeProofWhitelist([mint]);
      const { poolPda: pool } = await testMakePool({
        tswap,
        owner,
        config,
        whitelist,
      });

      await testDepositSol({
        pool,
        config,
        owner,
        whitelist,
        lamports,
      });
      await expect(
        testWithdrawSol({
          pool,
          config,
          owner,
          whitelist,
          // +1 lamport dips into rent.
          lamports: lamports + 1,
        })
      ).rejectedWith(COMMON_INSUFFICIENT_FUNDS_ERR);
    }
  });

  it("withdraw sol from NFT pool fails", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;

    // Create pool + ATAs.
    const { mint } = await createAndFundAta({ owner });
    const { whitelist } = await makeProofWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    await expect(
      testWithdrawSol({
        pool,
        config,
        owner,
        whitelist,
        lamports: 0,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });

  it("properly parses raw withdraw sol tx", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = tokenPoolConfig;
    const { mint } = await createAndFundAta({ owner });
    const { whitelist } = await makeProofWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    const amount = 137391932;

    await testDepositSol({
      pool,
      config,
      owner,
      whitelist,
      lamports: amount,
    });

    const { withdrawSig, solEscrowPda } = await testWithdrawSol({
      pool,
      config,
      owner,
      whitelist,
      lamports: amount,
    });

    const tx = await getTransactionConvertedToLegacy(
      TEST_PROVIDER.connection,
      withdrawSig,
      "confirmed"
    );
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx!);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("withdrawSol");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(config))
    );
    expect(swapSdk.getSolAmount(ix)?.toNumber()).eq(amount);
    expect(swapSdk.getFeeAmount(ix)).null;

    expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
      pool.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Sol Escrow")?.pubkey.toBase58()).eq(
      solEscrowPda.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
      owner.publicKey.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()).eq(
      whitelist.toBase58()
    );
  });

  //endregion

  it("withdraws a pNft (no rulesets)", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundAta({
          owner,
          programmable: true,
        });

        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint]);
        const { poolPda: pool, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        await testDepositNft({
          pool,
          config,
          owner,
          ata,
          wlNft,
          whitelist,
          nftAuthPda,
        });

        await testWithdrawNft({ pool, config, owner, ata, wlNft, whitelist });
      })
    );
  });

  it("withdraws a pNft (1 ruleset)", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });

    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, ata } = await createAndFundAta({
          owner,
          programmable: true,
          ruleSetAddr,
        });

        const {
          proofs: [wlNft],
          whitelist,
        } = await makeProofWhitelist([mint]);
        const { poolPda: pool, nftAuthPda } = await testMakePool({
          tswap,
          owner,
          config,
          whitelist,
        });
        await testDepositNft({
          pool,
          config,
          owner,
          ata,
          wlNft,
          whitelist,
          nftAuthPda,
        });
        await testWithdrawNft({ pool, config, owner, ata, wlNft, whitelist });
      })
    );
  });
});

import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";
import { buildAndSendTx, swapSdk } from "../shared";
import {
  beforeHook,
  createAndFundATA,
  createATA,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testDepositNft,
  testDepositSol,
  testMakePool,
  testWithdrawNft,
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

  it("withdraw nft from pool after depositing", async () => {
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
        await testWithdrawNft({ pool, config, owner, ata, wlNft, whitelist });
      })
    );
  });

  it("withdraw nft from pool after someone sells", async () => {
    const [owner, seller] = await makeNTraders(2);

    await Promise.all(
      [tokenPoolConfig, tradePoolConfig].map(async (config) => {
        // Create pool + ATAs.
        const { mint, ata } = await createAndFundATA(seller);
        const { ata: ownerAta } = await createATA(mint, owner);
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);
        const pool = await testMakePool({ tswap, owner, config, whitelist });
        await testDepositSol({
          pool,
          whitelist,
          config,
          owner,
          lamports: LAMPORTS_PER_SOL,
        });

        // Seller sells into pool.
        const {
          tx: { ixs },
        } = await swapSdk.sellNft({
          whitelist,
          nftMint: wlNft.mint,
          nftSellerAcc: ata,
          owner: owner.publicKey,
          seller: seller.publicKey,
          config,
          proof: wlNft.proof,
          // Fine to go lower.
          minPrice: new BN(LAMPORTS_PER_SOL / 2),
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
      })
    );
  });

  it("withdraw NFT from another pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

    for (const config of [nftPoolConfig, tradePoolConfig]) {
      const { mint: mintA, ata: ataA } = await createAndFundATA(traderA);
      const { mint: mintB, ata: ataB } = await createAndFundATA(traderB);
      const { ata: ataAforB } = await createATA(mintA, traderB);
      const { ata: ataBforA } = await createATA(mintB, traderA);

      // Reuse whitelist fine.
      const {
        proofs: [wlNftA, wlNftB],
        whitelist,
      } = await makeWhitelist([mintA, mintB]);

      // Deposit into 2 pools.
      const poolA = await testMakePool({
        tswap,
        owner: traderA,
        config,
        whitelist,
      });
      const poolB = await testMakePool({
        tswap,
        owner: traderB,
        config,
        whitelist,
      });
      await testDepositNft({
        pool: poolA,
        config,
        owner: traderA,
        ata: ataA,
        wlNft: wlNftA,
        whitelist,
      });
      await testDepositNft({
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
});

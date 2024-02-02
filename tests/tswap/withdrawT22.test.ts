import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { buildAndSendTx, swapSdk } from "../shared";
import { testInitUpdateMintProof } from "../twhitelist/common";
import {
  beforeHook,
  createAndFundAta,
  createAssociatedTokenAccountT22,
  createFundedHolderAndMintAndTokenT22,
  createMintAndTokenT22,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testDepositNft,
  testDepositNftT22,
  testDepositSol,
  testMakePool,
  testWithdrawNft,
  testWithdrawNftT22,
  tradePoolConfig,
} from "./common";

describe("[Token 2022] tswap withdraws", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Withdraw NFT.

  it("[T22] withdraw from pool after depositing", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const { mint, token } = await createMintAndTokenT22(owner.publicKey);

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

        await testDepositNftT22({
          pool,
          config,
          owner,
          ata: token,
          wlNft,
          whitelist,
          nftAuthPda,
        });

        // Need an ATA for withdraw.
        const { token: ata } = await createAssociatedTokenAccountT22(
          owner.publicKey,
          mint
        );

        await testWithdrawNftT22({
          pool,
          config,
          owner,
          ata,
          wlNft,
          whitelist,
        });
      })
    );
  });

  it("[T22] withdraw from TRADE pool after someone sells", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const config = tradePoolConfig;

    // Create pool + ATAs.
    const { mint, token: ata } = await createMintAndTokenT22(seller.publicKey);
    const { token: ownerAta } = await createAssociatedTokenAccountT22(
      owner.publicKey,
      mint
    );
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
    } = await swapSdk.sellNftT22({
      type: "trade",
      whitelist,
      nftMint: wlNft.mint,
      nftSellerAcc: ata,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      // Fine to go lower.
      minPrice: new BN(LAMPORTS_PER_SOL / 2),
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [seller],
    });

    // Buyer buys.
    await testWithdrawNftT22({
      pool,
      config,
      owner,
      ata: ownerAta,
      wlNft,
      whitelist,
    });
  });
});

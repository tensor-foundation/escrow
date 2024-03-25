import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";
import { buildAndSendTx, swapSdk } from "../shared";
import { testInitUpdateMintProof } from "../twhitelist/common";
import { wnsMint, wnsTokenAccount } from "../wns";
import {
  beforeHook,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testDepositSol,
  testMakePool,
  tradePoolConfig,
  testDepositNftWns,
  testWithdrawNftWns,
} from "./common";

describe("[WNS Token 2022] tswap withdraws", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Withdraw NFT.

  it("[WNS] withdraw from pool after depositing", async () => {
    const [owner] = await makeNTraders({ n: 1 });

    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const {
          mint,
          token,
          collection: collectionMint,
        } = await wnsMint(owner.publicKey);

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

        await testDepositNftWns({
          pool,
          config,
          owner,
          ata: token,
          wlNft,
          whitelist,
          nftAuthPda,
          collectionMint,
        });

        await testWithdrawNftWns({
          pool,
          config,
          owner,
          ata: token,
          wlNft,
          whitelist,
          collectionMint,
        });
      })
    );
  });

  it("[WNS] withdraw from TRADE pool after someone sells", async () => {
    const [owner, seller] = await makeNTraders({ n: 2 });
    const config = tradePoolConfig;

    // Create pool + ATAs.
    const {
      mint,
      token: ata,
      collection: collectionMint,
    } = await wnsMint(seller.publicKey, undefined, 0);
    const { token: ownerAta } = await wnsTokenAccount(owner.publicKey, mint);

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
    } = await swapSdk.wnsSellNft({
      type: "trade",
      whitelist,
      nftMint: wlNft.mint,
      nftSellerAcc: ata,
      owner: owner.publicKey,
      seller: seller.publicKey,
      config,
      collectionMint,
      // Fine to go lower.
      minPrice: new BN(LAMPORTS_PER_SOL / 2),
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [seller],
    });

    // Buyer buys.
    await testWithdrawNftWns({
      pool,
      config,
      owner,
      ata: ownerAta,
      wlNft,
      whitelist,
      collectionMint,
    });
  });
});

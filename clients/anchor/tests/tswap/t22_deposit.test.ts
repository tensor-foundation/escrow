import { PublicKey } from "@solana/web3.js";
import {
  beforeHook,
  createFundedHolderAndMintAndTokenT22,
  makeProofWhitelist,
  nftPoolConfig,
  testDepositNftT22,
  testMakePool,
} from "./common";

describe("[Token 2022] tswap deposits", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Deposit NFT

  it("[T22] can deposit with long proof", async () => {
    const { mint, token, holder: owner } = await createFundedHolderAndMintAndTokenT22(10);
    const config = nftPoolConfig;
    const {
      whitelist,
      proofs: [wlNft],
      // Long proof!
    } = await makeProofWhitelist([mint], 1);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await testDepositNftT22({
      nftAuthPda,
      pool,
      config,
      owner,
      ata: token,
      wlNft,
      whitelist,
    });
  });
});

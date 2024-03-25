import { PublicKey } from "@solana/web3.js";
import { wnsMint } from "../wns";
import {
  beforeHook,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testMakePool,
  testDepositNftWns,
} from "./common";

describe("[WNS Token 2022] tswap deposits", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Deposit NFT

  it("[WNS] can deposit with long proof", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const {
      mint,
      token,
      collection: collectionMint,
    } = await wnsMint(owner.publicKey);

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
    await testDepositNftWns({
      nftAuthPda,
      pool,
      config,
      owner,
      ata: token,
      wlNft,
      whitelist,
      collectionMint,
    });
  });
});

import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { buildAndSendTx, swapSdk, TOKEN_ACCT_WRONG_MINT_ERR } from "../shared";
import {
  beforeHook,
  createAndFundATA,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testDepositSol,
  testMakePool,
} from "./common";

describe("tswap deposits", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  it("deposit non-WL nft fails", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundATA(owner);
    const { proofs, whitelist } = await makeWhitelist([mint]);
    const { mint: badMint, ata: badAta } = await createAndFundATA(owner);
    await testMakePool({ tswap, owner, config, whitelist });

    // Bad mint (w/ good + bad ATAs passed).
    for (const currAta of [ata, badAta]) {
      const {
        tx: { ixs },
      } = await swapSdk.depositNft({
        whitelist,
        nftMint: badMint,
        nftSource: currAta,
        owner: owner.publicKey,
        config,
        proof: proofs[0].proof,
      });
      await expect(
        buildAndSendTx({
          ixs,
          extraSigners: [owner],
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("InvalidProof"));
    }

    // Good mint
    const {
      tx: { ixs: goodIxs },
    } = await swapSdk.depositNft({
      whitelist,
      nftMint: mint,
      nftSource: ata,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await buildAndSendTx({
      ixs: goodIxs,
      extraSigners: [owner],
    });
  });

  it("deposit WL nft w/ non-WL ata fails", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint } = await createAndFundATA(owner);
    const { proofs, whitelist } = await makeWhitelist([mint]);
    const { ata: badAta } = await createAndFundATA(owner);
    await testMakePool({ tswap, owner, config, whitelist });

    const {
      tx: { ixs },
    } = await swapSdk.depositNft({
      whitelist,
      // Good mint
      nftMint: mint,
      // Bad ATA
      nftSource: badAta,
      owner: owner.publicKey,
      config,
      proof: proofs[0].proof,
    });
    await expect(
      buildAndSendTx({
        ixs,
        extraSigners: [owner],
      })
    ).rejectedWith(TOKEN_ACCT_WRONG_MINT_ERR);
  });

  it("deposit SOL into NFT pool fails", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint } = await createAndFundATA(owner);
    const { whitelist } = await makeWhitelist([mint]);
    const pool = await testMakePool({ tswap, owner, config, whitelist });
    await expect(
      testDepositSol({
        pool,
        whitelist,
        config,
        owner,
        lamports: 69 * LAMPORTS_PER_SOL,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });
});

import { LangErrorCode } from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  swapSdk,
  hexCode,
  TEST_PROVIDER,
  castPoolConfigAnchor,
} from "../shared";
import {
  beforeHook,
  createAndFundATA,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testDepositNft,
  testDepositSol,
  testMakePool,
  tokenPoolConfig,
} from "./common";

describe("tswap deposits", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  //#region Deposit NFT

  it("deposit non-WL nft fails", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundATA(owner);
    const { proofs, whitelist } = await makeWhitelist([mint]);
    const { mint: badMint, ata: badAta } = await createAndFundATA(owner);
    await testMakePool({ tswap, owner, config, whitelist });

    // Bad mint (w/ good + bad ATAs passed).
    // All:
    // 1) non-WL mint + bad ATA
    // 2) non-WL mint + good ATA
    // 3) WL mint + bad ATA
    // should fail.
    for (const { currMint, currAta, err } of [
      {
        currMint: badMint,
        currAta: badAta,
        err: swapSdk.getErrorCodeHex("InvalidProof"),
      },
      {
        currMint: badMint,
        currAta: ata,
        err: hexCode(LangErrorCode.ConstraintTokenMint),
      },
      {
        currMint: mint,
        currAta: badAta,
        err: hexCode(LangErrorCode.ConstraintTokenMint),
      },
    ]) {
      const {
        tx: { ixs },
      } = await swapSdk.depositNft({
        whitelist,
        nftMint: currMint,
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
      ).rejectedWith(err);
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

  it("properly parses raw deposit nft tx", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundATA(owner);
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    const { depSig } = await testDepositNft({
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
      commitment: "confirmed",
    });

    const tx = (await TEST_PROVIDER.connection.getTransaction(depSig, {
      commitment: "confirmed",
    }))!;
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("depositNft");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(config))
    );
    expect(swapSdk.getSolAmount(ix)).null;
    expect(swapSdk.getFeeAmount(ix)).null;

    expect(swapSdk.getAccountByName(ix, "Nft Mint")?.pubkey.toBase58()).eq(
      wlNft.mint.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
      owner.publicKey.toBase58()
    );
  });

  //#endregion

  //#region Deposit SOL

  it("deposit SOL into NFT pool fails", async () => {
    const [owner] = await makeNTraders(1);
    const config = nftPoolConfig;
    const { mint } = await createAndFundATA(owner);
    const { whitelist } = await makeWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
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

  it("properly parses raw deposit sol tx", async () => {
    const [owner] = await makeNTraders(1);
    const config = tokenPoolConfig;
    const { mint } = await createAndFundATA(owner);
    const { whitelist } = await makeWhitelist([mint]);
    const { poolPda: pool } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    const amount = 137391932;

    const { depSig } = await testDepositSol({
      pool,
      config,
      owner,
      whitelist,
      lamports: amount,
      commitment: "confirmed",
    });

    const tx = (await TEST_PROVIDER.connection.getTransaction(depSig, {
      commitment: "confirmed",
    }))!;
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("depositSol");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(config))
    );
    expect(swapSdk.getSolAmount(ix)?.toNumber()).eq(amount);
    expect(swapSdk.getFeeAmount(ix)).null;

    expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
      owner.publicKey.toBase58()
    );
  });

  //#endregion
});

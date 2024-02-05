import { LangErrorCode } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getTransactionConvertedToLegacy,
  hexCode,
} from "@tensor-hq/tensor-common";
import { expect } from "chai";
import {
  buildAndSendTx,
  castPoolConfigAnchor,
  createTokenAuthorizationRules,
  swapSdk,
  TEST_PROVIDER,
  wlSdk,
} from "../shared";
import {
  beforeHook,
  createAndFundAta,
  makeEverythingWhitelist,
  makeFvcWhitelist,
  makeNTraders,
  makeProofWhitelist,
  makeVocWhitelist,
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

  it("can deposit with long proof", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundAta({ owner });
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
    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });
  });

  it("can deposit with REALLY long proof", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundAta({ owner });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeProofWhitelist([mint]);

    // Artificial proof (takes far less time to generate).
    // 17 seems to be the cap.
    // Fractal (w/ 100k mints) is around length 17.
    wlNft.proof = Array(17)
      .fill(null)
      .map((_) => Buffer.from(Array(32).fill(0)));

    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    // NB rejected w/ invalid proof instead of transcation size limit.
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        wlNft,
        whitelist,
      })
    ).rejectedWith(wlSdk.getErrorCodeHex("FailedMerkleProofVerification"));
  });

  it("deposit non-WL nft fails", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const { mint, ata } = await createAndFundAta({ owner });
    const { proofs, whitelist } = await makeProofWhitelist([mint]);
    const { mint: badMint, ata: badAta } = await createAndFundAta({ owner });
    const { poolPda, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

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
        err: swapSdk.getErrorCodeHex("BadMintProof"),
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
        tokenProgram: TOKEN_PROGRAM_ID,
        // proof: proofs[0].proof,
      });
      await expect(
        buildAndSendTx({
          ixs,
          extraSigners: [owner],
        })
      ).rejectedWith(err);
    }

    // Good mint
    await testDepositNft({
      pool: poolPda,
      nftAuthPda,
      owner,
      config,
      ata,
      wlNft: proofs[0],
      whitelist,
    });
  });

  it("properly parses raw deposit nft tx", async () => {
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
    const { depSig, receiptPda } = await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });

    const tx = await getTransactionConvertedToLegacy(
      TEST_PROVIDER.connection,
      depSig,
      "confirmed"
    );
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx!);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("depositNft");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(config))
    );
    expect(swapSdk.getSolAmount(ix)).null;
    expect(swapSdk.getFeeAmount(ix)).null;

    expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
      pool.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Nft Receipt")?.pubkey.toBase58()).eq(
      receiptPda.toBase58()
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

  // --------------------------------------- fvc

  it("deposits successfully using FVC verification", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const creator = Keypair.generate();
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        {
          address: creator.publicKey,
          share: 100,
          authority: creator,
        },
      ],
    });
    const { whitelist } = await makeFvcWhitelist(creator.publicKey);
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
      whitelist,
      nftMint: mint,
    });
  });

  it("deposits successfully using FVC verification (2nd creator)", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const creator = Keypair.generate();
    const creator2 = Keypair.generate();
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        {
          address: creator.publicKey,
          share: 50,
        },
        {
          address: creator2.publicKey,
          share: 50,
          authority: creator2,
        },
      ],
    });
    const { whitelist } = await makeFvcWhitelist(creator2.publicKey);
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
      whitelist,
      nftMint: mint,
    });
  });

  it("fails FVC verification when wrong creator verified", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const creator = Keypair.generate();
    const creator2 = Keypair.generate();
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        {
          address: creator.publicKey,
          share: 50,
          authority: creator,
        },
        {
          address: creator2.publicKey,
          share: 50,
        },
      ],
    });
    const { whitelist } = await makeFvcWhitelist(creator2.publicKey);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1777");
  });

  it("fails FVC verification when creator not verified", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const creator = Keypair.generate();
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        {
          address: creator.publicKey,
          share: 100,
          //not verified
        },
      ],
    });
    const { whitelist } = await makeFvcWhitelist(creator.publicKey);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1777");
  });

  it("fails FVC verification when creator not present", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const creator = Keypair.generate();
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 0,
      //no creators
    });
    const { whitelist } = await makeFvcWhitelist(creator.publicKey);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1777");
  });

  it("fails FVC verification when wrong creator entirely", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const creator = Keypair.generate();
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        {
          address: creator.publicKey,
          share: 100,
          authority: creator,
        },
      ],
    });
    const { whitelist } = await makeFvcWhitelist(Keypair.generate().publicKey);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1777");
  });

  // --------------------------------------- voc

  it("deposits successfully using VOC verification", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const collection = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      collection,
      collectionVerified: true,
    });
    const { whitelist } = await makeVocWhitelist(collection.publicKey);
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
      whitelist,
      nftMint: mint,
    });
  });

  it("fails VOC verification when collection not verified", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const collection = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      collection,
      collectionVerified: false,
    });
    const { whitelist } = await makeVocWhitelist(collection.publicKey);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1776");
  });

  it("fails VOC verification when no collection", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const collection = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
    });
    const { whitelist } = await makeVocWhitelist(collection.publicKey);
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1776");
  });

  it("fails VOC verification when wrong collection", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const collection = Keypair.generate();
    const collection2 = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      collection,
      collectionVerified: true,
    });
    const { whitelist } = await makeVocWhitelist(collection2.publicKey); //<-- wrong
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint,
      })
    ).to.be.rejectedWith("0x1776");
  });

  // --------------------------------------- mixed together

  it("correctly prioritizes merkle proof over VOC", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const collection = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      collection,
      collectionVerified: true,
    });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeEverythingWhitelist([mint], 100, collection.publicKey); //coll present √
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    //try not passing in proof, proof will be [], verification will fail
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint, //<-- don't pass in merkle proof
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadMintProof"));

    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      whitelist,
      wlNft, //<-- correctly pass in merkle proof
    });
  });

  it("correctly prioritizes merkle proof over FVC", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const creator = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        { address: creator.publicKey, share: 100, authority: creator },
      ],
    });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeEverythingWhitelist(
      [mint],
      100,
      undefined,
      creator.publicKey //creator present √
    );
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    //try not passing in proof, proof will be [], verification will fail
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint, //<-- don't pass in merkle proof
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadMintProof"));

    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      whitelist,
      wlNft, //<-- correctly pass in merkle proof
    });
  });

  it("correctly prioritizes merkle proof over both VOC and FVC", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const creator = Keypair.generate();
    const collection = Keypair.generate();
    const config = nftPoolConfig;
    const { mint, ata, metadata } = await createAndFundAta({
      owner,
      royaltyBps: 10000,
      creators: [
        { address: creator.publicKey, share: 100, authority: creator },
      ],
      collection,
      collectionVerified: true,
    });
    const {
      whitelist,
      proofs: [wlNft],
    } = await makeEverythingWhitelist(
      [mint],
      100,
      collection.publicKey, //coll present √
      creator.publicKey //creator present √
    );
    const { poolPda: pool, nftAuthPda } = await testMakePool({
      tswap,
      owner,
      config,
      whitelist,
    });

    //try not passing in proof, proof will be [], verification will fail
    await expect(
      testDepositNft({
        nftAuthPda,
        pool,
        config,
        owner,
        ata,
        whitelist,
        nftMint: mint, //<-- don't pass in merkle proof
      })
    ).to.be.rejectedWith(swapSdk.getErrorCodeHex("BadMintProof"));

    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      whitelist,
      wlNft, //<-- correctly pass in merkle proof
    });
  });

  //#endregion

  //#region Deposit SOL

  it("deposit SOL into NFT pool fails", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;
    const { mint } = await createAndFundAta({ owner });
    const { whitelist } = await makeProofWhitelist([mint]);
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

    const { depSig, solEscrowPda } = await testDepositSol({
      pool,
      config,
      owner,
      whitelist,
      lamports: amount,
    });

    const tx = await getTransactionConvertedToLegacy(
      TEST_PROVIDER.connection,
      depSig,
      "confirmed"
    );
    expect(tx).not.null;
    const ixs = swapSdk.parseIxs(tx!);
    expect(ixs).length(1);

    const ix = ixs[0];
    expect(ix.ix.name).eq("depositSol");
    expect(JSON.stringify(swapSdk.getPoolConfig(ix))).eq(
      JSON.stringify(castPoolConfigAnchor(config))
    );
    expect(swapSdk.getSolAmount(ix)?.toNumber()).eq(amount);
    expect(swapSdk.getFeeAmount(ix)).null;

    expect(swapSdk.getAccountByName(ix, "Sol Escrow")?.pubkey.toBase58()).eq(
      solEscrowPda.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Pool")?.pubkey.toBase58()).eq(
      pool.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Owner")?.pubkey.toBase58()).eq(
      owner.publicKey.toBase58()
    );
    expect(swapSdk.getAccountByName(ix, "Whitelist")?.pubkey.toBase58()).eq(
      whitelist.toBase58()
    );
  });

  //#endregion

  it("deposits a pNft (no rulesets)", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;

    const { mint, ata } = await createAndFundAta({
      owner,
      programmable: true,
    });
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

    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });
  });

  it("deposits a pNft (1 ruleset)", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const config = nftPoolConfig;

    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });

    const { mint, ata } = await createAndFundAta({
      owner,
      programmable: true,
      ruleSetAddr,
    });
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

    await testDepositNft({
      nftAuthPda,
      pool,
      config,
      owner,
      ata,
      wlNft,
      whitelist,
    });
  });
});

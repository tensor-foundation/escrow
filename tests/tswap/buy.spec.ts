import { BN, LangErrorCode } from "@project-serum/anchor";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { expect } from "chai";
import { CurveType, PoolConfig, PoolType } from "../../src";
import { hexCode } from "../../src/common";
import {
  buildAndSendTx,
  cartesian,
  generateTreeOfSize,
  swapSdk,
  TEST_PROVIDER,
  TOKEN_ACCT_WRONG_MINT_ERR,
  wlSdk,
} from "../shared";
import {
  beforeHook,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testMakePoolBuyNft,
  testDepositNft,
  testMakePool,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap buy", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
  });

  it("buys nft from nft pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("buys nft from trade pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config: tradePoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("buy from token pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    await expect(
      testMakePoolBuyNft({
        tswap,
        owner: traderA,
        buyer: traderB,
        config: tokenPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });

  it("buy nft at higher max price works (a steal!)", async () => {
    const [owner, buyer] = await makeNTraders(2);

    // needs to be serial ugh
    for (const [config, price] of cartesian(
      [nftPoolConfig, tradePoolConfig],
      [1.01 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL]
    )) {
      await testMakePoolBuyNft({
        tswap,
        owner,
        buyer,
        config,
        // The lamports exchanged is still the current price.
        expectedLamports: LAMPORTS_PER_SOL,
        maxLamports: price,
      });
    }
  });

  it("buy nft at lower max price fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

    await Promise.all(
      cartesian(
        [
          { owner: traderA, buyer: traderB },
          { owner: traderB, buyer: traderA },
        ],
        [nftPoolConfig, tradePoolConfig],
        [0.5 * LAMPORTS_PER_SOL, 0.99 * LAMPORTS_PER_SOL]
      ).map(async ([{ owner, buyer }, config, price]) => {
        await expect(
          testMakePoolBuyNft({
            tswap,
            owner,
            buyer,
            config,
            expectedLamports: price,
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));
      })
    );
  });

  it("buy non-WL nft fails", async () => {
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const [owner, buyer] = await makeNTraders(2);
        const { mint, ata } = await makeMintTwoAta(owner, buyer);
        const { mint: badMint, ata: badAta } = await makeMintTwoAta(
          owner,
          buyer
        );
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);
        const poolPda = await testMakePool({ tswap, owner, whitelist, config });

        await testDepositNft({
          pool: poolPda,
          owner,
          config,
          ata,
          wlNft,
          whitelist,
        });

        // Both:
        // 1) non-WL mint + good ATA
        // 2) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: ata,
            err: hexCode(LangErrorCode.AccountNotInitialized),
          },
          { currMint: mint, currAta: badAta, err: TOKEN_ACCT_WRONG_MINT_ERR },
        ]) {
          const {
            tx: { ixs },
          } = await swapSdk.buyNft({
            whitelist,
            nftMint: currMint,
            nftBuyerAcc: currAta,
            owner: owner.publicKey,
            buyer: buyer.publicKey,
            config,
            proof: wlNft.proof,
            maxPrice: new BN(LAMPORTS_PER_SOL),
          });

          await expect(
            buildAndSendTx({
              ixs,
              extraSigners: [buyer],
            })
          ).rejectedWith(err);
        }
      })
    );
  });

  it("buy formerly deposited now non-WL mint fails, can withdraw though", async () => {
    await Promise.all(
      [nftPoolConfig, tradePoolConfig].map(async (config) => {
        const [owner, buyer] = await makeNTraders(2);
        const { mint, ata } = await makeMintTwoAta(owner, buyer);
        const { mint: badMint, ata: badAta } = await makeMintTwoAta(
          owner,
          buyer
        );
        const {
          proofs: [wlNft, badWlNft],
          whitelist,
        } = await makeWhitelist([mint, badMint]);
        const poolPda = await testMakePool({ tswap, owner, whitelist, config });

        // Deposit both good and (soon-to-be) bad mints.
        for (const { nft, currAta } of [
          { nft: wlNft, currAta: ata },
          { nft: badWlNft, currAta: badAta },
        ]) {
          await testDepositNft({
            pool: poolPda,
            owner,
            config,
            ata: currAta,
            wlNft: nft,
            whitelist,
          });
        }

        // Now update whitelist to just contain first mint.
        const { root: newRoot } = generateTreeOfSize(100, [mint]);
        const wlAcc = await wlSdk.fetchWhitelist(whitelist);
        const {
          tx: { ixs: updateWlIxs },
        } = await wlSdk.initUpdateWhitelist({
          owner: TEST_PROVIDER.publicKey,
          uuid: wlAcc.uuid,
          rootHash: newRoot,
        });
        await buildAndSendTx({ ixs: updateWlIxs });

        // Cannot buy non-WL nft anymore.
        const {
          tx: { ixs },
        } = await swapSdk.buyNft({
          whitelist,
          nftMint: badMint,
          nftBuyerAcc: badAta,
          owner: owner.publicKey,
          buyer: buyer.publicKey,
          config,
          proof: wlNft.proof,
          maxPrice: new BN(LAMPORTS_PER_SOL),
        });

        await expect(
          buildAndSendTx({
            ixs,
            extraSigners: [buyer],
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("InvalidProof"));

        // todo test withdraw
      })
    );
  });

  it("deposits/buys multiple", async () => {
    //todo once optimize the ix, try increasing
    const MAX_IXS = 1;
    const [traderA, traderB] = await makeNTraders(2);

    //prepare multiple nfts
    const nfts: {
      mint: PublicKey;
      ataA: PublicKey;
      ataB: PublicKey;
      depositIxs?: TransactionInstruction[];
      buyIxs?: TransactionInstruction[];
    }[] = [];

    for (let i = 0; i < MAX_IXS; i++) {
      const {
        mint,
        ata: ataA,
        otherAta: ataB,
      } = await makeMintTwoAta(traderA, traderB);
      nfts.push({ mint, ataA, ataB });
    }

    //prepare tree & pool
    const { proofs, whitelist } = await makeWhitelist(
      nfts.map((nft) => nft.mint)
    );

    const config: PoolConfig = {
      poolType: PoolType.NFT,
      curveType: CurveType.Linear,
      startingPrice: new BN(LAMPORTS_PER_SOL),
      delta: new BN(LAMPORTS_PER_SOL / 10),
      honorRoyalties: false,
      mmFeeBps: 0,
    };

    // Run txs.

    const {
      tx: { ixs: poolIxs },
    } = await swapSdk.initPool({
      owner: traderA.publicKey,
      whitelist,
      config: config,
    });
    await buildAndSendTx({
      ixs: poolIxs,
      extraSigners: [traderA],
    });

    let currPrice = new BN(config.startingPrice);

    for (const nft of nfts) {
      const {
        tx: { ixs: depositIxs },
      } = await swapSdk.depositNft({
        whitelist,
        nftMint: nft.mint,
        nftSource: nft.ataA,
        owner: traderA.publicKey,
        config: config,
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
      });
      nft.depositIxs = depositIxs;

      const {
        tx: { ixs: buyIxs },
      } = await swapSdk.buyNft({
        whitelist,
        nftMint: nft.mint,
        nftBuyerAcc: nft.ataB,
        owner: traderA.publicKey,
        buyer: traderB.publicKey,
        config: config,
        proof: proofs.find((p) => p.mint === nft.mint)!.proof,
        maxPrice: currPrice,
      });
      nft.buyIxs = buyIxs;
      currPrice = currPrice.sub(config.delta);
    }

    // amazing table for debugging
    // const tx = new TransactionEnvelope(
    //   new SolanaAugmentedProvider(
    //     SolanaProvider.init({
    //       connection: TEST_PROVIDER.connection,
    //       wallet: TEST_PROVIDER.wallet,
    //       opts: TEST_PROVIDER.opts,
    //     })
    //   ),
    //   nfts.map((n) => n.ixs).flat() as TransactionInstruction[],
    //   [traderA]
    // );
    // await tx.simulateTable().catch(console.log);

    //deposit
    await buildAndSendTx({
      ixs: nfts.map((n) => n.depositIxs).flat() as TransactionInstruction[],
      extraSigners: [traderA],
    });

    //buy
    await buildAndSendTx({
      ixs: nfts.map((n) => n.buyIxs).flat() as TransactionInstruction[],
      extraSigners: [traderB],
    });

    //check one of the accounts
    const traderAccA = await getAccount(nfts[0].ataA);
    expect(traderAccA.amount.toString()).eq("0");
    const traderAccB = await getAccount(nfts[0].ataB);
    expect(traderAccB.amount.toString()).eq("1");
  });
});

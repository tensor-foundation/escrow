import { BN } from "@project-serum/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  cartesian,
  swapSdk,
  TEST_PROVIDER,
  TOKEN_ACCT_WRONG_MINT_ERR,
} from "../shared";
import {
  beforeHook,
  makeMintTwoAta,
  makeNTraders,
  makeWhitelist,
  nftPoolConfig,
  testMakePool,
  testMakePoolSellNft,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("tswap sell", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let expSellerRent: number;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, expSellerRent } = await beforeHook());
  });

  it("sells nft into token/trade pool", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      await testMakePoolSellNft({
        tswap,
        owner,
        seller,
        config,
        // Selling is 1 tick lower than start price for trade pools.
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        expectedRentBySeller: expSellerRent,
      });
    }
  });

  it("sell nft at lower min price works (a steal!)", async () => {
    const [owner, seller] = await makeNTraders(2);

    // needs to be serial ugh
    for (const [config, price] of cartesian(
      [tokenPoolConfig, tradePoolConfig],
      [0.99 * LAMPORTS_PER_SOL, 0.01 * LAMPORTS_PER_SOL]
    )) {
      await testMakePoolSellNft({
        tswap,
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        minLamports: config === tokenPoolConfig ? price : price - 1234,
        expectedRentBySeller: expSellerRent,
      });
    }
  });

  it("sell into nft pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    await expect(
      testMakePoolSellNft({
        tswap,
        owner: traderA,
        seller: traderB,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        expectedRentBySeller: 0,
      })
    ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
  });

  it("sell nft at higher price fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);

    await Promise.all(
      cartesian(
        [
          { owner: traderA, seller: traderB },
          { owner: traderB, seller: traderA },
        ],
        [tokenPoolConfig, tradePoolConfig],
        [1.01 * LAMPORTS_PER_SOL, 1.5 * LAMPORTS_PER_SOL]
      ).map(async ([{ owner, seller }, config, price]) => {
        await expect(
          testMakePoolSellNft({
            tswap,
            owner,
            seller,
            config,
            expectedLamports: config === tokenPoolConfig ? price : price - 1234,
            expectedRentBySeller: 0, // doesn't matter
          })
        ).rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));
      })
    );
  });

  it("sell non-WL nft fails", async () => {
    await Promise.all(
      [tradePoolConfig, tokenPoolConfig].map(async (config) => {
        const [owner, seller] = await makeNTraders(2);
        const { mint, ata } = await makeMintTwoAta(seller, owner);
        const { mint: badMint, ata: badAta } = await makeMintTwoAta(
          seller,
          owner
        );
        const {
          proofs: [wlNft],
          whitelist,
        } = await makeWhitelist([mint]);
        await testMakePool({ tswap, owner, whitelist, config });

        // Both:
        // 1) non-WL mint + good ATA
        // 2) WL mint + bad ATA
        // should fail.
        for (const { currMint, currAta, err } of [
          {
            currMint: badMint,
            currAta: ata,
            err: swapSdk.getErrorCodeHex("InvalidProof"),
          },
          { currMint: mint, currAta: badAta, err: TOKEN_ACCT_WRONG_MINT_ERR },
        ]) {
          const {
            tx: { ixs },
          } = await swapSdk.sellNft({
            whitelist,
            nftMint: currMint,
            nftSellerAcc: currAta,
            owner: owner.publicKey,
            seller: seller.publicKey,
            config,
            proof: wlNft.proof,
            minPrice: new BN(
              config === tokenPoolConfig
                ? LAMPORTS_PER_SOL
                : LAMPORTS_PER_SOL - 1234
            ),
          });

          await expect(
            buildAndSendTx({
              provider: TEST_PROVIDER,
              ixs,
              extraSigners: [seller],
            })
          ).rejectedWith(err);
        }
      })
    );
  });
});

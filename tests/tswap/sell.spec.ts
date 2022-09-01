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

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap } = await beforeHook());
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
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        // Selling is 1 tick lower than start price for trade pools.
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
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
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        seller,
        config,
        expectedLamports:
          config === tokenPoolConfig
            ? LAMPORTS_PER_SOL
            : LAMPORTS_PER_SOL - 1234,
        minLamports: config === tokenPoolConfig ? price : price - 1234,
      });
    }
  });

  it("sell into nft pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    for (const sellType of ["trade", "token"] as const) {
      await expect(
        testMakePoolSellNft({
          sellType,
          tswap,
          owner: traderA,
          seller: traderB,
          config: nftPoolConfig,
          expectedLamports: LAMPORTS_PER_SOL,
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
    }
  });

  it("sellNft(Trade|Token)Pool into (Token|Trade) pool fails", async () => {
    const [traderA, traderB] = await makeNTraders(2);
    for (const sellType of ["trade", "token"] as const) {
      await expect(
        testMakePoolSellNft({
          sellType,
          tswap,
          owner: traderA,
          seller: traderB,
          // Reverse the pool type vs the sell instr type.
          config: sellType === "trade" ? tokenPoolConfig : tradePoolConfig,
          expectedLamports: LAMPORTS_PER_SOL,
        })
      ).rejectedWith(swapSdk.getErrorCodeHex("WrongPoolType"));
    }
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
            sellType: config === tradePoolConfig ? "trade" : "token",
            tswap,
            owner,
            seller,
            config,
            expectedLamports: config === tokenPoolConfig ? price : price - 1234,
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
            type: config === tradePoolConfig ? "trade" : "token",
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

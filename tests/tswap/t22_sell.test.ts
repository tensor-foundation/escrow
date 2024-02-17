import { AddressLookupTableAccount, Keypair, PublicKey } from "@solana/web3.js";
import { cartesian } from "../shared";
import {
  adjustSellMinLamports,
  beforeHook,
  defaultSellExpectedLamports,
  createFundedHolderAndMintAndTokenT22,
  makeNTraders,
  testMakePoolSellNft,
  testMakePoolSellNftT22,
  tokenPoolConfig,
  tradePoolConfig,
  createAssociatedTokenAccountT22,
  createMintAndTokenT22,
} from "./common";

describe("[Token 2022] tswap sell", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("[T22] sell into token/trade pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const expectedLamports = defaultSellExpectedLamports(
        config === tokenPoolConfig
      );

      const { mint, token } = await createMintAndTokenT22(seller.publicKey);
      await createAssociatedTokenAccountT22(owner.publicKey, mint);

      await testMakePoolSellNftT22({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        mint,
        seller,
        sellerToken: token,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(
          config === tokenPoolConfig,
          expectedLamports
        ),
      });
    }
  });

  it("[T22] sell into token/trade pool (pay taker broker)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });

    // Intentionally do this serially (o/w balances will race).
    for (const [{ owner, seller }, config] of cartesian(
      [
        { owner: traderA, seller: traderB },
        { owner: traderB, seller: traderA },
      ],
      [tokenPoolConfig, tradePoolConfig]
    )) {
      const expectedLamports = defaultSellExpectedLamports(
        config === tokenPoolConfig
      );

      const { mint, token } = await createMintAndTokenT22(seller.publicKey);
      await createAssociatedTokenAccountT22(owner.publicKey, mint);

      const takerBroker = Keypair.generate().publicKey;
      await testMakePoolSellNftT22({
        sellType: config === tradePoolConfig ? "trade" : "token",
        tswap,
        owner,
        mint,
        seller,
        sellerToken: token,
        config,
        expectedLamports,
        minLamports: adjustSellMinLamports(
          config === tokenPoolConfig,
          expectedLamports
        ),
        takerBroker,
      });
    }
  });
});

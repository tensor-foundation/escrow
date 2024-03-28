import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  beforeHook,
  makeNTraders,
  nftPoolConfig,
  testMakePoolBuyNftT22,
  testMakePoolBuyNftWns,
} from "./common";

describe("[WNS Token 2022] tswap buy", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("[WNS] buy from nft pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testMakePoolBuyNftWns({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("[WNS] buy from nft pool (pay taker broker)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      const takerBroker = Keypair.generate().publicKey;
      await testMakePoolBuyNftWns({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
        takerBroker,
      });
    }
  });
});

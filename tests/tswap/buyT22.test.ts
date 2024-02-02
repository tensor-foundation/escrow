import { BN, LangErrorCode } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getTransactionConvertedToLegacy,
  hexCode,
} from "@tensor-hq/tensor-common";
import { expect } from "chai";
import {
  buildAndSendTx,
  cartesian,
  castPoolConfigAnchor,
  COMMON_BAD_ROYALTY_ERR,
  createTokenAuthorizationRules,
  CurveTypeAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  swapSdk,
  TakerSide,
  TEST_PROVIDER,
} from "../shared";
import {
  beforeHook,
  computeTakerPrice,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  TAKER_FEE_PCT,
  testDepositNft,
  testMakePool,
  testMakePoolBuyNft,
  testMakePoolBuyNftT22,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("[Token 2022] tswap buy", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("[T22] buy from nft pool", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      await testMakePoolBuyNftT22({
        tswap,
        owner,
        buyer,
        config: nftPoolConfig,
        expectedLamports: LAMPORTS_PER_SOL,
      });
    }
  });

  it("[T22] buy from nft pool (pay taker broker)", async () => {
    const [traderA, traderB] = await makeNTraders({ n: 2 });
    // Intentionally do this serially (o/w balances will race).
    for (const { owner, buyer } of [
      { owner: traderA, buyer: traderB },
      { owner: traderB, buyer: traderA },
    ]) {
      const takerBroker = Keypair.generate().publicKey;
      await testMakePoolBuyNftT22({
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

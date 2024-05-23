import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import { expect } from "chai";
import { castPoolTypeAnchor, PoolType, TensorWhitelistSDK } from "../../src";
import {
  buildAndSendTx,
  createTokenAuthorizationRules,
  getLamports,
  COMMON_CREATOR_MISMATCH_ERR,
  PoolConfigAnchor,
  swapSdk,
  COMMON_INSUFFICIENT_FUNDS_ERR,
} from "../shared";
import {
  adjustSellMinLamports,
  beforeHook,
  defaultSellExpectedLamports,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  MAKER_REBATE_PCT,
  testAttachPoolToMargin,
  testClosePool,
  testDepositIntoMargin,
  testDetachPoolFromMargin,
  testEditPool,
  testMakeMargin,
  testMakePool,
  testSellNft,
  testWithdrawFromMargin,
  tokenPoolConfig,
  tradePoolConfig,
} from "./common";

describe("margin account", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("inits > deposits > withdraws > closes margin acc", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const { marginPda, marginNr, marginRent } = await testMakeMargin({ owner });

    //deposit
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL,
    });

    //withdraw
    await testWithdrawFromMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL,
    });

    //try withdraw into rent, should fail
    await expect(
      testWithdrawFromMargin({
        owner,
        marginNr,
        marginPda,
        amount: 1,
      })
    ).to.be.rejectedWith(COMMON_INSUFFICIENT_FUNDS_ERR);

    //deposit again, so we can see if it's withdrawn correctly
    await testDepositIntoMargin({
      owner,
      marginNr,
      marginPda,
      amount: LAMPORTS_PER_SOL,
    });

    const lamports = await getLamports(marginPda);
    expect(lamports).to.eq(marginRent + LAMPORTS_PER_SOL);

    //close and check amount move out correctly
    const preCloseOwnerBalance = await getLamports(owner.publicKey);
    const {
      tx: { ixs: ixsClose },
    } = await swapSdk.closeMarginAcc({
      owner: owner.publicKey,
      marginNr: marginNr,
    });
    await buildAndSendTx({
      ixs: ixsClose,
      extraSigners: [owner],
    });
    const postCloseOwnerBalance = await getLamports(owner.publicKey);
    expect(postCloseOwnerBalance).to.eq(preCloseOwnerBalance! + lamports!);
  });

  it("creates multiple margin accs", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const name = "hello_world";
    const nameBuffer = TensorWhitelistSDK.nameToBuffer(name);

    //1
    const { ixs, marginNr } = await testMakeMargin({ owner });

    //try 1 again, should fail
    await expect(
      buildAndSendTx({
        ixs,
        extraSigners: [owner],
      })
    ).to.be.rejectedWith("0x0");

    //2
    const { marginNr: marginNr2 } = await testMakeMargin({ owner });
    expect(marginNr2).to.eq(marginNr + 1);
  });
});

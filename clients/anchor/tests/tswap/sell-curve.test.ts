import { BN } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
  AddressLookupTableAccount,
  PublicKey
} from "@solana/web3.js";
import { expect } from "chai";
import {
  CurveTypeAnchor,
  PoolConfigAnchor,
  PoolTypeAnchor,
  TakerSide,
  buildAndSendTx,
  swapSdk
} from "../shared";
import { testInitUpdateMintProof } from "../twhitelist/common";
import {
  beforeHook,
  computeDepositAmount,
  computeTakerPrice,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  testMakePool
} from "./common";

describe("tswap sell", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("sell a ton with default exponential curve + tolerance", async () => {

    // prime #
    const numSells = 109;

    const [traderA, traderB] = await makeNTraders({ n: 2, sol: 200_000 });
    const config: PoolConfigAnchor = {
      poolType: PoolTypeAnchor.Token,
      curveType: CurveTypeAnchor.Exponential,
      // ~2 SOL (prime #)
      startingPrice: new BN(2_083_195_757),
      // 17.21% (prime #)
      delta: new BN(17_21),
      mmCompoundFees: true,
      mmFeeBps: null,
    };

    //prepare multiple nfts
    const nfts = await Promise.all(
      new Array(numSells).fill(null).map(async () => {
        const {
          mint,
          ata: ataB,
          otherAta: ataA,
        } = await makeMintTwoAta({ owner: traderB, other: traderA });
        return { mint, ataA, ataB };
      })
    );

    //prepare tree & pool
    const { proofs, whitelist } = await makeProofWhitelist(
      nfts.map((nft) => nft.mint)
    );
    await testMakePool({ tswap, owner: traderA, whitelist, config });

    // deposit enough SOL.
    const depositAmount = computeDepositAmount({
      config,
      nftCount: numSells,
    });
    const {
      tx: { ixs },
    } = await swapSdk.depositSol({
      whitelist,
      owner: traderA.publicKey,
      config,
      lamports: depositAmount,
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [traderA],
    });

    // sell NFTs (sequentially).
    for (const [sellCount, nft] of nfts.entries()) {
      const currPrice = computeTakerPrice({
        config,
        buyCount: 0,
        sellCount,
        takerSide: TakerSide.Sell,
      });

      const proof = proofs.find((p) => p.mint === nft.mint)!.proof;
      await testInitUpdateMintProof({
        user: traderB,
        mint: nft.mint,
        whitelist,
        proof,
        expectedProofLen: 8,
      });

      const {
        tx: { ixs },
      } = await swapSdk.sellNft({
        type: "token",
        whitelist,
        nftMint: nft.mint,
        nftSellerAcc: nft.ataB,
        owner: traderA.publicKey,
        seller: traderB.publicKey,
        config: config,
        minPrice: currPrice,
        tokenProgram: TOKEN_PROGRAM_ID,
      });
      await buildAndSendTx({
        ixs,
        extraSigners: [traderB],
      });
      console.debug(
        `sold nft (count: ${sellCount}) at ${currPrice.toNumber()}`
      );
    }

    // Check NFTs have all been transferred.
    await Promise.all(
      nfts.map(async (nft) => {
        const traderAccB = await getAccount(nft.ataB);
        expect(traderAccB.amount.toString()).eq("0");
        const traderAccA = await getAccount(nft.ataA);
        expect(traderAccA.amount.toString()).eq("1");
      })
    );
  });
});

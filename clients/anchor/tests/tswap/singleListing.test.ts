import { BN } from "@coral-xyz/anchor";
import {
  createApproveInstruction,
  TokenAccountNotFoundError,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { isNullLike } from "@tensor-hq/tensor-common";
import { expect } from "chai";
import { TAKER_BROKER_PCT } from "../../src";
import {
  buildAndSendTx,
  createTokenAuthorizationRules,
  getLamports,
  swapSdk,
  withLamports,
} from "../shared";
import {
  beforeHook,
  calcFeesRebates,
  createAndFundAta,
  CreatorInput,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testDepositNft,
  testMakeList,
  testMakePool,
} from "./common";

describe("tswap single listing", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("list + delist single listing", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    const ownerLamports1 = await getLamports(owner.publicKey);
    const { escrowPda } = await testMakeList({ mint, price, ata, owner });

    //owner's lamports went down
    const ownerLamports2 = await getLamports(owner.publicKey);
    expect(ownerLamports2).lt(ownerLamports1!);

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.delist({
      nftMint: mint,
      nftDest: ata,
      owner: owner.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    });
    await buildAndSendTx({
      ixs: delistIxs,
      extraSigners: [owner],
    });
    let traderAcc = await getAccount(ata);
    expect(traderAcc.amount.toString()).eq("1");
    // Escrow closed.
    await expect(getAccount(escrowPda)).rejectedWith(TokenAccountNotFoundError);

    //owner's lamports up since account got closed
    const ownerLamports3 = await getLamports(owner.publicKey);
    expect(ownerLamports3).gt(ownerLamports2!);
  });

  it("delegate: list + delist works", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    // --------------------------------------- list

    const ownerLamports1 = await getLamports(owner.publicKey);
    const { escrowPda } = await testMakeList({
      mint,
      price,
      ata,
      owner,
    });

    //owner's lamports went down
    const ownerLamports2 = await getLamports(owner.publicKey);
    expect(ownerLamports2).lt(ownerLamports1!);

    // --------------------------------------- delegate

    //setup a delegate (!) WHILE the NFT is listed
    const delegate = Keypair.generate();
    const approveIx = createApproveInstruction(
      ata,
      delegate.publicKey,
      owner.publicKey,
      10
    );
    await buildAndSendTx({
      ixs: [approveIx],
      extraSigners: [owner],
    });
    const acc = await getAccount(ata);
    expect(acc.delegate?.toString()).to.eq(delegate.publicKey.toString());

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.delist({
      nftMint: mint,
      nftDest: ata,
      owner: owner.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    });
    await buildAndSendTx({
      ixs: delistIxs,
      extraSigners: [owner],
    });
    let traderAcc = await getAccount(ata);
    expect(traderAcc.amount.toString()).eq("1");
    // Escrow closed.
    await expect(getAccount(escrowPda)).rejectedWith(TokenAccountNotFoundError);

    //owner's lamports up since account got closed
    const ownerLamports3 = await getLamports(owner.publicKey);
    expect(ownerLamports3).gt(ownerLamports2!);
  });

  it("list + delist single listing (separate payer)", async () => {
    const [owner, payer] = await makeNTraders({ n: 2 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    const payerLamports1 = await getLamports(payer.publicKey);
    const ownerLamports1 = await getLamports(owner.publicKey);

    const { escrowPda } = await testMakeList({
      mint,
      price,
      ata,
      owner,
      payer,
    });

    const payerLamports2 = await getLamports(payer.publicKey);
    const ownerLamports2 = await getLamports(owner.publicKey);

    //only payer's lamports went down
    expect(payerLamports2).lt(payerLamports1!);
    expect(ownerLamports2).eq(ownerLamports1!);

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.delist({
      nftMint: mint,
      nftDest: ata,
      owner: owner.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      payer: payer.publicKey,
    });
    await buildAndSendTx({
      ixs: delistIxs,
      extraSigners: [owner, payer],
    });
    let traderAcc = await getAccount(ata);
    expect(traderAcc.amount.toString()).eq("1");
    // Escrow closed.
    await expect(getAccount(escrowPda)).rejectedWith(TokenAccountNotFoundError);

    const payerLamports3 = await getLamports(payer.publicKey);
    const ownerLamports3 = await getLamports(owner.publicKey);

    //payer's lamports up since account got closed
    expect(payerLamports3).gt(payerLamports2!);
    expect(ownerLamports3).eq(ownerLamports2!);
  });

  it("list + edit + buy single listing (taker broker)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    const royaltyBps = 10000;
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;

    for (const price of [100, LAMPORTS_PER_SOL, 0.5 * LAMPORTS_PER_SOL]) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const takerBroker = Keypair.generate().publicKey;
      const { mint, ata, otherAta } = await makeMintTwoAta({
        owner,
        other: buyer,
        royaltyBps,
        creators,
        programmable,
        ruleSetAddr,
      });

      await testMakeList({
        mint,
        price: new BN(price),
        ata,
        owner,
      });

      // --------------------------------------- edit

      const editedPrice = price * 2;
      const {
        tx: { ixs },
      } = await swapSdk.editSingleListing({
        nftMint: mint,
        owner: owner.publicKey,
        price: new BN(editedPrice),
      });
      await buildAndSendTx({
        ixs,
        extraSigners: [owner],
      });

      // --------------------------------------- buy

      const {
        tx: { ixs: badBuyIxs },
      } = await swapSdk.buySingleListing({
        buyer: buyer.publicKey,
        maxPrice: new BN(price), //<-- original price
        nftBuyerAcc: otherAta,
        nftMint: mint,
        owner: owner.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID
      });
      await expect(
        buildAndSendTx({
          ixs: badBuyIxs,
          extraSigners: [buyer],
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));

      await buySingleListing({
        buyer,
        expectedLamports: editedPrice,
        mint,
        otherAta,
        owner,
        creators,
        royaltyBps,
        programmable,
        takerBroker,
      });
    }
  });

  it("list + edit + buy single listing (pay optional royalties)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    const royaltyBps = 10000;

    for (const optionalRoyaltyPct of [null, 0, 33, 50, 100]) {
      const price = LAMPORTS_PER_SOL;
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata, otherAta } = await makeMintTwoAta({
        owner,
        other: buyer,
        royaltyBps,
        creators,
      });

      await testMakeList({
        mint,
        price: new BN(price),
        ata,
        owner,
      });

      // --------------------------------------- edit

      const editedPrice = price * 2;
      const {
        tx: { ixs },
      } = await swapSdk.editSingleListing({
        nftMint: mint,
        owner: owner.publicKey,
        price: new BN(editedPrice),
      });
      await buildAndSendTx({
        ixs,
        extraSigners: [owner],
      });

      // --------------------------------------- buy

      const {
        tx: { ixs: badBuyIxs },
      } = await swapSdk.buySingleListing({
        buyer: buyer.publicKey,
        maxPrice: new BN(price), //<-- original price
        nftBuyerAcc: otherAta,
        nftMint: mint,
        owner: owner.publicKey,
        optionalRoyaltyPct,
        tokenProgram: TOKEN_PROGRAM_ID
      });
      await expect(
        buildAndSendTx({
          ixs: badBuyIxs,
          extraSigners: [buyer],
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));

      await buySingleListing({
        buyer,
        expectedLamports: editedPrice,
        mint,
        otherAta,
        owner,
        creators,
        royaltyBps,
        optionalRoyaltyPct,
      });
    }
  });

  it("list + delist single listing", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    const { escrowPda } = await testMakeList({ mint, price, ata, owner });

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.delist({
      nftMint: mint,
      nftDest: ata,
      owner: owner.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    });
    await buildAndSendTx({
      ixs: delistIxs,
      extraSigners: [owner],
    });
    let traderAcc = await getAccount(ata);
    expect(traderAcc.amount.toString()).eq("1");
    // Escrow closed.
    await expect(getAccount(escrowPda)).rejectedWith(TokenAccountNotFoundError);
  });

  it("can't list twice", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    await testMakeList({ mint, price, ata, owner });
    await expect(testMakeList({ mint, price, ata, owner })).to.be.rejectedWith(
      "0x0"
    );
  });

  it("can't list if nft already in pool escrow", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    // --------------------------------------- deposit

    const {
      whitelist,
      proofs: [wlNft],
      // Long proof!
    } = await makeProofWhitelist([mint], 1);

    const config = nftPoolConfig;
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

    // --------------------------------------- list

    await expect(testMakeList({ mint, price, ata, owner })).to.be.rejectedWith(
      "0x0"
    );
  });

  it("can't deposit into pool escrow if nft already single listed", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    // --------------------------------------- list

    await testMakeList({ mint, price, ata, owner });

    // --------------------------------------- deposit

    const {
      whitelist,
      proofs: [wlNft],
      // Long proof!
    } = await makeProofWhitelist([mint], 1);

    const config = nftPoolConfig;
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
        wlNft,
        whitelist,
      })
    ).to.be.rejectedWith("0x0");
  });

  it("can't edit a listing that wasnt created", async () => {
    const [owner] = await makeNTraders({ n: 1 });
    const royaltyBps = 10000;
    const ruleSetAddr = await createTokenAuthorizationRules({ payer: owner });
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundAta({
      owner,
      royaltyBps,
      creators,
      programmable,
      ruleSetAddr,
    });

    const {
      tx: { ixs },
    } = await swapSdk.editSingleListing({
      nftMint: mint,
      owner: owner.publicKey,
      price: new BN(123),
    });
    await expect(
      buildAndSendTx({
        ixs,
        extraSigners: [owner],
      })
    ).to.be.rejectedWith("0xbc4");
  });
});

const buySingleListing = async ({
  mint,
  otherAta,
  owner,
  buyer,
  expectedLamports,
  royaltyBps,
  creators,
  programmable,
  lookupTableAccount,
  optionalRoyaltyPct = null,
  takerBroker = null,
}: {
  mint: PublicKey;
  otherAta: PublicKey;
  owner: Keypair;
  buyer: Keypair;
  expectedLamports: number;
  royaltyBps?: number;
  creators?: CreatorInput[];
  programmable?: boolean;
  lookupTableAccount?: AddressLookupTableAccount | null;
  optionalRoyaltyPct?: number | null;
  takerBroker?: PublicKey | null;
}) => {
  const {
    tx: { ixs: buyIxs },
    tswapPda,
    escrowPda,
  } = await swapSdk.buySingleListing({
    buyer: buyer.publicKey,
    maxPrice: new BN(expectedLamports),
    nftBuyerAcc: otherAta,
    nftMint: mint,
    owner: owner.publicKey,
    optionalRoyaltyPct,
    takerBroker,
    tokenProgram: TOKEN_PROGRAM_ID
  });
  return await withLamports(
    {
      prevFeeAccLamports: tswapPda,
      prevSellerLamports: owner.publicKey,
      prevBuyerLamports: buyer.publicKey,
      ...(takerBroker ? { prevTakerBroker: takerBroker } : {}),
    },
    async ({
      prevFeeAccLamports,
      prevSellerLamports,
      prevBuyerLamports,
      prevTakerBroker,
    }) => {
      await buildAndSendTx({
        ixs: buyIxs,
        extraSigners: [buyer],
        lookupTableAccounts: lookupTableAccount
          ? [lookupTableAccount]
          : undefined,
      });

      //NFT moved from escrow to trader
      const traderAcc = await getAccount(otherAta);
      expect(traderAcc.amount.toString()).eq("1");
      // Escrow closed.
      await expect(getAccount(escrowPda)).rejectedWith(
        TokenAccountNotFoundError
      );

      //fees
      const feeAccLamports = await getLamports(tswapPda);
      const { tswapFee, brokerFee, makerRebate, takerFee } =
        calcFeesRebates(expectedLamports);
      expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).approximately(
        tswapFee,
        1
      );
      if (!isNullLike(takerBroker) && TAKER_BROKER_PCT > 0 && brokerFee > 0) {
        const brokerLamports = await getLamports(takerBroker);
        expect(brokerLamports! - (prevTakerBroker ?? 0)).eq(brokerFee);
      }

      // Check creators' balances.
      let creatorsFee = 0;
      // Trade pools (when being bought from) charge no royalties.
      if (!!creators?.length && royaltyBps) {
        //skip creators when royalties not enough to cover rent
        let skippedCreators = 0;
        for (const c of creators) {
          if (c.share <= 1) {
            skippedCreators++;
          }
        }

        const temp = Math.trunc(
          (programmable
            ? royaltyBps / 1e4
            : !isNullLike(optionalRoyaltyPct)
            ? ((royaltyBps / 1e4) * optionalRoyaltyPct) / 100
            : 0) *
            expectedLamports *
            (1 - skippedCreators / 100)
        );

        for (const c of creators) {
          const cBal = await getLamports(c.address);
          //only run the test if share > 1, else it's skipped && cBal exists (it wont if 0 royalties were paid)
          if (c.share > 1 && !isNullLike(cBal)) {
            const expected = Math.trunc((temp * c.share) / 100);
            expect(cBal).eq(expected);
            creatorsFee += expected;
          }
        }
      }

      // Buyer pays full amount.
      const currBuyerLamports = await getLamports(buyer.publicKey);
      //skip check for programmable, since you create additional PDAs that cost lamports (not worth tracking)
      if (!programmable) {
        expect(currBuyerLamports! - prevBuyerLamports!).eq(
          -1 * (expectedLamports + takerFee + creatorsFee)
        );
      }

      // amount sent to owner's wallet
      const currSellerLamports = await getLamports(owner.publicKey);
      expect(currSellerLamports! - prevSellerLamports!).eq(
        expectedLamports +
          makerRebate +
          (await swapSdk.getSingleListingRent()) +
          (await swapSdk.getTokenAcctRent())
      );
    }
  );
};

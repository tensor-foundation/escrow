import { BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TokenAccountNotFoundError,
  TOKEN_2022_PROGRAM_ID,
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
  getLamports,
  swapSdk,
  TEST_CONN_PAYER,
  TEST_PROVIDER,
  withLamports,
} from "../shared";
import {
  createCollectionWithRoyalties,
  mintNft,
  wnsMint,
  wnsTokenAccount,
} from "../wns";
import {
  beforeHook,
  calcFeesRebates,
  getAccountWithProgramId,
  makeNTraders,
  testMakeListWns,
} from "./common";

describe("[WNS Token 2022] tswap single listing", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("[WNS] list + delist single listing", async () => {
    const { collection } = await createCollectionWithRoyalties(
      TEST_PROVIDER,
      TEST_CONN_PAYER.payer,
      TEST_CONN_PAYER.payer,
      {
        name: "test",
        symbol: "TST",
        maxSize: 10,
        uri: "https://test.com",
      }
    );

    const creator = Keypair.generate().publicKey;
    const { mint, token } = await mintNft(
      TEST_PROVIDER,
      TEST_CONN_PAYER.payer.publicKey, // minter
      TEST_CONN_PAYER.payer,
      TEST_CONN_PAYER.payer,
      {
        collection: collection.toString(),
        creators: [
          {
            address: creator.toString(),
            share: 100,
          },
        ],
        name: "WSN mint",
        symbol: "WSN",
        royaltyBasisPoints: 500,
        uri: "https://test.com",
      }
    );
    const minter = TEST_CONN_PAYER.payer;

    const price = new BN(LAMPORTS_PER_SOL);

    // --------------------------------------- list

    const holderLamports1 = await getLamports(minter.publicKey);

    const {
      tx: { ixs },
      escrowPda,
      singleListing,
    } = await swapSdk.wnsList({
      price: price,
      nftMint: mint,
      nftSource: token,
      owner: minter.publicKey,
      collectionMint: collection,
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [minter],
    });

    const traderAcc = await getAccountWithProgramId(
      token,
      TOKEN_2022_PROGRAM_ID
    );
    expect(traderAcc.amount.toString()).eq("0");
    const escrowAcc = await getAccountWithProgramId(
      escrowPda,
      TOKEN_2022_PROGRAM_ID
    );
    expect(escrowAcc.amount.toString()).eq("1");

    const singleListingAcc = await swapSdk.fetchSingleListing(singleListing);
    expect(singleListingAcc.owner.toBase58()).to.eq(
      minter.publicKey.toBase58()
    );
    expect(singleListingAcc.nftMint.toBase58()).to.eq(mint.toBase58());
    expect(singleListingAcc.price.toNumber()).to.eq(price.toNumber());

    const holderLamports2 = await getLamports(minter.publicKey);
    expect(holderLamports2).lt(holderLamports1!);

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.wnsDelist({
      nftMint: mint,
      nftDest: getAssociatedTokenAddressSync(
        mint,
        minter.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID
      ),
      owner: minter.publicKey,
      collectionMint: collection,
    });
    await buildAndSendTx({
      ixs: delistIxs,
      extraSigners: [minter],
    });

    let holderAcc = await getAccountWithProgramId(
      getAssociatedTokenAddressSync(
        mint,
        minter.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID
      ),
      TOKEN_2022_PROGRAM_ID
    );
    expect(holderAcc.amount.toString()).eq("1");
    // Escrow closed.
    await expect(
      getAccountWithProgramId(escrowPda, TOKEN_2022_PROGRAM_ID)
    ).rejectedWith(TokenAccountNotFoundError);

    //owner's lamports up since account got closed
    const holderLamports3 = await getLamports(minter.publicKey);
    expect(holderLamports3).gt(holderLamports2!);
  });

  it("[WNS] list + edit + buy single listing (taker broker)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    for (const price of [100, LAMPORTS_PER_SOL, 0.5 * LAMPORTS_PER_SOL]) {
      const takerBroker = Keypair.generate().publicKey;

      const royaltyBps = 500;
      const { mint, token: ata, collection } = await wnsMint(owner.publicKey, undefined, royaltyBps);
      const { token: otherAta } = await wnsTokenAccount(buyer.publicKey, mint);

      await testMakeListWns({
        mint,
        price: new BN(price),
        ata,
        owner,
        collection,
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
      } = await swapSdk.wnsBuySingleListing({
        buyer: buyer.publicKey,
        maxPrice: new BN(price), //<-- original price
        nftBuyerAcc: otherAta,
        nftMint: mint,
        owner: owner.publicKey,
        collectionMint: collection,
      });
      await expect(
        buildAndSendTx({
          ixs: badBuyIxs,
          extraSigners: [buyer],
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));

      await wnsBuySingleListing({
        buyer,
        expectedLamports: editedPrice,
        mint,
        otherAta,
        owner,
        takerBroker,
        collectionMint: collection,
        royaltyBps,
      });
    }
  });
});

const wnsBuySingleListing = async ({
  mint,
  otherAta,
  owner,
  buyer,
  collectionMint,
  expectedLamports,
  royaltyBps = 0,
  lookupTableAccount,
  takerBroker = null,
}: {
  mint: PublicKey;
  otherAta: PublicKey;
  owner: Keypair;
  buyer: Keypair;
  collectionMint: PublicKey;
  expectedLamports: number;
  royaltyBps?: number;
  lookupTableAccount?: AddressLookupTableAccount | null;
  takerBroker?: PublicKey | null;
}) => {
  const {
    tx: { ixs: buyIxs },
    tswapPda,
    escrowPda,
  } = await swapSdk.wnsBuySingleListing({
    buyer: buyer.publicKey,
    maxPrice: new BN(expectedLamports),
    nftBuyerAcc: otherAta,
    nftMint: mint,
    owner: owner.publicKey,
    takerBroker,
    collectionMint,
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
      const traderAcc = await getAccountWithProgramId(
        otherAta,
        TOKEN_2022_PROGRAM_ID
      );
      expect(traderAcc.amount.toString()).eq("1");
      // Escrow closed.
      await expect(
        getAccountWithProgramId(escrowPda, TOKEN_2022_PROGRAM_ID)
      ).rejectedWith(TokenAccountNotFoundError);

      //fees
      const creatorsFee = (expectedLamports * royaltyBps) / 10000;
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

      // Buyer pays full amount.
      const currBuyerLamports = await getLamports(buyer.publicKey);
      expect(currBuyerLamports! - prevBuyerLamports!).eq(
        -1 * (expectedLamports + takerFee + creatorsFee)
      );

      // amount sent to owner's wallet
      const currSellerLamports = await getLamports(owner.publicKey);
      expect(currSellerLamports! - prevSellerLamports!).eq(
        expectedLamports +
          makerRebate +
          (await swapSdk.getSingleListingRent()) +
          (await swapSdk.getTokenAcctRentForMint(mint, TOKEN_2022_PROGRAM_ID))
      );
    }
  );
};

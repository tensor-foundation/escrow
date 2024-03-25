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
import { buildAndSendTx, getLamports, swapSdk, withLamports } from "../shared";
import {
  beforeHook,
  calcFeesRebates,
  createAssociatedTokenAccountT22,
  createFundedHolderAndMintAndTokenT22,
  createMintAndTokenT22,
  getAccountWithProgramId,
  makeNTraders,
  testMakeList,
  testMakeListT22,
} from "./common";

describe("[Token 2022] tswap single listing", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("[T22] list + delist single listing", async () => {
    const { mint, token, holder } = await createFundedHolderAndMintAndTokenT22(
      10
    );
    const price = new BN(LAMPORTS_PER_SOL);

    // --------------------------------------- list

    const holderLamports1 = await getLamports(holder.publicKey);

    const {
      tx: { ixs },
      escrowPda,
      singleListing,
    } = await swapSdk.listT22({
      price: price,
      nftMint: mint,
      nftSource: token,
      owner: holder.publicKey,
    });
    await buildAndSendTx({
      ixs,
      extraSigners: [holder],
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
      holder.publicKey.toBase58()
    );
    expect(singleListingAcc.nftMint.toBase58()).to.eq(mint.toBase58());
    expect(singleListingAcc.price.toNumber()).to.eq(price.toNumber());

    const holderLamports2 = await getLamports(holder.publicKey);
    expect(holderLamports2).lt(holderLamports1!);

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.delistT22({
      nftMint: mint,
      nftDest: getAssociatedTokenAddressSync(
        mint,
        holder.publicKey,
        undefined,
        TOKEN_2022_PROGRAM_ID
      ),
      owner: holder.publicKey,
    });
    await buildAndSendTx({
      ixs: delistIxs,
      extraSigners: [holder],
    });

    let holderAcc = await getAccountWithProgramId(
      getAssociatedTokenAddressSync(
        mint,
        holder.publicKey,
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
    const holderLamports3 = await getLamports(holder.publicKey);
    expect(holderLamports3).gt(holderLamports2!);
  });

  it("[T22] list + edit + buy single listing (taker broker)", async () => {
    const [owner, buyer] = await makeNTraders({ n: 2 });
    for (const price of [100, LAMPORTS_PER_SOL, 0.5 * LAMPORTS_PER_SOL]) {
      const takerBroker = Keypair.generate().publicKey;

      const { mint, token: ata } = await createMintAndTokenT22(owner.publicKey);
      const { token: otherAta } = await createAssociatedTokenAccountT22(
        buyer.publicKey,
        mint
      );

      await testMakeListT22({
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
      } = await swapSdk.buySingleListingT22({
        buyer: buyer.publicKey,
        maxPrice: new BN(price), //<-- original price
        nftBuyerAcc: otherAta,
        nftMint: mint,
        owner: owner.publicKey,
      });
      await expect(
        buildAndSendTx({
          ixs: badBuyIxs,
          extraSigners: [buyer],
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));

      await buySingleListingT22({
        buyer,
        expectedLamports: editedPrice,
        mint,
        otherAta,
        owner,
        takerBroker,
      });
    }
  });
});

const buySingleListingT22 = async ({
  mint,
  otherAta,
  owner,
  buyer,
  expectedLamports,
  lookupTableAccount,
  takerBroker = null,
}: {
  mint: PublicKey;
  otherAta: PublicKey;
  owner: Keypair;
  buyer: Keypair;
  expectedLamports: number;
  lookupTableAccount?: AddressLookupTableAccount | null;
  takerBroker?: PublicKey | null;
}) => {
  const {
    tx: { ixs: buyIxs },
    tswapPda,
    escrowPda,
  } = await swapSdk.buySingleListingT22({
    buyer: buyer.publicKey,
    maxPrice: new BN(expectedLamports),
    nftBuyerAcc: otherAta,
    nftMint: mint,
    owner: owner.publicKey,
    takerBroker,
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
        -1 * (expectedLamports + takerFee)
      );

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

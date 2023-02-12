import { BN } from "@project-serum/anchor";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  createTokenAuthorizationRules,
  getLamports,
  swapSdk,
  TEST_PROVIDER,
  withLamports,
} from "../shared";
import {
  beforeHook,
  createAndFundATA,
  getAccount,
  makeMintTwoAta,
  makeNTraders,
  makeProofWhitelist,
  nftPoolConfig,
  testDepositNft,
  testMakeList,
  testMakePool,
  TSWAP_FEE_PCT,
} from "./common";
import { TokenAccountNotFoundError } from "@solana/spl-token";
import { isNullLike } from "../../src";

describe("tswap single listing", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("list + delist single listing", async () => {
    const [owner] = await makeNTraders(1);
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      owner
    );
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundATA(
      owner,
      undefined,
      royaltyBps,
      creators,
      undefined,
      undefined,
      programmable,
      ruleSetAddr
    );

    const { escrowPda } = await testMakeList({ mint, price, ata, owner });

    // --------------------------------------- delist

    const {
      tx: { ixs: delistIxs },
    } = await swapSdk.delist({
      nftMint: mint,
      nftDest: ata,
      owner: owner.publicKey,
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

  it("list + edit + buy single listing", async () => {
    const [owner, buyer] = await makeNTraders(2);
    const royaltyBps = 10000;
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      owner
    );
    const programmable = true;

    for (const price of [100, LAMPORTS_PER_SOL, 0.33 * LAMPORTS_PER_SOL]) {
      const creators = Array(5)
        .fill(null)
        .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
      const { mint, ata, otherAta } = await makeMintTwoAta(
        owner,
        buyer,
        royaltyBps,
        creators,
        undefined,
        undefined,
        programmable,
        ruleSetAddr
      );

      const { escrowPda, tswapPda } = await testMakeList({
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
      });
      await expect(
        buildAndSendTx({
          ixs: badBuyIxs,
          extraSigners: [buyer],
        })
      ).to.be.rejectedWith(swapSdk.getErrorCodeHex("PriceMismatch"));

      const {
        tx: { ixs: buyIxs },
      } = await swapSdk.buySingleListing({
        buyer: buyer.publicKey,
        maxPrice: new BN(editedPrice),
        nftBuyerAcc: otherAta,
        nftMint: mint,
        owner: owner.publicKey,
      });
      return await withLamports(
        {
          prevFeeAccLamports: tswapPda,
          prevSellerLamports: owner.publicKey,
          prevBuyerLamports: buyer.publicKey,
        },
        async ({
          prevFeeAccLamports,
          prevSellerLamports,
          prevBuyerLamports,
        }) => {
          await buildAndSendTx({
            ixs: buyIxs,
            extraSigners: [buyer],
          });

          //NFT moved from escrow to trader
          const traderAcc = await getAccount(otherAta);
          expect(traderAcc.amount.toString()).eq("1");
          // Escrow closed.
          await expect(getAccount(escrowPda)).rejectedWith(
            TokenAccountNotFoundError
          );

          const feeAccLamports = await getLamports(tswapPda);
          const tswapFee = Math.trunc(editedPrice * TSWAP_FEE_PCT);
          //paid tswap fees (NB: fee account may be un-init before).
          expect(feeAccLamports! - (prevFeeAccLamports ?? 0)).eq(tswapFee);

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

            creatorsFee = Math.trunc(
              (programmable ? royaltyBps / 1e4 : 0) *
                editedPrice *
                (1 - skippedCreators / 100)
            );

            for (const c of creators) {
              const cBal = await getLamports(c.address);
              //only run the test if share > 1, else it's skipped && cBal exists (it wont if 0 royalties were paid)
              if (c.share > 1 && !isNullLike(cBal)) {
                expect(cBal).eq(
                  Math.trunc(
                    ((creatorsFee / (1 - skippedCreators / 100)) * c.share) /
                      100
                  )
                );
              }
            }
          }

          // Buyer pays full amount.
          const currBuyerLamports = await getLamports(buyer.publicKey);
          //skip check for programmable, since you create additional PDAs that cost lamports (not worth tracking)
          if (!programmable) {
            expect(currBuyerLamports! - prevBuyerLamports!).eq(
              -1 * (editedPrice + tswapFee + creatorsFee)
            );
          }

          // amount sent to owner's wallet
          const currSellerLamports = await getLamports(owner.publicKey);
          expect(currSellerLamports! - prevSellerLamports!).eq(
            editedPrice +
              (await swapSdk.getSingleListingRent()) +
              (await swapSdk.getTokenAcctRent())
          );
        }
      );
    }
  });

  it("can't list twice", async () => {
    const [owner] = await makeNTraders(1);
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      owner
    );
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundATA(
      owner,
      undefined,
      royaltyBps,
      creators,
      undefined,
      undefined,
      programmable,
      ruleSetAddr
    );

    await testMakeList({ mint, price, ata, owner });
    await expect(testMakeList({ mint, price, ata, owner })).to.be.rejectedWith(
      "0x0"
    );
  });

  it("can't list if nft already in pool escrow", async () => {
    const [owner] = await makeNTraders(1);
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      owner
    );
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundATA(
      owner,
      undefined,
      royaltyBps,
      creators,
      undefined,
      undefined,
      programmable,
      ruleSetAddr
    );

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
      commitment: "confirmed",
    });

    // --------------------------------------- list

    await expect(testMakeList({ mint, price, ata, owner })).to.be.rejectedWith(
      "0x0"
    );
  });

  it("can't deposit into pool escrow if nft already single listed", async () => {
    const [owner] = await makeNTraders(1);
    const royaltyBps = 10000;
    const price = new BN(LAMPORTS_PER_SOL);
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      owner
    );
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundATA(
      owner,
      undefined,
      royaltyBps,
      creators,
      undefined,
      undefined,
      programmable,
      ruleSetAddr
    );

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
        commitment: "confirmed",
      })
    ).to.be.rejectedWith("0x0");
  });

  it("can't edit a listing that wasnt created", async () => {
    const [owner] = await makeNTraders(1);
    const royaltyBps = 10000;
    const ruleSetAddr = await createTokenAuthorizationRules(
      TEST_PROVIDER,
      owner
    );
    const programmable = true;
    const creators = Array(5)
      .fill(null)
      .map((_) => ({ address: Keypair.generate().publicKey, share: 20 }));
    const { mint, ata } = await createAndFundATA(
      owner,
      undefined,
      royaltyBps,
      creators,
      undefined,
      undefined,
      programmable,
      ruleSetAddr
    );

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

import { BN } from "@coral-xyz/anchor";
import {
  AuthorityType,
  createInitializeAccount3Instruction,
  createInitializeImmutableOwnerInstruction,
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createInitializeNonTransferableMintInstruction,
  ExtensionType,
  getAccountLen,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getExtensionTypes,
  getMintLen,
  mintToChecked,
  setAuthority,
  TokenAccountNotFoundError,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import {
  AddressLookupTableAccount,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  buildAndSendTx,
  createTokenAuthorizationRules,
  getLamports,
  swapSdk,
  TEST_CONN_PAYER,
} from "../shared";
import {
  beforeHook,
  createAndFundAta,
  createFundedWallet,
  getAccount,
  getAccountWithProgramId,
  makeNTraders,
  testMakeList,
} from "./common";

describe("tswap single listing Token-2022", () => {
  // Keep these coupled global vars b/w tests at a minimal.
  let tswap: PublicKey;
  let lookupTableAccount: AddressLookupTableAccount | null;

  // All tests need these before they start.
  before(async () => {
    ({ tswapPda: tswap, lookupTableAccount } = await beforeHook());
  });

  it("list + delist single listing T22", async () => {
    const { mint, token, holder } = await generateTokenMintT22(10);
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
});

export const generateTokenMintT22 = async (
  sol: number
): Promise<{
  mint: PublicKey;
  token: PublicKey;
  holder: Keypair;
}> => {
  // creates a Token 2022 mint + metadata pointer

  const extensions = [ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);

  let lamports = await TEST_CONN_PAYER.conn.getMinimumBalanceForRentExemption(
    mintLen
  );
  const mint = Keypair.generate();

  const createMint = new Transaction()
    .add(
      SystemProgram.createAccount({
        fromPubkey: TEST_CONN_PAYER.payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    )
    .add(
      createInitializeMetadataPointerInstruction(
        mint.publicKey,
        TEST_CONN_PAYER.payer.publicKey,
        mint.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    )
    .add(
      createInitializeMint2Instruction(
        mint.publicKey,
        0,
        TEST_CONN_PAYER.payer.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID
      )
    );

  await sendAndConfirmTransaction(
    TEST_CONN_PAYER.conn,
    createMint,
    [TEST_CONN_PAYER.payer, mint],
    undefined
  );

  // create token

  const accountLen = getAccountLen([ExtensionType.ImmutableOwner]);
  lamports = await TEST_CONN_PAYER.conn.getMinimumBalanceForRentExemption(
    accountLen
  );

  const holder = Keypair.generate();
  const token = Keypair.generate();

  const createToken = new Transaction()
    .add(
      SystemProgram.transfer({
        fromPubkey: TEST_CONN_PAYER.payer.publicKey,
        toPubkey: holder.publicKey,
        lamports: sol * LAMPORTS_PER_SOL,
      })
    )
    .add(
      SystemProgram.createAccount({
        fromPubkey: TEST_CONN_PAYER.payer.publicKey,
        newAccountPubkey: token.publicKey,
        space: accountLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      })
    )
    .add(
      createInitializeImmutableOwnerInstruction(
        token.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    )
    .add(
      createInitializeAccount3Instruction(
        token.publicKey,
        mint.publicKey,
        holder.publicKey,
        TOKEN_2022_PROGRAM_ID
      )
    );

  await sendAndConfirmTransaction(
    TEST_CONN_PAYER.conn,
    createToken,
    [TEST_CONN_PAYER.payer, token],
    undefined
  );

  // mint token

  await mintToChecked(
    TEST_CONN_PAYER.conn,
    TEST_CONN_PAYER.payer,
    mint.publicKey,
    token.publicKey,
    TEST_CONN_PAYER.payer,
    1,
    0,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  // removes the authority from the mint

  await setAuthority(
    TEST_CONN_PAYER.conn,
    TEST_CONN_PAYER.payer,
    mint.publicKey,
    TEST_CONN_PAYER.payer,
    AuthorityType.MintTokens,
    null,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID
  );

  return { mint: mint.publicKey, token: token.publicKey, holder };
};

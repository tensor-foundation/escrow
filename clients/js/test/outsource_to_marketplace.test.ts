import {
  appendTransactionMessageInstruction,
  getAddressDecoder,
  pipe,
} from '@solana/web3.js';
import { findMarginAccountPda, TENSOR_ESCROW_PROGRAM_ADDRESS } from '../src';
import {
  TSWAP_SINGLETON,
  createDefaultSolanaClient,
  generateKeyPairSignerWithSol,
  signAndSendTransaction,
  createDefaultTransaction,
  LAMPORTS_PER_SOL,
  ANCHOR_ERROR__INVALID_PROGRAM_ID,
  createT22NftWithRoyalties,
  createWnsNftInGroup,
} from '@tensor-foundation/test-helpers';
import test from 'ava';
import { getInitMarginAccountInstructionAsync } from '../src';
import {
  createWhitelistV2,
  expectCustomError,
  generateUuid,
  initTswap,
} from './_common';
import { createDefaultNft } from '@tensor-foundation/mpl-token-metadata';
import {
  findBidStatePda,
  getBidInstructionAsync,
  getTakeBidCompressedFullMetaInstructionAsync,
  getTakeBidCoreInstructionAsync,
  getTakeBidLegacyInstructionAsync,
  getTakeBidT22InstructionAsync,
  getTakeBidWnsInstructionAsync,
  Target,
} from '@tensor-foundation/marketplace';
import { MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS } from './generated/adversarial';
import { createDefaultAssetWithCollection } from '@tensor-foundation/mpl-core';
import { setupSingleVerifiedCNFT } from '@tensor-foundation/mpl-bubblegum';
import { metadataArgsToTMetadataArgsArgs } from './_common';

// TODO: this should be a test in Marketplace
test("a custom program can't imitate being the marketplace program to drain the margin account in a malicious noop handler", async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  const attacker = await generateKeyPairSignerWithSol(client);
  const nftUpdateAuthority = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: marginAccountOwner,
  });

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const bidStateId = getAddressDecoder().decode(generateUuid());
  const [bidStatePda] = await findBidStatePda({
    bidId: bidStateId,
    owner: marginAccountOwner.address,
  });

  // Initialize the bid state account (attached to margin)
  const createBidIx = await getBidInstructionAsync({
    owner: marginAccountOwner,
    target: Target.Whitelist,
    targetId: whitelist,
    bidId: bidStateId,
    bidState: bidStatePda,
    sharedEscrow: marginAccountPda,
    amount: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createBidIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Legacy:
  const { mint } = await createDefaultNft({
    client,
    owner: attacker.address,
    payer: attacker,
    authority: nftUpdateAuthority,
  });

  const sellIx = await getTakeBidLegacyInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint,
    whitelist,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    // (!)
    marketplaceProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });

  const sellTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellTx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  // Core:
  const [asset, collection] = await createDefaultAssetWithCollection({
    client,
    payer: attacker,
    collectionAuthority: nftUpdateAuthority,
    owner: attacker.address,
    royalties: {
      creators: [
        {
          percentage: 100,
          address: nftUpdateAuthority.address,
        },
      ],
      basisPoints: 0,
    },
  });

  const sellCoreIx = await getTakeBidCoreInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    asset: asset.address,
    collection: collection?.address,
    whitelist,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    // (!)
    marketplaceProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });

  const sellCoreTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellCoreTx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  // T22:
  const t22Nft = await createT22NftWithRoyalties({
    client,
    payer: attacker,
    owner: attacker.address,
    mintAuthority: nftUpdateAuthority,
    freezeAuthority: null,
    decimals: 0,
    data: {
      name: 'Test Token',
      symbol: 'TT',
      uri: 'https://example.com',
    },
    royalties: {
      key: nftUpdateAuthority.address,
      value: '0',
    },
  });

  const sellT22Ix = await getTakeBidT22InstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint: t22Nft.mint,
    whitelist,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    // (!)
    marketplaceProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
    transferHookAccounts: [],
  });

  const sellT22Tx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellT22Tx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  // WNS:
  const { mint: wnsMint, group } = await createWnsNftInGroup({
    client,
    payer: attacker,
    owner: attacker.address,
    authority: nftUpdateAuthority,
  });

  const sellWnsIx = await getTakeBidWnsInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint: wnsMint,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    collection: group,
    // (!)
    marketplaceProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });

  const sellWnsTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellWnsIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellWnsTx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  // Compressed:
  let { merkleTree, root, meta, proof } = await setupSingleVerifiedCNFT({
    client,
    cNftOwner: attacker.address,
    creatorKeypair: nftUpdateAuthority,
    creator: {
      address: nftUpdateAuthority.address,
      share: 100,
      verified: true,
    },
    leafIndex: 0,
  });
  const metaArgs = metadataArgsToTMetadataArgsArgs(meta);

  const sellCompressedIx = await getTakeBidCompressedFullMetaInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    merkleTree,
    root,
    proof,
    whitelist,
    index: 0,
    ...metaArgs,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    tensorswapProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    creators: [[nftUpdateAuthority.address, 100]],
    // (!)
    marketplaceProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
  });

  const sellCompressedTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellCompressedIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    sellCompressedTx,
    ANCHOR_ERROR__INVALID_PROGRAM_ID
  );
});

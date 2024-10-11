import {
  appendTransactionMessageInstruction,
  getAddressDecoder,
  pipe,
} from '@solana/web3.js';
import {
  createDefaultSolanaClient,
  signAndSendTransaction,
  createDefaultTransaction,
  LAMPORTS_PER_SOL,
  TSWAP_SINGLETON,
  generateKeyPairSignerWithSol,
} from '@tensor-foundation/test-helpers';
import test from 'ava';
import {
  CurveType,
  fetchPool,
  findPoolPda,
  getCreatePoolInstructionAsync,
  getSellNftTradePoolInstructionAsync,
  PoolType,
} from '@tensor-foundation/amm';
import {
  findBidStatePda,
  getBidInstructionAsync,
  getTakeBidLegacyInstructionAsync,
  Target,
} from '@tensor-foundation/marketplace';
import { createDefaultNft } from '@tensor-foundation/mpl-token-metadata';
import { createWhitelistV2, generateUuid, initTswap } from './_common';
import {
  getInitMarginAccountInstructionAsync,
  findMarginAccountPda,
  getDepositMarginAccountInstructionAsync,
  TENSOR_ESCROW_PROGRAM_ADDRESS,
} from '../src';

test('it can call the withdrawMarginAccountCpiTamm instruction', async (t) => {
  const client = createDefaultSolanaClient();
  const owner = await generateKeyPairSignerWithSol(
    client,
    5n * LAMPORTS_PER_SOL
  );
  const seller = await generateKeyPairSignerWithSol(
    client,
    5n * LAMPORTS_PER_SOL
  );
  await initTswap(client);

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: seller,
  });

  // Initialize the margin account
  const [marginAccountPda] = await findMarginAccountPda({
    owner: owner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });
  const marginAccountInitIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: owner,
  });
  await pipe(
    await createDefaultTransaction(client, owner),
    (tx) => appendTransactionMessageInstruction(marginAccountInitIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Assert margin account exists and is owner by TSWAP
  const marginAccount = await client.rpc
    .getAccountInfo(marginAccountPda, { encoding: 'base64' })
    .send();
  t.assert(marginAccount.value?.owner === TENSOR_ESCROW_PROGRAM_ADDRESS);

  // Deposit SOL into the margin account
  const depositSolIx = await getDepositMarginAccountInstructionAsync({
    owner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, owner),
    (tx) => appendTransactionMessageInstruction(depositSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const poolId = generateUuid();
  const [poolAta] = await findPoolPda({ poolId, owner: owner.address });

  // Initialize the pool account (attached to margin)
  const createPoolIx = await getCreatePoolInstructionAsync({
    owner: owner,
    whitelist,
    pool: poolAta,
    poolId,
    config: {
      poolType: PoolType.Trade,
      startingPrice: LAMPORTS_PER_SOL / 2n,
      delta: 0,
      mmCompoundFees: false,
      mmFeeBps: null,
      curveType: CurveType.Linear,
    },
    sharedEscrow: marginAccountPda,
  });
  await pipe(
    await createDefaultTransaction(client, owner),
    (tx) => appendTransactionMessageInstruction(createPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Assert the pool exists and is attached to the margin account
  const pool = await fetchPool(client.rpc, poolAta);
  t.assert(pool.data.sharedEscrow === marginAccountPda);

  const marginAccountLamportsBefore = (
    await client.rpc.getBalance(marginAccountPda).send()
  ).value;

  // Seller mints an NFT and sells it in the pool
  const { mint } = await createDefaultNft({
    client,
    payer: seller,
    authority: seller,
    owner: seller.address,
  });

  const sellNftIx = await getSellNftTradePoolInstructionAsync({
    owner: owner.address,
    pool: pool.address,
    mint,
    minPrice: 1,
    whitelist,
    taker: seller,
    sharedEscrow: marginAccountPda,
    // TODO: set defaultValue in AMM kinobi client gen (maybe only resolve if sharedEscrow is set)
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    creators: [seller.address],
  });

  await pipe(
    await createDefaultTransaction(client, seller),
    (tx) => appendTransactionMessageInstruction(sellNftIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const marginAccountLamportsAfter = (
    await client.rpc.getBalance(marginAccountPda).send()
  ).value;

  // Assert that the margin account paid the correct amount of SOL
  t.is(
    BigInt(marginAccountLamportsAfter),
    BigInt(marginAccountLamportsBefore) - LAMPORTS_PER_SOL / 2n
  );
});

test('it can call the withdrawMarginAccountCpiTcmp instruction', async (t) => {
  const client = createDefaultSolanaClient();
  await initTswap(client);
  const owner = await generateKeyPairSignerWithSol(
    client,
    5n * LAMPORTS_PER_SOL
  );
  const seller = await generateKeyPairSignerWithSol(
    client,
    5n * LAMPORTS_PER_SOL
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: seller,
  });

  // Initialize the margin account
  const [marginAccountPda] = await findMarginAccountPda({
    owner: owner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });
  const marginAccountInitIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: owner,
  });
  await pipe(
    await createDefaultTransaction(client, owner),
    (tx) => appendTransactionMessageInstruction(marginAccountInitIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Assert margin account exists and is owner by TSWAP
  const marginAccount = await client.rpc
    .getAccountInfo(marginAccountPda, { encoding: 'base64' })
    .send();
  t.assert(marginAccount.value?.owner === TENSOR_ESCROW_PROGRAM_ADDRESS);

  // Deposit SOL into the margin account
  const depositSolIx = await getDepositMarginAccountInstructionAsync({
    owner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, owner),
    (tx) => appendTransactionMessageInstruction(depositSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Create a Marketplace Bid
  const bidId = getAddressDecoder().decode(generateUuid());
  const [bidStatePda] = await findBidStatePda({ bidId, owner: owner.address });

  const createBidIx = await getBidInstructionAsync({
    bidId,
    bidState: bidStatePda,
    target: Target.Whitelist,
    targetId: whitelist,
    owner: owner,
    sharedEscrow: marginAccountPda,
    amount: LAMPORTS_PER_SOL / 2n,
  });

  await pipe(
    await createDefaultTransaction(client, owner),
    (tx) => appendTransactionMessageInstruction(createBidIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Seller mints an NFT and sells it into the bid
  const { mint } = await createDefaultNft({
    client,
    payer: seller,
    authority: seller,
    owner: seller.address,
  });

  const takeBidLegacyIx = await getTakeBidLegacyInstructionAsync({
    owner: owner.address,
    bidState: bidStatePda,
    mint,
    seller: seller,
    sharedEscrow: marginAccountPda,
    whitelist: whitelist,
    minAmount: LAMPORTS_PER_SOL / 2n,
    creators: [seller.address],
  });

  const marginAccountLamportsBefore = (
    await client.rpc.getBalance(marginAccountPda).send()
  ).value;

  await pipe(
    await createDefaultTransaction(client, seller),
    (tx) => appendTransactionMessageInstruction(takeBidLegacyIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const marginAccountLamportsAfter = (
    await client.rpc.getBalance(marginAccountPda).send()
  ).value;

  // Assert that the margin account paid the correct amount of SOL
  t.is(
    BigInt(marginAccountLamportsAfter),
    BigInt(marginAccountLamportsBefore) - LAMPORTS_PER_SOL / 2n
  );
});

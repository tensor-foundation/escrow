import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import {
  address,
  appendTransactionMessageInstruction,
  fixEncoderSize,
  getAddressDecoder,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  pipe,
  SOLANA_ERROR__INSTRUCTION_ERROR__PRIVILEGE_ESCALATION,
} from '@solana/web3.js';
import {
  CurveType,
  findPoolPda,
  getCreatePoolInstructionAsync,
  getSellNftTokenPoolCoreInstructionAsync,
  getSellNftTokenPoolInstructionAsync,
  getSellNftTokenPoolT22InstructionAsync,
  getSellNftTradePoolCoreInstructionAsync,
  getSellNftTradePoolInstructionAsync,
  getSellNftTradePoolT22InstructionAsync,
  getWithdrawSolInstruction,
  PoolType,
  TENSOR_AMM_PROGRAM_ADDRESS,
} from '@tensor-foundation/amm';
import {
  findBidStatePda,
  getBidInstructionAsync,
  getTakeBidCompressedFullMetaInstructionAsync,
  getTakeBidCoreInstructionAsync,
  getTakeBidLegacyInstructionAsync,
  getTakeBidT22InstructionAsync,
  getTakeBidWnsInstructionAsync,
  Target,
  TENSOR_MARKETPLACE_PROGRAM_ADDRESS,
} from '@tensor-foundation/marketplace';
import {
  ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH,
  ANCHOR_ERROR__CONSTRAINT_ADDRESS,
  ANCHOR_ERROR__CONSTRAINT_SEEDS,
  ANCHOR_ERROR__INVALID_PROGRAM_ID,
  createDefaultSolanaClient,
  createDefaultTransaction,
  generateKeyPairSignerWithSol,
  LAMPORTS_PER_SOL,
  signAndSendTransaction,
  TSWAP_SINGLETON,
} from '@tensor-foundation/test-helpers';
import test from 'ava';
import {
  fetchMarginAccount,
  findMarginAccountPda,
  getDepositMarginAccountInstructionAsync,
  getInitMarginAccountInstructionAsync,
  getWithdrawMarginAccountInstructionAsync,
  TENSOR_ESCROW_PROGRAM_ADDRESS,
} from '../src';
import {
  createTokenPoolAndTradePool,
  createWhitelistV2,
  expectCustomError,
  expectGenericError,
  generateUuid,
  initTswap,
  mintAllStandards,
  mintLegacyCoreAndT22,
} from './_common';
import { setupIdlBufferAttack } from './_idl_buffer_setup';
import {
  getWithdrawFromTammMarginInstruction,
  getWithdrawFromTammMarginSignedInstruction,
  getWithdrawFromTcmpMarginInstruction,
  getWithdrawFromTcmpMarginSignedInstruction,
  MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
} from './generated/adversarial';

test('it prevents an incorrect owner from withdrawing from the margin account', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  const incorrectOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Owner deposits SOL into the margin account
  const depositSolIx = await getDepositMarginAccountInstructionAsync({
    owner: marginAccountOwner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(depositSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Invalid owner can't withdraw
  const withdrawSolIxIncorrectOwner =
    await getWithdrawMarginAccountInstructionAsync({
      owner: incorrectOwner,
      marginAccount: marginAccountPda,
      lamports: LAMPORTS_PER_SOL / 2n,
    });

  const incorrectOwnerTx = pipe(
    await createDefaultTransaction(client, incorrectOwner),
    (tx) =>
      appendTransactionMessageInstruction(withdrawSolIxIncorrectOwner, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, incorrectOwnerTx, ANCHOR_ERROR__CONSTRAINT_SEEDS);

  // Correct owner can withdraw
  const withdrawSolIx = await getWithdrawMarginAccountInstructionAsync({
    owner: marginAccountOwner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 2n,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const marginAccount = await fetchMarginAccount(client.rpc, marginAccountPda);
  t.is(BigInt(marginAccount.lamports), 1886160n); // only account rent left
});

test('it prevents an incorrect owner with a margin account from withdrawing from a different margin account', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  const incorrectOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Owner deposits SOL into the margin account
  const depositSolIx = await getDepositMarginAccountInstructionAsync({
    owner: marginAccountOwner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(depositSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );
  // Create a different margin account for the incorrect owner
  const [differentMarginAccountPda] = await findMarginAccountPda({
    owner: incorrectOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  const createDifferentMarginAccountIx =
    await getInitMarginAccountInstructionAsync({
      marginAccount: differentMarginAccountPda,
      owner: incorrectOwner,
    });
  await pipe(
    await createDefaultTransaction(client, incorrectOwner),
    (tx) =>
      appendTransactionMessageInstruction(createDifferentMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Incorrect owner deposits SOL into the different margin account
  const depositSolIxDifferentMarginAccount =
    await getDepositMarginAccountInstructionAsync({
      owner: incorrectOwner,
      marginAccount: differentMarginAccountPda,
      lamports: LAMPORTS_PER_SOL / 2n,
    });
  await pipe(
    await createDefaultTransaction(client, incorrectOwner),
    (tx) =>
      appendTransactionMessageInstruction(
        depositSolIxDifferentMarginAccount,
        tx
      ),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Invalid owner can't withdraw
  const withdrawSolIxIncorrectOwner =
    await getWithdrawMarginAccountInstructionAsync({
      owner: incorrectOwner,
      marginAccount: marginAccountPda,
      lamports: LAMPORTS_PER_SOL / 2n,
    });

  const incorrectOwnerTx = pipe(
    await createDefaultTransaction(client, incorrectOwner),
    (tx) =>
      appendTransactionMessageInstruction(withdrawSolIxIncorrectOwner, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, incorrectOwnerTx, ANCHOR_ERROR__CONSTRAINT_SEEDS);

  // Correct owner can withdraw
  const withdrawSolIx = await getWithdrawMarginAccountInstructionAsync({
    owner: marginAccountOwner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 2n,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const marginAccount = await fetchMarginAccount(client.rpc, marginAccountPda);
  t.is(BigInt(marginAccount.lamports), 1886160n); // only account rent left

  // Owner also can't withdraw from the different margin account
  const withdrawSolIxDifferentMarginAccount =
    await getWithdrawMarginAccountInstructionAsync({
      owner: marginAccountOwner,
      marginAccount: differentMarginAccountPda,
      lamports: LAMPORTS_PER_SOL / 2n,
    });

  const incorrectOwnerTxDifferentMarginAccount = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) =>
      appendTransactionMessageInstruction(
        withdrawSolIxDifferentMarginAccount,
        tx
      ),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    incorrectOwnerTxDifferentMarginAccount,
    ANCHOR_ERROR__CONSTRAINT_SEEDS
  );
});

test('a custom program cannot CPI into WithdrawMarginAccountCpiTammInstruction with an imitated pool', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: marginAccountOwner,
  });

  const poolId = generateUuid();
  const [poolAta] = await findPoolPda({
    poolId,
    owner: marginAccountOwner.address,
  });

  // Initialize a real pool account (attached to margin)
  const createPoolIx = await getCreatePoolInstructionAsync({
    owner: marginAccountOwner,
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
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Derive adversarial pool
  const [adversarialPoolPda] = await getProgramDerivedAddress({
    programAddress: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    seeds: [
      getUtf8Encoder().encode('pool'),
      getAddressEncoder().encode(marginAccountOwner.address),
      fixEncoderSize(getBytesEncoder(), 32).encode(poolId),
    ],
  });

  const withdrawIx = getWithdrawFromTammMarginSignedInstruction({
    marginAccount: marginAccountPda,
    pool: adversarialPoolPda,
    poolId: poolId,
    owner: marginAccountOwner,
    destination: marginAccountOwner.address,
    tensorEscrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    lamports: LAMPORTS_PER_SOL / 2n,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  });

  const tx = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, tx, ANCHOR_ERROR__CONSTRAINT_SEEDS);
});

test('a custom program cannot CPI into WithdrawMarginAccountCpiTammInstruction with a real pool', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: marginAccountOwner,
  });

  const poolId = generateUuid();
  const [poolAta] = await findPoolPda({
    poolId,
    owner: marginAccountOwner.address,
  });

  // Initialize a real pool account (attached to margin)
  const createPoolIx = await getCreatePoolInstructionAsync({
    owner: marginAccountOwner,
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
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const withdrawIx = getWithdrawFromTammMarginInstruction({
    marginAccount: marginAccountPda,
    pool: poolAta,
    poolId: poolId,
    owner: marginAccountOwner,
    destination: marginAccountOwner.address,
    tensorEscrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    lamports: LAMPORTS_PER_SOL / 2n,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  });

  const tx = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Expect tx to fail with privilege escalation
  await expectGenericError(
    t,
    tx,
    SOLANA_ERROR__INSTRUCTION_ERROR__PRIVILEGE_ESCALATION
  );
});

// (!!) This test can only be called once since it has to set the authority to a deterministic
// PDA for the IdlBuffer. To run this test again successfully, restart the local validator
test('a custom program cannot imitate a real pool account with an IdlBuffer', async (t) => {
  /*
   * This test creates an anchor native IDL Buffer and writes
   * data to it, so it could be deserialized as a pool
   * As a result, an attacker is able to create and have
   * authority over an AMM Program owned account whose size
   * and data (except discriminator + IDL Acc Header) are
   * matching a real pool account.
   * Then it tries to withdraw with the fake pool
   * which is owned by the attacker.
   */

  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  const nftUpdateAuthority = await generateKeyPairSignerWithSol(client);
  const attacker = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: nftUpdateAuthority,
  });

  const poolId = generateUuid();
  const [poolAta] = await findPoolPda({
    poolId,
    owner: marginAccountOwner.address,
  });

  // Initialize a real pool account (attached to margin)
  const createPoolIx = await getCreatePoolInstructionAsync({
    owner: marginAccountOwner,
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
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const pool = await client.rpc
    .getAccountInfo(poolAta, { encoding: 'base64' })
    .send();
  const [poolData] = pool!.value!.data!;

  const idlAddressAcc = await setupIdlBufferAttack({
    t,
    client,
    attacker,
    base64EncodedData: poolData,
    accountSize: 447,
    programAddress: TENSOR_AMM_PROGRAM_ADDRESS,
  });

  // Try to withdraw from the fake pool
  const withdrawIx = getWithdrawSolInstruction({
    owner: attacker,
    pool: idlAddressAcc,
    lamports: LAMPORTS_PER_SOL / 2n,
  });

  const tx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(withdrawIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Expect tx to fail with discriminator mismatch of the pool acc
  await expectCustomError(t, tx, ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH);

  // Alternatively, try to mint an NFT and sell into the imitated pool account (trade + token), attached to real shared escrow
  // In a real attack scenario, the attacker would slightly change the IdlBuffer data so it points to his own escrow account,
  // but that is not necessary for this test
  const {
    legacy: mint,
    core: { asset, collection },
    t22: t22Nft,
  } = await mintLegacyCoreAndT22({
    client,
    owner: attacker,
    mintAuthority: nftUpdateAuthority,
  });

  const sellTradePoolIx = await getSellNftTradePoolInstructionAsync({
    owner: marginAccountOwner.address,
    // (!)
    pool: idlAddressAcc,
    mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    creators: [nftUpdateAuthority.address],
  });

  const tradePoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTradePoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    tradePoolTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellTokenPoolIx = await getSellNftTokenPoolInstructionAsync({
    owner: marginAccountOwner.address,
    // (!)
    pool: idlAddressAcc,
    mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    creators: [nftUpdateAuthority.address],
  });

  const tokenPoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTokenPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    tokenPoolTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellTradePoolCoreIx = await getSellNftTradePoolCoreInstructionAsync({
    whitelist,
    asset: asset.address,
    collection: collection?.address,
    owner: marginAccountOwner.address,
    taker: attacker,
    // (!)
    pool: idlAddressAcc,
    minPrice: 0n,
    sharedEscrow: marginAccountPda,
    creators: [nftUpdateAuthority.address],
  });

  const coreTradePoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTradePoolCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    coreTradePoolTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellTokenPoolCoreIx = await getSellNftTokenPoolCoreInstructionAsync({
    whitelist,
    asset: asset.address,
    collection: collection?.address,
    owner: marginAccountOwner.address,
    taker: attacker,
    // (!)
    pool: idlAddressAcc,
    minPrice: 0n,
    sharedEscrow: marginAccountPda,
    creators: [nftUpdateAuthority.address],
  });

  const coreTokenPoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTokenPoolCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    coreTokenPoolTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellTradePoolT22Ix = await getSellNftTradePoolT22InstructionAsync({
    owner: marginAccountOwner.address,
    // (!)
    pool: idlAddressAcc,
    mint: t22Nft.mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    transferHookAccounts: [],
    creators: [nftUpdateAuthority.address],
  });

  const t22TradePoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTradePoolT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    t22TradePoolTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellTokenPoolT22Ix = await getSellNftTokenPoolT22InstructionAsync({
    owner: marginAccountOwner.address,
    // (!)
    pool: idlAddressAcc,
    mint: t22Nft.mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    transferHookAccounts: [],
    creators: [nftUpdateAuthority.address],
  });

  const t22TokenPoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTokenPoolT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    t22TokenPoolTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );
});

test("a custom program can't imitate being the escrow program to drain the margin account (TAMM ixs)", async (t) => {
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

  const { tradePoolPda, tokenPoolPda } = await createTokenPoolAndTradePool({
    client,
    marginAccountOwner,
    whitelist,
    marginAccountPda,
  });

  const {
    legacy: mint,
    core: { asset, collection },
    t22: t22Nft,
  } = await mintLegacyCoreAndT22({
    client,
    owner: attacker,
    mintAuthority: nftUpdateAuthority,
  });

  const sellIx = await getSellNftTradePoolInstructionAsync({
    owner: marginAccountOwner.address,
    pool: tradePoolPda,
    mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    // (!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });

  const tx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, tx, ANCHOR_ERROR__CONSTRAINT_ADDRESS);

  const sellTokenPoolIx = await getSellNftTokenPoolInstructionAsync({
    owner: marginAccountOwner.address,
    pool: tokenPoolPda,
    mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    // (!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });
  const sellTokenPoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTokenPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellTokenPoolTx, ANCHOR_ERROR__CONSTRAINT_ADDRESS);

  const sellTokenPoolCoreIx = await getSellNftTokenPoolCoreInstructionAsync({
    whitelist,
    asset: asset.address,
    collection: collection?.address,
    owner: marginAccountOwner.address,
    taker: attacker,
    pool: tokenPoolPda,
    minPrice: 0n,
    //(!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    sharedEscrow: marginAccountPda,
    creators: [nftUpdateAuthority.address],
  });

  const coreTokenPoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTokenPoolCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, coreTokenPoolTx, ANCHOR_ERROR__CONSTRAINT_ADDRESS);

  const sellTradePoolCoreIx = await getSellNftTradePoolCoreInstructionAsync({
    whitelist,
    asset: asset.address,
    collection: collection?.address,
    owner: marginAccountOwner.address,
    taker: attacker,
    pool: tradePoolPda,
    minPrice: 0n,
    //(!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    sharedEscrow: marginAccountPda,
    creators: [nftUpdateAuthority.address],
  });

  const coreTradePoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTradePoolCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, coreTradePoolTx, ANCHOR_ERROR__CONSTRAINT_ADDRESS);

  const sellTokenPoolT22Ix = await getSellNftTokenPoolT22InstructionAsync({
    owner: marginAccountOwner.address,
    pool: tokenPoolPda,
    mint: t22Nft.mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    //(!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
    transferHookAccounts: [],
  });

  const t22TokenPoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTokenPoolT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, t22TokenPoolTx, ANCHOR_ERROR__CONSTRAINT_ADDRESS);

  const sellTradePoolT22Ix = await getSellNftTradePoolT22InstructionAsync({
    owner: marginAccountOwner.address,
    pool: tradePoolPda,
    mint: t22Nft.mint,
    whitelist,
    minPrice: 0n,
    taker: attacker,
    sharedEscrow: marginAccountPda,
    //(!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
    transferHookAccounts: [],
  });

  const t22TradePoolTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellTradePoolT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, t22TradePoolTx, ANCHOR_ERROR__CONSTRAINT_ADDRESS);
});

test('a custom program cannot CPI into WithdrawMarginAccountCpiTcompInstruction with an imitated bid state', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: marginAccountOwner,
  });

  const bidId = getAddressDecoder().decode(generateUuid());
  const [bidStatePda] = await findBidStatePda({
    bidId,
    owner: marginAccountOwner.address,
  });

  // Initialize the bid account (attached to margin)
  const createBidIx = await getBidInstructionAsync({
    owner: marginAccountOwner,
    target: Target.Whitelist,
    targetId: whitelist,
    bidId,
    bidState: bidStatePda,
    sharedEscrow: marginAccountPda,
    amount: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createBidIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Derive adversarial bidState
  const [adversarialBidStatePda] = await getProgramDerivedAddress({
    programAddress: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    seeds: [
      getUtf8Encoder().encode('bid_state'),
      getAddressEncoder().encode(marginAccountOwner.address),
      getAddressEncoder().encode(bidId),
    ],
  });

  const withdrawIx = getWithdrawFromTcmpMarginSignedInstruction({
    marginAccount: marginAccountPda,
    //(!)
    bidState: adversarialBidStatePda,
    bidId,
    owner: marginAccountOwner,
    destination: marginAccountOwner.address,
    tensorEscrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    lamports: LAMPORTS_PER_SOL / 2n,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  });

  const tx = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, tx, ANCHOR_ERROR__CONSTRAINT_SEEDS);
});

test('a custom program cannot CPI into WithdrawMarginAccountCpiTcompInstruction with a real bidState', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: marginAccountOwner,
  });

  const bidId = getAddressDecoder().decode(generateUuid());
  const [bidStatePda] = await findBidStatePda(
    {
      bidId,
      owner: marginAccountOwner.address,
    },
    { programAddress: address('TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp') }
  );

  // Initialize the bid account (attached to margin)
  const createBidIx = await getBidInstructionAsync({
    owner: marginAccountOwner,
    target: Target.Whitelist,
    targetId: whitelist,
    bidId: bidId,
    bidState: bidStatePda,
    sharedEscrow: marginAccountPda,
    amount: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createBidIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const withdrawIx = getWithdrawFromTcmpMarginInstruction({
    marginAccount: marginAccountPda,
    bidState: bidStatePda,
    bidId: bidId,
    owner: marginAccountOwner,
    destination: marginAccountOwner.address,
    tensorEscrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    lamports: LAMPORTS_PER_SOL / 2n,
    systemProgram: SYSTEM_PROGRAM_ADDRESS,
  });

  const tx = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Expect tx to fail with privilege escalation
  await expectGenericError(
    t,
    tx,
    SOLANA_ERROR__INSTRUCTION_ERROR__PRIVILEGE_ESCALATION
  );
});

// (!!) This test can only be called once since it has to set the authority to a deterministic
// PDA for the IdlBuffer. To run this test again successfully, restart the local validator
test('a custom program cannot imitate a real bid state account with an IdlBuffer', async (t) => {
  /*
   * This test creates an anchor native IDL Buffer and writes
   * data to it, so it could be deserialized as a pool
   * As a result, an attacker is able to create and have
   * authority over an Marketplace Program owned account whose size
   * and data (except discriminator + IDL Acc Header) are
   * matching a real bid state account.
   * Then it tries to withdraw with the fake bid state
   * which is owned by the attacker.
   */

  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  const nftUpdateAuthority = await generateKeyPairSignerWithSol(client);
  const attacker = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Create a new margin account for the owner
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the whitelist
  const { whitelist } = await createWhitelistV2({
    client,
    updateAuthority: nftUpdateAuthority,
  });

  const bidStateId = getAddressDecoder().decode(generateUuid());
  const [bidStatePda] = await findBidStatePda({
    bidId: bidStateId,
    owner: marginAccountOwner.address,
  });

  // Initialize a real bid state account (attached to margin)
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

  const bidState = await client.rpc
    .getAccountInfo(bidStatePda, { encoding: 'base64' })
    .send();
  const [bidStateData] = bidState!.value!.data!;

  const idlAddressAcc = await setupIdlBufferAttack({
    t,
    client,
    attacker,
    base64EncodedData: bidStateData,
    accountSize: 426,
    programAddress: TENSOR_MARKETPLACE_PROGRAM_ADDRESS,
  });

  // Try to mint an NFT and sell into the imitated bidState account, attached to real shared escrow
  // In a real attack scenario, the attacker would slightly change the IdlBuffer data so it points to his own escrow account,
  // but that is not necessary for this test
  const {
    legacy: mint,
    core: { asset, collection },
    t22: t22Nft,
    wns: { mint: wnsMint, group },
    compressed: { merkleTree, root, proof, metaArgs },
  } = await mintAllStandards({
    client,
    owner: attacker,
    mintAuthority: nftUpdateAuthority,
  });

  const sellIx = await getTakeBidLegacyInstructionAsync({
    //(!)
    bidState: idlAddressAcc,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
  });

  const sellTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    sellTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellCoreIx = await getTakeBidCoreInstructionAsync({
    whitelist,
    asset: asset.address,
    collection: collection?.address,
    owner: marginAccountOwner.address,
    //(!)
    bidState: idlAddressAcc,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    seller: attacker,
    minAmount: 0n,
    creators: [nftUpdateAuthority.address],
  });

  const sellCoreTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    sellCoreTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellT22Ix = await getTakeBidT22InstructionAsync({
    //(!)
    bidState: idlAddressAcc,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint: t22Nft.mint,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    transferHookAccounts: [],
    creators: [nftUpdateAuthority.address],
  });

  const sellT22Tx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    sellT22Tx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellWnsIx = await getTakeBidWnsInstructionAsync({
    //(!)
    bidState: idlAddressAcc,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint: wnsMint,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    escrowProgram: TENSOR_ESCROW_PROGRAM_ADDRESS,
    collection: group,
    creators: [nftUpdateAuthority.address],
  });

  const sellWnsTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellWnsIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    sellWnsTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );

  const sellCompressedIx = await getTakeBidCompressedFullMetaInstructionAsync({
    //(!)
    bidState: idlAddressAcc,
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
  });

  const sellCompressedTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellCompressedIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(
    t,
    sellCompressedTx,
    ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH
  );
});

test("a custom program can't imitate being the escrow program to drain the margin account (Marketplace ixs)", async (t) => {
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

  // Create BidState
  const bidId = getAddressDecoder().decode(generateUuid());
  const [bidStatePda] = await findBidStatePda({
    bidId,
    owner: marginAccountOwner.address,
  });

  // Initialize the bid account (attached to margin)
  const createBidIx = await getBidInstructionAsync({
    owner: marginAccountOwner,
    target: Target.Whitelist,
    targetId: whitelist,
    bidId,
    bidState: bidStatePda,
    sharedEscrow: marginAccountPda,
    amount: LAMPORTS_PER_SOL / 2n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createBidIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const {
    legacy: mint,
    core: { asset, collection },
    t22: t22Nft,
    wns: { mint: wnsMint, group },
    compressed: { merkleTree, root, proof, metaArgs },
  } = await mintAllStandards({
    client,
    owner: attacker,
    mintAuthority: nftUpdateAuthority,
  });

  const sellIx = await getTakeBidLegacyInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint,
    whitelist,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    // (!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });

  const tx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, tx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  const sellCoreIx = await getTakeBidCoreInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    asset: asset.address,
    collection: collection?.address,
    whitelist,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    // (!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
  });

  const sellCoreTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellCoreIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellCoreTx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  const sellT22Ix = await getTakeBidT22InstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint: t22Nft.mint,
    whitelist,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    // (!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [nftUpdateAuthority.address],
    transferHookAccounts: [],
  });

  const sellT22Tx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellT22Ix, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellT22Tx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

  const sellWnsIx = await getTakeBidWnsInstructionAsync({
    bidState: bidStatePda,
    owner: marginAccountOwner.address,
    seller: attacker,
    mint: wnsMint,
    minAmount: 0n,
    sharedEscrow: marginAccountPda,
    // (!)
    escrowProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    collection: group,
    creators: [nftUpdateAuthority.address],
  });

  const sellWnsTx = pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(sellWnsIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  await expectCustomError(t, sellWnsTx, ANCHOR_ERROR__INVALID_PROGRAM_ID);

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
    // (!)
    tensorswapProgram: MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS,
    creators: [[nftUpdateAuthority.address, 100]],
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

import { appendTransactionMessageInstruction, pipe } from '@solana/web3.js';
import {
  fetchMarginAccount,
  findMarginAccountPda,
  getDepositMarginAccountInstructionAsync,
  getWithdrawMarginAccountInstructionAsync,
} from '../src';
import {
  TSWAP_SINGLETON,
  createDefaultSolanaClient,
  generateKeyPairSignerWithSol,
  signAndSendTransaction,
  createDefaultTransaction,
  LAMPORTS_PER_SOL,
} from '@tensor-foundation/test-helpers';
import test from 'ava';
import { getInitMarginAccountInstructionAsync } from '../src';
import { expectCustomError, initTswap } from './_common';

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

  const SEED_CONSTRAINT_VIOLATION_ERROR = 2006;

  await expectCustomError(t, incorrectOwnerTx, SEED_CONSTRAINT_VIOLATION_ERROR);

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

  const SEED_CONSTRAINT_VIOLATION_ERROR = 2006;

  await expectCustomError(t, incorrectOwnerTx, SEED_CONSTRAINT_VIOLATION_ERROR);

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
    SEED_CONSTRAINT_VIOLATION_ERROR
  );
});
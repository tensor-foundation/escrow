import { appendTransactionMessageInstruction, pipe } from '@solana/web3.js';
import {
  findMarginAccountPda,
  getDepositMarginAccountInstructionAsync,
  getWithdrawMarginAccountInstructionAsync,
  getCloseMarginAccountInstructionAsync,
  fetchMaybeMarginAccount,
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

test('it can initialize, deposit, withdraw and close a margin account', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const [marginAccountPda] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: 0,
    tswap: TSWAP_SINGLETON,
  });

  // Initialize the margin account
  const createMarginAccountIx = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda,
    owner: marginAccountOwner,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Deposit SOL into the margin account
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

  // Withdraw SOL from the margin account
  const withdrawSolIx = await getWithdrawMarginAccountInstructionAsync({
    owner: marginAccountOwner,
    marginAccount: marginAccountPda,
    lamports: LAMPORTS_PER_SOL / 4n,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawSolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Try to withdraw more than available
  const withdrawMoreThanAvailableIx =
    await getWithdrawMarginAccountInstructionAsync({
      owner: marginAccountOwner,
      marginAccount: marginAccountPda,
      lamports: LAMPORTS_PER_SOL / 2n,
    });
  const withdrawMoreThanAvailableTx = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) =>
      appendTransactionMessageInstruction(withdrawMoreThanAvailableIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const INT_OVERFLOW_ERROR = 1103;
  await expectCustomError(t, withdrawMoreThanAvailableTx, INT_OVERFLOW_ERROR);

  // Close the margin account
  const closeMarginAccountIx = await getCloseMarginAccountInstructionAsync({
    owner: marginAccountOwner,
    marginAccount: marginAccountPda,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(closeMarginAccountIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Verify the margin account is closed
  const marginAccount = await fetchMaybeMarginAccount(
    client.rpc,
    marginAccountPda
  );
  t.assert(marginAccount.exists === false);
});

test('it can create multiple margin accounts with different margin numbers', async (t) => {
  const client = createDefaultSolanaClient();
  const marginAccountOwner = await generateKeyPairSignerWithSol(client);
  await initTswap(client);

  const marginNr1 = 0;
  const marginNr2 = 65535;
  const [marginAccountPda1] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: marginNr1,
    tswap: TSWAP_SINGLETON,
  });
  const [marginAccountPda2] = await findMarginAccountPda({
    owner: marginAccountOwner.address,
    marginNr: marginNr2,
    tswap: TSWAP_SINGLETON,
  });

  // Initialize the first margin account
  const createMarginAccountIx1 = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda1,
    owner: marginAccountOwner,
    marginNr: marginNr1,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx1, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Initialize the second margin account
  const createMarginAccountIx2 = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda2,
    owner: marginAccountOwner,
    marginNr: marginNr2,
  });
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx2, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Verify the margin accounts are created
  const marginAccount1 = await fetchMaybeMarginAccount(
    client.rpc,
    marginAccountPda1
  );
  const marginAccount2 = await fetchMaybeMarginAccount(
    client.rpc,
    marginAccountPda2
  );
  t.assert(marginAccount1.exists);
  t.assert(marginAccount2.exists);

  // Try to create a margin account with the same margin number again
  const createMarginAccountIx3 = await getInitMarginAccountInstructionAsync({
    marginAccount: marginAccountPda1,
    owner: marginAccountOwner,
    marginNr: marginNr1,
  });
  const createMarginAccountTx3 = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createMarginAccountIx3, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const ACCOUNT_ALREADY_IN_USE_ERROR_CODE = 0;
  await expectCustomError(
    t,
    createMarginAccountTx3,
    ACCOUNT_ALREADY_IN_USE_ERROR_CODE
  );
});

import {
  AccountRole,
  Address,
  addSignersToInstruction,
  appendTransactionMessageInstruction,
  createAddressWithSeed,
  fixEncoderSize,
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  getUtf8Encoder,
  pipe,
  SOLANA_ERROR__INSTRUCTION_ERROR__PRIVILEGE_ESCALATION,
} from '@solana/web3.js';
import {
  fetchMarginAccount,
  findMarginAccountPda,
  getDepositMarginAccountInstructionAsync,
  getWithdrawMarginAccountInstructionAsync,
  TENSOR_ESCROW_PROGRAM_ADDRESS,
} from '../src';
import {
  TSWAP_SINGLETON,
  createDefaultSolanaClient,
  generateKeyPairSignerWithSol,
  signAndSendTransaction,
  createDefaultTransaction,
  LAMPORTS_PER_SOL,
  ANCHOR_ERROR__CONSTRAINT_SEEDS,
  SYSVARS_RENT,
  ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH,
} from '@tensor-foundation/test-helpers';
import test from 'ava';
import { getInitMarginAccountInstructionAsync } from '../src';
import {
  createWhitelistV2,
  expectCustomError,
  expectGenericError,
  generateUuid,
  initTswap,
} from './_common';
import {
  CurveType,
  findPoolPda,
  getCreatePoolInstructionAsync,
  getWithdrawSolInstruction,
  PoolType,
  TENSOR_AMM_PROGRAM_ADDRESS,
} from '@tensor-foundation/amm';
import { MARGIN_WITHDRAW_CPI_PROGRAM_ADDRESS } from './generated/adversarial/programs/marginWithdrawCpi';
import { getWithdrawFromTammMarginSignedInstruction } from './generated/adversarial/instructions/withdrawFromTammMarginSigned';
import { getWithdrawFromTammMarginInstruction } from './generated/adversarial/instructions/withdrawFromTammMargin';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';

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

  // Initialize the pool account (attached to margin)
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

  // Initialize the pool account (attached to margin)
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

test('a custom program cannot CPI into WithdrawMarginAccountCpiInstruction with an IdlBuffer imitating a pool account', async (t) => {
  /*
   * This test creates an anchor native IDL Buffer and writes
   * data to it, so it could be deserialized as a pool
   * As a result, an attacker is able to create an
   * AMM Program owned account whose size and data
   * (except discriminator + IDL Acc Header) are
   * matching a real pool account.
   * Then it tries to withdraw with the fake pool
   * which is owned by the attacker.
   */

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

  // Initialize the pool account (attached to margin)
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

  // Idl dispatch ix discriminator
  const IDL_IX_TAG_LE = new Uint8Array([
    0x40, 0xf4, 0xbc, 0x78, 0xa7, 0xe9, 0x69, 0x0a,
  ]);
  const idlAddressAcc = await idlAddress();

  const createBufferIx = {
    programAddress: TENSOR_AMM_PROGRAM_ADDRESS,
    accounts: [
      {
        address: marginAccountOwner.address,
        role: AccountRole.READONLY_SIGNER,
      },
      { address: idlAddressAcc, role: AccountRole.WRITABLE },
      {
        address: (
          await getProgramDerivedAddress({
            programAddress: TENSOR_AMM_PROGRAM_ADDRESS,
            seeds: [],
          })
        )[0],
        role: AccountRole.READONLY,
      },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TENSOR_AMM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: SYSVARS_RENT, role: AccountRole.READONLY },
    ],
    // idl dispatch discriminator, IdlInstruction enum variant serialized (IdlInstruction::Create), allocated length (le bytes)
    data: Buffer.concat([
      IDL_IX_TAG_LE,
      Buffer.from([0]),
      Buffer.from([147, 1, 0, 0, 0, 0, 0, 0]),
    ]),
  };
  const signedCreateBufferIx = addSignersToInstruction(
    [marginAccountOwner],
    createBufferIx
  );

  // Send the transaction
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(signedCreateBufferIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const writeBufferIx = {
    programAddress: TENSOR_AMM_PROGRAM_ADDRESS,
    accounts: [
      { address: idlAddressAcc, role: AccountRole.WRITABLE },
      {
        address: marginAccountOwner.address,
        role: AccountRole.READONLY_SIGNER,
      },
    ],
    // 1. idl dispatch discriminator,
    // 2. IdlInstruction enum variant serialized (IdlInstruction::Write),
    // 3. amount of bytes to write
    // 4. data to write (rest of the pool data)
    data: Buffer.concat([
      IDL_IX_TAG_LE,
      Buffer.from([2]),
      Buffer.from([147, 1, 0, 0, 0, 0, 0, 0]),
      Buffer.from(poolData!, 'base64').slice(48),
    ]),
  };
  const signedWriteBufferIx = addSignersToInstruction(
    [marginAccountOwner],
    writeBufferIx
  );

  // Send the transaction
  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(signedWriteBufferIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );
  const fakePool = await client.rpc
    .getAccountInfo(idlAddressAcc, { encoding: 'base64' })
    .send();

  // assert that the last bytes (except the discriminator + pool header) are matching
  t.assert(
    Buffer.from(pool!.value!.data![0], 'base64')
      .slice(48)
      .equals(Buffer.from(fakePool!.value!.data![0], 'base64').slice(48))
  );

  // Try to withdraw from the fake pool
  const withdrawIx = getWithdrawSolInstruction({
    owner: marginAccountOwner,
    pool: idlAddressAcc,
    lamports: LAMPORTS_PER_SOL / 2n,
  });

  const tx = pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(withdrawIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Expect tx to fail with discriminator mismatch of the pool acc
  await expectCustomError(t, tx, ANCHOR_ERROR__ACCOUNT_DISCRIMINATOR_MISMATCH);
});

export async function idlAddress(): Promise<Address> {
  const seed = 'anchor:idl';
  const programAddress = TENSOR_AMM_PROGRAM_ADDRESS;
  const base = (
    await getProgramDerivedAddress({ programAddress, seeds: [] })
  )[0];
  return await createAddressWithSeed({
    baseAddress: base,
    seed,
    programAddress,
  });
}

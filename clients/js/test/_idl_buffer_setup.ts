import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import {
  AccountRole,
  Address,
  addSignersToInstruction,
  appendTransactionMessageInstruction,
  getProgramDerivedAddress,
  KeyPairSigner,
  pipe,
} from '@solana/web3.js';
import {
  Client,
  createDefaultTransaction,
  signAndSendTransaction,
  SYSVARS_RENT,
} from '@tensor-foundation/test-helpers';
import { ExecutionContext } from 'ava';
import { idlAddress } from './_common';

export const setupIdlBufferAttack = async ({
  t,
  client,
  attacker,
  base64EncodedData,
  accountSize,
  programAddress,
}: {
  t: ExecutionContext;
  client: Client;
  attacker: KeyPairSigner;
  base64EncodedData: string;
  accountSize: number;
  programAddress: Address;
}): Promise<Address> => {
  // consts
  const IDL_ACCOUNT_HEADER_SIZE = 44;
  const ACCOUNT_IMITATION_SIZE_FOUR_BYTES_LE = Buffer.alloc(4);
  const ACCOUNT_IMITATION_SIZE_EIGHT_BYTES_LE = Buffer.alloc(8);
  ACCOUNT_IMITATION_SIZE_FOUR_BYTES_LE.writeUInt32LE(
    accountSize - IDL_ACCOUNT_HEADER_SIZE,
    0
  );
  ACCOUNT_IMITATION_SIZE_EIGHT_BYTES_LE.writeUInt32LE(
    accountSize - IDL_ACCOUNT_HEADER_SIZE,
    0
  );

  const IDL_IX_TAG_LE = new Uint8Array([
    0x40, 0xf4, 0xbc, 0x78, 0xa7, 0xe9, 0x69, 0x0a,
  ]);
  const idlAddressAcc = await idlAddress(programAddress);

  const createBufferIx = {
    programAddress: programAddress,
    accounts: [
      {
        address: attacker.address,
        role: AccountRole.READONLY_SIGNER,
      },
      { address: idlAddressAcc, role: AccountRole.WRITABLE },
      {
        address: (
          await getProgramDerivedAddress({
            programAddress: programAddress,
            seeds: [],
          })
        )[0],
        role: AccountRole.READONLY,
      },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      {
        address: programAddress,
        role: AccountRole.READONLY,
      },
      { address: SYSVARS_RENT, role: AccountRole.READONLY },
    ],
    // 1. idl dispatch discriminator,
    // 2. IdlInstruction enum variant serialized (IdlInstruction::Create),
    // 3. allocated length (u64 as le bytes)
    data: Buffer.concat([
      IDL_IX_TAG_LE,
      Buffer.from([0]),
      Buffer.from(ACCOUNT_IMITATION_SIZE_EIGHT_BYTES_LE),
    ]),
  };
  const signedCreateBufferIx = addSignersToInstruction(
    [attacker],
    createBufferIx
  );

  // Send the transaction
  await pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(signedCreateBufferIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  const writeBufferIx = {
    programAddress: programAddress,
    accounts: [
      { address: idlAddressAcc, role: AccountRole.WRITABLE },
      {
        address: attacker.address,
        role: AccountRole.READONLY_SIGNER,
      },
    ],
    // 1. idl dispatch discriminator,
    // 2. IdlInstruction enum variant serialized (IdlInstruction::Write),
    // 3. amount of bytes to write (u32 as le bytes)
    // 4. data to write (rest of the pool data)
    data: Buffer.concat([
      IDL_IX_TAG_LE,
      Buffer.from([2]),
      Buffer.from(ACCOUNT_IMITATION_SIZE_FOUR_BYTES_LE),
      Buffer.from(base64EncodedData, 'base64').slice(IDL_ACCOUNT_HEADER_SIZE),
    ]),
  };
  const signedWriteBufferIx = addSignersToInstruction(
    [attacker],
    writeBufferIx
  );

  await pipe(
    await createDefaultTransaction(client, attacker),
    (tx) => appendTransactionMessageInstruction(signedWriteBufferIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );
  const fakeAccount = await client.rpc
    .getAccountInfo(idlAddressAcc, { encoding: 'base64' })
    .send();

  // assert that the last bytes (except the discriminator + IdlBuffer account header) are matching
  t.assert(
    Buffer.from(base64EncodedData, 'base64')
      .slice(IDL_ACCOUNT_HEADER_SIZE)
      .equals(
        Buffer.from(fakeAccount!.value!.data![0], 'base64').slice(
          IDL_ACCOUNT_HEADER_SIZE
        )
      )
  );
  return idlAddressAcc;
};

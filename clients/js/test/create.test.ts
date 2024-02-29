import { appendTransactionInstruction } from '@solana/transactions';
import { address, pipe } from '@solana/web3.js';
import test from 'ava';
import {
  createDefaultSolanaClient,
  createDefaultTransaction,
  generateKeyPairSignerWithSol,
  signAndSendTransaction,
} from './_setup';
import {
  Metadata,
  fetchMetadata,
  findMasterEditionPda,
  findMetadataPda,
  getCreateV1InstructionAsync,
  printSupply,
} from './external';
import { generateKeyPairSigner } from '@solana/signers';

test('it can initialize a new update authority', async (t) => {
  // Given a Umi instance and a new signer.
  const client = createDefaultSolanaClient();
  const authority = await generateKeyPairSignerWithSol(client);
  const mint = await generateKeyPairSigner();

  const [metadata] = await findMetadataPda({ mint: mint.address });
  const [masterEdition] = await findMasterEditionPda({ mint: mint.address });

  // When we initialize a new update authority.
  const createIx = await getCreateV1InstructionAsync({
    authority,
    mint,
    metadata,
    masterEdition,
    name: 'test',
    creators: null,
    payer: authority,
    sellerFeeBasisPoints: 500,
    uri: 'https://arweave.net/123',
    printSupply: printSupply('Zero'),
    splTokenProgram: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  });

  await pipe(
    await createDefaultTransaction(client, authority.address),
    (tx) => appendTransactionInstruction(createIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  // Then a whitelist authority was created with the correct data.
  t.like(await fetchMetadata(client.rpc, metadata), <Metadata>{
    address: metadata,
    data: {
      name: 'test',
    },
  });
});

import { ExecutionContext } from 'ava';
import {
  address,
  Address,
  airdropFactory,
  appendTransactionMessageInstruction,
  generateKeyPairSigner,
  isSolanaError,
  KeyPairSigner,
  lamports,
  pipe,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from '@solana/web3.js';
import {
  Client,
  createDefaultTransaction,
  createKeyPairSigner,
  ONE_SOL,
  signAndSendTransaction,
  TSWAP_SINGLETON,
} from '@tensor-foundation/test-helpers';
import { getInitUpdateTswapInstruction } from '../src';
import { v4 } from 'uuid';
import {
  getCreateWhitelistV2Instruction,
  findWhitelistV2Pda,
  Condition,
  Mode,
} from '@tensor-foundation/whitelist';

export const expectCustomError = async (
  t: ExecutionContext,
  promise: Promise<unknown>,
  code: number
) => {
  const error = await t.throwsAsync<Error & { context: { logs: string[] } }>(
    promise
  );

  if (isSolanaError(error.cause, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM)) {
    t.assert(
      error.cause.context.code === code,
      `expected error code ${code}, received ${error.cause.context.code}`
    );
  } else {
    t.fail("expected a custom error, but didn't get one");
  }
};
const OWNER_BYTES = [
  75, 111, 93, 80, 59, 171, 168, 79, 238, 255, 9, 233, 236, 194, 196, 73, 76, 2,
  51, 180, 184, 6, 77, 52, 36, 243, 28, 125, 104, 104, 114, 246, 166, 110, 5,
  17, 12, 8, 199, 21, 64, 143, 53, 202, 39, 71, 93, 114, 119, 171, 152, 44, 155,
  146, 43, 217, 148, 215, 83, 14, 162, 91, 65, 177,
];
export const DEFAULT_PUBKEY: Address = address(
  '11111111111111111111111111111111'
);
export const getOwner = async () =>
  await createKeyPairSigner(Uint8Array.from(OWNER_BYTES));

export const getAndFundOwner = async (client: Client) => {
  const owner = await createKeyPairSigner(Uint8Array.from(OWNER_BYTES));
  await airdropFactory(client)({
    recipientAddress: owner.address,
    lamports: lamports(ONE_SOL),
    commitment: 'confirmed',
  });

  return owner;
};

export const initTswap = async (client: Client) => {
  const tswapOwner = await getAndFundOwner(client);

  const tswap = TSWAP_SINGLETON;

  const initTswapIx = getInitUpdateTswapInstruction({
    tswap,
    owner: tswapOwner,
    newOwner: tswapOwner,
    feeVault: DEFAULT_PUBKEY, // Dummy fee vault
    cosigner: tswapOwner,
    config: { feeBps: 0 },
  });
  await pipe(
    await createDefaultTransaction(client, tswapOwner),
    (tx) => appendTransactionMessageInstruction(initTswapIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );
};
export const generateUuid = () => uuidToUint8Array(v4());
export const uuidToUint8Array = (uuid: string) => {
  const encoder = new TextEncoder();
  // replace any '-' to handle uuids
  return encoder.encode(uuid.replaceAll('-', ''));
};

export interface CreateWhitelistParams {
  client: Client;
  payer?: KeyPairSigner;
  updateAuthority: KeyPairSigner;
  namespace?: KeyPairSigner;
  freezeAuthority?: Address;
  conditions?: Condition[];
}
export async function createWhitelistV2({
  client,
  updateAuthority,
  payer = updateAuthority,
  namespace,
  freezeAuthority = DEFAULT_PUBKEY,
  conditions = [{ mode: Mode.FVC, value: updateAuthority.address }],
}: CreateWhitelistParams) {
  const uuid = generateUuid();
  namespace = namespace || (await generateKeyPairSigner());

  const [whitelist] = await findWhitelistV2Pda({
    namespace: namespace.address,
    uuid,
  });

  const createWhitelistIx = getCreateWhitelistV2Instruction({
    payer,
    updateAuthority,
    namespace,
    whitelist,
    freezeAuthority,
    conditions,
    uuid,
  });

  await pipe(
    await createDefaultTransaction(client, payer),
    (tx) => appendTransactionMessageInstruction(createWhitelistIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );

  return { whitelist, uuid, conditions };
}

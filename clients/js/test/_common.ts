import {
  address,
  Address,
  airdropFactory,
  appendTransactionMessageInstruction,
  createAddressWithSeed,
  generateKeyPairSigner,
  getProgramDerivedAddress,
  isSolanaError,
  KeyPairSigner,
  lamports,
  OptionOrNullable,
  pipe,
  ReadonlyUint8Array,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
  SolanaErrorCode,
  unwrapOption,
} from '@solana/web3.js';
import {
  CurveType,
  findPoolPda,
  getCreatePoolInstructionAsync,
  PoolType,
} from '@tensor-foundation/amm';
import {
  TCollectionArgs,
  TTokenProgramVersion,
  TTokenProgramVersionArgs,
  TTokenStandard,
  TTokenStandardArgs,
  TUsesArgs,
} from '@tensor-foundation/marketplace';
import {
  MetadataArgs,
  setupSingleVerifiedCNFT,
} from '@tensor-foundation/mpl-bubblegum';
import { createDefaultAssetWithCollection } from '@tensor-foundation/mpl-core';
import { createDefaultNft } from '@tensor-foundation/mpl-token-metadata';
import {
  Client,
  createDefaultTransaction,
  createKeyPairSigner,
  createT22NftWithRoyalties,
  createWnsNftInGroup,
  LAMPORTS_PER_SOL,
  ONE_SOL,
  signAndSendTransaction,
  TSWAP_SINGLETON,
} from '@tensor-foundation/test-helpers';
import {
  Condition,
  findWhitelistV2Pda,
  getCreateWhitelistV2Instruction,
  Mode,
} from '@tensor-foundation/whitelist';
import { ExecutionContext } from 'ava';
import { v4 } from 'uuid';
import { getInitUpdateTswapInstruction } from '../src';

export const expectGenericError = async (
  t: ExecutionContext,
  promise: Promise<unknown>,
  code: number
) => {
  const error = await t.throwsAsync<Error & { context: { logs: string[] } }>(
    promise
  );
  t.true(isSolanaError(error.cause!, code as SolanaErrorCode));
};

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

export async function idlAddress(programAddress: Address): Promise<Address> {
  const seed = 'anchor:idl';
  const base = (
    await getProgramDerivedAddress({ programAddress, seeds: [] })
  )[0];
  return await createAddressWithSeed({
    baseAddress: base,
    seed,
    programAddress,
  });
}

// No idea why this is not exported by Marketplace, but by Price-Lock...
//
export type TMetadataArgsArgs = {
  /** The name of the asset */
  name: string;
  /** The symbol for the asset */
  symbol: string;
  /** URI pointing to JSON representing the asset */
  uri: string;
  /** Royalty basis points that goes to creators in secondary sales (0-10000) */
  sellerFeeBasisPoints: number;
  primarySaleHappened: boolean;
  isMutable: boolean;
  /** nonce for easy calculation of editions, if present */
  editionNonce: OptionOrNullable<number>;
  /** Since we cannot easily change Metadata, we add the new DataV2 fields here at the end. */
  tokenStandard: OptionOrNullable<TTokenStandardArgs>;
  /** Collection */
  collection: OptionOrNullable<TCollectionArgs>;
  /** Uses */
  uses: OptionOrNullable<TUsesArgs>;
  tokenProgramVersion: TTokenProgramVersionArgs;
  creatorShares: ReadonlyUint8Array;
  creatorVerified: Array<boolean>;
};

export const metadataArgsToTMetadataArgsArgs = (
  meta: MetadataArgs
): TMetadataArgsArgs => {
  return {
    ...meta,
    tokenStandard: unwrapOption(
      meta.tokenStandard
    )! as unknown as TTokenStandard,
    creatorShares: new Uint8Array(
      meta.creators.map((creator) => creator.share)
    ),
    uses: meta.uses as OptionOrNullable<TUsesArgs>,
    tokenProgramVersion:
      meta.tokenProgramVersion as unknown as TTokenProgramVersion,
    creatorVerified: meta.creators.map((creator) => creator.verified),
  };
};

export const createTokenPoolAndTradePool = async ({
  client,
  marginAccountOwner,
  whitelist,
  marginAccountPda,
}: {
  client: Client;
  marginAccountOwner: KeyPairSigner;
  whitelist: Address;
  marginAccountPda: Address;
}) => {
  // Create Trade + Token Pool
  const tradePoolId = generateUuid();
  const [tradePoolPda] = await findPoolPda({
    poolId: tradePoolId,
    owner: marginAccountOwner.address,
  });

  const createPoolIx = await getCreatePoolInstructionAsync({
    owner: marginAccountOwner,
    whitelist: whitelist,
    pool: tradePoolPda,
    poolId: tradePoolId,
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

  const tokenPoolId = generateUuid();
  const [tokenPoolPda] = await findPoolPda({
    poolId: tokenPoolId,
    owner: marginAccountOwner.address,
  });
  const createTokenPoolIx = await getCreatePoolInstructionAsync({
    owner: marginAccountOwner,
    whitelist,
    pool: tokenPoolPda,
    poolId: tokenPoolId,
    config: {
      poolType: PoolType.Token,
      curveType: CurveType.Linear,
      startingPrice: LAMPORTS_PER_SOL / 2n,
      delta: 0,
      mmCompoundFees: false,
      mmFeeBps: null,
    },
    sharedEscrow: marginAccountPda,
  });

  await pipe(
    await createDefaultTransaction(client, marginAccountOwner),
    (tx) => appendTransactionMessageInstruction(createTokenPoolIx, tx),
    (tx) => signAndSendTransaction(client, tx)
  );
  return { tradePoolPda, tokenPoolPda };
};

export const mintLegacyCoreAndT22 = async ({
  client,
  owner,
  mintAuthority,
}: {
  client: Client;
  owner: KeyPairSigner;
  mintAuthority: KeyPairSigner;
}) => {
  // Legacy:
  const { mint } = await createDefaultNft({
    client,
    owner: owner.address,
    payer: owner,
    authority: mintAuthority,
  });
  // Core:
  const [asset, collection] = await createDefaultAssetWithCollection({
    client,
    payer: owner,
    collectionAuthority: mintAuthority,
    owner: owner.address,
    royalties: {
      creators: [
        {
          percentage: 100,
          address: mintAuthority.address,
        },
      ],
      basisPoints: 0,
    },
  });
  // T22:
  const t22Nft = await createT22NftWithRoyalties({
    client,
    payer: owner,
    owner: owner.address,
    mintAuthority,
    freezeAuthority: null,
    decimals: 0,
    data: {
      name: 'Test Token',
      symbol: 'TT',
      uri: 'https://example.com',
    },
    royalties: {
      key: mintAuthority.address,
      value: '0',
    },
  });
  return { legacy: mint, core: { asset, collection }, t22: t22Nft };
};

export const mintAllStandards = async ({
  client,
  owner,
  mintAuthority,
}: {
  client: Client;
  owner: KeyPairSigner;
  mintAuthority: KeyPairSigner;
}) => {
  const {
    legacy,
    core: { asset, collection },
    t22,
  } = await mintLegacyCoreAndT22({
    client,
    owner,
    mintAuthority,
  });
  // WNS:
  const { mint: wnsMint, group } = await createWnsNftInGroup({
    client,
    payer: owner,
    owner: owner.address,
    authority: mintAuthority,
  });

  // Compressed:
  let { merkleTree, root, meta, proof } = await setupSingleVerifiedCNFT({
    client,
    cNftOwner: owner.address,
    creatorKeypair: mintAuthority,
    creator: {
      address: mintAuthority.address,
      share: 100,
      verified: true,
    },
    leafIndex: 0,
  });
  const metaArgs = metadataArgsToTMetadataArgsArgs(meta);
  return {
    legacy,
    core: { asset, collection },
    t22,
    wns: { mint: wnsMint, group },
    compressed: { merkleTree, root, meta, proof, metaArgs },
  };
};

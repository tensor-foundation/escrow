import * as anchor from "@project-serum/anchor";
import { TSwapSDK } from "../src";
import {
  Keypair,
  Signer,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { waitMS } from "@tensor-hq/tensor-common/dist/util";
import { buildTx } from "@tensor-hq/tensor-common/dist/solana_contrib";

const provider = anchor.AnchorProvider.env();
const sdk = new TSwapSDK({ provider });

const buildAndSendTx = async (
  ixs: TransactionInstruction[],
  extraSigners: Signer[]
): Promise<string> => {
  const { tx } = await buildTx({
    connections: [provider.connection],
    instructions: ixs,
    additionalSigners: extraSigners,
    feePayer: provider.publicKey,
  });
  await provider.wallet.signTransaction(tx);
  return await provider.connection.sendRawTransaction(tx.serialize());
};

describe("tensorswap", () => {
  let tSwap: Keypair;

  beforeEach("configure accs", async () => {
    const {
      tx: { ixs, extraSigners },
      tSwap: tSwap_,
    } = await sdk.initTSwap(provider.publicKey);
    tSwap = tSwap_;
    await buildAndSendTx(ixs, extraSigners);
  });

  it("inits tswap", async () => {
    await waitMS(1000);

    const tw = await sdk.fetchTSwap(tSwap.publicKey);
    console.log(tw);
  });
});

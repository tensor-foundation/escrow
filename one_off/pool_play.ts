import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TensorSwapSDK } from "../src";
import { getLamports, swapSdk } from "../tests/shared";

(async () => {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(require("/Users/ilmoi/.config/solana/tswap_cosigner.json"))
  );
  const wallet = new Wallet(payer);
  const conn = new Connection("https://api.mainnet-beta.solana.com");
  const provider = new AnchorProvider(conn, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
    skipPreflight: true,
  });

  const sdk = new TensorSwapSDK({ provider });
  const p = await sdk.fetchPool(
    new PublicKey("8QwC9qPDaGkrL1X3Do3MzmajXCCt3T1R6LTDF6SeqQBn")
  );
  console.log(JSON.stringify(p, null, 4));
  const m = await sdk.fetchMarginAccount(p.margin!);
  // console.log(JSON.stringify(m, null, 4));
  console.log("lamports", (await conn.getAccountInfo(p.margin!))?.lamports);
})();

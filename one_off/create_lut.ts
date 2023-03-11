import { AnchorProvider, Wallet } from "@project-serum/anchor";
import { Connection, Keypair } from "@solana/web3.js";
import { createCoreTswapLUT } from "../tests/shared";

(async () => {
  console.log("creating lut...");

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

  await createCoreTswapLUT(provider);
})();

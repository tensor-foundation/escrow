import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { TSWAP_CORE_LUT } from "../src";
import { updateLUT } from "../tests/shared";

(async () => {
  console.log("creating/updating lut...");

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

  // await createCoreTswapLUT(provider);

  //test LUT to play with
  const lookupTableAddress = new PublicKey(
    "HUaXt5yU96yGWnUnMHLGAHVUPfuDomY3MWvz8XTdXQnm"
  );

  await updateLUT(provider, TSWAP_CORE_LUT);
})();

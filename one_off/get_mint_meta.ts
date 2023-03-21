import { Metaplex } from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";

(async () => {
  const mplex = new Metaplex(
    new Connection("https://api.mainnet-beta.solana.com")
  );
  const nft = await mplex
    .nfts()
    .findByMint({
      mintAddress: new PublicKey(
        "73ZNkkPMBXcMnZ4CLHFJxRp5fzUoATUjdSLKoypPP4xg"
      ),
    });
  console.log(nft);
})();

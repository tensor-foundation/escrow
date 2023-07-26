import { createTokenAuthorizationRules, TEST_PROVIDER } from "../tests/shared";
import { createAndMintPNft, createAndFundATA } from "../tests/tswap/common";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { AnchorProvider } from "@coral-xyz/anchor";
import { keypairIdentity, Metaplex } from "@metaplex-foundation/js";

(async () => {
  const payer = Keypair.fromSecretKey(
    Uint8Array.from(require("/Users/ilmoi/.config/solana/play.json"))
  );
  const wallet = new NodeWallet(payer);
  const provider = new AnchorProvider(
    new Connection("https://api.mainnet-beta.solana.com", {
      commitment: "confirmed",
    }),
    wallet,
    { commitment: "confirmed" }
  );

  console.log("lfg");

  const ruleSetAddr = await createTokenAuthorizationRules(provider, payer);
  // const ruleSetAddr = new PublicKey(
  //   "93329r1uvqbSS58Xz8iQuQ1NWNT59vesCF4HM4tqRTjs"
  // );
  console.log("ruleset", ruleSetAddr.toBase58());

  const collection = Keypair.generate();
  console.log("collection", collection.publicKey.toBase58());

  const creators = Array(1)
    .fill(null)
    .map((_) => ({ address: payer.publicKey, share: 100 }));

  const mint = Keypair.generate();
  console.log("mint", mint.publicKey.toBase58());

  const { tokenAddress } = await createAndMintPNft({
    owner: payer,
    mint,
    creators,
    // collection,
    // collectionVerified: true,
    ruleSet: ruleSetAddr,
    royaltyBps: 1000,
    provider,
  });

  //manually verify creators (auto doesn't work)
  // PNFTs creator not supported
  // const metaplex = new Metaplex(provider.connection);
  // await metaplex
  //   .use(keypairIdentity(payer))
  //   .nfts()
  //   .verifyCreator({ mintAddress: mint.publicKey, creator: payer });

  console.log("ata", tokenAddress.toBase58());
})();

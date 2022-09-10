/*
Instructions:

At the top level (ie tensorswap/), run:

1. See setup_data.ts instructions first
2. 
    ```
    ANCHOR_WALLET=~/.config/solana/id.json \
    TENSORSWAP_ADDR=<tswap program id> \
    TWHITELIST_ADDR=<twhitelist program id> \
    TSWAP_FEE_ACC=$(solana address) \
        yarn ts-node localnet/playground.ts
    ```
*/
import {
  TENSORSWAP_ADDR,
  TensorWhitelistSDK,
  TENSOR_WHITELIST_ADDR,
} from "../src";

import { swapSdk, TEST_PROVIDER, wlSdk } from "../tests/shared";

(async () => {
  const twhAccs = await TEST_PROVIDER.connection.getProgramAccounts(
    TENSOR_WHITELIST_ADDR
  );
  console.log(
    twhAccs.length,
    twhAccs.map((acc) => ({
      key: acc.pubkey.toBase58(),
      acct: wlSdk.decode(acc.account),
    }))
  );

  const tswapAccs = await TEST_PROVIDER.connection.getProgramAccounts(
    TENSORSWAP_ADDR
  );
  const parsed = tswapAccs.map((acc) => ({
    key: acc.pubkey.toBase58(),
    acc,
    parsed: swapSdk.decode(acc.account),
  }));
  console.log(parsed.length);
  console.log(
    "receipt",
    parsed.find((p) => p.parsed?.name === "nftDepositReceipt")?.parsed
  );
  console.log(
    "escrow",
    parsed.find((p) => p.parsed?.name === "solEscrow")?.parsed
  );
  console.log("pool", parsed.find((p) => p.parsed?.name === "pool")?.parsed);
  console.log("tswap", parsed.find((p) => p.parsed?.name === "tSwap")?.parsed);
  // console.log(findTSwapPDA({})[0].toBase58());
})();

const path = require("path");

const targetDir = path.join(__dirname, "..", "target");

function getProgram(file) {
  return path.join(targetDir, "deploy", file);
}

module.exports = {
  validator: {
    commitment: "processed",
    accountsCluster: "https://api.devnet.solana.com",
    programs: [
      {
        label: "Escrow",
        programId: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
        deployPath: getProgram("escrow_program.so"),
      },
      // extenal programs
      {
        label: "Tensor Whitelist",
        programId: "TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW",
        deployPath: getProgram(
          "TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW.so"
        ),
      },
      {
        label: "Tensor Bid",
        programId: "TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv",
        deployPath: getProgram(
          "TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv.so"
        ),
      },
      {
        label: "Metaplex Token Metadata",
        programId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        deployPath: getProgram(
          "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s.so"
        ),
      },
      {
        label: "Metaplex Token Auth Rules",
        programId: "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg",
        deployPath: getProgram(
          "auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg.so"
        ),
      },
      {
        label: "SPL Token-2022",
        programId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        deployPath: getProgram(
          "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb.so"
        ),
      },
      {
        label: "WNS",
        programId: "wns1gDLt8fgLcGhWi5MqAqgXpwEP1JftKE9eZnXS1HM",
        deployPath: getProgram(
          "wns1gDLt8fgLcGhWi5MqAqgXpwEP1JftKE9eZnXS1HM.so"
        ),
      },
      {
        label: "WNS Distribution",
        programId: "diste3nXmK7ddDTs1zb6uday6j4etCa9RChD8fJ1xay",
        deployPath: getProgram(
          "diste3nXmK7ddDTs1zb6uday6j4etCa9RChD8fJ1xay.so"
        ),
      },
    ],
    // extenal accounts
    accounts: [
      {
        label: "WNS Admin",
        accountId: "9SUrE3EPBoXVjNywEDHSJKJdxebs8H8sLgEWdueEvnKX",
        executable: false,
      },
    ],
  },
};

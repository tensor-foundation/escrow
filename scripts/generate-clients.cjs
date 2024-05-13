const path = require("path");
const fs = require("fs");
const k = require("@metaplex-foundation/kinobi");

// Paths.
const clientDir = path.join(__dirname, "..", "clients");
const idlDir = path.join(__dirname, "..", "program", "idl");

// Instanciate Kinobi.
const kinobi = k.createFromIdls([path.join(idlDir, "escrow_program.json")]);

// Update programs.
kinobi.update(
  k.updateProgramsVisitor({
    escrowProgram: {
      name: "tensorEscrow"
    }
  })
);

// Update accounts.
kinobi.update(
  k.updateAccountsVisitor({
    marginAccount: {
      seeds: [
        k.constantPdaSeedNodeFromString("margin"),
        k.variablePdaSeedNode(
          "tswap",
          k.publicKeyTypeNode(),
          "Tswap singleton account"
        ),
        k.variablePdaSeedNode(
          "owner",
          k.publicKeyTypeNode(),
          "The address of the pool and escrow owner"
        ),
        // TODO: should be constantPdaSeedNodeFromBytes (introduced in kinobi v19)
        k.variablePdaSeedNode(
          "marginNr",
          k.bytesTypeNode(k.fixedSizeNode(2)),
        )
      ]
    },
    tSwap: {
      seeds: []
    }
  })
);

// Set default account values accross multiple instructions.
kinobi.update(
  k.setInstructionAccountDefaultValuesVisitor([
    {
      account: "marginAccount",
      ignoreIfOptional: true,
      // TODO: when upgrading to v19, can be changed to pdaValueNode (resolver will be redundant and can be deleted)
      defaultValue: k.resolverValueNode("resolveMarginAccountPda", {
        dependsOn: [
          k.accountValueNode("owner")
        ]
      })
    },
    {
      account: "tswap",
      defaultValue: k.pdaValueNode("tSwap")
    }
  ])
);

// Update instructions.
kinobi.update(
  k.updateInstructionsVisitor({
    initMarginAccount: {
      arguments: {
        marginNr: {
          defaultValue: k.numberValueNode(0)
        },
        // TODO: add defaultValue to "name" arg
        // defaultValue should be byteValueNode (32 zero-bytes), needs higher version (^0.19)
      }
    },
    detachPoolFromMargin: {
      arguments: {
        lamports: {
          defaultValue: k.numberValueNode(0),
          docs: ["amount of lamports to be moved back to bid escrow"]
        }
      }
    },
    wnsBuyNft: {
      name: "buyNftWns"
    },
    wnsBuySingleListing: {
      name: "buySingleListingWns"
    },
    wnsDelist: {
      name: "delistWns"
    },
    wnsDepositNft: {
      name: "depositNftWns"
    },
    wnsList: {
      name: "listWns"
    },
    wnsSellNftTokenPool: {
      name: "sellNftTokenPoolWns"
    },
    wnsSellNftTradePool: {
      name: "sellNftTradePoolWns"
    },
    wnsWithdrawNft: {
      name: "withdrawNftWns"
    },
    withdrawMarginAccountCpi: {
      name: "withdrawMarginAccountFromTBid"
    },
    withdrawMarginAccountCpiTcomp: {
      name: "withdrawMarginAccountFromTComp"
    },
    withdrawMarginAccountCpiTlock: {
      name: "withdrawMarginAccountFromTLock"
    }
  })
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(k.renderJavaScriptExperimentalVisitor(jsDir, { 
  prettier,
  asyncResolvers: [
    "resolveMarginAccountPda"
  ]
}));

// Render Rust.
const crateDir = path.join(clientDir, "rust");
const rustDir = path.join(clientDir, "rust", "src", "generated");
kinobi.accept(
  k.renderRustVisitor(rustDir, {
    formatCode: true,
    crateFolder: crateDir,
    renderParentInstructions: true
  })
);

/*
const testKinobi = k.createFromJson(
  fs.readFileSync(path.join(__dirname, "token-metadata.json"))
);


testKinobi.accept(
  k.consoleLogVisitor(k.getDebugStringVisitor({ indent: true }))
);


// Render JavaScript for tests.
const jsTestDir = path.join(clientDir, "js", "test", "external", "generated");
testKinobi.accept(k.renderJavaScriptExperimentalVisitor(jsTestDir, { prettier }));
*/

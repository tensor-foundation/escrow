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
      name: "tensorEscrow",
    },
  })
);

// Update instructions.
kinobi.update(
  k.updateInstructionsVisitor({
    wnsBuyNft: {
      name: "buyNftWns",
    },
    wnsBuySingleListing: {
      name: "buySingleListingWns",
    },
    wnsDelist: {
      name: "delistWns",
    },
    wnsDepositNft: {
      name: "depositNftWns",
    },
    wnsList: {
      name: "listWns",
    },
    wnsSellNftTokenPool: {
      name: "sellNftTokenPoolWns",
    },
    wnsSellNftTradePool: {
      name: "sellNftTradePoolWns",
    },
    wnsWithdrawNft: {
      name: "withdrawNftWns",
    },
    withdrawMarginAccountCpi: {
      name: "withdrawMarginAccountFromTBid",
    },
    withdrawMarginAccountCpiTcomp: {
      name: "withdrawMarginAccountFromTComp",
    },
    withdrawMarginAccountCpiTlock: {
      name: "withdrawMarginAccountFromTLock",
    },
  })
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(k.renderJavaScriptExperimentalVisitor(jsDir, { prettier }));

// Render Rust.
const crateDir = path.join(clientDir, "rust");
const rustDir = path.join(clientDir, "rust", "src", "generated");
kinobi.accept(
  k.renderRustVisitor(rustDir, {
    formatCode: true,
    crateFolder: crateDir,
    renderParentInstructions: true,
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
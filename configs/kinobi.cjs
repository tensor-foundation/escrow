const path = require("path");
const k = require("@metaplex-foundation/kinobi");

// Paths.
const clientDir = path.join(__dirname, "..", "clients");
const idlDir = path.join(__dirname, "..", "idls");

// Instanciate Kinobi.
const kinobi = k.createFromIdls([path.join(idlDir, "margin_program.json")]);

// Update programs.
kinobi.update(
  k.updateProgramsVisitor({
    marginProgram: {
      name: "tensorMargin",
    },
  })
);

// Update instructions.
kinobi.update(
  k.updateInstructionsVisitor({
    buyNftT22: {
      name: "t22BuyNft",
    },
    buySingleListingT22: {
      name: "t22BuySingleListing",
    },
    delistT22: {
      name: "t22Delist",
    },
    depositNftT22: {
      name: "t22DepositNft",
    },
    listT22: {
      name: "t22List",
    },
    sellNftTokenPoolT22: {
      name: "t22SellNftTokenPool",
    },
    sellNftTradePoolT22: {
      name: "t22SellNftTradePool",
    },
    withdrawNftT22: {
      name: "t22WithdrawNft",
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

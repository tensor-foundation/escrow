#!/usr/bin/env zx
import "zx/globals";
import * as k from "kinobi";
import { rootNodeFromAnchor } from "@kinobi-so/nodes-from-anchor";
import { renderVisitor as renderJavaScriptVisitor } from "@kinobi-so/renderers-js";
import { renderVisitor as renderRustVisitor } from "@kinobi-so/renderers-rust";
import { getAllProgramIdls } from "./utils.mjs";

// Instanciate Kinobi.
const [idl, ...additionalIdls] = getAllProgramIdls().map((idl) =>
  rootNodeFromAnchor(require(idl)),
);
const kinobi = k.createFromRoot(idl, additionalIdls);

// Update programs.
kinobi.update(
  k.updateProgramsVisitor({
    escrowProgram: {
      name: "tensorEscrow",
    },
  }),
);

// Update programs.
kinobi.update(
  k.updateInstructionsVisitor({
    withdrawMarginAccountCpi: {
      name: "withdrawMarginAccountFromTBid",
    },
  }),
);

// Update accounts.
kinobi.update(
  k.updateAccountsVisitor({
    marginAccount: {
      seeds: [
        k.constantPdaSeedNodeFromString("utf8", "margin"),
        k.variablePdaSeedNode(
          "tswap",
          k.publicKeyTypeNode(),
          "Tswap singleton account",
        ),
        k.variablePdaSeedNode(
          "owner",
          k.publicKeyTypeNode(),
          "The address of the pool and escrow owner",
        ),
        k.variablePdaSeedNode("marginNr", k.numberTypeNode("u16")),
      ],
    },
    tSwap: {
      seeds: [],
    },
  }),
);

// Set default account values accross multiple instructions.
kinobi.update(
  k.setInstructionAccountDefaultValuesVisitor([
    {
      account: "tswap",
      defaultValue: k.pdaValueNode("tSwap"),
    },
  ]),
);

// Update instructions.
kinobi.update(
  k.updateInstructionsVisitor({
    initMarginAccount: {
      accounts: {
        marginAccount: {
          defaultValue: k.pdaValueNode("marginAccount", [
            k.pdaSeedValueNode("tswap", k.accountValueNode("tswap")),
            k.pdaSeedValueNode("owner", k.accountValueNode("owner")),
            k.pdaSeedValueNode("marginNr", k.argumentValueNode("marginNr")),
          ]),
        },
      },
      arguments: {
        marginNr: {
          defaultValue: k.numberValueNode(0),
        },
        name: {
          type: k.fixedSizeTypeNode(k.bytesTypeNode(), 32),
          defaultValue: k.bytesValueNode(
            "base16",
            "0000000000000000000000000000000000000000000000000000000000000000",
          ),
        },
      },
    },
    // Set marginAccount default to marginNr=0 as seeds for depositMarginAccount/withdrawMarginAccount
    // not for closeMarginAccount, so one would have to explicitly state which marginAccount to close!
    depositMarginAccount: {
      accounts: {
        marginAccount: {
          defaultValue: k.pdaValueNode("marginAccount", [
            k.pdaSeedValueNode("tswap", k.accountValueNode("tswap")),
            k.pdaSeedValueNode("owner", k.accountValueNode("owner")),
            k.pdaSeedValueNode("marginNr", k.numberValueNode(0)),
          ]),
        },
      },
    },
    withdrawMarginAccount: {
      accounts: {
        marginAccount: {
          defaultValue: k.pdaValueNode("marginAccount", [
            k.pdaSeedValueNode("tswap", k.accountValueNode("tswap")),
            k.pdaSeedValueNode("owner", k.accountValueNode("owner")),
            k.pdaSeedValueNode("marginNr", k.numberValueNode(0)),
          ]),
        },
      },
    },
  }),
);

// Render JavaScript.
const jsClient = path.join(__dirname, "..", "clients", "js");
kinobi.accept(
  renderJavaScriptVisitor(path.join(jsClient, "src", "generated"), {
    prettier: require(path.join(jsClient, ".prettierrc.json")),
  }),
);

// Render Rust.
const rustClient = path.join(__dirname, "..", "clients", "rust");
kinobi.accept(
  renderRustVisitor(path.join(rustClient, "src", "generated"), {
    formatCode: true,
    crateFolder: rustClient,
  }),
);

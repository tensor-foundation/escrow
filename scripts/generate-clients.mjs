#!/usr/bin/env zx
import "zx/globals";
import * as c from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor as renderJavaScriptVisitor } from "@codama/renderers-js";
import { renderVisitor as renderRustVisitor } from "@codama/renderers-rust";
import { getAllProgramIdls } from "./utils.mjs";

// Instanciate codama.
const [idl, ...additionalIdls] = getAllProgramIdls().map((idl) =>
  rootNodeFromAnchor(require(idl)),
);
const codama = c.createFromRoot(idl);
const codamaAdversarial = c.createFromRoot(additionalIdls[0]);

// Update programs.
codama.update(
  c.updateProgramsVisitor({
    escrowProgram: {
      name: "tensorEscrow",
    },
  }),
);

// Update programs.
codama.update(
  c.updateInstructionsVisitor({
    withdrawMarginAccountCpi: {
      name: "withdrawMarginAccountFromTBid",
    },
  }),
);

// Update accounts.
codama.update(
  c.updateAccountsVisitor({
    marginAccount: {
      seeds: [
        c.constantPdaSeedNodeFromString("utf8", "margin"),
        c.variablePdaSeedNode(
          "tswap",
          c.publicKeyTypeNode(),
          "Tswap singleton account",
        ),
        c.variablePdaSeedNode(
          "owner",
          c.publicKeyTypeNode(),
          "The address of the pool and escrow owner",
        ),
        c.variablePdaSeedNode("marginNr", c.numberTypeNode("u16")),
      ],
    },
    tSwap: {
      seeds: [],
    },
  }),
);

// Set default account values accross multiple instructions.
codama.update(
  c.setInstructionAccountDefaultValuesVisitor([
    {
      account: "tswap",
      defaultValue: c.pdaValueNode("tSwap"),
    },
  ]),
);

// Update instructions.
codama.update(
  c.updateInstructionsVisitor({
    initMarginAccount: {
      accounts: {
        marginAccount: {
          defaultValue: c.pdaValueNode("marginAccount", [
            c.pdaSeedValueNode("tswap", c.accountValueNode("tswap")),
            c.pdaSeedValueNode("owner", c.accountValueNode("owner")),
            c.pdaSeedValueNode("marginNr", c.argumentValueNode("marginNr")),
          ]),
        },
      },
      arguments: {
        marginNr: {
          defaultValue: c.numberValueNode(0),
        },
        name: {
          type: c.fixedSizeTypeNode(c.bytesTypeNode(), 32),
          defaultValue: c.bytesValueNode(
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
          defaultValue: c.pdaValueNode("marginAccount", [
            c.pdaSeedValueNode("tswap", c.accountValueNode("tswap")),
            c.pdaSeedValueNode("owner", c.accountValueNode("owner")),
            c.pdaSeedValueNode("marginNr", c.numberValueNode(0)),
          ]),
        },
      },
    },
    withdrawMarginAccount: {
      accounts: {
        marginAccount: {
          defaultValue: c.pdaValueNode("marginAccount", [
            c.pdaSeedValueNode("tswap", c.accountValueNode("tswap")),
            c.pdaSeedValueNode("owner", c.accountValueNode("owner")),
            c.pdaSeedValueNode("marginNr", c.numberValueNode(0)),
          ]),
        },
      },
    },
  }),
);

// Render JavaScript.
const jsClient = path.join(__dirname, "..", "clients", "js");
codama.accept(
  renderJavaScriptVisitor(path.join(jsClient, "src", "generated"), {
    prettier: require(path.join(jsClient, ".prettierrc.json")),
  }),
);

codamaAdversarial.accept(
  renderJavaScriptVisitor(path.join(jsClient, "test", "generated", "adversarial"), {
    prettier: require(path.join(jsClient, ".prettierrc.json")),
  }),
);

// Render Rust.
const rustClient = path.join(__dirname, "..", "clients", "rust");
codama.accept(
  renderRustVisitor(path.join(rustClient, "src", "generated"), {
    formatCode: true,
    crateFolder: rustClient,
  }),
);

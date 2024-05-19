#!/usr/bin/env zx
import "zx/globals";
import * as k from "kinobi";
import { rootNodeFromAnchor } from "@kinobi-so/nodes-from-anchor";
import { renderVisitor as renderJavaScriptVisitor } from "@kinobi-so/renderers-js";
import { renderVisitor as renderRustVisitor } from "@kinobi-so/renderers-rust";
import { getAllProgramIdls } from "./utils.mjs";

// Instanciate Kinobi.
const [idl, ...additionalIdls] = getAllProgramIdls().map((idl) =>
  rootNodeFromAnchor(require(idl))
);
const kinobi = k.createFromRoot(idl, additionalIdls);

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
  })
);

// Render JavaScript.
const jsClient = path.join(__dirname, "..", "clients", "js");
kinobi.accept(
  renderJavaScriptVisitor(path.join(jsClient, "src", "generated"), {
    prettier: require(path.join(jsClient, ".prettierrc.json")),
  })
);

// Render Rust.
const rustClient = path.join(__dirname, "..", "clients", "rust");
kinobi.accept(
  renderRustVisitor(path.join(rustClient, "src", "generated"), {
    formatCode: true,
    crateFolder: rustClient,
  })
);

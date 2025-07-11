#!/usr/bin/env zx
import "zx/globals";
import { workingDirectory, getProgramFolders } from "../utils.mjs";

const whereToFetchBinariesFrom = argv._.filter(a => a !== path.basename(__filename))[0];

// Save external programs binaries to the output directory.
if(whereToFetchBinariesFrom === "artifacts" || whereToFetchBinariesFrom === "mainnet") await import("./dump_mainnet_external.mjs");
else await import("./dump_devnet_external.mjs");

// Fetch binaries (potentially offchain) from artifacts/mainnet/devnet
if(whereToFetchBinariesFrom === "artifacts") await import("../fetch-external-binaries.mjs"); 
else if(whereToFetchBinariesFrom === "mainnet") await import("./dump_mainnet_others.mjs"); 
else await import("./dump_devnet_others.mjs");

// Build the programs.
for (const folder of getProgramFolders()) {
  cd(`${path.join(workingDirectory, folder)}`);
  await $`cargo-build-sbf ${process.argv.slice(4)}`;
}

#!/usr/bin/env zx
import { generateIdl } from "@metaplex-foundation/shank-js";
import "zx/globals";
import { getCargo, getProgramFolders } from "./utils.mjs";

const binaryInstallDir = path.join(__dirname, "..", ".cargo");

// Ensure the binary install directory exists
await $`mkdir -p ${binaryInstallDir}`.quiet();

for (const folder of getProgramFolders()) {
  try {
    const cargo = getCargo(folder);
    const programDir = path.join(__dirname, "..", folder);

    // Ensure the program directory exists
    await $`mkdir -p ${programDir}`.quiet();

    console.log(`Generating IDL for ${folder}...`);

    await generateIdl({
      generator: "anchor",
      programName: cargo.package.name.replace(/-/g, "_"),
      programId: cargo.package.metadata.solana["program-id"],
      idlDir: programDir,
      idlName: "idl",
      programDir,
      binaryInstallDir,
      rustbin: {
        locked: true
      }
    });

    console.log(`Successfully generated IDL for ${folder}`);
  } catch (error) {
    console.error(`Error generating IDL for ${folder}:`, error);
    throw error; // Re-throw to ensure the build fails
  }
}

import { parse as parseToml } from "@iarna/toml";
import "zx/globals";

process.env.FORCE_COLOR = 3;
process.env.CARGO_TERM_COLOR = "always";

export const workingDirectory = (await $`pwd`.quiet()).toString().trim();

export function getAllProgramIdls() {
  return getAllProgramFolders().map((folder) =>
    path.join(workingDirectory, folder, "idl.json")
  );
}

export function getExternalProgramOutputDir() {
  const config =
    getCargo().workspace?.metadata?.solana?.["external-programs-output"];
  return path.join(workingDirectory, config ?? "target/deploy");
}

export function getExternalProgramAddresses() {
  const offchainAddresses = getProgramFolders().flatMap(
    (folder) =>
      getCargo(folder).package?.metadata?.solana?.[
        "external-programs-repositories"
      ] ?? []
  );
  const addresses = getProgramFolders()
    .flatMap(
      (folder) =>
        getCargo(folder).package?.metadata?.solana?.["program-dependencies"] ??
        []
    )
    .filter(
      (address) =>
        !offchainAddresses.map(([repo, address]) => address).includes(address)
    );
  return Array.from(new Set(addresses));
}

export function getOffchainProgramAddresses() {
  const addresses = getProgramFolders()
    .flatMap(
      (folder) =>
        getCargo(folder).package?.metadata?.solana?.[
          "external-programs-repositories"
        ] ?? []
    )
    .map(([repo, address]) => address);
  return Array.from(new Set(addresses));
}

export function getExternalAccountAddresses() {
  const addresses = getProgramFolders().flatMap(
    (folder) =>
      getCargo(folder).package?.metadata?.solana?.["account-dependencies"] ?? []
  );
  return Array.from(new Set(addresses));
}

let didWarnAboutMissingPrograms = false;
export function getProgramFolders() {
  let programs;

  if (process.env.PROGRAMS) {
    try {
      programs = JSON.parse(process.env.PROGRAMS);
    } catch (error) {
      programs = process.env.PROGRAMS.split(/\s+/);
    }
  } else {
    programs = getAllProgramFolders();
  }

  const filteredPrograms = programs.filter((program) =>
    fs.existsSync(path.join(workingDirectory, program))
  );

  if (
    filteredPrograms.length !== programs.length &&
    !didWarnAboutMissingPrograms
  ) {
    didWarnAboutMissingPrograms = true;
    programs
      .filter((program) => !filteredPrograms.includes(program))
      .forEach((program) => {
        echo(chalk.yellow(`Program not found: ${workingDirectory}/${program}`));
      });
  }

  return filteredPrograms;
}

export function getAllProgramFolders() {
  return getCargo().workspace.members.filter((member) =>
    (getCargo(member).lib?.["crate-type"] ?? []).includes("cdylib")
  );
}

export function getCargo(folder) {
  return parseToml(
    fs.readFileSync(
      path.join(workingDirectory, folder ? folder : ".", "Cargo.toml"),
      "utf8"
    )
  );
}

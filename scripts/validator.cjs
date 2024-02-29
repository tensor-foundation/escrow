const path = require("path");

const targetDir = path.join(__dirname, "..", "target");

function getProgram(programBinary) {
  return path.join(targetDir, "deploy", programBinary);
}

module.exports = {
  validator: {
    commitment: "processed",
    programs: [
      {
        label: "Margin",
        programId: "TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN",
        deployPath: getProgram("margin_program.so"),
      },
      // Below are external programs that should be included in the local validator.
      // You may configure which ones to fetch from the cluster when building
      // programs within the `scripts/program/dump.sh` script.
      {
        label: "SPL Noop",
        programId: "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
        deployPath: getProgram("spl_noop.so"),
      },
    ],
  },
};
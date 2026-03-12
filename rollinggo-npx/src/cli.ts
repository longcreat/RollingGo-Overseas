import { CommanderError } from "commander";

import { createProgram } from "./program.js";

async function main(): Promise<void> {
  try {
    await createProgram().parseAsync(process.argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exit(error.exitCode);
    }
    throw error;
  }
}

main();

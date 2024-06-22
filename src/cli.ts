#!/usr/bin/env node

// Mine
import * as command from "./command";
// import * as process from 'process'; -- use global so can modify exitCode
import * as util from "./util";

const program = command.makeProgram();

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof Error) {
      if (program.opts().debug) {
        console.log(`${err.stack}`);
      }
      // util.terminate(`caught exception with message ${err.message}`);
      if (err.message !== util.suppressTerminateExceptionMessage) {
        console.log(`caught exception with message ${err.message}`);
      }
    } else {
      throw err;
    }
    // Recommended practice for node is set exitcode not force exit
    process.exitCode = 1;
  }
}

main().then(() => {});

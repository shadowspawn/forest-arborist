#!/usr/bin/env node

// Mine
import * as command from "./command";
import * as util from "./util";


const program = command.makeProgram();

// Sort commands so alphabetical in help. Using internal knowledge!
// https://github.com/tj/commander.js/issues/625
if (program.commands) {
  program.commands.sort((a: command.Command, b: command.Command) => {
    return a._name.localeCompare(b._name);
  });
}

try {
  program.parse(process.argv);
} catch (err) {
  if (program.debug) {
    console.log(`${err.stack}`);
  }
  // util.terminate(`caught exception with message ${err.message}`);
  if (err.message !== util.suppressTerminateExceptionMessage) {
    console.log(`caught exception with message ${err.message}`);
  }
  // Recommended practice for node is set exitcode not force exit
  process.exitCode = 1;
}

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

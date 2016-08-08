#!/usr/local/bin/node

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');

// const armConfigFilename = '.arm-config.json';
const armRootFilename = '.arm-root.json';

function terminate(message) {
  console.log(chalk.red(`Error: ${message}`));
  process.exit(1);
}


function loadRoot() {
  const masterKey = 'master';
  const data = fs.readFileSync(armRootFilename);
  let rootObject;

  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${armRootFilename}\n${err}`);
  }
  if (rootObject[masterKey] === undefined) {
    terminate(`problem parsing ${armRootFilename}\nmissing field 'master'`);
  }
  console.log(`master folder from root config: ${rootObject[masterKey]}`);

  Object.keys(rootObject.alphabet).forEach((key) => {
    console.log(`${key}: ${rootObject.alphabet[key]}`);
  });
}


function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}


function printRoot() {
  let tryParent = true;
  do {
    const cwd = process.cwd();

    if (fileExists(armRootFilename)) {
      console.log(process.cwd());
      return;
    }

    // NB: chdir('..') from '/' silently does nothing
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  terminate('Root of source tree not found. (Do you need to call \'arm init\'?)');
}


//------------------------------------------------------------------------------
// Command line processing

program
  .version('0.0.1');

// Extra help
program.on('--help', () => {
  console.log("  See also 'arm <command> --help' to read about a specific subcommand.");
  console.log('');
});

program
  .command('install')
  .description('install dependent repositories')
  .option('-n, --dry-run', 'do not perform actions, just print output')
  .action(() => {
    terminate('not implemented yet');
  });

program
  .command('init')
  .description(`add file above master repo to mark root of source tree (${armRootFilename})`)
  .option('-m, --master', 'master directory, defaults to current directory')
  .action(() => {
    terminate('not implemented yet');
  });

program
  .command('root')
  .description('print the root directory of the current source tree')
  .action(() => {
    printRoot();
    process.exit(0);
  });

program
  .command('_test')
  .description('testing testing testing')
  .action(() => {
    loadRoot();
    process.exit(0);
  });


program.parse(process.argv);

// Calling exit as part of recognised command handling,
// so into error handling if reach this code.

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

// Error in the same style as command uses for unknown option
console.log('');
console.log(`  error: unknown command \`${process.argv[2]}`);
console.log('');
process.exit(1);

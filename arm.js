#!/usr/local/bin/node

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
// Reminder: shell still listed as dependency in package.json, remove if not used
// const shell = require('shelljs');

const armConfigFilename = 'arm.json';
const armRootFilename = '.arm-root.json';

let gRecognisedCommand = false; // Seems there should be a tidier way...

const my = {
  errorColour: (text) => chalk.red(text),
  commandColour: (text) => chalk.blue(text),
};


function terminate(message) {
  console.log(my.errorColour(`Error: ${message}`));
  process.exit(1);
}


function testTest() {
  // // code in development, not final routine

  // shell playing about
  // if (shell.exec('git --version').code !== 0) {
  //   terminate('Error: git not available');
  // }
  // if (!shell.which('hg')) {
  //   terminate('Error: git not available');
  // }

  // // Read root file and do some json mucking about

  // const data = fs.readFileSync(armRootFilename);
  // let rootObject;
  //
  // try {
  //   rootObject = JSON.parse(data);
  // } catch (err) {
  //   terminate(`problem parsing ${armRootFilename}\n${err}`);
  // }
  // if (rootObject.master === undefined) {
  //   terminate(`problem parsing ${armRootFilename}\nmissing field 'master'`);
  // }
  // console.log(`master folder from root config: ${rootObject.master}`);
  //
  // Object.keys(rootObject.alphabet).forEach((key) => {
  //   console.log(`${key}: ${rootObject.alphabet[key]}`);
  // });
}


function fileExistsSync(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}


function dirExistsSync(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }
    throw err;
  }
}


function runCommand(cmd, args) {
  const child = childProcess.spawn(cmd, args);
  let stdoutText = '';
  let stderrText = '';
  child.stdout.on('data', (buffer) => { stdoutText += buffer.toString(); });
  child.stderr.on('data', (buffer) => { stderrText += buffer.toString(); });
  // child.stdout.on('end', () => { console.log('end'); callBack(stdoutText); });
  child.on('close', (code) => {
    console.log(my.commandColour(`${cmd} ${args.join(' ')}`));
    if (code === 0) {
      console.log(stdoutText);
    } else {
      console.log(my.errorColour(stderrText));
    }
  });
}


function readMasterFolderName() {
  const data = fs.readFileSync(armRootFilename);
  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${process.cwd()}/${armRootFilename}\n${err}`);
  }
  if (rootObject.master === undefined) {
    terminate(`problem parsing: ${process.cwd()}/${armRootFilename}\nmissing field 'master'`);
  }
  return rootObject.master;
}


function cdRootFolder() {
  const startedInMasterFolder = fileExistsSync(armConfigFilename);

  let tryParent = true;
  do {
    if (fileExistsSync(armRootFilename)) {
      readMasterFolderName(); // Sanity check
      return;
    }

    // NB: chdir('..') from '/' silently does nothing,so check we moved
    const cwd = process.cwd();
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  if (startedInMasterFolder) {
    terminate('Root of source tree not found. (Do you need to call \'arm init\'?)');
  } else {
    terminate('Root of source tree not found. ');
  }
}


function readConfig(includeMaster) {
  // Assuming already called cd to root folder
  const rootPath = process.cwd();
  const masterFolderName = readMasterFolderName();
  process.chdir(masterFolderName);

  const masterPath = process.cwd();
  let data;
  try {
    data = fs.readFileSync(armConfigFilename);
  } catch (err) {
    terminate(`problem opening ${masterPath}/${armConfigFilename}\n${err}`);
  }
  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${masterPath}/${armConfigFilename}\n${err}`);
  }

  if (includeMaster) rootObject[masterFolderName] = masterFolderName;

  process.chdir(rootPath);
  return rootObject;
}


function showTreeStatus() {
  const rootObject = readConfig(true);
  Object.keys(rootObject).forEach((repoPath) => {
    if (dirExistsSync(path.join(repoPath, '.hg'))) {
      runCommand(
        'hg', ['-R', repoPath, 'status']
      );
    } else {
      runCommand(
        'git', ['-C', repoPath, 'status', '--short']
      );
    }
  });
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
  .command('_install')
  .description('install dependent repositories')
  .option('-n, --dry-run', 'do not perform actions, just show actions')
  .action(() => {
    gRecognisedCommand = true;
    readConfig();
    terminate('not fully implemented yet');
  });

program
  .command('_init')
  .description(`add file above master repo to mark root of source tree (${armRootFilename})`)
  .option('-m, --master', 'master directory, defaults to current directory')
  .action(() => {
    gRecognisedCommand = true;
    terminate('not implemented yet');
  });

program
  .command('root')
  .description('show the root directory of the working tree')
  .action(() => {
    gRecognisedCommand = true;
    cdRootFolder();
    console.log(process.cwd());
    process.exit(0);
  });

program
  .command('status')
  .description('show the status of the working tree')
  .action(() => {
    gRecognisedCommand = true;
    cdRootFolder();
    showTreeStatus();
    // process.exit(0);
  });

program
  .command('_test')
  .description('testing testing testing')
  .action(() => {
    gRecognisedCommand = true;
    testTest();
    process.exit(0);
  });

program.parse(process.argv);

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

// Error in the same style as command uses for unknown option
if (!gRecognisedCommand) {
  console.log('');
  console.log(`  error: unknown command \`${process.argv[2]}'`);
  console.log('');
  process.exit(1);
}

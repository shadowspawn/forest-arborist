#!/usr/local/bin/node

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');

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


function execCommand(cmd, args) {
  childProcess.execFile(cmd, args, (error, stdout, stderr) => {
    console.log(my.commandColour(`${cmd} ${args.join(' ')}`));
    if (error) {
      console.log(my.errorColour(stderr));
    } else {
      console.log(stdout);
    }
  });
}


function readMasterDirectoryName() {
  const armRootPath = path.resolve(armRootFilename);
  const data = fs.readFileSync(armRootPath);
  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${armRootPath}\n${err}`);
  }
  if (rootObject.masterDirectory === undefined) {
    terminate(`problem parsing: ${armRootPath}\nmissing field 'masterDirectory'`);
  }
  return rootObject.masterDirectory;
}


function cdRootDirectory() {
  const startedInMasterDirectory = fileExistsSync(armConfigFilename);

  let tryParent = true;
  do {
    if (fileExistsSync(armRootFilename)) {
      readMasterDirectoryName(); // Sanity check
      return;
    }

    // NB: chdir('..') from '/' silently does nothing on Mac,so check we moved
    const cwd = process.cwd();
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  if (startedInMasterDirectory) {
    terminate('root of working group not found. (Do you need to call "arm init"?)');
  } else {
    terminate('root of working group not found. ');
  }
}


function readConfigDependencies(addMaster) {
  // Assuming already called cd to root directory
  const masterDirectoryName = readMasterDirectoryName();
  const configPath = path.resolve(masterDirectoryName, armConfigFilename);

  let data;
  try {
    data = fs.readFileSync(configPath);
  } catch (err) {
    terminate(`problem opening ${configPath}\n${err}`);
  }

  let configObject;
  try {
    configObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${configPath}\n${err}`);
  }
  if (configObject.dependencies === undefined) {
    terminate(`problem parsing: ${configPath}\nmissing field 'dependencies'`);
  }
  if (addMaster) configObject.dependencies[masterDirectoryName] = masterDirectoryName;

  return configObject.dependencies;
}


function doStatus() {
  const dependencies = readConfigDependencies(true);
  Object.keys(dependencies).forEach((repoPath) => {
    if (dirExistsSync(path.join(repoPath, '.hg'))) {
      execCommand(
        'hg', ['-R', repoPath, 'status']
      );
    } else {
      execCommand(
        'git', ['-C', repoPath, 'status', '--short']
      );
    }
  });
}


function findRepositories(startingDirectory, callback) {
  const itemList = fs.readdirSync(startingDirectory);
  itemList.forEach((item) => {
    const itemPath = path.join(startingDirectory, item);
    if (dirExistsSync(itemPath)) {
      if (dirExistsSync(path.join(itemPath, '.git'))) {
        const origin = childProcess.execFileSync(
          'git', ['-C', itemPath, 'config', '--get', 'remote.origin.url']
        ).toString().trim();
        callback(itemPath, origin);
      } else if (dirExistsSync(path.join(itemPath, '.hg'))) {
        const origin = childProcess.execFileSync(
          'hg', ['-R', itemPath, 'config', 'paths.default']
        ).toString().trim();
        callback(itemPath, origin);
      } else {
        findRepositories(itemPath, callback);
      }
    }
  });
}


function doInit() {
  if (!dirExistsSync('.git') && !dirExistsSync('.hg')) {
    terminate('no .git or .hg directory here. Please run from directory of main repository.');
  }

  const masterDirectory = path.basename(process.cwd());
  process.chdir('..');

  // Dependencies
  const configPath = path.resolve(masterDirectory, armConfigFilename);
  if (fileExistsSync(configPath)) {
    console.log(`Skipping dependencies, already have ${armConfigFilename}`);
  } else {
    const dependencies = {};
    findRepositories('.', (directory, origin) => {
      dependencies[directory] = origin;
    });
    delete dependencies[masterDirectory];
    const config = { dependencies };
    const prettyConfig = JSON.stringify(config, null, '  ');

    fs.writeFileSync(configPath, prettyConfig);
    console.log(`Initialised dependencies in ${armConfigFilename}`);
  }

  // Root placeholder file. Safer to overwrite as low content.
  const rootFilePath = path.resolve(armRootFilename);
  let initialisedWord = 'Initialised';
  if (fileExistsSync(armRootFilename)) initialisedWord = 'Reinitialised';
  const rootObject = { masterDirectory };
  const prettyRootObject = JSON.stringify(rootObject, null, '  ');
  fs.writeFileSync(rootFilePath, prettyRootObject);
  console.log(`${initialisedWord} marker file at root of working group: ${rootFilePath}`);
}

//------------------------------------------------------------------------------
// Command line processing

program
  .version('0.0.1');

// Extra help
program.on('--help', () => {
  console.log('  Files:');
  console.log(
    `    ${armConfigFilename} contains repos for working group (dependencies of main repo)`);
  console.log(`    ${armRootFilename} marks root of working group`);
  console.log('');
  console.log("  See also 'arm <command> --help' if there are options on a subcommand.");
  console.log('');
});

program
  .command('init')
  .description('add dependencies file in current repo, and marker file at root of working group')
  .action(() => {
    gRecognisedCommand = true;
    // Start from master directory rather than root directory
    doInit();
  });

program
  .command('root')
  .description('show the root directory of the working group')
  .action(() => {
    gRecognisedCommand = true;
    cdRootDirectory();
    console.log(process.cwd());
  });

program
  .command('status')
  .description('show the status of the working group')
  .action(() => {
    gRecognisedCommand = true;
    cdRootDirectory();
    doStatus();
  });

program
  .command('_install')
  .description('install dependent repositories')
  .option('-n, --dry-run', 'do not perform actions, just show actions')
  .action(() => {
    gRecognisedCommand = true;
    readConfigDependencies();
    terminate('not fully implemented yet');
  });

program
  .command('_test')
  .description('testing testing testing')
  .action(() => {
    gRecognisedCommand = true;
    console.log(chalk.yellow('test'));
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

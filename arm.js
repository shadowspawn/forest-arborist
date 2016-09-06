#!/usr/bin/env node
// Shebang uses absolute path, but may vary between Mac and Lin, so env for portability.

'use strict'; // eslint-disable-line strict

// Naming used in this file: the repo/directory containing the config file is the nest.
// (Following theme of root and forest...)

const program = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const url = require('url');
const mute = require('mute');
const myPackage = require('./package.json');

const armConfigFilename = 'arm.json'; // stored in nest directory
const armRootFilename = '.arm-root.json'; // stored in root directory

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


function getUnrecognisedArgs() {
  const args = program.args[0];

  // commander is passing "self" as final parameter for undocumented reasons!
  if ((args.length > 0) && (typeof args[args.length - 1] === 'object')) {
    args.pop();
  }

  return args;
}


function assertRecognisedArgs() {
  const unrecognisedArgs = getUnrecognisedArgs();
  if (unrecognisedArgs.length > 0) {
    console.log('');
    console.log(`  error: unexpected extra args: ${unrecognisedArgs}`);
    console.log('');
    process.exit(1);
  }
}


function execCommandSync(commandParam) {
  const command = commandParam;
  if (command.args === undefined) command.args = [];
  let cwdDisplay = `${command.cwd}: `;
  if (command.cwd === undefined || command.cwd === '') {
    cwdDisplay = '(root): ';
    command.cwd = '.';
  }
  if (command.suppressContext) cwdDisplay = '';

  // Trying hard to get a possibly copy-and-paste command.
  let quotedArgs = '';
  if (command.args.length > 0) quotedArgs = `'${command.args.join("' '")}'`;
  quotedArgs = quotedArgs.replace(/\n/g, '\\n');
  console.log(chalk.blue(`${cwdDisplay}${command.cmd} ${quotedArgs}`));

  try {
    // Note: he stdio option hooks up child stream to parent so we get live progress.
    childProcess.execFileSync(
        command.cmd, command.args,
        { cwd: command.cwd, stdio: [0, 1, 2] }
      );
  } catch (err) {
    // Some commands return non-zero for expecte situations
    if (command.allowedShellStatus === undefined || command.allowedShellStatus !== err.status) {
      throw err;
    }
  }
  console.log(''); // blank line after command output
}


function readNestPathFromRoot() {
  const armRootPath = path.resolve(armRootFilename);
  const data = fs.readFileSync(armRootPath);
  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${armRootPath}\n${err}`);
  }
  if (rootObject.configDirectory === undefined) {
    terminate(`problem parsing: ${armRootPath}\nmissing field 'configurationDirectory'`);
  }
  return rootObject.configDirectory;
}


function cdRootDirectory() {
  const startedInNestDirectory = fileExistsSync(armConfigFilename);

  let tryParent = true;
  do {
    if (fileExistsSync(armRootFilename)) {
      return;
    }

    // NB: chdir('..') from '/' silently does nothing on Mac, so check we moved
    const cwd = process.cwd();
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  if (startedInNestDirectory) {
    terminate('root of forest not found. (Do you need to call "arm install"?)');
  } else {
    terminate('root of forest not found. ');
  }
}


function readConfig(nestPath, addNestToDependencies) {
  const configPath = path.resolve(nestPath, armConfigFilename);

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
  if (configObject.rootDirectory === undefined) {
    terminate(`problem parsing: ${configPath}\nmissing field 'rootDirectory'`);
  }

  if (addNestToDependencies) {
    let repoType;
    if (dirExistsSync(path.join(nestPath, '.git'))) repoType = 'git';
    else if (dirExistsSync(path.join(nestPath, '.hg'))) repoType = 'hg';
    configObject.dependencies[nestPath] = { repoType };
  }

  // Sanity check repoType so callers do not need to warn about unexpected type.
  Object.keys(configObject.dependencies).forEach((repoPath) => {
    const repoType = configObject.dependencies[repoPath].repoType;
    const supportedTypes = ['git', 'hg'];
    if (supportedTypes.indexOf(repoType) === -1) {
      console.log(my.errorColour(
        `Skipping entry for "${repoPath}" with unsupported repoType: ${repoType}`
      ));
      delete configObject.dependencies[repoPath];
    }
  });

  return configObject;
}


function doStatus() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readConfig(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    if (repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['status', '--short'], cwd: repoPath }
      );
    } else if (repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['status'], cwd: repoPath }
      );
    }
  });
}


function doFetch() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readConfig(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    if (repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['fetch'], cwd: repoPath }
      );
    } else if (repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['pull'], cwd: repoPath }
      );
    }
  });
}


function doHgAutoMerge(repoPath) {
  // Battle tested code from hgh tool
  const headCount = childProcess.execFileSync(
    'hg', ['heads', '.', '--repository', repoPath, '--template', 'x']
  ).length;
  if (headCount === 0) {
    // Brand new repo, nothing to do
  } else if (headCount === 1) {
    // We just did a pull, so looking for an update.
    const tipNode = childProcess.execFileSync(
      'hg', ['tip', '--repository', repoPath, '--template', '{node}']
    );
    const parentNode = childProcess.execFileSync(
      'hg', ['parents', '--repository', repoPath, '--template', '{node}']
    );
    if (tipNode !== parentNode) {
      execCommandSync(
        { cmd: 'hg', args: ['update'], cwd: repoPath }
      );
    }
  } else {
    try {
      execCommandSync(
        { cmd: 'hg', args: ['merge', '--tool', 'internal:merge'], cwd: repoPath }
      );
      execCommandSync(
        { cmd: 'hg', args: ['commit', '--message', 'Merge'], cwd: repoPath }
      );
    } catch (err) {
      if (err.status === 1) {
        console.log(my.errorColour('NB: unresolved conflicts'));
        console.log('');
      } else {
        throw err;
      }
    }
  }
}


function doPull() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readConfig(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    if (repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['pull'], cwd: repoPath }
      );
    } else if (repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['pull'], cwd: repoPath }
      );
      doHgAutoMerge(repoPath);
    }
  });
}


function doOutgoing() {
  cdRootDirectory();
  const nestDirectory = readNestPathFromRoot();
  const dependencies = readConfig(nestDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    if (repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['log', '@{u}..', '--oneline'], cwd: repoPath }
      );
    } else if (repoType === 'hg') {
      // Outgoing returns 1 if there are no outgoing changes.
      execCommandSync(
        { cmd: 'hg',
          args: ['outgoing', '--quiet', '--template', '{node|short} {desc|firstline}\n'],
          cwd: repoPath,
          allowedShellStatus: 1,
        }
      );
    }
  });
}


function isGitRepository(repository) {
  const unmute = mute(); // Did not manage to suppress output using stdio, so use mute.
  try {
    // KISS and get git to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync(
      'git', ['ls-remote', repository]
    );
    unmute();
    return true;
  } catch (err) {
    unmute();
    return false;
  }
}


function isHgRepository(repository) {
  const unmute = mute(); // Did not manage to suppress output using stdio, so use mute.
  try {
    // KISS and get hg to check. Hard to be definitive by hand, especially with scp URLs.
    childProcess.execFileSync(
      'hg', ['id', repository]
    );
    unmute();
    return true;
  } catch (err) {
    unmute();
    return false;
  }
}


function writeRootFile(rootFilePath, nestFromRoot) {
  let initialisedWord = 'Initialised';
  if (fileExistsSync(rootFilePath)) initialisedWord = 'Reinitialised';
  const rootObject = { configDirectory: nestFromRoot };
  const prettyRootObject = JSON.stringify(rootObject, null, '  ');
  fs.writeFileSync(rootFilePath, prettyRootObject);
  if (nestFromRoot === '') {
    console.log(`${initialisedWord} marker file at root of forest: ${armRootFilename}`);
  } else {
    console.log(`${initialisedWord} marker file at root of forest: ${rootFilePath}`);
  }
}


function doInstall() {
  let configObject;
  if (fileExistsSync(armConfigFilename)) {
    // Probably being called during setup, before root file added.
    configObject = readConfig('.');
    const rootAbsolutePath = path.resolve(configObject.rootDirectory);
    const nestFromRoot = path.relative(rootAbsolutePath, process.cwd());
    writeRootFile(path.join(rootAbsolutePath, armRootFilename), nestFromRoot);
  }

  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  if (configObject === undefined) configObject = readConfig(nestPath);
  const dependencies = configObject.dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    if (dirExistsSync(repoPath)) {
      console.log(`Skipping already present dependency: ${repoPath}`);
    } else {
      const entry = dependencies[repoPath];
      execCommandSync(
        { cmd: entry.repoType, args: ['clone', entry.origin, repoPath], suppressContext: true }
      );
    }
  });
}


function findRepositories(startingDirectory, callback) {
  if (startingDirectory === '.hg' || startingDirectory === '.git') {
    return; // No point searching inside control folders
  }

  const itemList = fs.readdirSync(startingDirectory);
  itemList.forEach((item) => {
    const itemPath = path.join(startingDirectory, item);
    if (dirExistsSync(itemPath)) {
      if (dirExistsSync(path.join(itemPath, '.git'))) {
        const origin = childProcess.execFileSync(
          'git', ['-C', itemPath, 'config', '--get', 'remote.origin.url']
        ).toString().trim();
        callback(itemPath, origin, 'git');
      } else if (dirExistsSync(path.join(itemPath, '.hg'))) {
        const origin = childProcess.execFileSync(
          'hg', ['--repository', itemPath, 'config', 'paths.default']
        ).toString().trim();
        callback(itemPath, origin, 'hg');
      }

      // Keep searching in case of nested repos.
      findRepositories(itemPath, callback);
    }
  });
}


function doInit(rootDirParam) {
  const configPath = path.resolve(armConfigFilename);
  if (fileExistsSync(configPath)) {
    console.log(`Skipping init, already have ${armConfigFilename}`);
    return;
  }
  if (fileExistsSync('.hgsub')) {
    console.log('Skipping init, found .hgsub. Suggest use sibling init for subrepositories.');
    return;
  }

  // Sort out nest and root paths
  const nestAbsolutePath = process.cwd();
  let rootAbsolutePath;
  if (rootDirParam === undefined) {
    rootAbsolutePath = process.cwd();
    console.log('Scanning for nested dependencies…');
  } else {
    rootAbsolutePath = path.resolve(rootDirParam);
    console.log('Scanning for dependencies from root…');
  }
  const nestFromRoot = path.relative(rootAbsolutePath, nestAbsolutePath);
  const rootFromNest = path.relative(nestAbsolutePath, rootAbsolutePath);

  // Dependencies
  process.chdir(rootAbsolutePath);
  const dependencies = {};
  findRepositories('.', (directory, origin, repoType) => {
    dependencies[directory] = { origin, repoType };
    console.log(`  ${directory}`);
  });
  delete dependencies[nestFromRoot];
  const config = { dependencies, rootDirectory: rootFromNest };
  const prettyConfig = JSON.stringify(config, null, '  ');

  fs.writeFileSync(configPath, prettyConfig);
  console.log(`Initialised dependencies in ${armConfigFilename}`);

  // Root placeholder file. Safer to overwrite as low content.
  writeRootFile(path.join(rootAbsolutePath, armRootFilename), nestFromRoot);
}


function doClone(source, destinationParam) {
  // We need to know the nest directory to find the config file after the clone.
  let destination = destinationParam;
  if (destination !== undefined) {
    // Leave it up to user to make intermediate directories if needed.
  } else if (source.indexOf('/') !== -1) {
    // Might be URL or a posix path.
    const urlPath = url.parse(source).pathname;
    destination = path.posix.basename(urlPath, '.git');
  } else {
    // file system
    destination = path.basename(source, '.git');
  }

  // Clone source.
  if (isGitRepository(source)) {
    execCommandSync(
      { cmd: 'git', args: ['clone', source, destination], suppressContext: true }
    );
  } else if (isHgRepository(source)) {
    execCommandSync(
      { cmd: 'hg', args: ['clone', source, destination], suppressContext: true }
    );
  } else {
    terminate(`Unable to determine repository type: ${source}`);
  }

  if (!fileExistsSync(path.join(destination, armConfigFilename))) {
    terminate(`Warning: stopping as did not find ${armConfigFilename}`);
  }

  process.chdir(destination);
  doInstall();
}


function doForEach(args) {
  if (args.length === 0) terminate('No foreach command specified');
  const cmd = args.shift();

  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readConfig(nestPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    if (args.length > 0) {
      execCommandSync(
        { cmd, args, cwd: repoPath }
      );
    } else {
      execCommandSync(
        { cmd, cwd: repoPath }
      );
    }
  });
}


function doSnapshot() {
  cdRootDirectory();
  const nestPath = readNestPathFromRoot();
  const dependencies = readConfig(nestPath, true).dependencies;

  const snapshot = {};
  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    let id;
    if (repoType === 'git') {
      id = childProcess.execFileSync(
        'git', ['rev-parse', 'HEAD'], { cwd: repoPath }
      ).toString().trim();
    } else if (repoType === 'hg') {
      id = childProcess.execFileSync(
        'hg', ['log', '--rev', '.', '--template', '{node}'], { cwd: repoPath }
      ).toString().trim();
    }
    snapshot[repoPath] = id;
  });
  const prettySnapshot = JSON.stringify(snapshot, null, '  ');
  console.log(prettySnapshot);
}


//------------------------------------------------------------------------------
// Command line processing

program
  .version(myPackage.version);

// Extra help
program.on('--help', () => {
  console.log('  Files:');
  console.log(
    `    ${armConfigFilename} configuration file for forest, especially dependencies`);
  console.log(`    ${armRootFilename} marks root of forest`);
  console.log('');
  console.log('  Commands starting with an underscore are still in development.');
  console.log('  See https://github.com/JohnRGee/arm.git for usage overview.');
  console.log("  See also 'arm <command> --help' if there are options on a subcommand.");
  console.log('');
});

program
  .command('clone <source> [destination]')
  .description('clone source and install its dependencies')
  .action((source, destination) => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doClone(source, destination);
  });


program
  .command('fetch')
  .description('fetch branches and tags from origin remote')
  .action(() => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doFetch();
  });

program
  .command('init')
  .option('--root <dir>', 'root directory of forest if not current directory')
  .description('add config file in current directory, and marker file at root of forest')
  .action((options) => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doInit(options.root);
  });

program
  .command('install')
  .description('clone missing (new) dependent repositories')
  .action(() => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doInstall();
  });

program
  .command('outgoing')
  .description('show changesets not in the default push location')
  .action(() => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doOutgoing();
  });

program
  .command('pull')
  .description('git-style pull, which is fetch and merge')
  .action(() => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doPull();
  });

program
  .command('root')
  .description('show the root directory of the forest')
  .action(() => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    cdRootDirectory();
    console.log(process.cwd());
  });

program
  .command('status')
  .description('show concise status for each repo in the forest')
  .action(() => {
    gRecognisedCommand = true;
    assertRecognisedArgs();
    doStatus();
  });

program
  .command('_foreach')
  .description('run specified command on forest, e.g. "arm _foreach -- pwd"')
  .arguments('[command...]')
  .action((command) => {
    gRecognisedCommand = true;
    doForEach(command);
  });

program
  .command('_snapshot [save|restore]')
  .description('display state of forest')
  .action((command) => {
    gRecognisedCommand = true;
    if (command !== undefined) console.log(my.errorColour('save and restore not implemented yet'));
    doSnapshot();
  });

program.parse(process.argv);

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

// Error2 in the same style as command uses for unknown option
if (!gRecognisedCommand) {
  console.log('');
  console.log(`  error: unknown command \`${process.argv[2]}'`);
  console.log('');
  process.exit(1);
}

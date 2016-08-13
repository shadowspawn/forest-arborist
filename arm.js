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
    terminate('root of source tree not found. (Do you need to call "arm init"?)');
  } else {
    terminate('root of source tree not found. ');
  }
}


function readConfig(includeMaster) {
  // Assuming already called cd to root folder
  const masterFolderName = readMasterFolderName();
  const configPath = path.resolve(masterFolderName, armConfigFilename);

  let data;
  try {
    data = fs.readFileSync(configPath);
  } catch (err) {
    terminate(`problem opening ${configPath}\n${err}`);
  }
  let dependenciesObject;
  try {
    dependenciesObject = JSON.parse(data);
  } catch (err) {
    terminate(`problem parsing ${configPath}\n${err}`);
  }

  if (includeMaster) dependenciesObject[masterFolderName] = masterFolderName;
  return dependenciesObject;
}


function doStatus() {
  const rootObject = readConfig(true);
  Object.keys(rootObject).forEach((repoPath) => {
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


function findRepositories(startingFolder, callback) {
  const itemList = fs.readdirSync(startingFolder);
  itemList.forEach((item) => {
    const itemPath = path.join(startingFolder, item);
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


  // var walk = function(dir, done) {
  //   var results = [];
  //   fs.readdir(dir, function(err, list) {
  //     if (err) return done(err);
  //     var pending = list.length;
  //     if (!pending) return done(null, results);
  //     list.forEach(function(file) {
  //       file = path.resolve(dir, file);
  //       fs.stat(file, function(err, stat) {
  //         if (stat && stat.isDirectory()) {
  //           walk(file, function(err, res) {
  //             results = results.concat(res);
  //             if (!--pending) done(null, results);
  //           });
  //         } else {
  //           results.push(file);
  //           if (!--pending) done(null, results);
  //         }
  //       });
  //     });
  //   });
  // };
}


function doInit(options) {
  if (!dirExistsSync('.git') && !dirExistsSync('.hg')) {
    terminate('no .git or .hg folder here. Please run from folder of main repository.');
  }
  if (fileExistsSync(armConfigFilename) && !options.force) {
    terminate(`already have ${armConfigFilename}. To overwrite use "arm init --force".`);
  }

  const masterFolder = path.basename(process.cwd());
  const configPath = path.resolve(armConfigFilename);
  process.chdir('..');

  const dependencies = {};
  findRepositories('.', (folder, origin) => {
    dependencies[folder] = origin;
  });
  delete dependencies[masterFolder];
  const prettyDependencies = JSON.stringify(dependencies, null, '  ');

  const rootFilePath = path.resolve(armRootFilename);
  const rootObject = { master: masterFolder };
  const prettyRootObject = JSON.stringify(rootObject, null, '  ');

  if (options.dryRun) {
    console.log(`Dependencies to write to ${configPath}:`);
    console.log(prettyDependencies);
    console.log(`Master to write to ${rootFilePath}:`);
    console.log(prettyRootObject);
  } else {
    fs.writeFileSync(configPath, prettyDependencies);
    console.log(`Initialised ${configPath}`);

    fs.writeFileSync(rootFilePath, prettyRootObject);
    console.log(`Initialised ${rootFilePath}`);
  }
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
  .command('init')
  .description(`add file above master repo to mark root of source tree (${armRootFilename})`)
  .option('-f, --force', 'overwrite existing file')
  .option('-n, --dry-run', 'do not perform actions, show what would happen')
  .action((options) => {
    gRecognisedCommand = true;
    doInit(options);
  });

program
  .command('root')
  .description('show the root directory of the working tree')
  .action(() => {
    gRecognisedCommand = true;
    cdRootFolder();
    console.log(process.cwd());
  });

program
  .command('status')
  .description('show the status of the working tree')
  .action(() => {
    gRecognisedCommand = true;
    cdRootFolder();
    doStatus();
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

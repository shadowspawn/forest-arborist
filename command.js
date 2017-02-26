#!/usr/bin/env node
// Node location may vary between Mac and Lin, so env for portability.

// Do we still need strict? Was needed for an older node, and eslint thinks not needed.
/* eslint strict: [0, "global"] */

'use strict';

// Naming used in this file: the repo/directory containing the manifest file is the main repo/.

const childProcess = require('child_process');
const fs = require('fs');
const program = require('commander');
// Mine
const myPackage = require('./package.json');
const core = require('./lib/core');
const coreBranch = require('./lib/core-branch');
const coreClone = require('./lib/core-clone');
const coreFor = require('./lib/core-for');
const coreInit = require('./lib/core-init');
const coreSnapshot = require('./lib/core-snapshot');
const repo = require('./lib/repo');
const util = require('./lib/util');


function doStatus() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.repoType === 'git') {
      util.execCommandSync(
        { cmd: 'git', args: ['status', '--short'], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      util.execCommandSync(
        { cmd: 'hg', args: ['status'], cwd: repoPath }
      );
    }
  });
  process.chdir(startDir);
}


function hgAutoMerge(repoPath) {
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
      util.execCommandSync(
        { cmd: 'hg', args: ['update'], cwd: repoPath }
      );
    }
  } else {
    try {
      util.execCommandSync(
        { cmd: 'hg', args: ['merge', '--tool', 'internal:merge'], cwd: repoPath }
      );
      util.execCommandSync(
        { cmd: 'hg', args: ['commit', '--message', 'Merge'], cwd: repoPath }
      );
    } catch (err) {
      if (err.status === 1) {
        console.log(util.errorColour('NB: unresolved conflicts'));
        console.log('');
      } else {
        throw err;
      }
    }
  }
}


function doPull() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${repoPath}\n`);
    } else if (repo.getBranch(repoPath, entry.repoType) === undefined) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      const repoType = entry.repoType;
      if (repoType === 'git') {
        util.execCommandSync(
          { cmd: 'git', args: ['pull'], cwd: repoPath }
        );
      } else if (repoType === 'hg') {
        util.execCommandSync(
          { cmd: 'hg', args: ['pull'], cwd: repoPath }
        );
        hgAutoMerge(repoPath);
      }
    }
  });
  process.chdir(startDir);
}


//------------------------------------------------------------------------------
// Command line processing

program
  .version(myPackage.version)
  .option('--debug', 'include debugging information, such as stack dump');

// Extra help
program.on('--help', () => {
  console.log('  Files:');
  console.log(
    `    ${core.manifestPath({})} default manifest for forest`);
  console.log(`    ${core.fabRootFilename} marks root of forest (do not commit to VCS)`);
  console.log('');
  console.log('  Forest management: clone, init, install');
  console.log('  Utility: status, pull, outgoing, for-each, for-free');
  console.log('  Branch: make-branch, switch');
  console.log('  Reproducible state: snapshot, recreate, restore');
  console.log('');
  console.log('  See https://github.com/JohnRGee/forest-arborist.git for usage overview.');
  console.log("  See also 'fab <command> --help' for command options and further help.");
  console.log('');
});

program
  .command('clone <source> [destination]')
  .option('-b, --branch <branchname>', 'branch to checkout for free repos')
  .option('-m, --manifest <name>', 'custom manifest file')
  .description('clone source and install its dependencies')
  .action((source, destination, options) => {
    coreClone.doClone(source, destination, options);
  });

program
  .command('init')
  .option('--root <dir>', 'root directory of forest if not current directory')
  .option('-m, --manifest <name>', 'custom manifest file')
  .description('add manifest in current directory, and marker file at root of forest')
  .on('--help', () => {
    console.log('  Use init to create the manifest based on your current sandpit. ');
    console.log('  Run from your main repo and it finds the dependent repos.');
    console.log('');
    console.log('  Examples:');
    console.log('    For a forest layout with dependent repos nested in the main repo:');
    console.log('         fab init');
    console.log('');
    console.log('    For a forest layout with sibling repositories:');
    console.log('         fab init --root ..');
  })
  .action((options) => {
    coreInit.doInit(options);
  });

program
  .command('install')
  .option('-m, --manifest <name>', 'custom manifest file')
  .description('clone missing (new) dependent repositories')
  .on('--help', () => {
    console.log('  Run Install from the main repo.');
  })
  .action((options) => {
    coreClone.doInstall(options);
  });

program
  .command('status')
  .description('show concise status for each repo in the forest')
  .action(() => {
    doStatus();
  });

program
  .command('pull')
  .description('git-style pull, which is fetch and merge')
  .on('--help', () => {
    console.log('  Target repos: free and branch-locked, excludes repos pinned to a revision');
  })
  .action(() => {
    doPull();
  });

program
  .command('root')
  .description('show the root directory of the forest')
  .action(() => {
    core.cdRootDirectory();
    console.log(process.cwd());
  });

program
  .command('for-each')
  .alias('forEach')
  .description('run specified command on each repo in the forest, e.g. "fab for-each ls -- -al"')
  .arguments('<command> [args...]')
  .action((command, args) => {
    coreFor.doForEach({}, command, args);
  });

program
  .command('for-free')
  .description('run specified command on repos which are not locked or pinned')
  .arguments('<command> [args...]')
  .action((command, args) => {
    coreFor.doForEach({ freeOnly: true }, command, args);
  });

program
  .command('switch <branch>')
  .description('switch branch of free repos')
  .action((branch) => {
    coreBranch.doSwitch(branch);
  });

program
  .command('make-branch <branch> [start_point]')
  .option('-p, --publish', 'push newly created branch')
  .description('create new branch in free repos')
  .action((branch, startPoint, options) => {
    coreBranch.doMakeBranch(branch, startPoint, options.publish);
  });

program
  .command('snapshot')
  .option('-o, --output <file>', 'write snapshot to file rather then stdout')
  .description('display state of forest')
  .action((options) => {
    coreSnapshot.doSnapshot(options);
  });

program
  .command('recreate <snapshot> [destination]')
  .description('clone repos to recreate forest in past state')
  .action((snapshot, destination) => {
    coreSnapshot.doRecreate(snapshot, destination);
  });

program
  .command('restore [snapshot]')
  .description('checkout repos to restore forest in past state')
  .action((snapshot) => {
    coreSnapshot.doRestore(snapshot);
  });

// Hidden command for trying things out
program
  .command('_test', null, { noHelp: true })
  .description('test')
  .action(() => {
    const itemList = fs.readdirSync('.fab');
    itemList.forEach((item) => {
      if (item === 'manifest.json') {
        console.log('  (default)');
      } else {
        const match = /(.*)_manifest.json$/.exec(item);
        if (match !== null) {
          console.log(`  ${match[1]}`);
        }
      }
    });
  });


// Catch-all, unrecognised command.
program
  .command('*')
  .action((command) => {
    // Tempting to try passing through to for-each, but primary
    // focus is management. KISS.
    // Display error in same style commander uses for unrecognised options.
    // Unfortunately * shows up in help!
    console.log('');
    console.log(`  error: unknown command \`${command}'`);
    console.log('');
    process.exitCode = 1;
  });

try {
  program.parse(process.argv);
} catch (err) {
  if (program.opts().debug) {
    console.log(`${err.stack}`);
  }
  // util.terminate(`caught exception with message ${err.message}`);
  if (err.message !== util.suppressTerminateExceptionMessage) {
    console.log(`caught exception with message ${err.message}`);
  }
  // Recommended pactice for node is set exitcode not force exit
  process.exitCode = 1;
}

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

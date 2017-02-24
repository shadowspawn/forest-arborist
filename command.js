#!/usr/bin/env node
// Node location may vary between Mac and Lin, so env for portability.

// Do we still need strict? Was needed for an older node, and eslint thinks not needed.
/* eslint strict: [0, "global"] */

'use strict';

// Naming used in this file: the repo/directory containing the manifest file is the main repo/.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const program = require('commander');
const tmp = require('tmp');
// Mine
const myPackage = require('./package.json');
const core = require('./lib/core');
const dvcsUrl = require('./lib/dvcs-url');
const fsX = require('./lib/fsExtra');
const repo = require('./lib/repo');
const util = require('./lib/util');


function doStatus() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const dependencies = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
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
  const dependencies = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
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


function cloneEntry(entry, repoPath, freeBranch) {
  // Mercurial does not support making intermediate folders.
  // This just copes with one deep, but KISS and cover most use.
  if (entry.repoType === 'hg') {
    const parentDir = path.dirname(repoPath);
    if (parentDir !== '.' && !fsX.dirExistsSync(parentDir)) {
      fs.mkdirSync(parentDir);
    }
  }

  // Determine target branch for clone
  let branch;
  if (entry.pinRevision !== undefined) {
    console.log(`# ${repoPath}: cloning pinned revision`);
    branch = undefined;
  } else if (entry.lockBranch !== undefined) {
    console.log(`# ${repoPath}: cloning locked branch`);
    branch = entry.lockBranch;
  } else if (freeBranch !== undefined) {
    console.log(`# ${repoPath}: cloning free repo on requested branch`);
    branch = freeBranch;
  } else {
    console.log(`# ${repoPath}: cloning free repo`);
  }

  const args = ['clone'];
  if (branch !== undefined) {
    if (entry.repoType === 'git') {
      args.push('--branch', branch);
    } if (entry.repoType === 'hg') {
      args.push('--updaterev', branch);
    }
  }

  // Suppress checkout for pinRevision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === 'git') {
      args.push('--no-checkout');
    } if (entry.repoType === 'hg') {
      args.push('--noupdate');
    }
  }
  args.push(entry.origin, repoPath);
  // Clone command ready!
  util.execCommandSync({ cmd: entry.repoType, args, suppressContext: true });

  // Second command to checkout pinned revision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === 'git') {
      util.execCommandSync(
        { cmd: 'git', args: ['checkout', '--quiet', entry.pinRevision], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      util.execCommandSync(
        { cmd: 'hg', args: ['update', '--rev', entry.pinRevision], cwd: repoPath }
      );
    }
  }
}


function checkoutEntry(entry, repoPath, freeBranch) {
  // Determine target for checkout
  let revision;
  let gitConfig = [];
  if (entry.pinRevision !== undefined) {
    console.log(`# ${repoPath}: checkout pinned revision`);
    revision = entry.pinRevision;
    gitConfig = ['-c', 'advice.detachedHead=false'];
  } else if (entry.lockBranch !== undefined) {
    console.log(`# ${repoPath}: checkout locked branch`);
    revision = entry.lockBranch;
  } else if (freeBranch !== undefined) {
    console.log(`# ${repoPath}: checkout free repo on requested branch`);
    revision = freeBranch;
  } else {
    let displayName = repoPath;
    if (displayName === '' || displayName === '.') displayName = '(root)';
    console.log(`# ${displayName}: skipping free repo`);
  }

  if (revision !== undefined) {
    if (entry.repoType === 'git') {
      util.execCommandSync(
        { cmd: 'git', args: gitConfig.concat(['checkout', revision]), cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      util.execCommandSync(
        { cmd: 'hg', args: ['update', '--rev', revision], cwd: repoPath }
      );
    }
  } else {
    console.log('');
  }
}


function doInstall(options) {
  const startDir = process.cwd();
  // Use same branch as main for free branches
  const manifestObject = core.readManifest({
    mainPath: '.',
    manifest: options.manifest,
  });
  const rootAbsolutePath = path.resolve(manifestObject.rootDirectory);
  const mainFromRoot = path.relative(rootAbsolutePath, process.cwd());
  const freeBranch = repo.getBranch('.');
  core.writeRootFile({
    rootFilePath: path.join(rootAbsolutePath, core.fabRootFilename),
    mainPath: mainFromRoot,
    manifest: options.manifest,
  });
  console.log();

  core.cdRootDirectory();
  const dependencies = manifestObject.dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fsX.dirExistsSync(repoPath)) {
      checkoutEntry(entry, repoPath, freeBranch);
    } else {
      cloneEntry(entry, repoPath, freeBranch);
    }
  });
  process.chdir(startDir);
}


function doClone(source, destinationParam, options) {
  const startDir = process.cwd();
  // We need to know the main directory to find the manifest file after the clone.
  let destination = destinationParam;
  if (destination === undefined) {
    destination = path.posix.basename(dvcsUrl.parse(source).pathname, '.git');
  }

  // Clone source.
  const mainEntry = { origin: source };
  if (repo.isGitRepository(source)) {
    mainEntry.repoType = 'git';
  } else if (repo.isHgRepository(source)) {
    mainEntry.repoType = 'hg';
  } else {
    console.log('(Does the source repo exist?)');
    util.terminate(`failed to find repository type for ${source}`);
  }
  cloneEntry(mainEntry, destination, options.branch);

  const fabManifest = core.manifestPath({ mainPath: destination });
  if (!fsX.fileExistsSync(fabManifest)) {
    util.terminate(`stopping as did not find manifest ${fabManifest}`);
  }

  const manifest = core.readManifest({
    mainPath: destination,
    manifest: options.manifest,
  });
  if (manifest.mainPathFromRoot !== undefined && manifest.mainPathFromRoot !== '') {
    // Play shell game for sibling layout, using destination as a wrapper folder.
    console.log('Using sibling repo layout');
    const tmpObj = tmp.dirSync({ dir: '.' }); // local to folder
    console.log();
    fs.renameSync(destination, path.join(tmpObj.name, destination));
    fs.mkdirSync(destination);
    const mainPathFromHere = path.join(destination, manifest.mainPathFromRoot);
    fs.renameSync(path.join(tmpObj.name, destination), mainPathFromHere);
    fs.rmdirSync(tmpObj.name); // Should be auto-deleted but something breaking that?

    process.chdir(mainPathFromHere);
  } else {
    process.chdir(destination);
  }

  doInstall({ manifest: options.manifest });

  console.log(`Created repo forest in ${destination}`);
  process.chdir(startDir);
}


function doSnapshot() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();
  const manifest = core.readManifest({ fromRoot: true });

  // Create dependencies with fixed revision and absolute repo.
  const dependencies = {};
  Object.keys(manifest.dependencies).forEach((repoPath) => {
    const entry = manifest.dependencies[repoPath];
    dependencies[repoPath] = {
      origin: repo.getOrigin(repoPath, entry.repoType), // KISS, want absolute
      repoType: entry.repoType,
      pinRevision: repo.getRevision(repoPath, entry.repoType),
    };
  });
  const snapshot = {
    dependencies,
    rootDirectory: manifest.rootDirectory,
    mainPathFromRoot: manifest.mainPathFromRoot,
    manifest: rootObject.manifest,
  };

  const mainPath = rootObject.mainPath;
  const mainRepoType = repo.getRepoTypeForLocalPath(mainPath);
  snapshot.mainRepo = {
    origin: repo.getOrigin(mainPath, mainRepoType),
    repoType: mainRepoType,
    pinRevision: repo.getRevision(mainPath, mainRepoType),
  };

  const prettySnapshot = JSON.stringify(snapshot, null, '  ');
  console.log(prettySnapshot);
  process.chdir(startDir);
}


function doRecreate(snapshotPath, destinationParam) {
  const startDir = process.cwd();
  const snapshotObject = util.readJson(
    snapshotPath,
    ['mainRepo', 'dependencies', 'rootDirectory', 'mainPathFromRoot']
  );
  const mainRepoEntry = snapshotObject.mainRepo;

  let destination = destinationParam;
  if (destination === undefined || destination === '') {
    destination = path.posix.basename(dvcsUrl.parse(mainRepoEntry.origin).pathname, '.git');
  }

  // Clone main repo first and cd to root
  const mainPathFromRoot = util.normalizeToPosix(snapshotObject.mainPathFromRoot);
  if (mainPathFromRoot !== '.') {
    // Sibling layout. Make wrapper root directory.
    fs.mkdirSync(destination);
    process.chdir(destination);
    destination = mainPathFromRoot;
    cloneEntry(mainRepoEntry, destination);
  } else {
    cloneEntry(mainRepoEntry, destination);
    process.chdir(destination);
  }

  // Clone dependent repos.
  const dependencies = snapshotObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    cloneEntry(entry, repoPath);
  });

  // Install root file
  core.writeRootFile({
    rootFilePath: path.resolve(core.fabRootFilename),
    mainPath: snapshotObject.mainPathFromRoot,
    manifest: snapshotObject.manifest,
  });

  console.log(`Recreated repo forest from snapshot to ${destination}`);
  // console.log('(use restore -" to get a current checkout again');
  process.chdir(startDir);
}


function doRestore(snapshotPath) {
  if (!fsX.fileExistsSync(snapshotPath)) util.terminate(`snapshot file not found "${snapshotPath}"`);

  const startDir = process.cwd();
  const snapshotObject = util.readJson(
    snapshotPath,
    ['mainRepo', 'dependencies', 'rootDirectory', 'mainPathFromRoot']
  );
  core.cdRootDirectory();

  checkoutEntry(snapshotObject.mainRepo, snapshotObject.mainPathFromRoot);

  const dependencies = snapshotObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fsX.dirExistsSync(repoPath)) {
      checkoutEntry(entry, repoPath);
    } else {
      cloneEntry(entry, repoPath);
    }
  });

  console.log('Restored repo forest from snapshot');
  // console.log('(use restore -" to get a current checkout again');
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
    doClone(source, destination, options);
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
    core.doInit(options);
  });

program
  .command('install')
  .option('-m, --manifest <name>', 'custom manifest file')
  .description('clone missing (new) dependent repositories')
  .on('--help', () => {
    console.log('  Run Install from the main repo.');
  })
  .action((options) => {
    doInstall(options);
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
  .description('run specified command on each repo in the forest, e.g. "fab for-each ls -- -al"')
  .arguments('<command> [args...]')
  .action((command, args) => {
    core.doForEach({}, command, args);
  });

program
  .command('for-free')
  .description('run specified command on repos which are not locked or pinned')
  .arguments('<command> [args...]')
  .action((command, args) => {
    core.doForEach({ freeOnly: true }, command, args);
  });

program
  .command('switch <branch>')
  .description('switch branch of free repos')
  .action((branch) => {
    core.doSwitch(branch);
  });

program
  .command('make-branch <branch> [start_point]')
  .option('-p, --publish', 'push newly created branch')
  .description('create new branch in free repos')
  .action((branch, startPoint, options) => {
    core.doMakeBranch(branch, startPoint, options.publish);
  });

program
  .command('snapshot')
  .description('display state of forest')
  .action(() => {
    doSnapshot();
  });

program
  .command('recreate <snapshot> [destination]')
  .description('clone repos to recreate forest in past state')
  .action((snapshot, destination) => {
    doRecreate(snapshot, destination);
  });

program
  .command('restore <snapshot>')
  .description('checkout repos to restore forest in past state')
  .action((snapshot) => {
    doRestore(snapshot);
  });

// Hidden command for trying things out
program
  .command('_test', null, { noHelp: true })
  .description('test')
  .action(() => {
    core.readRootFile();
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

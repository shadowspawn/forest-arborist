#!/usr/bin/env node
// Node location may vary between Mac and Lin, so env for portability.

// Do we still need strict? Was needed for an older node, and eslint thinks not needed.
/* eslint strict: [0, "global"] */

'use strict';

// Naming used in this file: the repo/directory containing the manifest file is the main repo/.

const program = require('commander');
const fs = require('fs');
const childProcess = require('child_process');
const path = require('path');
const shellQuote = require('shell-quote');
const tmp = require('tmp');

// Mine
const myPackage = require('./package.json');
const dvcsUrl = require('./lib/dvcs-url');
const repo = require('./lib/repo');
const fsX = require('./lib/fsExtra');
const util = require('./lib/util');

const armManifest = 'arm.json'; // stored in main directory
const armRootFilename = '.arm-root.json'; // stored in root directory


function execCommandSync(commandParam) {
  const command = commandParam;
  if (command.args === undefined) command.args = [];
  let cwdDisplay = `${command.cwd}: `;
  if (command.cwd === undefined || command.cwd === '' || command.cwd === '.') {
    cwdDisplay = '(root): ';
    command.cwd = '.';
  }
  if (command.suppressContext) cwdDisplay = '';

  // Trying hard to get a possibly copy-and-paste command.
  // let quotedArgs = '';
  // if (command.args.length > 0) quotedArgs = `'${command.args.join("' '")}'`;
  let quotedArgs = shellQuote.quote(command.args);
  quotedArgs = quotedArgs.replace(/\n/g, '\\n');
  console.log(util.commandColour(`${cwdDisplay}${command.cmd} ${quotedArgs}`));

  try {
    // Note: the stdio option hooks up child stream to parent so we get live progress.
    childProcess.execFileSync(
        command.cmd, command.args,
        { cwd: command.cwd, stdio: [0, 1, 2] }
      );
  } catch (err) {
    // Some commands return non-zero for expected situations
    if (command.allowedShellStatus === undefined || command.allowedShellStatus !== err.status) {
      throw err;
    }
  }
  console.log(''); // blank line after command output
}


function isRelativePath(pathname) {
  if (pathname === null || pathname === undefined) { return false; }

  return pathname.startsWith('./') || pathname.startsWith('../');
}


function readMainPathFromRoot() {
  const armRootPath = path.resolve(armRootFilename);
  const data = fs.readFileSync(armRootPath);
  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    util.terminate(`problem parsing ${armRootPath}\n${err}`);
  }
  // Support old naming at least for a little while... (nest -> main)
  if (rootObject.nestPath !== undefined) rootObject.mainPath = rootObject.nestPath;
  if (rootObject.mainPath === undefined) {
    util.terminate(`problem parsing: ${armRootPath}\nmissing field 'mainPath'`);
  }

  return util.normalizeToPosix(rootObject.mainPath);
}


function cdRootDirectory() {
  const startedInMainDirectory = fsX.fileExistsSync(armManifest);

  let tryParent = true;
  do {
    if (fsX.fileExistsSync(armRootFilename)) {
      return;
    }

    // NB: chdir('..') from '/' silently does nothing on Mac, so check we moved
    const cwd = process.cwd();
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  if (startedInMainDirectory) {
    util.terminate('root of forest not found. (Do you need to call "arm install"?)');
  } else {
    util.terminate('root of forest not found. ');
  }
}


function readManifest(mainPath, addMainToDependencies) {
  const manifestPath = path.resolve(mainPath, armManifest);

  let data;
  try {
    data = fs.readFileSync(manifestPath);
  } catch (err) {
    util.terminate(`problem opening ${manifestPath}\n${err}`);
  }

  let manifestObject;
  try {
    manifestObject = JSON.parse(data);
  } catch (err) {
    util.terminate(`problem parsing ${manifestPath}\n${err}`);
  }
  if (manifestObject.dependencies === undefined) {
    util.terminate(`problem parsing: ${manifestPath}\nmissing field 'dependencies'`);
  }
  if (manifestObject.rootDirectory === undefined) {
    util.terminate(`problem parsing: ${manifestPath}\nmissing field 'rootDirectory'`);
  }
  // Support old naming at least for a little while... (nest -> main)
  if (manifestObject.nestPathFromRoot !== undefined) {
    manifestObject.mainPathFromRoot = manifestObject.nestPathFromRoot;
  }

  const mainRepoType = repo.getRepoTypeForLocalPath(mainPath);
  const mainOrigin = repo.getOrigin(mainPath, mainRepoType);
  const parsedMainOrigin = dvcsUrl.parse(mainOrigin);
  if (addMainToDependencies) {
    const mainNormalized = util.normalizeToPosix(mainPath);
    manifestObject.dependencies[mainNormalized] = { origin: mainOrigin, repoType: mainRepoType };
  }

  Object.keys(manifestObject.dependencies).forEach((repoPath) => {
    // Sanity check repoType so callers do not need to warn about unexpected type.
    const entry = manifestObject.dependencies[repoPath];
    const supportedTypes = ['git', 'hg'];
    if (supportedTypes.indexOf(entry.repoType) === -1) {
      console.log(util.errorColour(
        `Skipping entry for "${repoPath}" with unsupported repoType: ${entry.repoType}`
      ));
      delete manifestObject.dependencies[repoPath];
      return; // continue forEach
    }

    // Turn relative repos into absolute repos.
    if (isRelativePath(entry.origin)) {
      entry.origin = dvcsUrl.resolve(parsedMainOrigin, entry.origin);
    }
  });

  return manifestObject;
}


function doStatus() {
  cdRootDirectory();
  const mainPath = readMainPathFromRoot();
  const dependencies = readManifest(mainPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['status', '--short'], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['status'], cwd: repoPath }
      );
    }
  });
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
        console.log(util.errorColour('NB: unresolved conflicts'));
        console.log('');
      } else {
        throw err;
      }
    }
  }
}


function doPull() {
  cdRootDirectory();
  const mainPath = readMainPathFromRoot();
  const dependencies = readManifest(mainPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${repoPath}\n`);
    } else if (repo.getBranch(repoPath, entry.repoType) === undefined) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      const repoType = entry.repoType;
      if (repoType === 'git') {
        execCommandSync(
          { cmd: 'git', args: ['pull'], cwd: repoPath }
        );
      } else if (repoType === 'hg') {
        execCommandSync(
          { cmd: 'hg', args: ['pull'], cwd: repoPath }
        );
        hgAutoMerge(repoPath);
      }
    }
  });
}


function doOutgoing() {
  cdRootDirectory();
  const mainDirectory = readMainPathFromRoot();
  const dependencies = readManifest(mainDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const repoType = dependencies[repoPath].repoType;
    if (repoType === 'git') {
      execCommandSync(
        // http://stackoverflow.com/questions/2016901/viewing-unpushed-git-commits
        // Started with "git log @{u}.." but that fails for detached head."
        // The following does not list changes which have been pushed to some but not all branches,
        // but otherwise pretty cool!
        { cmd: 'git',
          args: ['log', '--branches', '--not', '--remotes', '--decorate', '--oneline'],
          cwd: repoPath,
        }
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


function doSwitch(branch) {
  cdRootDirectory();
  const mainDirectory = readMainPathFromRoot();
  const dependencies = readManifest(mainDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['checkout', branch], cwd: repoPath }
      );
    } else if (repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['update', branch], cwd: repoPath }
      );
    }
  });
}


function doMakeBranch(branch, startPoint, publish) {
  cdRootDirectory();
  const mainDirectory = readMainPathFromRoot();
  const dependencies = readManifest(mainDirectory, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
      return; // continue forEach
    }

    const repoType = entry.repoType;
    if (repoType === 'git') {
      // Could check for remote branch using "git fetch origin ${branch}" ?
      const args = ['checkout', '-b', branch];
      if (startPoint !== undefined) args.push(startPoint);
      execCommandSync({ cmd: 'git', args, cwd: repoPath });
      if (publish) {
        execCommandSync(
          { cmd: 'git', args: ['push', '--set-upstream', 'origin', branch], cwd: repoPath }
        );
      }
    } else if (repoType === 'hg') {
      if (startPoint !== undefined) {
        execCommandSync({ cmd: 'hg', args: ['update', startPoint], cwd: repoPath });
      }
      execCommandSync({ cmd: 'hg', args: ['branch', branch], cwd: repoPath });
      if (publish) {
        execCommandSync(
          { cmd: 'hg', args: ['commit', '--message', 'Create branch'], cwd: repoPath }
        );
        execCommandSync(
          { cmd: 'hg', args: ['push', '--branch', branch, '--new-branch'], cwd: repoPath }
        );
      }
    }
  });
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
  execCommandSync({ cmd: entry.repoType, args, suppressContext: true });

  // Second command to checkout pinned revision
  if (entry.pinRevision !== undefined) {
    if (entry.repoType === 'git') {
      execCommandSync(
        { cmd: 'git', args: ['checkout', '--quiet', entry.pinRevision], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['update', '--rev', entry.pinRevision], cwd: repoPath }
      );
    }
  }
}


function checkoutEntry(entry, repoPath, freeBranch) {
  // Determine target for checkout
  let revision;
  if (entry.pinRevision !== undefined) {
    console.log(`# ${repoPath}: checkout pinned revision`);
    revision = entry.pinRevision;
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
      execCommandSync(
        { cmd: 'git', args: ['checkout', '--quiet', revision], cwd: repoPath }
      );
    } else if (entry.repoType === 'hg') {
      execCommandSync(
        { cmd: 'hg', args: ['update', '--rev', revision], cwd: repoPath }
      );
    }
  } else {
    console.log('');
  }
}


function writeRootFile(rootFilePath, mainPath) {
  let initialisedWord = 'Initialised';
  if (fsX.fileExistsSync(rootFilePath)) initialisedWord = 'Reinitialised';
  const rootObject = { mainPath: util.normalizeToPosix(mainPath) };
  const prettyRootObject = JSON.stringify(rootObject, null, '  ');
  fs.writeFileSync(rootFilePath, prettyRootObject);
  console.log(`${initialisedWord} marker file at root of forest: ${armRootFilename}`);
}


function doInstall(freeBranch, includeMainInInstall) {
  let manifestObject;
  // Might be called before root file added, so look for manifest first.
  if (fsX.fileExistsSync(armManifest)) {
    manifestObject = readManifest('.', includeMainInInstall);
    const rootAbsolutePath = path.resolve(manifestObject.rootDirectory);
    const mainFromRoot = path.relative(rootAbsolutePath, process.cwd());
    writeRootFile(path.join(rootAbsolutePath, armRootFilename), mainFromRoot);
    console.log();
  }

  cdRootDirectory();
  const mainPath = readMainPathFromRoot();
  if (manifestObject === undefined) manifestObject = readManifest(mainPath, includeMainInInstall);
  const dependencies = manifestObject.dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fsX.dirExistsSync(repoPath)) {
      checkoutEntry(entry, repoPath, freeBranch);
    } else {
      cloneEntry(entry, repoPath, freeBranch);
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
    if (fsX.dirExistsSync(itemPath)) {
      if (fsX.dirExistsSync(path.join(itemPath, '.git'))) {
        callback(itemPath, 'git');
      } else if (fsX.dirExistsSync(path.join(itemPath, '.hg'))) {
        callback(itemPath, 'hg');
      }

      // Keep searching in case of nested repos.
      findRepositories(itemPath, callback);
    }
  });
}


function doInit(rootDirParam) {
  const manifestPath = path.resolve(armManifest);
  if (fsX.fileExistsSync(manifestPath)) {
    console.log(`Skipping init, already have ${armManifest}`);
    console.log('(Delete it to start over, or did you want "arm install"?)');
    return;
  }

  // Find main origin, if we can.
  const mainRepoType = repo.getRepoTypeForLocalPath('.');
  if (mainRepoType === undefined) {
    util.terminate('expecting current directory to have a repository. (KISS)');
  }
  const mainOrigin = repo.getOrigin('.', mainRepoType);
  let parsedMainOrigin;
  if (mainOrigin === undefined) {
    console.log(util.errorColour('(origin not specified for starting repo)'));
  } else {
    parsedMainOrigin = dvcsUrl.parse(mainOrigin);
  }

  // Sort out main and root paths
  const mainAbsolutePath = process.cwd();
  let rootAbsolutePath;
  if (rootDirParam === undefined) {
    rootAbsolutePath = process.cwd();
    console.log('Scanning for nested dependencies…');
  } else {
    rootAbsolutePath = path.resolve(rootDirParam);
    console.log('Scanning for dependencies from root…');
  }
  const mainFromRoot = path.relative(rootAbsolutePath, mainAbsolutePath);
  const rootFromMain = path.relative(mainAbsolutePath, rootAbsolutePath);

  // Dependencies (implicitly finds main too, but that gets deleted)
  process.chdir(rootAbsolutePath);
  const dependencies = {};
  findRepositories('.', (repoPathParam, repoType) => {
    const repoPath = util.normalizeToPosix(repoPathParam);
    console.log(`  ${repoPath}`);
    const origin = repo.getOrigin(repoPath, repoType);
    const entry = { origin, repoType };

    if (origin === undefined) {
      console.log(util.errorColour('    (origin not specified)'));
    } else {
      const parsedOrigin = dvcsUrl.parse(origin);
      // We are doing simple auto detection of relative path, siblings on server
      if (dvcsUrl.sameDir(parsedOrigin, parsedMainOrigin)) {
        console.log('    (free)');
        // Like git submodule, require relative paths to start with ./ or ../
        const relativePath = path.posix.relative(parsedMainOrigin.pathname, parsedOrigin.pathname);
        if (isRelativePath(relativePath)) {
          entry.origin = relativePath;
        }
      } else {
        const lockBranch = repo.getBranch(repoPath, repoType);
        if (lockBranch === undefined) {
          const revision = repo.getRevision(repoPath, repoType);
          console.log(`    (pinned revision to ${revision})`);
          entry.pinRevision = revision;
        } else {
          console.log(`    (locked branch to ${lockBranch})`);
          entry.lockBranch = lockBranch;
        }
      }
      dependencies[repoPath] = entry;
    }
  });
  delete dependencies[mainFromRoot];
  const manifest = {
    dependencies,
    rootDirectory: util.normalizeToPosix(rootFromMain),
    mainPathFromRoot: util.normalizeToPosix(mainFromRoot),
    tipsForManualEditing: [
      'The origin property for dependencies can be an URL ',
      '  or a relative path which is relative to the main repo origin.)',
      'The key for the dependencies map is the local relative path from the root directory.',
      'Use forward slashes in paths (e.g. path/to not path\to).',
      'Dependent repos come in three flavours, determined by the properties:',
      '  1) if has pinRevision property, repo pinned to specified revision or tag (commit-ish)',
      '  2) if has lockBranch property, repo locked to specified branch',
      '  3) otherwise, repo is free and included in branch affecting commands',
    ],
  };
  const prettyManifest = JSON.stringify(manifest, null, '  ');

  fs.writeFileSync(manifestPath, prettyManifest);
  console.log(`Initialised dependencies in ${armManifest}`);

  // Root placeholder file. Safe to overwrite as low content.
  writeRootFile(path.join(rootAbsolutePath, armRootFilename), mainFromRoot);

  // Offer clue for possible sibling init situation.
  if (Object.keys(dependencies).length === 0) {
    console.log('(No dependencies found. For a sibling repo layout use "arm init --root ..")');
  }
}


function doClone(source, destinationParam, options) {
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

  if (!fsX.fileExistsSync(path.join(destination, armManifest))) {
    util.terminate(`stopping as did not find manifest ${armManifest}`);
  }

  const manifest = readManifest(destination);
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

  doInstall(options.branch, false);

  console.log(`Created repo forest in ${destination}`);
}


function doForEach(internalOptions, cmd, args) {
  console.log(cmd);
  console.log(args);
  // const cmd = args.shift();

  cdRootDirectory();
  const mainPath = readMainPathFromRoot();
  const dependencies = readManifest(mainPath, true).dependencies;

  Object.keys(dependencies).forEach((repoPath) => {
    if (internalOptions.freeOnly) {
      const entry = dependencies[repoPath];
      if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
        return; // continue forEach
      }
    }

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
  const mainPath = readMainPathFromRoot();
  const manifest = readManifest(mainPath);

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
  };

  const mainRepoType = repo.getRepoTypeForLocalPath(mainPath);
  snapshot.mainRepo = {
    origin: repo.getOrigin(mainPath, mainRepoType),
    repoType: mainRepoType,
    pinRevision: repo.getRevision(mainPath, mainRepoType),
  };

  const prettySnapshot = JSON.stringify(snapshot, null, '  ');
  console.log(prettySnapshot);
}


function doRecreate(snapshotPath, destinationParam) {
  if (!fsX.fileExistsSync(snapshotPath)) util.terminate(`snapshot file not found "${snapshotPath}"`);

  // Read snapshot
  let data;
  try {
    data = fs.readFileSync(snapshotPath);
  } catch (err) {
    util.terminate(`problem opening ${snapshotPath}\n${err}`);
  }
  let snapshotObject;
  try {
    snapshotObject = JSON.parse(data);
  } catch (err) {
    util.terminate(`problem parsing ${snapshotPath}\n${err}`);
  }

  const mainRepoEntry = snapshotObject.mainRepo;

  let destination = destinationParam;
  if (destination === undefined || destination === '') {
    destination = path.posix.basename(dvcsUrl.parse(mainRepoEntry.origin).pathname, '.git');
  }

  // Clone main repo first
  if (snapshotObject.mainPathFromRoot !== undefined && snapshotObject.mainPathFromRoot !== '') {
    // Sibling layout. Make wrapper directory.
    fs.mkdirSync(destination);
    process.chdir(destination);
    destination = snapshotObject.mainPathFromRoot;
    cloneEntry(mainRepoEntry, destination);
  } else {
    cloneEntry(mainRepoEntry, destination);
    process.chdir(destination);
  }

  // Clone dependent repos
  const dependencies = snapshotObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    cloneEntry(entry, repoPath);
  });

  // Install root file
  writeRootFile(path.resolve(armRootFilename), snapshotObject.mainPathFromRoot);
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
    `    ${armManifest} manifest file for forest`);
  console.log(`    ${armRootFilename} marks root of forest (do not commit to VCS)`);
  console.log('');
  console.log('  Forest management: clone, init, install');
  console.log('  Utility: status, pull, outgoing, for-each, for-free');
  console.log('  Branch: make-branch, switch');
  console.log('  Reproducible state: snapshot, recreate, restore');
  console.log('');
  console.log('  Commands starting with an underscore are still in development.');
  console.log('  See https://github.com/JohnRGee/arm.git for usage overview.');
  console.log("  See also 'arm <command> --help' for command options and further help.");
  console.log('');
});

program
  .command('clone <source> [destination]')
  .option('-b, --branch <branchname>', 'branch to checkout for free repos')
  .description('clone source and install its dependencies')
  .action((source, destination, options) => {
    doClone(source, destination, options);
  });

program
  .command('init')
  .option('--root <dir>', 'root directory of forest if not current directory')
  .description('add manifest in current directory, and marker file at root of forest')
  .on('--help', () => {
    console.log('  Use init to create the manifest based on your current sandpit. ');
    console.log('  Run from your main repo and it finds the dependent repos.');
    console.log('');
    console.log('  Examples:');
    console.log('    For a forest layout with dependent repos nested in the main repo:');
    console.log('         arm init');
    console.log('');
    console.log('    For a forest layout with sibling repositories:');
    console.log('         arm init --root ..');
  })
  .action((options) => {
    doInit(options.root);
  });

program
  .command('install')
  .option('-b, --branch <branchname>', 'branch to checkout for free dependent repos')
  .description('clone missing (new) dependent repositories')
  .action((options) => {
    doInstall(options.branch, true);
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
  .command('outgoing')
  .description('show new changesets that have not been pushed')
  .action(() => {
    doOutgoing();
  });

program
  .command('root')
  .description('show the root directory of the forest')
  .action(() => {
    cdRootDirectory();
    console.log(process.cwd());
  });

program
  .command('for-each')
  .description('run specified command on each repo in the forest, e.g. "arm for-each ls -- -al"')
  .arguments('<command> [args...]')
  .action((command, args) => {
    doForEach({}, command, args);
  });

program
  .command('for-free')
  .description('run specified command on repos which are not locked or pinned')
  .arguments('<command> [args...]')
  .action((command, args) => {
    doForEach({ freeOnly: true }, command, args);
  });

program
  .command('switch <branch>')
  .description('switch branch of free repos')
  .action((branch) => {
    doSwitch(branch);
  });

program
  .command('make-branch <branch> [start_point]')
  .option('-p, --publish', 'push newly created branch')
  .description('create new branch in free repos')
  .action((branch, startPoint, options) => {
    doMakeBranch(branch, startPoint, options.publish);
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
  .command('_restore <snapshot>')
  .description('checkout repos to restore forest in past state')
  .action((snapshot) => {
    if (snapshot) ; // Lint fir unused variable
    console.log('Not implemented yet');
  });

// Hidden command for trying things out
program
  .command('_test', null, { noHelp: true })
  .description('test')
  .action(() => {
    const tmpDir1 = tmp.dirSync();
    console.log(tmpDir1);
    const tmpDir2 = tmp.dirSync({ dir: '.' });
    console.log(tmpDir2);
  });

// Catch-all, unrecognised command.
program
  .command('*')
  .action((command) => {
    // Tempting to try passing through to for-each, but primary
    // focus is management. KISS.
    // Display error in same style commander uses for unrecognised options.
    console.log('');
    console.log(`  error: unknown command \`${command}'`);
    console.log('');
    process.exit(1);
  });

try {
  program.parse(process.argv);
} catch (err) {
  if (program.opts().debug) {
    console.log(`${err.stack}`);
  }
  util.terminate(`caught exception with message ${err.message}`);
}

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

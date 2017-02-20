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
const core = require('./lib/core');
const dvcsUrl = require('./lib/dvcs-url');
const fsX = require('./lib/fsExtra');
const repo = require('./lib/repo');
const util = require('./lib/util');

const fabRootFilename = '.fab-root.json'; // stored in root directory


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


function readJson(targetPath, requiredProperties) {
  let data;
  try {
    data = fs.readFileSync(targetPath);
  } catch (err) {
    util.terminate(`problem opening ${targetPath}\n${err}`);
  }

  let rootObject;
  try {
    rootObject = JSON.parse(data);
  } catch (err) {
    util.terminate(`problem parsing ${targetPath}\n${err}`);
  }

  // Sanity check. Possible errors due to hand editing, but during development
  // usually unsupported old file formats!
  if (requiredProperties !== undefined) {
    for (let length = requiredProperties.length, index = 0; index < length; index += 1) {
      const required = requiredProperties[index];
      if (!Object.prototype.hasOwnProperty.call(rootObject, required)) {
        util.terminate(`problem parsing: ${targetPath}\nMissing property '${required}'`);
      }
      if (rootObject[required] === undefined) {
        util.terminate(`problem parsing: ${targetPath}\nUndefined value for property '${required}'`);
      }
    }
  }

  return rootObject;
}


function readRootFile() {
  // Use absolute path so appears in any errors
  const fabRootPath = path.resolve(fabRootFilename);
  const rootObject = readJson(fabRootPath, ['mainPath']);
  // rootObject may alsp have manifest property.

  // Santise inputs: normalise mainPath
  rootObject.mainPath = util.normalizeToPosix(rootObject.mainPath);

  return rootObject;
}


function cdRootDirectory() {
  const startedInMainDirectory = fsX.dirExistsSync('.fab');

  let tryParent = true;
  do {
    if (fsX.fileExistsSync(fabRootFilename)) {
      return;
    }

    // NB: chdir('..') from '/' silently does nothing on Mac, so check we moved
    const cwd = process.cwd();
    process.chdir('..');
    tryParent = (cwd !== process.cwd());
  } while (tryParent);

  if (startedInMainDirectory) {
    util.terminate('root of forest not found. (Do you need to call "fab install"?)');
  } else {
    util.terminate('root of forest not found. ');
  }
}


// function readManifestX(mainPath, addMainToDependencies) {
function readManifest(options) {
  // options properties: fromRoot or mainPath and manifest, addMainToDependencies
  let mainPath;
  let fabManifest;
  if (options.fromRoot) {
    const rootObject = readRootFile();
    mainPath = rootObject.mainPath;
    fabManifest = core.manifestPath({ mainPath, manifest: rootObject.manifest });
  } else {
    mainPath = options.mainPath;
    fabManifest = core.manifestPath({ mainPath, manifest: options.manifest });
  }
  const manifestObject = readJson(
    fabManifest,
    ['dependencies', 'rootDirectory', 'mainPathFromRoot']
  );
  // Cleanup as may have been edited or old versions.
  manifestObject.rootDirectory = util.normalizeToPosix(manifestObject.rootDirectory);
  manifestObject.mainPathFromRoot = util.normalizeToPosix(manifestObject.mainPathFromRoot);

  const mainRepoType = repo.getRepoTypeForLocalPath(mainPath);
  const mainOrigin = repo.getOrigin(mainPath, mainRepoType);
  const parsedMainOrigin = dvcsUrl.parse(mainOrigin);
  if (options.addMainToDependencies) {
    manifestObject.dependencies[manifestObject.mainPathFromRoot] =
      { origin: mainOrigin, repoType: mainRepoType };
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
    if (util.isRelativePath(entry.origin)) {
      entry.origin = dvcsUrl.resolve(parsedMainOrigin, entry.origin);
    }
  });

  return manifestObject;
}


function doStatus() {
  cdRootDirectory();
  const dependencies = readManifest({ fromRoot: true, addMainToDependencies: true }).dependencies;

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
  const dependencies = readManifest({ fromRoot: true, addMainToDependencies: true }).dependencies;

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
  const dependencies = readManifest({ fromRoot: true, addMainToDependencies: true }).dependencies;

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
  const dependencies = readManifest({ fromRoot: true, addMainToDependencies: true }).dependencies;

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
  const dependencies = readManifest({ fromRoot: true, addMainToDependencies: true }).dependencies;

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
      execCommandSync(
        { cmd: 'git', args: gitConfig.concat(['checkout', revision]), cwd: repoPath }
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


function doInstall(options) {
  // Use same branch as main for free branches
  const manifestObject = readManifest({
    mainPath: '.',
    manifest: options.manifest,
  });
  const rootAbsolutePath = path.resolve(manifestObject.rootDirectory);
  const mainFromRoot = path.relative(rootAbsolutePath, process.cwd());
  const freeBranch = repo.getBranch('.');
  core.writeRootFile({
    rootFilePath: path.join(rootAbsolutePath, fabRootFilename),
    mainPath: mainFromRoot,
    manifest: options.manifest,
  });
  console.log();

  cdRootDirectory();
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

  const fabManifest = core.manifestPath({ mainPath: destination });
  if (!fsX.fileExistsSync(fabManifest)) {
    util.terminate(`stopping as did not find manifest ${fabManifest}`);
  }

  const manifest = readManifest({
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
}


function doForEach(internalOptions, cmd, args) {
  cdRootDirectory();
  const dependencies = readManifest({ fromRoot: true, addMainToDependencies: true }).dependencies;

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
  const rootObject = readRootFile();
  const manifest = readManifest({ fromRoot: true });

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
}


function doRecreate(snapshotPath, destinationParam) {
  const snapshotObject = readJson(
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
    rootFilePath: path.resolve(fabRootFilename),
    mainPath: snapshotObject.mainPathFromRoot,
    manifest: snapshotObject.manifest,
  });

  console.log(`Recreated repo forest from snapshot to ${destination}`);
  // console.log('(use restore -" to get a current checkout again');
}


function doRestore(snapshotPath) {
  if (!fsX.fileExistsSync(snapshotPath)) util.terminate(`snapshot file not found "${snapshotPath}"`);

  const snapshotObject = readJson(
    snapshotPath,
    ['mainRepo', 'dependencies', 'rootDirectory', 'mainPathFromRoot']
  );
  cdRootDirectory();

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
  console.log(`    ${fabRootFilename} marks root of forest (do not commit to VCS)`);
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
  .description('run specified command on each repo in the forest, e.g. "fab for-each ls -- -al"')
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
    readRootFile();
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

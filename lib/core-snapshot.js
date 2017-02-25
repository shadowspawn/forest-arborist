'use strict';

const fs = require('fs');
const path = require('path');
// // Mine
const core = require('./core');
const coreClone = require('./core-clone');
const dvcsUrl = require('./dvcs-url');
const fsX = require('./fsExtra');
const repo = require('./repo');
const util = require('./util');


function doSemiInstall() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();
  const manifestObject = core.readManifest({ fromRoot: true, manifest: rootObject.manifest });

  const mainPath = rootObject.mainPath;
  let freeBranch = repo.getBranch(mainPath);
  if (freeBranch === undefined && repo.isGitRepository(mainPath)) {
    util.execCommandSync(
      { cmd: 'git', args: ['checkout', '@{-1}'], cwd: mainPath }
    );
    // childProcess.execFileSync('git', ['checkout', '@{-1}'], { cwd: mainPath });
    freeBranch = repo.getBranch(mainPath);
  } else {
    const origin = repo.getOrigin(mainPath);
    const repoType = repo.getRepoTypeForLocalPath(mainPath);
    const mainEntry = { origin, repoType };
    coreClone.checkoutEntry(mainEntry, mainPath, freeBranch);
  }

  const dependencies = manifestObject.dependencies;
  Object.keys(dependencies).forEach((repoPath) => {
    const entry = dependencies[repoPath];
    if (fsX.dirExistsSync(repoPath)) {
      coreClone.checkoutEntry(entry, repoPath, freeBranch);
    }
  });

  process.chdir(startDir);
}


module.exports = {


  doSnapshot(options) {
    const startDir = process.cwd();
    core.cdRootDirectory();
    const rootObject = core.readRootFile();
    const manifestObject = core.readManifest({ fromRoot: true, manifest: rootObject.manifest });

    // Create dependencies with fixed revision and absolute repo.
    const dependencies = {};
    Object.keys(manifestObject.dependencies).forEach((repoPath) => {
      const entry = manifestObject.dependencies[repoPath];
      dependencies[repoPath] = {
        origin: repo.getOrigin(repoPath, entry.repoType), // KISS, want absolute
        repoType: entry.repoType,
        pinRevision: repo.getRevision(repoPath, entry.repoType),
      };
    });
    const snapshot = {
      dependencies,
      rootDirectory: manifestObject.rootDirectory,
      mainPathFromRoot: manifestObject.mainPathFromRoot,
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
    if (options.output === undefined) {
      console.log(prettySnapshot);
    } else {
      fs.writeFileSync(options.output, prettySnapshot);
    }
    process.chdir(startDir);
  },


  doRecreate(snapshotPath, destinationParam) {
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
      coreClone.cloneEntry(mainRepoEntry, destination);
    } else {
      coreClone.cloneEntry(mainRepoEntry, destination);
      process.chdir(destination);
    }

    // Clone dependent repos.
    const dependencies = snapshotObject.dependencies;
    Object.keys(dependencies).forEach((repoPath) => {
      const entry = dependencies[repoPath];
      coreClone.cloneEntry(entry, repoPath);
    });

    // Install root file
    core.writeRootFile({
      rootFilePath: path.resolve(core.fabRootFilename),
      mainPath: snapshotObject.mainPathFromRoot,
      manifest: snapshotObject.manifest,
    });

    console.log(`Recreated repo forest from snapshot to ${destination}`);
    console.log('(use "fab restore" without snapshot file to get a current checkout again');
    process.chdir(startDir);
  },


  doRestore(snapshotPath) {
    if (snapshotPath !== undefined && !fsX.fileExistsSync(snapshotPath)) {
      util.terminate(`snapshot file not found "${snapshotPath}"`);
    }

    if (snapshotPath === undefined) {
      doSemiInstall();
      return;
    }

    const startDir = process.cwd();
    const snapshotObject = util.readJson(
      snapshotPath,
      ['mainRepo', 'dependencies', 'rootDirectory', 'mainPathFromRoot']
    );
    core.cdRootDirectory();

    coreClone.checkoutEntry(snapshotObject.mainRepo, snapshotObject.mainPathFromRoot);

    const dependencies = snapshotObject.dependencies;
    Object.keys(dependencies).forEach((repoPath) => {
      const entry = dependencies[repoPath];
      if (fsX.dirExistsSync(repoPath)) {
        coreClone.checkoutEntry(entry, repoPath);
      } else {
        coreClone.cloneEntry(entry, repoPath);
      }
    });

    console.log('Restored repo forest from snapshot');
    console.log('(use "fab restore" without snapshot file to get a current checkout again');
    process.chdir(startDir);
  },


};

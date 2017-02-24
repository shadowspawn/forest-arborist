'use strict';

// These are the routines which implement the command line

const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
// Mine
const dvcsUrl = require('./dvcs-url');
const fsX = require('./fsExtra');
const repo = require('./repo');
const util = require('./util');


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


const core = {
  fabRootFilename: '.fab-root.json', // stored in root directory


  cdRootDirectory() {
    const startDir = process.cwd();
    const startedInMainDirectory = fsX.dirExistsSync('.fab');

    let tryParent = true;
    do {
      if (fsX.fileExistsSync(core.fabRootFilename)) {
        return;
      }

      // NB: chdir('..') from '/' silently does nothing on Mac, so check we moved
      const cwd = process.cwd();
      process.chdir('..');
      tryParent = (cwd !== process.cwd());
    } while (tryParent);

    // Failed to find root
    process.chdir(startDir);
    if (startedInMainDirectory) {
      util.terminate('root of forest not found. (Do you need to call "fab install"?)');
    } else {
      util.terminate('root of forest not found. ');
    }
  },


  // Perhaps make internal when finished refactor?
  manifestPath(options) {
    let manifest;
    // filename
    if (options.manifest !== undefined) {
      manifest = `${options.manifest}_manifest.json`;
    } else {
      manifest = 'manifest.json';
    }
    // directory
    manifest = `.fab/${manifest}`;
    // path
    if (options.mainPath !== undefined) {
      manifest = path.join(options.mainPath, manifest);
    }

    return manifest;
  },


  readRootFile() {
    // Use absolute path so appears in any errors
    const fabRootPath = path.resolve(core.fabRootFilename);
    const rootObject = util.readJson(fabRootPath, ['mainPath']);
    // rootObject may alsp have manifest property.

    // Santise inputs: normalise mainPath
    rootObject.mainPath = util.normalizeToPosix(rootObject.mainPath);

    return rootObject;
  },


  writeRootFile(options) {
    // options properties: rootFilePath, mainPath, manifest

    let initialisedWord = 'Initialised';
    if (fsX.fileExistsSync(options.rootFilePath)) initialisedWord = 'Reinitialised';
    const rootObject = {
      mainPath: util.normalizeToPosix(options.mainPath),
      manifest: options.manifest,
    };
    const prettyRootObject = JSON.stringify(rootObject, null, '  ');
    fs.writeFileSync(options.rootFilePath, prettyRootObject);
    console.log(`${initialisedWord} marker file at root of forest: ${core.fabRootFilename}`);
  },


  readManifest(options) {
    // options properties: fromRoot or mainPath and manifest, addMainToDependencies
    let mainPath;
    let fabManifest;
    if (options.fromRoot) {
      const rootObject = core.readRootFile();
      mainPath = rootObject.mainPath;
      fabManifest = core.manifestPath({ mainPath, manifest: rootObject.manifest });
    } else {
      mainPath = options.mainPath;
      fabManifest = core.manifestPath({ mainPath, manifest: options.manifest });
    }
    const manifestObject = util.readJson(
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
  },


  doInit(options) {
    // options properties: manifest, root
    const startDir = process.cwd();

    const relManifestPath = core.manifestPath({ manifest: options.manifest });
    if (fsX.fileExistsSync(relManifestPath)) {
      console.log(`Skipping init, already have ${relManifestPath}`);
      console.log('(Delete it to start over, or did you want "fab install"?)');
      return;
    }
    const absManifestPath = path.resolve('.', relManifestPath);

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
    if (options.root === undefined) {
      rootAbsolutePath = process.cwd();
      console.log('Scanning for nested dependencies…');
    } else {
      rootAbsolutePath = path.resolve(options.root);
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
      }

      // Pinned, then free, and fallback to locked.
      const lockBranch = repo.getBranch(repoPath, repoType);
      if (lockBranch === undefined) {
        const revision = repo.getRevision(repoPath, repoType);
        console.log(`    (pinned revision to ${revision})`);
        entry.pinRevision = revision;
      } else {
        let sameParent = false;
        let parsedOrigin;
        if (origin !== undefined) {
          parsedOrigin = dvcsUrl.parse(origin);
          sameParent = dvcsUrl.sameDir(parsedOrigin, parsedMainOrigin);
        }
        if (sameParent) {
          console.log('    (free)');
          const relativePath = path.posix.relative(
            parsedMainOrigin.pathname, parsedOrigin.pathname);
          // Should always be true?
          if (util.isRelativePath(relativePath)) {
            entry.origin = relativePath;
          }
        } else {
          console.log(`    (locked branch to ${lockBranch})`);
          entry.lockBranch = lockBranch;
        }
      }
      dependencies[repoPath] = entry;
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

    const manifestDir = path.dirname(absManifestPath);
    if (!fsX.dirExistsSync(manifestDir)) fs.mkdirSync(manifestDir);
    fs.writeFileSync(absManifestPath, prettyManifest);
    console.log(`Initialised dependencies in ${relManifestPath}`);

    // Root placeholder file. Safe to overwrite as low content.
    core.writeRootFile({
      rootFilePath: path.join(rootAbsolutePath, core.fabRootFilename),
      mainPath: mainFromRoot,
      manifest: options.manifest,
    });

    // Offer clue for possible sibling init situation.
    if (Object.keys(dependencies).length === 0) {
      console.log('(No dependencies found. For a sibling repo layout use "fab init --root ..")');
    }
    process.chdir(startDir); // Simplify unit tests and reuse
  },


  doMakeBranch(branch, startPoint, publish) {
    const startDir = process.cwd();
    core.cdRootDirectory();
    const dependencies = core.readManifest(
      { fromRoot: true, addMainToDependencies: true }
    ).dependencies;

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
        console.log('before');
        util.execCommandSync({ cmd: 'git', args, cwd: repoPath });
        console.log('after');
        if (publish) {
          util.execCommandSync(
            { cmd: 'git', args: ['push', '--set-upstream', 'origin', branch], cwd: repoPath }
          );
        }
      } else if (repoType === 'hg') {
        if (startPoint !== undefined) {
          util.execCommandSync({ cmd: 'hg', args: ['update', startPoint], cwd: repoPath });
        }
        util.execCommandSync({ cmd: 'hg', args: ['branch', branch], cwd: repoPath });
        if (publish) {
          util.execCommandSync(
            { cmd: 'hg', args: ['commit', '--message', 'Create branch'], cwd: repoPath }
          );
          util.execCommandSync(
            { cmd: 'hg', args: ['push', '--branch', branch, '--new-branch'], cwd: repoPath }
          );
        }
      }
    });
    process.chdir(startDir); // Simplify unit tests and reuse
  },


  doSwitch(branch) {
    const startDir = process.cwd();
    core.cdRootDirectory();
    const dependencies = core.readManifest(
      { fromRoot: true, addMainToDependencies: true }
    ).dependencies;

    Object.keys(dependencies).forEach((repoPath) => {
      const entry = dependencies[repoPath];
      if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
        return; // continue forEach
      }

      const repoType = entry.repoType;
      if (repoType === 'git') {
        util.execCommandSync(
          { cmd: 'git', args: ['checkout', branch], cwd: repoPath }
        );
      } else if (repoType === 'hg') {
        util.execCommandSync(
          { cmd: 'hg', args: ['update', branch], cwd: repoPath }
        );
      }
    });
    process.chdir(startDir); // Simplify unit tests and reuse
  },


  doForEach(internalOptions, cmd, args) {
    const startDir = process.cwd();
    core.cdRootDirectory();
    const dependencies = core.readManifest(
      { fromRoot: true, addMainToDependencies: true }
    ).dependencies;

    Object.keys(dependencies).forEach((repoPath) => {
      if (internalOptions.freeOnly) {
        const entry = dependencies[repoPath];
        if (entry.lockBranch !== undefined || entry.pinRevision !== undefined) {
          return; // continue forEach
        }
      }

      if (args.length > 0) {
        util.execCommandSync(
          { cmd, args, cwd: repoPath }
        );
      } else {
        util.execCommandSync(
          { cmd, cwd: repoPath }
        );
      }
    });
    process.chdir(startDir); // Simplify unit tests and reuse
  },


  cloneEntry(entry, repoPath, freeBranch) {
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
  },


  checkoutEntry(entry, repoPath, freeBranch) {
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
  },


  doInstall(options) {
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
        core.checkoutEntry(entry, repoPath, freeBranch);
      } else {
        core.cloneEntry(entry, repoPath, freeBranch);
      }
    });
    process.chdir(startDir);
  },


  doClone(source, destinationParam, options) {
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
    core.cloneEntry(mainEntry, destination, options.branch);

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

    core.doInstall({ manifest: options.manifest });

    console.log(`Created repo forest in ${destination}`);
    process.chdir(startDir);
  },

};


module.exports = core;

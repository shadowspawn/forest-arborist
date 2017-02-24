'use strict';

// These are the routines which implement the command line

const fs = require('fs');
const path = require('path');
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
    const startDir = process.cwd();

    // options properties: manifest, root
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


};


module.exports = core;

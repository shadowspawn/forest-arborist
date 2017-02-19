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


  // Perhaps make internal when finished refactor?
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


  doInit(options) {
    // options properties: manifest, root
    const relManifestPath = core.manifestPath({ manifest: options.manifest });
    if (fsX.fileExistsSync(relManifestPath)) {
      console.log(`Skipping init, already have ${relManifestPath}`);
      console.log('(Delete it to start over, or did you want "fab install"?)');
      return;
    }
    const absManifestOath = path.resolve('.', relManifestPath);

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
      } else {
        const parsedOrigin = dvcsUrl.parse(origin);
        // We are doing simple auto detection of relative path, siblings on server
        if (dvcsUrl.sameDir(parsedOrigin, parsedMainOrigin)) {
          console.log('    (free)');
          // Like git submodule, require relative paths to start with ./ or ../
          const relativePath = path.posix.relative(
            parsedMainOrigin.pathname, parsedOrigin.pathname);
          if (util.isRelativePath(relativePath)) {
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

    const manifestDir = path.dirname(absManifestOath);
    if (!fsX.dirExistsSync(manifestDir)) fs.mkdirSync(manifestDir);
    fs.writeFileSync(absManifestOath, prettyManifest);
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
  },


};


module.exports = core;

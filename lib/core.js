'use strict';

// These are the routines which implement the command line

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
// Mine
const dvcsUrl = require('./dvcs-url');
const fsX = require('./fsExtra');
const repo = require('./repo');
const util = require('./util');


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


  manifestList(mainPath) {
    const manifestDir = path.join(mainPath, '.fab');
    if (!fsX.dirExistsSync(manifestDir)) {
      console.log('(No manifest folder found. Do you need to cd to main repo, or run "fab init"?)');
      return;
    }

    console.log('Available manifest:');
    const itemList = fs.readdirSync(manifestDir);
    let count = 0;
    itemList.forEach((item) => {
      if (item === 'manifest.json') {
        console.log('  (default)');
        count += 1;
      } else {
        const match = /(.*)_manifest.json$/.exec(item);
        if (match !== null) {
          count += 1;
          console.log(`  ${match[1]}`);
        }
      }
    });
    if (count === 0) console.log('  (none found)');
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

    if (options.tipToAddToIgnore) {
      const rootDir = path.dirname(options.rootFilePath);
      if (repo.isGitRepository(rootDir)) {
        try {
          childProcess.execFileSync('git', ['check-ignore', '--quiet', core.fabRootFilename]);
        } catch (err) {
          if (err.status === 1) {
            console.log(`(Suggest you add ${core.fabRootFilename} to .gitignore)`);
          }
        }
      }
    }
  },


  readManifest(options) {
    // options properties: fromRoot or mainPath and manifest, addMainToDependencies

    // Sort out manifest location
    let mainPath;
    let manifest;
    if (options.fromRoot) {
      const rootObject = core.readRootFile();
      mainPath = rootObject.mainPath;
      manifest = rootObject.manifest;
    } else {
      mainPath = options.mainPath;
      manifest = options.manifest;
    }
    const fabManifest = core.manifestPath({ mainPath, manifest });

    // Display some clues if file not foung
    if (!fsX.fileExistsSync(fabManifest)) {
      core.manifestList(mainPath);
      if (manifest !== undefined) {
        util.terminate(`manifest not found: ${manifest}`);
      } else {
        util.terminate('default manifest not found');
      }
    }

    // Hurrah, read manifest
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


};


module.exports = core;

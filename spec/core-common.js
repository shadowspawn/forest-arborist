'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
const repo = require('../lib/repo');
const util = require('../lib/util');


const cc = {
  suiteDependencies: ['free', path.join('Libs', 'pinned'), path.join('Libs', 'locked')],


  quietDoInit(options) {
    // Classic use of mute, suppress output from (our own) module that does not support it!
    const unmute = util.recursiveMute();
    try {
      core.doInit(options);
      unmute();
    } catch (err) {
      unmute();
      throw err;
    }
  },


  makeOneGitRepo(repoPath, origin) {
    const startingDir = process.cwd();
    childProcess.execFileSync('git', ['init', repoPath]);
    process.chdir(repoPath);
    childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Empty but real commit']);
    childProcess.execFileSync('git', ['remote', 'add', 'origin', origin]);

    process.chdir(startingDir);
  },


  // Nested, direct construction of a sandpit.
  makeOneOfEachGitRepo() {
    const rootDir = process.cwd();

    cc.makeOneGitRepo('.', 'git@ex.com:path/to/main.git');
    cc.makeOneGitRepo('free', 'git@ex.com:path/to/free.git');

    cc.makeOneGitRepo('pinned', 'git@ex.com:path/to/pinned.git');
    process.chdir('pinned');
    const oldRevision = repo.getRevision('.');
    childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Second empty but real commit']);
    childProcess.execFileSync('git', ['checkout', '--quiet', oldRevision]);
    process.chdir(rootDir);

    // locked
    cc.makeOneGitRepo('locked', 'git@ex.com:a/b/c/locked.git');

    // fab init
    process.chdir(rootDir);
    cc.quietDoInit({});

    process.chdir(rootDir);
  },


  // returns {remotesDir, nestedRootDir, siblingRootDir, pinnedRevision}
  makeGitRepoSuite() {
    const startDir = process.cwd();

    // Make remote empty bare repos
    fs.mkdirSync('remotes');
    process.chdir('remotes');
    const remotesDir = process.cwd();
    const allRemoteRepos = ['main-nested', 'main-sibling'].concat(cc.suiteDependencies);
    allRemoteRepos.forEach((repoPath) => {
      // Want a bare master, but not an empty one!
      const tempRepo = repoPath.concat('-tmp');
      childProcess.execFileSync('git', ['init', tempRepo]);
      childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Empty but real commit'], { cwd: tempRepo });
      childProcess.execFileSync('git', ['branch', '--quiet', 'develop'], { cwd: tempRepo });
      childProcess.execFileSync('git', ['clone', '--bare', '--quiet', tempRepo, repoPath]);
    });
    process.chdir(startDir);

    function initAndPushMain(options) {
      // Setting up two branches and two manifests
      // default manifest
      cc.quietDoInit(options);
      childProcess.execFileSync('git', ['add', core.manifestPath({})]);
      childProcess.execFileSync('git', ['commit', '-m', 'fab initialised']);

      // custom manifest
      const manifest = 'sub';
      const customOptions = { root: options.root, manifest };
      childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, 'free'), 'sub']);
      cc.quietDoInit(customOptions);
      childProcess.execFileSync('git', ['add', core.manifestPath({ manifest })]);
      childProcess.execFileSync('git', ['commit', '-m', 'fab initialised with custom manifest']);

      // push!
      childProcess.execFileSync('git', ['push', '--quiet']);

      //  create matching develop branch
      childProcess.execFileSync('git', ['checkout', '--quiet', 'develop']);
      childProcess.execFileSync('git', ['merge', '--quiet', 'master']);
      childProcess.execFileSync('git', ['push', '--quiet']);
    }

    // Set up main-nested
    fs.mkdirSync('sandpit');
    process.chdir('sandpit');
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, 'main-nested')]);
    process.chdir('main-nested');
    const nestedRootDir = process.cwd();
    cc.suiteDependencies.forEach((repoPath) => {
      childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, repoPath), repoPath]);
    });

    // Create the extra revision in pinned and rollback
    process.chdir('Libs/pinned');
    const pinnedRevision = repo.getRevision('.');
    childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Second empty but real commit']);
    childProcess.execFileSync('git', ['push', '--quiet']);
    childProcess.execFileSync('git', ['checkout', '--quiet', pinnedRevision]);

    process.chdir(nestedRootDir);
    initAndPushMain({});
    process.chdir(startDir);

    // Set up main-sibling in client layout
    process.chdir('sandpit');
    fs.mkdirSync('sibling');
    process.chdir('sibling');
    const siblingRootDir = process.cwd();
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, 'main-sibling')]);
    cc.suiteDependencies.forEach((repoPath) => {
      childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, repoPath), repoPath]);
    });
    childProcess.execFileSync('git', ['checkout', '--quiet', pinnedRevision],
      { cwd: path.join('Libs', 'pinned') }
    );
    //
    process.chdir('main-sibling');
    initAndPushMain({ root: '..' });
    process.chdir(startDir);

    return { remotesDir, nestedRootDir, siblingRootDir, pinnedRevision };
  },


  expectSuiteRepoLayout(options) {
    // options: rootDir, mainDir, freeBranch
    const startDir2 = process.cwd();

    // Check root
    expect(fsX.dirExistsSync(options.rootDir)).toBe(true);
    process.chdir(options.rootDir);
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);

    // Check main
    expect(fsX.dirExistsSync(options.mainDir)).toBe(true);
    expect(repo.getBranch(options.mainDir)).toEqual(options.freeBranch);
    expect(fsX.fileExistsSync(
      core.manifestPath({ manifest: options.manifest, mainPath: options.mainDir }))).toBe(true);

    // check dependencies
    cc.suiteDependencies.forEach((repoPath) => {
      expect(fsX.dirExistsSync(repoPath)).toBe(true);
    });
    expect(repo.getBranch('free')).toEqual(options.freeBranch);
    expect(repo.getBranch(path.join('Libs', 'locked'))).toEqual('master');
    expect(repo.getBranch(path.join('Libs', 'pinned'))).toBeUndefined();
    expect(repo.getRevision(path.join('Libs', 'pinned'))).toEqual(options.pinnedRevision);

    process.chdir(startDir2);
  },


};


module.exports = cc;

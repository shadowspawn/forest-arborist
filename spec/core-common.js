'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
// Mine
const core = require('../lib/core');
const repo = require('../lib/repo');
const util = require('../lib/util');


const cc = {


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

    function initAndPushMain(options) {
      cc.quietDoInit(options);
      childProcess.execFileSync('git', ['add', core.manifestPath({})]);
      childProcess.execFileSync('git', ['commit', '-m', 'fab initialised']);
      childProcess.execFileSync('git', ['push', '--quiet']);
    }

    // Make remote empty bare repos
    fs.mkdirSync('remotes');
    process.chdir('remotes');
    const remotesDir = process.cwd();
    const dependencies = ['free', path.join('Libs', 'pinned'), path.join('Libs', 'locked')];
    const allRemoteRepos = ['main-nested', 'main-sibling'].concat(dependencies);
    allRemoteRepos.forEach((repoPath) => {
      // Want a bare master, but not an empty one!
      const tempRepo = repoPath.concat('-tmp');
      childProcess.execFileSync('git', ['init', tempRepo]);
      childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Empty but real commit'], { cwd: tempRepo });
      childProcess.execFileSync('git', ['clone', '--bare', '--quiet', tempRepo, repoPath]);
    });
    process.chdir(startDir);

    // Set up main-nested
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, 'main-nested')]);
    process.chdir('main-nested');
    const nestedRootDir = process.cwd();
    dependencies.forEach((repoPath) => {
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
    fs.mkdirSync('sibling');
    process.chdir('sibling');
    const siblingRootDir = process.cwd();
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(remotesDir, 'main-sibling')]);
    dependencies.forEach((repoPath) => {
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


};


module.exports = cc;

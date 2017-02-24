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


  makeMasterGitRepos() {
    const startDir = process.cwd();

    function initAndPushMain(options) {
      cc.quietDoInit(options);
      childProcess.execFileSync('git', ['add', core.fabRootFilename]);
      childProcess.execFileSync('git', ['add', core.manifestPath({})]);
      childProcess.execFileSync('git', ['commit', '-m', 'fab initialised']);
      childProcess.execFileSync('git', ['push', '--quiet']);
    }

    // Make master empty bare repos
    fs.mkdirSync('master');
    process.chdir('master');
    const masterDir = process.cwd();
    const dependencies = ['free', 'Libs/pinned', 'Libs/locked'];
    const allMasterRepos = ['main-nested', 'main-sibling'].concat(dependencies);
    allMasterRepos.forEach((repoPath) => {
      // Want a bare master, but not an empty one!
      const tempRepo = repoPath.concat('-tmp');
      childProcess.execFileSync('git', ['init', tempRepo]);
      childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Empty but real commit'], { cwd: tempRepo });
      childProcess.execFileSync('git', ['clone', '--bare', '--quiet', tempRepo, repoPath]);
    });
    process.chdir(startDir);

    // Set up main-nested
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(masterDir, 'main-nested')]);
    process.chdir('main-nested');
    const mainNestedDir = process.cwd();
    dependencies.forEach((repoPath) => {
      childProcess.execFileSync('git', ['clone', '--quiet', path.join(masterDir, repoPath), repoPath]);
    });

    // Create the extra revision in pinned and rollback
    process.chdir('Libs/pinned');
    const oldPinnedRevision = repo.getRevision('.');
    childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Second empty but real commit']);
    childProcess.execFileSync('git', ['push', '--quiet']);
    childProcess.execFileSync('git', ['checkout', '--quiet', oldPinnedRevision]);

    process.chdir(mainNestedDir);
    initAndPushMain({});
    process.chdir(startDir);

    // Set up main-sibling in client layout
    fs.mkdirSync('sibling');
    process.chdir('sibling');
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(masterDir, 'main-sibling')]);
    dependencies.forEach((repoPath) => {
      childProcess.execFileSync('git', ['clone', '--quiet', path.join(masterDir, repoPath), repoPath]);
    });
    childProcess.execFileSync('git', ['checkout', '--quiet', oldPinnedRevision], { cwd: 'Libs/pinned' });

    process.chdir('main-sibling');
    initAndPushMain({ root: '..' });
    process.chdir(startDir);
  },


};


module.exports = cc;

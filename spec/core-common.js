'use strict';

const childProcess = require('child_process');
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
    childProcess.execFileSync('touch', ['a']);
    childProcess.execFileSync('git', ['add', 'a']);
    childProcess.execFileSync('git', ['commit', '-m', 'a']);
    childProcess.execFileSync('git', ['remote', 'add', 'origin', origin]);

    process.chdir(startingDir);
  },


  makeOneOfEachGitRepo() {
    const rootDir = process.cwd();

    cc.makeOneGitRepo('.', 'git@ex.com:path/to/main.git');
    cc.makeOneGitRepo('free', 'git@ex.com:path/to/free.git');

    cc.makeOneGitRepo('pinned', 'git@ex.com:path/to/pinned.git');
    process.chdir('pinned');
    const oldRevision = repo.getRevision('.');
    childProcess.execFileSync('touch', ['b']);
    childProcess.execFileSync('git', ['add', 'b']);
    childProcess.execFileSync('git', ['commit', '-m', 'b']);
    childProcess.execFileSync('git', ['checkout', '--quiet', oldRevision]);
    process.chdir(rootDir);

    // locked
    cc.makeOneGitRepo('locked', 'git@ex.com:a/b/c/locked.git');

    // fab init
    process.chdir(rootDir);
    cc.quietDoInit({});

    process.chdir(rootDir);
  },


};


module.exports = cc;

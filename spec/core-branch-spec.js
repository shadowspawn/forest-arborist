'use strict';

const childProcess = require('child_process');
const tmp = require('tmp');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
const repo = require('../lib/repo');
const util = require('../lib/util');
//
const cc = require('./core-common');


function quietDoMakeBranch(branch, startPoint, publish) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  const unmute = util.recursiveMute();
  try {
    core.doMakeBranch(branch, startPoint, publish);
    unmute();
  } catch (err) {
    unmute();
    throw err;
  }
}


function quietDoSwitch(branch) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  const unmute = util.recursiveMute();
  try {
    core.doSwitch(branch);
    unmute();
  } catch (err) {
    unmute();
    throw err;
  }
}


function makeOneGitRepo(repoPath, origin) {
  const startingDir = process.cwd();
  childProcess.execFileSync('git', ['init', repoPath]);
  process.chdir(repoPath);
  childProcess.execFileSync('touch', ['a']);
  childProcess.execFileSync('git', ['add', 'a']);
  childProcess.execFileSync('git', ['commit', '-m', 'a']);
  childProcess.execFileSync('git', ['remote', 'add', 'origin', origin]);

  process.chdir(startingDir);
}


function makeOneOfEachGitRepo() {
  const rootDir = process.cwd();

  makeOneGitRepo('.', 'git@ex.com:path/to/main.git');
  makeOneGitRepo('free', 'git@ex.com:path/to/free.git');

  makeOneGitRepo('pinned', 'git@ex.com:path/to/pinned.git');
  process.chdir('pinned');
  const oldRevision = repo.getRevision('.');
  childProcess.execFileSync('touch', ['b']);
  childProcess.execFileSync('git', ['add', 'b']);
  childProcess.execFileSync('git', ['commit', '-m', 'b']);
  childProcess.execFileSync('git', ['checkout', '--quiet', oldRevision]);
  process.chdir(rootDir);

  // locked
  makeOneGitRepo('locked', 'git@ex.com:a/b/c/locked.git');

  // fab init
  process.chdir(rootDir);
  cc.quietDoInit({});

  process.chdir(rootDir);
}


describe('core branch:', () => {
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  it('make-branch', () => {
    makeOneOfEachGitRepo();

    expect(repo.getBranch('.')).toEqual('master');
    expect(repo.getBranch('free')).toEqual('master');

    // make-branch X, check just affects free
    quietDoMakeBranch('one');
    expect(repo.getBranch('.')).toEqual('one');
    expect(repo.getBranch('free')).toEqual('one');
    expect(repo.getBranch('pinned')).toBeUndefined();
    expect(repo.getBranch('locked')).toEqual('master');

    // make-branch X, check from current branch
    const onOne = 'onOne';
    childProcess.execFileSync('touch', [onOne]);
    childProcess.execFileSync('git', ['add', onOne]);
    childProcess.execFileSync('git', ['commit', '-m', onOne]);
    quietDoMakeBranch('two');
    expect(fsX.fileExistsSync(onOne)).toBe(true);

    // make-branch X Y, check from specified start
    quietDoMakeBranch('three', 'master');
    expect(fsX.fileExistsSync(onOne)).toBe(false);

    // make-branch X --publish ????
  });


  it('switch', () => {
    makeOneOfEachGitRepo();
    quietDoMakeBranch('one');
    quietDoMakeBranch('two');
    expect(repo.getBranch('.')).toEqual('two');
    expect(repo.getBranch('free')).toEqual('two');

    quietDoSwitch('one');
    expect(repo.getBranch('.')).toEqual('one');
    expect(repo.getBranch('free')).toEqual('one');
    expect(repo.getBranch('pinned')).toBeUndefined();
    expect(repo.getBranch('locked')).toEqual('master');
  });
});

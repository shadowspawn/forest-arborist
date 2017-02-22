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


describe('core branch:', () => {
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  it('make-branch', () => {
    cc.makeOneOfEachGitRepo();

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
    cc.makeOneOfEachGitRepo();
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

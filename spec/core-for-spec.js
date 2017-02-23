'use strict';

const tmp = require('tmp');
// Mine
const core = require('../lib/core');
const repo = require('../lib/repo');
const util = require('../lib/util');
//
const cc = require('./core-common');


function quietDoFor(internalOptions, cmd, args) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  const unmute = util.recursiveMute();
  try {
    core.doForEach(internalOptions, cmd, args);
    unmute();
  } catch (err) {
    unmute();
    throw err;
  }
}


describe('core for:', () => {
  const tempFolder = tmp.dirSync({ unsafeCleanup: true });
  process.chdir(tempFolder.name);
  cc.makeOneOfEachGitRepo();

  it('for-free', () => {
    const freeBranch = 'freeBranch';
    quietDoFor({ freeOnly: true }, 'git', ['checkout', '--quiet', '-b', freeBranch]);
    expect(repo.getBranch('.')).toEqual(freeBranch);
    expect(repo.getBranch('free')).toBe(freeBranch);
    expect(repo.getBranch('pinned')).toBeUndefined();
    expect(repo.getBranch('locked')).toBe('master');
  });

  it('for-each', () => {
    const eachBranch = 'eachBranch';
    quietDoFor({}, 'git', ['checkout', '--quiet', '-b', eachBranch]);
    expect(repo.getBranch('.')).toEqual(eachBranch);
    expect(repo.getBranch('free')).toEqual(eachBranch);
    expect(repo.getBranch('pinned')).toEqual(eachBranch);
    expect(repo.getBranch('locked')).toEqual(eachBranch);
  });
});

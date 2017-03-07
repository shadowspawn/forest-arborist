'use strict';

const tmp = require('tmp');
// Mine
const coreFor = require('../src/core-for');
const repo = require('../src/repo');
const util = require('../src/util');
//
const cc = require('./core-common');


function quietDoFor(internalOptions, cmd, args) {
  util.muteCall(() => {
    coreFor.doForEach(internalOptions, cmd, args);
  });
}


describe('core for:', () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    cc.makeOneOfEachGitRepo();
  });

  afterEach(() => {
    process.chdir(startDir);
  });


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

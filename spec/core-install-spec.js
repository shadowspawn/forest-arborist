'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const tmp = require('tmp');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
const util = require('../lib/util');
// //
const cc = require('./core-common');


function quietDoInstall(options) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  const unmute = util.recursiveMute();
  try {
    core.doInstall(options);
    unmute();
  } catch (err) {
    unmute();
    throw err;
  }
}


describe('core install:', () => {
  const startDir = process.cwd();
  let tempFolder;
  let suite;    // {remotesDir, nestedRootDir, siblingRootDir, pinnedRevision}

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  it('nested', () => {
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(suite.remotesDir, 'main-nested')]);
    process.chdir('main-nested');
    quietDoInstall({});
    cc.expectSuiteRepoLayout({ rootDir: '.', mainDir: '.', freeBranch: 'master', pinnedRevision: suite.pinnedRevision });
  });

  it('nested on branch', () => {
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(suite.remotesDir, 'main-nested'), 'branch-nested']);
    process.chdir('branch-nested');
    childProcess.execFileSync('git', ['checkout', '--quiet', 'develop']);
    quietDoInstall({});
    cc.expectSuiteRepoLayout({ rootDir: '.', mainDir: '.', freeBranch: 'develop', pinnedRevision: suite.pinnedRevision });
  });

  it('nested --manifest', () => {
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(suite.remotesDir, 'main-nested'), 'sub-nested']);
    process.chdir('sub-nested');
    quietDoInstall({ manifest: 'sub' });
    cc.expectSuiteRepoLayout({ rootDir: '.', mainDir: '.', freeBranch: 'master', pinnedRevision: suite.pinnedRevision });
    // Look for the extra repo in the sub manifest
    expect(fsX.dirExistsSync('sub')).toBe(true);

    // Check root has manifest
    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual('.');
    expect(rootObject.manifest).toEqual('sub');
  });

  it('sibling', () => {
    fs.mkdirSync('sibling');
    process.chdir('sibling');
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(suite.remotesDir, 'main-sibling')]);
    process.chdir('main-sibling');
    quietDoInstall({});
    cc.expectSuiteRepoLayout({ rootDir: '..', mainDir: 'main-sibling', freeBranch: 'master', pinnedRevision: suite.pinnedRevision });
  });
});

'use strict';

const path = require('path');
const tmp = require('tmp');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
const repo = require('../lib/repo');
const util = require('../lib/util');
// //
const cc = require('./core-common');


function quietDoClone(source, destination, options) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  const unmute = util.recursiveMute();
  try {
    core.doClone(source, destination, options);
    unmute();
  } catch (err) {
    unmute();
    throw err;
  }
}


describe('core clone:', () => {
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

  function expectCCRepoLayout(options) {
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
    expect(repo.getRevision(path.join('Libs', 'pinned'))).toEqual(suite.pinnedRevision);

    process.chdir(startDir2);
  }

  it('nested source', () => {
    quietDoClone(
      path.join(suite.remotesDir, 'main-nested'),
      undefined, {}
    );
    expectCCRepoLayout({ rootDir: 'main-nested', mainDir: '.', freeBranch: 'master' });
  });

  it('nested source destination', () => {
    quietDoClone(
      path.join(suite.remotesDir, 'main-nested'),
      'dest-nested', {}
    );
    expectCCRepoLayout({ rootDir: 'dest-nested', mainDir: '.', freeBranch: 'master' });
  });

  it('nested source destination --branch', () => {
    quietDoClone(
      path.join(suite.remotesDir, 'main-nested'),
      'branch-nested', { branch: 'develop' }
    );
    expectCCRepoLayout({ rootDir: 'branch-nested', mainDir: '.', freeBranch: 'develop' });
  });

  it('nested source destination --manifest', () => {
    quietDoClone(
      path.join(suite.remotesDir, 'main-nested'),
      'sub-nested', { manifest: 'sub' }
    );
    expectCCRepoLayout({ rootDir: 'branch-nested', mainDir: '.', freeBranch: 'develop', manifest: 'sub' });
    expect(fsX.dirExistsSync(path.join('sub-nested', 'sub'))).toBe(true);

    process.chdir('sub-nested');
    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual('.');
    expect(rootObject.manifest).toEqual('sub');
  });

  it('sibling source', () => {
    quietDoClone(
      path.join(suite.remotesDir, 'main-sibling'),
      undefined, {}
    );
    expectCCRepoLayout({ rootDir: 'main-sibling', mainDir: 'main-sibling', freeBranch: 'master' });
  });

  it('sibling source destination', () => {
    quietDoClone(
      path.join(suite.remotesDir, 'main-sibling'),
      'dest-sibling', {}
    );
    expectCCRepoLayout({ rootDir: 'dest-sibling', mainDir: 'main-sibling', freeBranch: 'master' });
  });
});

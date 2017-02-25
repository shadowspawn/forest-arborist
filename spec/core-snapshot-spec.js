'use strict';

const childProcess = require('child_process');
const path = require('path');
const tmp = require('tmp');
// Mine
const core = require('../lib/core');
const coreClone = require('../lib/core-clone');
const coreSnapshot = require('../lib/core-snapshot');
const repo = require('../lib/repo');
const util = require('../lib/util');
//
const cc = require('./core-common');


describe('core snapshot:', () => {
  const startDir = process.cwd();
  let tempFolder;
  let suite;    // {remotesDir, nestedRootDir, pinnedRevision}

  beforeAll(() => {
  });

  afterAll(() => {
  });

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  it('restore', () => {
    // Get out a clean repo to work with
    util.muteCall(() => {
      coreClone.doClone(
        path.join(suite.remotesDir, 'main-nested'),
        'test-restore', {}
      );
    });
    process.chdir('test-restore');
    const manifestObject = core.readManifest({ fromRoot: true, addMainToDependencies: true });
    const forestRepos = manifestObject.dependencies;

    // Make snapshot
    coreSnapshot.doSnapshot({ output: 'ss' });

    // Note revisions and make sure now on a different revision.
    const beforeRevisions = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      beforeRevisions[repoPath] = repo.getRevision(repoPath);
      childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Change'], { cwd: repoPath });
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
    });

    util.muteCall(() => {
      coreSnapshot.doRestore('ss');
    });

    // Check restored revisions.
    Object.keys(forestRepos).forEach((repoPath) => {
      expect(repo.getRevision(repoPath)).toEqual(beforeRevisions[repoPath]);
    });

    // Get out of snapshot. Pinned revision stays same, others should move forward.
    util.muteCall(() => {
      coreSnapshot.doRestore();
    });
    cc.expectSuiteRepoLayout({ rootDir: '.', mainDir: '.', freeBranch: 'master', pinnedRevision: suite.pinnedRevision });
    Object.keys(forestRepos).forEach((repoPath) => {
      if (forestRepos[repoPath].pinRevision === undefined) {
        expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      }
    });
  });

  it('recreate', () => {
    // Get out a clean repo to work with
    util.muteCall(() => {
      coreClone.doClone(
        path.join(suite.remotesDir, 'main-nested'),
        'test-recreate-source', {}
      );
    });
    process.chdir('test-recreate-source');
    const manifestObject = core.readManifest({ fromRoot: true, addMainToDependencies: true });
    const forestRepos = manifestObject.dependencies;

    // Make snapshot
    coreSnapshot.doSnapshot({ output: 'ss' });
    const ss = path.resolve('ss');

    // Note revisions and make sure now on a different revision.
    const beforeRevisions = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      beforeRevisions[repoPath] = repo.getRevision(repoPath);
      // Get unpinned
      childProcess.execFileSync('git', ['checkout', '--quiet', 'master'], { cwd: repoPath });
      // Add revision
      childProcess.execFileSync('git', ['commit', '--allow-empty', '-m', 'Change'], { cwd: repoPath });
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      // Push to remote so so we can see if recreate is bring back old forest state.
      childProcess.execFileSync('git', ['push', '--quiet'], { cwd: repoPath });
    });

    process.chdir(tempFolder.name);
    util.muteCall(() => {
      coreSnapshot.doRecreate(ss, 'test-recreate-dest');
    });
    process.chdir('test-recreate-dest');

    // Check restored revisions.
    Object.keys(forestRepos).forEach((repoPath) => {
      expect(repo.getRevision(repoPath)).toEqual(beforeRevisions[repoPath]);
    });

    // Get out of snapshot. Pinned revision stays same, others should move forward.
    util.muteCall(() => {
      coreSnapshot.doRestore();
    });
    cc.expectSuiteRepoLayout({ rootDir: '.', mainDir: '.', freeBranch: 'master', pinnedRevision: suite.pinnedRevision });
    Object.keys(forestRepos).forEach((repoPath) => {
      childProcess.execFileSync('git', ['pull']);
      if (forestRepos[repoPath].pinRevision === undefined) {
        expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      }
    });
  });
});

'use strict';

// Sanity check that command line still working, not deep testing.

const childProcess = require('child_process');
const path = require('path');
const tmp = require('tmp');
// Mine
const coreClone = require('../lib/core-clone');
const util = require('../lib/util');
//
const cc = require('./core-common');


describe('command-line sanity check:', () => {
  const startDir = process.cwd();
  let tempFolder;
  let suite;    // {remotesDir, pinnedRevision}
  const preparedRepo = 'ref';

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
    // Get out a clean repo to work with
    util.muteCall(() => {
      coreClone.doClone(
        path.join(suite.remotesDir, 'main-nested'),
        preparedRepo, {}
      );
    });
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

  it('fab clone', () => {
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['clone', path.join(suite.remotesDir, 'main-nested'), 'clone-test']);
    });
  });

  it('fab init', () => {
    cc.makeOneGitRepo('init-test');
    process.chdir('init-test');
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['init']);
    });
  });

  it('fab install', () => {
    childProcess.execFileSync('git', ['clone', '--quiet', path.join(suite.remotesDir, 'main-nested'), 'install-test']);
    process.chdir('install-test');
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['install']);
    });
  });

  it('fab status', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['status']);
    });
  });

  it('fab pull', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['pull']);
    });
  });

  it('fab root', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['root']);
    });
  });

  it('fab for-each', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['for-each', 'pwd']);
    });
  });

  it('fab for-free', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['for-free', 'pwd']);
    });
  });

  it('fab switch', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['switch', 'develop']);
    });
  });

  it('fab make-branch', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['make-branch', 'feature/test']);
    });
  });

  // saves snapshot to use in recreate and restore
  it('fab snapshot', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['snapshot', '--output', 'snapshot']);
    });
  });

  it('fab recreate', () => {
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['recreate', path.join(preparedRepo, 'snapshot'), 'recreate-test']);
    });
  });

  it('fab restore', () => {
    process.chdir(preparedRepo);
    util.muteCall(() => {
      childProcess.execFileSync('fab', ['restore', 'snapshot']);
    });
  });
});

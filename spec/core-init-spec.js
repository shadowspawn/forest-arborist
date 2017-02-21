/* eslint-env jasmine */

'use strict';

const mute = require('mute');
const tmp = require('tmp');
const childProcess = require('child_process');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
const repo = require('../lib/repo');
const util = require('../lib/util');


function quietDoInit(options) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  // const unmute = mute();
  try {
    core.doInit(options);
    // unmute();
  } catch (err) {
    // unmute();
    throw err;
  }
}


describe('core init:', () => {
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  it('no repo', () => {
    expect(() => {
      quietDoInit({});
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  it('empty git repo', () => {
    // Check we don't fall over in empty repo
    childProcess.execFileSync('git', ['init']);
    expect(fsX.dirExistsSync('.git')).toBe(true);

    quietDoInit({});
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(fsX.fileExistsSync(core.manifestPath({}))).toBe(true);
    // Not too worried about root and manifest contents!
  });

  it('--manifest', () => {
    // Check manigest self consistent
    childProcess.execFileSync('git', ['init']);
    expect(fsX.dirExistsSync('.git')).toBe(true);

    const manifest = 'custom';
    quietDoInit({ manifest });
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(fsX.fileExistsSync(core.manifestPath({ manifest }))).toBe(true);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual('.');
    expect(rootObject.manifest).toEqual(manifest);
  });

  it('nested', () => {
    // Check cross referencing for nexted setup.
    const sub = 'child';
    childProcess.execFileSync('git', ['init']);
    childProcess.execFileSync('git', ['init', sub]);

    quietDoInit({});

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual('.');
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual('.');
    expect(manifestObject.mainPathFromRoot).toEqual('.');

    expect(manifestObject.dependencies[sub]).not.toBeUndefined();
  });

  it('sibling', () => {
    // Check cross referencing for sibling setup.
    const sibling = 'sibling';
    childProcess.execFileSync('git', ['init', 'main']);
    childProcess.execFileSync('git', ['init', sibling]);
    process.chdir('main');

    quietDoInit({ root: '..' });

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual('main');
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual('..');
    expect(manifestObject.mainPathFromRoot).toEqual('main');

    expect(manifestObject.dependencies[sibling]).not.toBeUndefined();
  });

  it('pinned', () => {
    // Auto detect pinned revisio
    childProcess.execFileSync('git', ['init']);
    childProcess.execFileSync('git', ['init', 'boost']);
    process.chdir('boost');
    childProcess.execFileSync('touch', ['a']);
    childProcess.execFileSync('git', ['add', 'a']);
    childProcess.execFileSync('git', ['commit', '-m', 'a']);
    const revision = repo.getRevision('.');
    childProcess.execFileSync('touch', ['b']);
    childProcess.execFileSync('git', ['add', 'b']);
    childProcess.execFileSync('git', ['commit', '-m', 'b']);
    childProcess.execFileSync('git', ['checkout', '--quiet', revision]);
    process.chdir('..');

    quietDoInit({});

    const manifestObject = core.readManifest({ fromRoot: true });
    const dependencies = manifestObject.dependencies;
    const entry = dependencies.boost;

    // After all that...
    expect(entry.pinRevision).toEqual(revision);
  });

  // locked
});

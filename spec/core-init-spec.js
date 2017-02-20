/* eslint-env jasmine */

'use strict';

const mute = require('mute');
const tmp = require('tmp');
const childProcess = require('child_process');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
const util = require('../lib/util');


function quietDoInit(options) {
  // Classic use of mute, suppress output from (our own) module that does not support it!
  const unmute = mute();
  try {
    core.doInit(options);
    unmute();
  } catch (err) {
    unmute();
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
    childProcess.execFileSync('git', ['init']);
    expect(fsX.dirExistsSync('.git')).toBe(true);

    quietDoInit({});
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(fsX.fileExistsSync(core.manifestPath({}))).toBe(true);

    // Can use readRootObject and readManifest?
    pending('check root contents');
    pending('check manifest');
  });

  it('manifest', () => {
    childProcess.execFileSync('git', ['init']);
    expect(fsX.dirExistsSync('.git')).toBe(true);

    const manifest = 'custom';
    quietDoInit({ manifest });
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(fsX.fileExistsSync(core.manifestPath({ manifest }))).toBe(true);

    // Can use readRootObject and readManifest?
    pending('check root contents');
    pending('check manifest');
  });

  // root (sibling)
  // pinned
  // locked
});

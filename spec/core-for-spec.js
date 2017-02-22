'use strict';

const tmp = require('tmp');
// Mine
const core = require('../lib/core');
const fsX = require('../lib/fsExtra');
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
    quietDoFor({ freeOnly: true }, 'touch', ['freeFile']);
    expect(fsX.fileExistsSync('freeFile')).toBe(true);
    expect(fsX.fileExistsSync('free/freeFile')).toBe(true);
    expect(fsX.fileExistsSync('pinned/freeFile')).toBe(false);
    expect(fsX.fileExistsSync('locked/freeFile')).toBe(false);
  });

  it('for-each', () => {
    quietDoFor({}, 'touch', ['eachFile']);
    expect(fsX.fileExistsSync('eachFile')).toBe(true);
    expect(fsX.fileExistsSync('free/eachFile')).toBe(true);
    expect(fsX.fileExistsSync('pinned/eachFile')).toBe(true);
    expect(fsX.fileExistsSync('locked/eachFile')).toBe(true);
  });
});

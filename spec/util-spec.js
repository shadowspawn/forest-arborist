'use strict';

const path = require('path');
const tmp = require('tmp');
// Mine
const util = require('../lib/util');
//
const cc = require('./core-common');


describe('util:', () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    cc.makeOneOfEachGitRepo();
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  it('normalizeToPosix', () => {
    // On win32 turn a\\b into a/b
    const nativePath = path.join('a', 'b', 'c');
    expect(util.normalizeToPosix(nativePath)).toEqual('a/b/c');

    // Produce a single identity form for path.
    expect(util.normalizeToPosix('')).toEqual('.');
    expect(util.normalizeToPosix()).toEqual('.');
  });
});

'use strict';

const tmp = require('tmp');
// Mine
// const core = require('../lib/core');
// const fsX = require('../lib/fsExtra');
// const util = require('../lib/util');
// //
const cc = require('./core-common');


// function quietDoFor(internalOptions, cmd, args) {
//   // Classic use of mute, suppress output from (our own) module that does not support it!
//   const unmute = util.recursiveMute();
//   try {
//     core.doForEach(internalOptions, cmd, args);
//     unmute();
//   } catch (err) {
//     unmute();
//     throw err;
//   }
// }


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


  it('nested', () => {
    console.log(`nested root is ${suite.nestedRootDir}`);
  });

  it('sibling', () => {
    console.log(`sibling root is ${suite.siblingRootDir}`);
  });
});

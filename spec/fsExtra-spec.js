'use strict';

const tmp = require('tmp');
// Mine
const fsX = require('../src/fsExtra');


describe('fsX (fsExtra):', () => {
  it('dirExistsSync', () => {
    // Do this one by hand rather than create and delete and worry about timing.
    expect(fsX.dirExistsSync('dir-which-do-not-expect-to-exist')).toBe(false);

    const tempFolder = tmp.dirSync();
    expect(fsX.dirExistsSync(tempFolder.name)).toBe(true);

    const tempFile = tmp.fileSync();
    expect(fsX.dirExistsSync(tempFile.name)).toBe(false);
  });

  it('fileExistsSync', () => {
    // Do this one by hand rather than create and delete and worry about timing.
    expect(fsX.fileExistsSync('file-which-do-not-expect-to-exist')).toBe(false);

    const tempFolder = tmp.dirSync();
    expect(fsX.fileExistsSync(tempFolder.name)).toBe(false);

    const tempFile = tmp.fileSync();
    expect(fsX.fileExistsSync(tempFile.name)).toBe(true);
  });
});

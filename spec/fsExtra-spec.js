/* eslint-env jasmine */

const fsX = require('../lib/fsExtra');
const os = require('os');
const fs = require('fs');
const path = require('path');


describe('fsh (fs extras):', () => {
  it('dirExistsSync', () => {
    const tempFolder1 = fs.mkdtempSync(os.tmpdir() + path.sep);
    const tempFile1 = path.resolve(tempFolder1, 'delete.me');
    fs.writeFileSync(tempFile1, 'Hello, world');
    expect(fsX.dirExistsSync(tempFile1)).toBe(false);
    expect(fsX.dirExistsSync(tempFolder1)).toBe(true);
    fs.unlinkSync(tempFile1);
    fs.rmdirSync(tempFolder1);
    expect(fsX.dirExistsSync(tempFolder1)).toBe(false);
  });

  it('fileExistsSync', () => {
    const tempFolder2 = fs.mkdtempSync(os.tmpdir() + path.sep);
    const tempFile2 = path.resolve(tempFolder2, 'delete.me');
    fs.writeFileSync(tempFile2, 'Hello, world');
    expect(fsX.fileExistsSync(tempFile2)).toBe(true);
    expect(fsX.fileExistsSync(tempFolder2)).toBe(false);
    fs.unlinkSync(tempFile2);
    expect(fsX.fileExistsSync(tempFile2)).toBe(false);
    fs.rmdirSync(tempFolder2);
  });
});

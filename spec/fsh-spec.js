'use strict'; // eslint-disable-line strict

const os = require('os');
const fsh = require('../lib/fsh');
const fs = require('fs');
const path = require('path');


describe('fsh', () => {
  it('dirExistsSync', () => {
    const tempFolder1 = fs.mkdtempSync(os.tmpdir() + path.sep);
    const tempFile1 = path.resolve(tempFolder1, 'delete.me');
    fs.writeFileSync(tempFile1, 'Hello, world');
    expect(fsh.dirExistsSync(tempFile1)).toBe(false);
    expect(fsh.dirExistsSync(tempFolder1)).toBe(true);
    fs.unlinkSync(tempFile1);
    fs.rmdirSync(tempFolder1);
    expect(fsh.dirExistsSync(tempFolder1)).toBe(false);
  });

  it('fileExistsSync', () => {
    const tempFolder2 = fs.mkdtempSync(os.tmpdir() + path.sep);
    const tempFile2 = path.resolve(tempFolder2, 'delete.me');
    fs.writeFileSync(tempFile2, 'Hello, world');
    expect(fsh.fileExistsSync(tempFile2)).toBe(true);
    expect(fsh.fileExistsSync(tempFolder2)).toBe(false);
    fs.unlinkSync(tempFile2);
    fs.rmdirSync(tempFolder2);
    expect(fsh.fileExistsSync(tempFile2)).toBe(false);
  });
});

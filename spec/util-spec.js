'use strict';

const path = require('path');
// Mine
const util = require('../lib/util');


describe('util:', () => {
  it('normalizeToPosix', () => {
    // On win32 turn a\\b into a/b
    const nativePath = path.join('a', 'b', 'c');
    expect(util.normalizeToPosix(nativePath)).toEqual('a/b/c');

    // Produce a single identity form for path.
    expect(util.normalizeToPosix('')).toEqual('.');
    expect(util.normalizeToPosix()).toEqual('.');
  });
});

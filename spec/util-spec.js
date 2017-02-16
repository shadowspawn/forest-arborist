/* eslint-env jasmine */

const path = require('path');
const util = require('../lib/util');

describe('util:', () => {
  it('normalizeToPosix', () => {
    // On win32 turn a\\b into a/b
    const nativePath = path.join('a', 'b', 'c');
    expect(util.normalizeToPosix(nativePath)).toEqual('a/b/c');

    // Clean up, but main point is turn '' into '.'
    expect(util.normalizeToPosix('')).toEqual('.');
  });
});

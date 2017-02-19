/* eslint-env jasmine */

'use strict';

// Testing the internal routines which do not correspond to command-line fab commands.
// (The 000 in the name is to run the utility functions before the commands.)

// Mine
const core = require('../lib/core');


describe('core:', () => {
  it('manifestPath', () => {
    expect(core.manifestPath({})).toEqual('.fab/manifest.json');
    expect(core.manifestPath({ manifest: 'custom' })).toEqual('.fab/custom_manifest.json');
    expect(core.manifestPath({ mainPath: 'main' })).toEqual('main/.fab/manifest.json');
    expect(core.manifestPath({ mainPath: 'main', manifest: 'custom' })).toEqual('main/.fab/custom_manifest.json');
  });
});

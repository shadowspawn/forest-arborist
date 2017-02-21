'use strict';

// Testing the internal routines which do not correspond to command-line fab commands.
// (The 000 in the name is to run the utility functions before the commands.)

// Mine
const core = require('../lib/core');

// Suppress lint error for importing devDependencies.
/* eslint import/no-extraneous-dependencies:
  ["error", {"devDependencies": true, "optionalDependencies": false, "peerDependencies": false}] */
const JasmineConsoleReporter = require('jasmine-console-reporter');


describe('core:', () => {
  it('manifestPath', () => {
    expect(core.manifestPath({})).toEqual('.fab/manifest.json');
    expect(core.manifestPath({ manifest: 'custom' })).toEqual('.fab/custom_manifest.json');
    expect(core.manifestPath({ mainPath: 'main' })).toEqual('main/.fab/manifest.json');
    expect(core.manifestPath({ mainPath: 'main', manifest: 'custom' })).toEqual('main/.fab/custom_manifest.json');
  });
});


// Try having more verbose and prettier output for running tests...
const myReporter = new JasmineConsoleReporter({
  colors: 1,           // (0|false)|(1|true)|2
  cleanStack: 1,       // (0|false)|(1|true)|2|3
  verbosity: 4,        // (0|false)|1|2|(3|true)|4
  listStyle: 'indent', // "flat"|"indent"
  activity: true,
});

jasmine.getEnv().addReporter(myReporter);

'use strict';

// collect together some common utility routines used across modules.

// Using colours in output is a bit opinionated, and can backfire if clashes
// with terminal colouring. May give up as more trouble than worth, or make
// an option.

const chalk = require('chalk');
const path = require('path');


module.exports = {


  terminate(message) {
    console.log(this.errorColour(`Error: ${message}`));
    process.exit(1);
  },


  errorColour(text) {
    return chalk.red(text);
  },


  commandColour(text) {
    // Started with blue but works poorly in Windows PowerShell with white text on blue background.
    return chalk.magenta(text);
  },


  normalizeToPosix(relPathParam) {
    let relPath = relPathParam;
    if (relPath === undefined) {
      relPath = '.';
    }

    // On win32 turn a\\b into a/b
    if (process.platform === 'win32') {
      relPath = relPathParam.replace(/\\/g, '/');
    }

    // Clean up, including turn '' into '.'
    return path.posix.normalize(relPath);
  },


};

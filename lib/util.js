'use strict';

// collect together some common utility routines used across modules.

// Using colours in output is a bit opinionated, and can backfire if clashes
// with terminal colouring. May give up as more trouble than worth, or make
// an option.

const chalk = require('chalk');
const mute = require('mute');
const path = require('path');
const fs = require('fs');

let muteDepth = 0;


const util = {
  suppressTerminateExceptionMessage: 'suppressMessageFromTerminate',


  terminate(message) {
    console.log(module.exports.errorColour(`Error: ${message}`));
    // Using throw rather than terminate so that we can catch in unit tests
    throw new Error(util.suppressTerminateExceptionMessage);
    // process.exit(1);
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


  isRelativePath(pathname) {
    if (pathname === null || pathname === undefined) { return false; }

    return pathname.startsWith('./') || pathname.startsWith('../');
  },


  readJson(targetPath, requiredProperties) {
    let data;
    try {
      data = fs.readFileSync(targetPath);
    } catch (err) {
      util.terminate(`problem opening ${targetPath}\n${err}`);
    }

    let rootObject;
    try {
      rootObject = JSON.parse(data);
    } catch (err) {
      util.terminate(`problem parsing ${targetPath}\n${err}`);
    }

    // Sanity check. Possible errors due to hand editing, but during development
    // usually unsupported old file formats!
    if (requiredProperties !== undefined) {
      for (let length = requiredProperties.length, index = 0; index < length; index += 1) {
        const required = requiredProperties[index];
        if (!Object.prototype.hasOwnProperty.call(rootObject, required)) {
          util.terminate(`problem parsing: ${targetPath}\nMissing property '${required}'`);
        }
        if (rootObject[required] === undefined) {
          util.terminate(`problem parsing: ${targetPath}\nUndefined value for property '${required}'`);
        }
      }
    }

    return rootObject;
  },


  // This might help with using mute in unit tests to call code which also uses mute.
  recursiveMute() {
    muteDepth += 1;
    if (muteDepth > 1) {
      return (() => {
        muteDepth -= 1;
      });
    }

    return mute();
  },

};


module.exports = util;

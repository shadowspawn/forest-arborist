'use strict';

// collect together some common utility routines used across modules.

// Using colours in output is a bit opinionated, and can backfire if clashes
// with terminal colouring. May give up as more trouble than worth, or make
// an option.

const chalk = require('chalk');
const childProcess = require('child_process');
const fs = require('fs');
const mute = require('mute');
const path = require('path');
const shellQuote = require('shell-quote');


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

    const unmute = mute();
    return (() => {
      muteDepth -= 1;
      unmute();
    });
  },


  isMuteNow() {
    return (muteDepth > 0);
  },


  execCommandSync(commandParam) {
    const command = commandParam;
    if (command.args === undefined) command.args = [];
    let cwdDisplay = `${command.cwd}: `;
    if (command.cwd === undefined || command.cwd === '' || command.cwd === '.') {
      cwdDisplay = '(root): ';
      command.cwd = '.';
    }
    if (command.suppressContext) cwdDisplay = '';

    // Trying hard to get a possibly copy-and-paste command.
    // let quotedArgs = '';
    // if (command.args.length > 0) quotedArgs = `'${command.args.join("' '")}'`;
    let quotedArgs = shellQuote.quote(command.args);
    quotedArgs = quotedArgs.replace(/\n/g, '\\n');
    console.log(util.commandColour(`${cwdDisplay}${command.cmd} ${quotedArgs}`));

    try {
      // Note: this stdio option hooks up child stream to parent so we get live progress.
      let stdio = 'inherit'; // [0, 1, 2]
      if (util.isMuteNow()) stdio = 'ignore';
      childProcess.execFileSync(
          command.cmd, command.args,
          { cwd: command.cwd, stdio }
        );
    } catch (err) {
      // Some commands return non-zero for expected situations
      if (command.allowedShellStatus === undefined || command.allowedShellStatus !== err.status) {
        throw err;
      }
    }
    console.log(''); // blank line after command output
  },


};


module.exports = util;

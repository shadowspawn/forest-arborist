// collect together some common utility routines used across modules.

// Using colours in output is a bit opinionated, and can backfire if clashes
// with terminal colouring. May give up as more trouble than worth, or make
// an option.

const chalk = require("chalk");
import childProcess = require("child_process");
import fs = require("fs");
import fsX = require("fs-extra");
import path = require("path");
import shellQuote = require("shell-quote");

declare var JEST_RUNNING: boolean | undefined; // Set via jest options in package.json
export const suppressTerminateExceptionMessage = "suppressMessageFromTerminate";
export var platform: string = process.platform; // Mutable platform to allow cross-platform testing.


// Exported for tests, not expecting to be called otherwise.
export function applyColourOverrides() {
  // Windows shell colours are so problematic that disable, unless user using Chalk override.
  // https://www.npmjs.com/package/chalk#chalksupportscolor
  if ((exports.platform === "win32") && (process.env["FORCE_COLOR"] === undefined)) {
    chalk.enabled = false;
  }

  // Support turning colours off using a suggested standard.
  // http://http://no-color.org
  if (process.env["NO_COLOR"] !== undefined) {
    chalk.enabled = false;
  }
}
applyColourOverrides();


export function terminate(message: string): never {
  console.error(exports.errorColour(`Error: ${message}`));
  // Using throw rather than terminate so that we can catch in unit tests
  throw new Error(suppressTerminateExceptionMessage);
  // process.exit(1);
}


export function errorColour(text: string) {
  return chalk.red(text);
}


export function commandColour(text: string) {
  return chalk.magenta(text);
}


export function normalizeToPosix(relPathParam?: string) {
  let relPath = relPathParam;
  if (relPath === undefined) {
    relPath = ".";
  }

  // On win32 turn a\\b into a/b
  if (exports.platform === "win32") {
    relPath = relPath.replace(/\\/g, "/");
  }

  // Clean up, including turn "" into "."
  return path.posix.normalize(relPath);
}


export function isRelativePath(pathname: string) {
  if (pathname === null || pathname === undefined) { return false; }

  // (string.startsWith only available from ES6)
  return pathname.indexOf("./") === 0 || pathname.indexOf("../") === 0;
}


export function readJson(targetPath: string, requiredProperties: string[]) {
  let rootObject = fsX.readJsonSync(targetPath);

  // Sanity check. Possible errors due to hand editing, but during development
  // usually unsupported old file formats!
  if (requiredProperties !== undefined) {
    for (let length = requiredProperties.length, index = 0; index < length; index += 1) {
      const required = requiredProperties[index];
      if (!Object.prototype.hasOwnProperty.call(rootObject, required)) {
        terminate(`problem parsing: ${targetPath}\nMissing property '${required}'`);
      }
      // Not sure if this can happen, but paranoia.
      if (rootObject[required] === undefined) {
        terminate(`problem parsing: ${targetPath}\nUndefined value for property '${required}'`);
      }
    }
  }

  return rootObject;
}


export interface ExecCommandSyncOptions {
  cmd: string;
  args?: string[];
  cwd?: string;
  allowedShellStatus?: number;
  suppressContext?: boolean;
}


export function execCommandSync(commandParam: ExecCommandSyncOptions) {
  const command = commandParam;
  if (command.args === undefined) command.args = [];
  let cwdDisplay = `${command.cwd}: `;
  if (command.cwd === undefined || command.cwd === "" || command.cwd === ".") {
    cwdDisplay = "(root): ";
    command.cwd = ".";
  }
  if (command.suppressContext) cwdDisplay = "";

  // Trying hard to get a possibly copy-and-paste command.
  // let quotedArgs = "";
  // if (command.args.length > 0) quotedArgs = `'${command.args.join("' '")}'`;
  let quotedArgs = shellQuote.quote(command.args);
  quotedArgs = quotedArgs.replace(/\n/g, "\\n");
  console.log(commandColour(`${cwdDisplay}${command.cmd} ${quotedArgs}`));

  try {
    // Note: this stdio option hooks up child stream to parent so we get live progress.
    let stdio = "inherit";
    // Using inherit mucks up jest --silent, so use default pipe
    if (typeof JEST_RUNNING !== "undefined" && JEST_RUNNING) stdio = "pipe";
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
  console.log(""); // blank line after command output
}


export function fileExistsSync(filePath: fs.PathLike) {
  // (Provided for symmetry with dirExistsSync, but could just use fs.existsSync.)
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}


export function dirExistsSync(filePath: fs.PathLike) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

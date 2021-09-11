// collect together some common utility routines used across modules.

// Using colours in output is a bit opinionated, and can backfire if clashes
// with terminal colouring. May give up as more trouble than worth, or make
// an option.

import chalk = require('chalk'); // this import style required for chalk 3
import * as childProcess from "child_process";
import * as fsX from "fs-extra";
import * as path from "path";
import * as shellQuote from "shell-quote";

declare let JEST_RUNNING: boolean | undefined; // Set via jest options in package.json
export const suppressTerminateExceptionMessage = "suppressMessageFromTerminate";


// Mutable platform to allow cross-platform testing, where needed.
let gPlatform: string = process.platform;
export function setPlatformForTest(platformParam: string): void {
  gPlatform = platformParam;
}


// Exported for tests, no need to call otherwise.
export function shouldDisableColour(platform: string = gPlatform): boolean {
  let shouldDisable = false;

  if ("NO_COLOR" in process.env) {
    // http://http://no-color.org
    shouldDisable = true;
  } else if ("FORCE_COLOR" in process.env) {
    // Leave it up to Chalk
    // https://www.npmjs.com/package/chalk#chalksupportscolor
    shouldDisable = false;
  } else if (platform === "win32") {
    // Windows shell colours are so problematic that disable.
    shouldDisable = true;
  }
  return shouldDisable;
}


export function errorColour(text: string): string {
  return chalk.red(text);
}


export function commandColour(text: string): string {
  return chalk.magenta(text);
}


export function terminate(message?: string): never {
  if (message !== undefined)
    console.error(errorColour(`Error: ${message}`));
  // Using throw rather than terminate so that we can catch in unit tests
  throw new Error(suppressTerminateExceptionMessage);
  // Set the error code in cli so no side-affects for other clients.
  //process.exit(1);
}


export function normalizeToPosix(relPathParam?: string): string {
  let relPath = relPathParam;
  if (relPath === undefined) {
    relPath = ".";
  }

  // On win32 turn a\\b into a/b
  if (gPlatform === "win32") {
    relPath = relPath.replace(/\\/g, "/");
  }

  // Clean up, including turn "" into "."
  return path.posix.normalize(relPath);
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function readJson(targetPath: string, requiredProperties?: string[]): any {
  const rootObject = fsX.readJsonSync(targetPath);

  // Sanity check. Possible errors due to hand editing, but during development
  // usually unsupported old file formats!
  if (requiredProperties !== undefined) {
    for (let length = requiredProperties.length, index = 0; index < length; index += 1) {
      const required = requiredProperties[index];
      if (!Object.prototype.hasOwnProperty.call(rootObject, required)) {
        terminate(`problem parsing: ${targetPath}\nMissing property '${required}'`);
      }
    }
  }

  return rootObject;
}


export interface ExecCommandSyncOptions {
  cwd?: string;
  suppressContext?: boolean;
}


export function execCommandSync(cmd: string, args?: string[],  optionsParam?: ExecCommandSyncOptions): void {
  const options = Object.assign({ }, optionsParam);
  let cwdDisplay = `${options.cwd}: `;
  if (options.cwd === undefined || options.cwd === "" || options.cwd === ".") {
    cwdDisplay = "(root): ";
    options.cwd = ".";
  }
  if (options.suppressContext)
    cwdDisplay = "";

  // Trying hard to get a possibly copy-and-paste command.
  let quotedArgs = "";
  if (args !== undefined) {
    quotedArgs = shellQuote.quote(args);
    quotedArgs = quotedArgs.replace(/\n/g, "\\n");
  }
  console.log(commandColour(`${cwdDisplay}${cmd} ${quotedArgs}`));

  // Note: this stdio option hooks up child stream to parent so we get live progress.
  let stdio: childProcess.StdioOptions = "inherit";
  // `jest --silent` does not suppress "inherit", so use default "pipe".
  if (typeof JEST_RUNNING !== "undefined" && JEST_RUNNING)
    stdio = "pipe";
  childProcess.execFileSync(
    cmd, args,
    { cwd: options.cwd, stdio }
  );

  console.log(""); // blank line after command output
}


export function restoreEnvVar(key: string, restoreValue?: string): void {
  if (restoreValue === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = restoreValue;
  }
}


// Narrow type particularly for string|undefined to let TypeScript see we checked
export function getStringOrThrow(str: string | undefined, message?: string): string {
  if (typeof str === "string")
    return str;
  throw message || "Expecting string";
}




// Initialisation

/* istanbul ignore next  */
if (shouldDisableColour()) {
  chalk.level = 0;
}

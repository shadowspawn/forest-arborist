// Test publish should produce functional command.

import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as sandpit from "./sandpit";
import * as util from "../src/util";

function execCommandSync(cmd: string, args?: string[]) {
  util.execCommandSync(cmd, args, { suppressContext:true });
}


execCommandSync("npm", ["unlink"]);

execCommandSync("npm", ["pack"]);
const files = fs.readdirSync(".");
const tarball = files.filter((filename) => {
  return (filename.startsWith("shadowspawn-forest-arborist"));
})[0];
execCommandSync("npm", ["install", "--global", tarball]);

let failed = false;
const startDir = process.cwd();
const tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
process.chdir(tempFolder.name);
try {
  sandpit.makePlayground(".");

  // Perform smoketest
  execCommandSync("fab", ["--version"]);
  execCommandSync("fab", ["clone", path.join("remotes", "git", "main.git")]);

} catch(reason) {
  console.log(util.errorColour("\nSomething went wrong, tidying up..."));
  failed = true;
}
process.chdir(startDir);
tempFolder.removeCallback();

execCommandSync("npm", ["uninstall", "--global", tarball]);
fs.unlinkSync(tarball);
execCommandSync("npm", ["link"]);

if (failed) {
  console.log(util.errorColour("Smoketest failed, see above."));
} else {
  console.log(util.errorColour("Smoketest passed."));
}

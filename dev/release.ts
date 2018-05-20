import * as childProcess from "child_process";
import * as fsX from "fs-extra";
import * as readline from "readline";
// Mine
import * as util from "../src/util";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


// Using execCommandSync to get echo and familiar colouring for commands.


function exitWithMessage(message: string) {
  console.log(util.errorColour(`Stopping: ${message}`));
  process.exit(1);
}


function execCommandSync(cmd: string, args?: string[]) {
  util.execCommandSync(cmd, args, { suppressContext:true });
}


async function readLineAsync(message: string) {
  return new Promise<string>((resolve, reject) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
}


async function main() {
  console.log("Checking sandpit clean");
  try {
    childProcess.execFileSync("git", ["diff-index", "--quiet", "HEAD"]);
    childProcess.execFileSync("git", ["diff-index", "--cached", "--quiet", "HEAD"]);
  } catch(err) {
    execCommandSync("git", ["status"]);
    exitWithMessage("sandpit not clean");
  }

  console.log("\nChecking for local commits");
  try {
    childProcess.execFileSync("git", ["diff-tree", "--quiet", "HEAD", "@{upstream}"]);
  } catch(err) {
    execCommandSync("git", ["status"]);
    exitWithMessage("local commits pending. Push first and let CI tests run for full safety.");
  }

  console.log("\nCopy up");
  execCommandSync("git", ["checkout", "master"]);
  execCommandSync("git", ["merge", "--ff-only", "develop"]);

  console.log("\nClean build");
  fsX.removeSync("dist");
  execCommandSync("npx", ["tsc"]);

  console.log("\nTests");
  // Calling scripts rather than running directly.
  execCommandSync("npm", ["run", "--silent", "test", "--", "--no-verbose"]);
  execCommandSync("npm", ["run", "--silent", "lint"]);
  // npm-publish-dry-run goes here...

  console.log("\nnpm version");
  console.log("Version can be explicit like 1.0, or bump using major | minor | path");
  console.log("(leave blank to skip version change)";
  const newVersion = await readLineAsync("Version for release: ");
  if (newVersion.length > 0) {
    execCommandSync("npm", ["version", newVersion]);
  } else {
    console.log("Skipping version bump");
  }

  console.log("\nnpm publish");
  const otp = await readLineAsync("One Time Password for publish: ");
  if (otp.length > 0) {
    execCommandSync("npm", ["publish", "--opt", otp]);
    execCommandSync("git", ["push", "--follow-tags"]);
  } else {
    console.log("Skipping publish");
  }

  console.log("Copy down for next version");
  execCommandSync("git", ["checkout", "develop"]);
  execCommandSync("git", ["merge", "master"]);
  execCommandSync("npm", ["version", "-no-git-tag-version", "prepatch"]);
}


main().then(() => {
  rl.close();
  console.log("Done!");
}).catch((reason) => {
  rl.close();
  console.log("Failed!");
});


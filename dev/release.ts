import * as childProcess from "child_process";
import * as fsX from "fs-extra";
import * as process from "process";
import * as readline from "readline";
// Mine
import * as util from "../src/util";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Using execCommandSync to get echo and familiar colouring for commands.

function exitWithMessage(message: string) {
  console.log(util.errorColour(`Stopping: ${message}`));
  process.exit(1);
}

function execCommandSync(cmd: string, args?: string[]) {
  util.execCommandSync(cmd, args, { suppressContext: true });
}

async function readLineAsync(message: string) {
  return new Promise<string>((resolve) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log("Checking sandpit clean");
  try {
    childProcess.execFileSync("git", ["diff-index", "--quiet", "HEAD"]);
    childProcess.execFileSync("git", [
      "diff-index",
      "--cached",
      "--quiet",
      "HEAD",
    ]);
  } catch (_err) {
    execCommandSync("git", ["status"]);
    exitWithMessage("sandpit not clean");
  }

  console.log("\nChecking for local commits");
  try {
    childProcess.execFileSync("git", [
      "diff-tree",
      "--quiet",
      "HEAD",
      "@{upstream}",
    ]);
  } catch (_err) {
    execCommandSync("git", ["status"]);
    exitWithMessage(
      "local commits pending. Push first and let CI tests run for full safety.",
    );
  }

  console.log("\nCopy up");
  execCommandSync("git", ["checkout", "main"]);
  execCommandSync("git", ["merge", "--ff-only", "develop"]);

  console.log("\nClean build");
  fsX.removeSync("dist");
  execCommandSync("npx", ["tsc"]);

  console.log("\nTests");
  // Calling scripts rather than running directly.
  execCommandSync("npm", ["run", "--silent", "test", "--", "--no-verbose"]);
  execCommandSync("npm", ["run", "--silent", "check"]);
  // npm-publish-dry-run goes here...

  console.log("\nnpm version");
  console.log(
    "Bump version using major | minor | patch, or specify explicitly like 1.0",
  );
  console.log("(leave blank to skip version change)");
  const newVersion = await readLineAsync("Version for release: ");
  if (newVersion.length > 0) {
    execCommandSync("npm", ["version", newVersion]);
  } else {
    console.log("Skipping version bump");
  }

  // In theory we should publish npm-shrinkwrap.json for a reproducible production install of a cli application,
  // but it is bit messy to do these days, and perhaps out of favour as applications have become more likely to be installed locally.
  // shrinkwrap just renames the package-lock to npm-shrinkwrap and so need to do work to get down to production dependencies.
  // I tried putting the following in prepack script, but didn't like it in practice and does not work for install from git.
  // KISS and leave out shrinkwrap until proven needed!
  //
  // # prepack
  // # Clean install of production modules using package-lock.json
  // rm -rf node_modules
  // rm -f npm-shrinkwrap.json
  // npm install --production
  // # Build shrinkwrap from production modules
  // rm -f package-lock.json
  // npm shrinkwrap

  console.log("\nnpm publish");
  const otp = await readLineAsync("One Time Password for npm publish: ");
  if (otp.length > 0) {
    execCommandSync("npm", ["publish", ".", "--otp", otp]);
    execCommandSync("git", ["push", "--follow-tags"]);
  } else {
    console.log("Skipping publish");
  }

  // # postpack, if fixing up from prepack above
  // rm npm-shrinkwrap.json
  // git checkout -- package-lock.json
  // # Skip the scripts as don't need to run tsc again (via prepare script).
  // npm install --ignore-scripts

  console.log("Copy down for next version");
  execCommandSync("git", ["checkout", "develop"]);
  execCommandSync("git", ["merge", "main"]);
  execCommandSync("npm", ["version", "-no-git-tag-version", "prepatch"]);
}

main()
  .then(() => {
    rl.close();
  })
  .catch(() => {
    rl.close();
    console.log(
      util.errorColour("Something went wrong, going back to develop branch."),
    );
    execCommandSync("git", ["checkout", "develop"]);
    console.log(
      util.errorColour("Something went wrong, back on develop branch."),
    );
  });

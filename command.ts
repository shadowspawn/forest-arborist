#!/usr/bin/env node
// Node location may vary between Mac and Lin, so env for portability.

// Do we still need strict? Was needed for an older node, and eslint thinks not needed.
/* eslint strict: [0, "global"] */

"use strict";

// Naming used in this file: the repo/directory containing the manifest file is the main repo/.

import childProcess = require("child_process");
import fs = require("fs");
import program = require("commander");
// Mine
const myPackage = (require.main !== undefined ? require.main.require("../package.json") : undefined);
import completion = require("./src/completion");
import core = require("./src/core");
import coreBranch = require("./src/core-branch");
import coreClone = require("./src/core-clone");
import coreFor = require("./src/core-for");
import coreInit = require("./src/core-init");
import coreSnapshot = require("./src/core-snapshot");
import repo = require("./src/repo");
import util = require("./src/util");


function doStatus() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.repoType === "git") {
      util.execCommandSync(
        { cmd: "git", args: ["status", "--short"], cwd: repoPath }
      );
    } else if (entry.repoType === "hg") {
      util.execCommandSync(
        { cmd: "hg", args: ["status"], cwd: repoPath }
      );
    }
  });
  process.chdir(startDir);
}


function hgAutoMerge(repoPath: string) {
  // Battle tested code from hgh tool
  const headCount = childProcess.execFileSync(
    "hg", ["heads", ".", "--repository", repoPath, "--template", "x"]
  ).length;
  if (headCount === 0) {
    // Brand new repo, nothing to do
  } else if (headCount === 1) {
    // We just did a pull, so looking for an update.
    const tipNode = childProcess.execFileSync(
      "hg", ["tip", "--repository", repoPath, "--template", "{node}"]
    );
    const parentNode = childProcess.execFileSync(
      "hg", ["parents", "--repository", repoPath, "--template", "{node}"]
    );
    if (tipNode !== parentNode) {
      util.execCommandSync(
        { cmd: "hg", args: ["update"], cwd: repoPath }
      );
    }
  } else {
    try {
      util.execCommandSync(
        { cmd: "hg", args: ["merge", "--tool", "internal:merge"], cwd: repoPath }
      );
      util.execCommandSync(
        { cmd: "hg", args: ["commit", "--message", "Merge"], cwd: repoPath }
      );
    } catch (err) {
      if (err.status === 1) {
        console.log(util.errorColour("NB: unresolved conflicts"));
        console.log("");
      } else {
        throw err;
      }
    }
  }
}


function doPull() {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const forestRepos = core.readManifest(
    { fromRoot: true, addMainToDependencies: true }
  ).dependencies;

  Object.keys(forestRepos).forEach((repoPath) => {
    const entry = forestRepos[repoPath];
    if (entry.pinRevision !== undefined) {
      console.log(`Skipping pinned repo: ${repoPath}\n`);
    } else if (repo.getBranch(repoPath, entry.repoType) === undefined) {
      console.log(`Skipping repo with detached HEAD: ${repoPath}\n`);
    } else {
      const repoType = entry.repoType;
      if (repoType === "git") {
        util.execCommandSync(
          { cmd: "git", args: ["pull"], cwd: repoPath }
        );
      } else if (repoType === "hg") {
        util.execCommandSync(
          { cmd: "hg", args: ["pull"], cwd: repoPath }
        );
        hgAutoMerge(repoPath);
      }
    }
  });
  process.chdir(startDir);
}


// ------------------------------------------------------------------------------
// Command line processing

program
  .version(myPackage.version)
  .option("--debug", "include debugging information, such as stack dump");

// Extra help
program.on("--help", () => {
  console.log(`
  Files:
     ${core.manifestPath({})} default manifest for forest
     ${core.fabRootFilename} marks root of forest (do not commit to VCS)

  Forest management: clone, init, install
  Utility: status, pull, for-each, for-free
  Branch: make-branch, switch
  Reproducible state: snapshot, recreate, restore

  See https://github.com/JohnRGee/forest-arborist.git for usage overview.
  See also "fab <command> --help" for command options and further help.
  `);
});

program
  .command("clone <source> [destination]")
  .option("-b, --branch <branchname>", "branch to checkout for free repos")
  .option("-m, --manifest <name>", "custom manifest file")
  .description("clone source and install its dependencies")
  .action((source, destination, options) => {
    coreClone.doClone(source, destination, options);
  });

program
  .command("completion")
  .description("generate shell completion script")
  .on("--help", () => {
    console.log(`
  Description:
    Generates shell completion script.
    For trying it out without writing files:
         source < fab completion
    or perhaps
         eval \`fab completion\`

    To install permanently, write to a startup file in
    same way as "npm completion". For interactive assistance:
         npx tabtab install fab --name=fab
    `);
  })
  .action(() => {
    if(process.argv.length === 3) {
      completion.shellCompletion();
    } else {
      completion.complete();
    }
  });

program
  .command("init")
  .option("--root <dir>", "root directory of forest if not current directory")
  .option("-m, --manifest <name>", "custom manifest file")
  .description("add manifest in current directory, and marker file at root of forest")
  .on("--help", () => {
    console.log(`
  Description:
    Use init to create the manifest based on your current sandpit.
    Run from your main repo and it finds the dependent repos.

  Examples:
    For a forest layout with dependent repos nested in the main repo:
         fab init

    For a forest layout with sibling repositories:
         fab init --root ..
    `);
  })
  .action((options) => {
    coreInit.doInit(options);
  });

program
  .command("install")
  .option("-m, --manifest <name>", "custom manifest file")
  .description("clone missing (new) dependent repositories")
  .on("--help", () => {
    console.log(`
  Description:
    Run Install from the main repo.

    Target repos: all missing and pinned repos. Pinned repos will be updated
                  to match the <pinRevision> from the manifest if necessary.
    `);
  })
  .action((options) => {
    coreClone.doInstall(options);
  });

program
  .command("status")
  .description("show concise status for each repo in the forest")
  .action(() => {
    doStatus();
  });

program
  .command("pull")
  .description("git-style pull, which is fetch and merge")
  .on("--help", () => {
    console.log(`
  Target repos: free and branch-locked, excludes repos pinned to a revision.
    `);
  })
  .action(() => {
    doPull();
  });

program
  .command("root")
  .description("show the root directory of the forest")
  .action(() => {
    core.cdRootDirectory();
    console.log(process.cwd());
  });

program
  .command("for-each")
  .alias("forEach")
  .description("run specified command on each repo in the forest, e.g. \"fab for-each -- ls -al\"")
  .arguments("-- <command> [args...]")
  .option("-k, --keepgoing", "ignore intermediate errors and process all the repos")
  .action((command, args, options) => {
    coreFor.doForEach(command, args, options);
  });

program
  .command("for-free")
  .description("run specified command on repos which are not locked or pinned")
  .arguments("-- <command> [args...]")
  .option("-k, --keepgoing", "ignore intermediate errors and process all the repos")
  .action((command, args, options) => {
    options.freeOnly = true; // Sticking in our own option!
    coreFor.doForEach(command, args, options);
  });

program
  .command("switch <branch>")
  .description("switch branch of free repos")
  .action((branch) => {
    coreBranch.doSwitch(branch);
  });

program
  .command("make-branch <branch> [start_point]")
  .option("-p, --publish", "push newly created branch")
  .description("create new branch in free repos")
  .action((branch, startPoint, options) => {
    coreBranch.doMakeBranch(branch, startPoint, options.publish);
  });

program
  .command("snapshot")
  .option("-o, --output <file>", "write snapshot to file rather then stdout")
  .description("display state of forest")
  .action((options) => {
    coreSnapshot.doSnapshot(options);
  });

program
  .command("recreate <snapshot> [destination]")
  .description("clone repos to recreate forest in past state")
  .action((snapshot, destination) => {
    coreSnapshot.doRecreate(snapshot, destination);
  });

program
  .command("restore [snapshot]")
  .description("checkout repos to restore forest in past state")
  .action((snapshot) => {
    coreSnapshot.doRestore(snapshot);
  });

// Hidden command for trying things out
program
  .command("_test", undefined, { noHelp: true })
  .description("Placeholder for internal development code")
  .action(() => {
  });

// Catch-all, unrecognised command.
program
  .command("*", undefined, { noHelp: true })
  .action((command) => {
    // Tempting to try passing through to for-each, but primary
    // focus is management. KISS.
    // Display error in same style commander uses for unrecognised options.
    // Unfortunately * shows up in help!
    console.log("");
    console.log(`  error: unknown command \`${command}"`);
    console.log("");
    process.exitCode = 1;
  });


try {
  program.parse(process.argv);
} catch (err) {
  if (program.opts().debug) {
    console.log(`${err.stack}`);
  }
  // util.terminate(`caught exception with message ${err.message}`);
  if (err.message !== util.suppressTerminateExceptionMessage) {
    console.log(`caught exception with message ${err.message}`);
  }
  // Recommended pactice for node is set exitcode not force exit
  process.exitCode = 1;
}

// Show help if no command specified.
if (process.argv.length === 2) {
  program.help();
}

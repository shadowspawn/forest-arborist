#!/usr/bin/env node
// Node location may vary between Mac and Lin, so env for portability.

// Naming used in this file: the repo/directory containing the manifest file is the main repo/.

import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
// Mine
// Trickery to cope with different relative paths for typescipt and javascript
const myPackage = require("dummy_for_node_modules/../../package.json");
import * as completion from "./completion";
import * as core from "./core";
import * as coreBranch from "./core-branch";
import * as coreClone from "./core-clone";
import * as coreFor from "./core-for";
import * as coreInit from "./core-init";
import * as coreManifest from "./core-manifest";
import * as corePull from "./core-pull";
import * as coreSnapshot from "./core-snapshot";
import * as repo from "./repo";
import * as util from "./util";


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





// Call with program.args which are the unconsumed arguments after parsing.

function assertNoExtraArgs(args: any[]) {
  // commander adds program as last parameter
  if (args.length > 1) {
    util.terminate(`unexpected extra argument: ${args[0]}`);
  }
}


// ------------------------------------------------------------------------------
// Command line processing. Returning new object to allow multiple calls for testing.

export type Command = commander.Command;

export function makeProgram(): Command {
  const program = new commander.Command();

  program
    .version(myPackage.version)
    .option("--debug", "include debugging information, such as stack dump");

  // Extra help
  /* istanbul ignore next  */
  program.on("--help", () => {
    console.log(`
    Files:
      ${core.manifestPath({})} default manifest for forest
      ${core.fabRootFilename} marks root of forest (do not commit to VCS)

    Commands Summary
    Forest management: clone, init, install
    Utility: status, pull, for-each, for-free
    Branch: make-branch, switch
    Reproducible state: snapshot, recreate, restore
    Display: root, main, manifest
    Manifest management: manifest --edit, --list, --add, --delete

    See https://github.com/JohnRGee/forest-arborist.git for usage overview.
    See also "fab <command> --help" for individual command options and further help.
    `);
  });

  program
    .command("clone <source> [destination]")
    .option("-b, --branch <branchname>", "branch to checkout for free repos")
    .option("-m, --manifest <name>", "custom manifest file")
    .description("clone source and install its dependencies")
    .on("--help", () => {
      /* istanbul ignore next  */
      console.log(`
    Description:
      Clones a forest by cloning the main repo into a newly created directory
      and installing its dependencies.

      The optional destination is the name for the newly created root directory.
      For a nested forest the new directory is the main repo, like with
      the git and hg clone commands. For a sibling forest the new directory
      is the root directory for the forest and not a repository itself.
     `);
    })
    .action((source, destination, options) => {
      coreClone.doClone(source, destination, options);
    });

  program
    .command("completion")
    .description("generate shell completion script")
    .on("--help", () => {
      /* istanbul ignore next  */
      console.log(`
    Description:
      Generates shell completion script.

      For trying out shell completion without writing files on Lin:
          source < (fab completion)
      on Mac:
          eval \`$(fab completion)\`

      To install permanently, write to a startup file in
      same way as "npm completion". For interactive assistance:
          npx tabtab install fab --name=fab
      `);
    })
    .action(() => {
      if (process.argv.length === 3) {
        completion.shellCompletion(program);
      } else {
        completion.complete(program);
      }
    });

  program
    .command("init")
    .option("--root <dir>", "root directory of forest if not current directory")
    .option("-m, --manifest <name>", "custom manifest file")
    .description("add manifest in current directory, and marker file at root of forest")
    .on("--help", () => {
      /* istanbul ignore next  */
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
      assertNoExtraArgs(program.args);
      coreInit.doInit(options);
    });

  program
    .command("install")
    .option("-m, --manifest <name>", "custom manifest file")
    .description("clone missing (new) dependent repositories")
    .on("--help", () => {
      /* istanbul ignore next  */
      console.log(`
    Description:
      Run Install from the main repo.

      Target repos: all missing and pinned repos. Pinned repos will be updated
                    to match the <pinRevision> from the manifest if necessary.
      `);
    })
    .action((options) => {
      assertNoExtraArgs(program.args);
      coreClone.doInstall(options);
    });

  program
    .command("status")
    .description("show concise status for each repo in the forest")
    .action(() => {
      assertNoExtraArgs(program.args);
      doStatus();
    });

  program
    .command("pull")
    .description("git-style pull, which is fetch and merge")
    .on("--help", () => {
      /* istanbul ignore next  */
      console.log(`
    Target repos: free and branch-locked, excludes repos pinned to a revision.
      `);
    })
    .action(() => {
      assertNoExtraArgs(program.args);
      corePull.doPull();
    });

  program
    .command("root")
    .description("show the root directory of the forest")
    .action(() => {
      assertNoExtraArgs(program.args);
      core.cdRootDirectory();
      console.log(process.cwd());
    });

  program
    .command("main")
    .description("show the main directory of the forest")
    .action(() => {
      assertNoExtraArgs(program.args);
      core.cdRootDirectory();
      const rootObject = core.readRootFile();
      const mainPath = path.resolve(process.cwd(), rootObject.mainPath);
      console.log(mainPath);
    });

  program
    .command("for-each")
    .alias("forEach") // because javascript has forEach so very familiar
    .description("run specified command on each repo in the forest, e.g. \"fab for-each -- ls -al\"")
    .arguments("-- <command> [args...]")
    .option("-k, --keepgoing", "ignore intermediate errors and process all the repos")
    // .allowUnknownOption() disabled as not convenient way to get unknown options yet
    .action((command, args, options) => {
      coreFor.doForEach(command, args, options);
    });

  program
    .command("for-free")
    .description("run specified command on repos which are not locked or pinned")
    .arguments("-- <command> [args...]")
    .option("-k, --keepgoing", "ignore intermediate errors and process all the repos")
    // .allowUnknownOption() disabled as not convenient way to get unknown options yet
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
      assertNoExtraArgs(program.args);
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
  /* istanbul ignore next  */
  program
    .command("_test", undefined, { noHelp: true })
    .description("Placeholder for internal development code")
    .option("--expected")
    .action(() => {
      console.log(program.args.length);
      });

  program
    .command("manifest")
    .description("manage manifest dependencies")
    .option("-e, --edit", "open manifest in editor")
    .option("-l, --list", "list dependencies from manifest")
    .option("-a, --add [repo-path]", "add entry to manifest dependencies")
    .option("-d, --delete [repo-path]", "delete entry from manifest dependencies")
    .on("--help", () => {
      /* istanbul ignore next  */
      console.log(`
    Description:
      Specify an option to list or make changes to manifest. Can be used from
      anywhere in forest.

      You can optionally specify the repo-path for --add and --delete,
      which otherwise default to the current working directory.

      --edit uses the EDITOR or VISUAL environment variable if specified,
      and falls back to Notepad on Windows and vi on other platforms.

      With no options, show the manifest path.
      `);
    })
    .action((options) => {
      assertNoExtraArgs(program.args);
      coreManifest.doManifest(options);
    });

  // Catch-all, unrecognised command.
  program
    .command("*", undefined, { noHelp: true })
    .action((command) => {
      // Tempting to try passing through to for-each, but primary
      // focus is management. KISS.
      // Display error in same style commander uses for unrecognised options.
      console.log("");
      console.log(`  error: unknown command \`${command}"`);
      console.log("");
      process.exitCode = 1;
    });

    return program;
}


export function fab(args: string[]): void {
  const baseArgs = ["node", "fab"];
  makeProgram().parse(baseArgs.concat(args));
}

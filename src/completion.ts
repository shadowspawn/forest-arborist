// Not doing much type checking here as we are using command internals and
// tabtab does not have up to date typings.

import * as childProcess from "child_process";
import * as commander from "commander";
import * as path from "path";
// Mine
import * as core from "./core";
import * as repo from "./repo";
const tabtab: TabTab = require("tabtab")({ name: "fab", cache: false });

let gProgram: commander.Command; // Clunky way of getting access to current command (was originally using module as global).


interface TabData {
  line: string;
  words: number;
  point: number;
  partial: number;
  last: string;
  lastPartial: string;
  prev: string;
}
interface TabDone { (error: Error | null, completions?: string[]): void; }
interface TabCallback { (data: TabData, done: TabDone): void; }
interface TabTab {
  start(): void;
  on(name: string, callback: TabCallback): void;
}


function wantOptions(lastPartial: string): boolean {
  if (/^--\w?/.test(lastPartial)) {
    return true;
  } else if (/^-\w?/.test(lastPartial)) {
    return true;
  }
  return false;
}


function completeOptions(lastPartial: string, options: any): string[] {
  let completions: string[] = [];
  if (/^--\w?/.test(lastPartial)) {
    completions = options.map((option: any) => {
      return option.long;
    });
  } else if (/^-\w?/.test(lastPartial)) {
    completions = options.map((option: any) => {
      return option.short;
    });
  }
  completions = completions.filter((e) => {
    return (e !== undefined);
  });
  return completions;
}


// First level hander
tabtab.on("fab", function (data, done) {
  // Only offer to complete first word in this callback
  // strip global options to avoid breaking count?
  if (data.words > 1)
    return (done(null, []));

  if (wantOptions(data.lastPartial))
    return done(null, completeOptions(data.lastPartial, gProgram.options));

  done(null, gProgram.commands
    .filter((cmd: any) => {
      return !cmd._noHelp;
    })
    .map((cmd: any) => {
      return cmd._name;
    }));
});


tabtab.on("switch", function (data, done) {
  const startDir = process.cwd();
  core.cdRootDirectory();
  const rootObject = core.readRootFile();

  if (repo.isGitRepository(rootObject.mainPath)) {
    const branches = childProcess.execFileSync(
      "git",
      ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"],
      { cwd: rootObject.mainPath }
    ).toString().trim();
    done(null, branches.split("\n"));
  }

  process.chdir(startDir);
});


export function addCommandOptions(program: commander.Command) {
  program.commands
    .filter((cmd: any) => {
      return !cmd._noHelp && cmd.options.length;
    })
    .map((cmd: any) => {
      tabtab.on(cmd._name, function (data, done) {
        if (wantOptions(data.lastPartial))
          return done(null, completeOptions(data.lastPartial, cmd.options));
      });
    });
}


export function complete(program: commander.Command) {
  gProgram = program;
  addCommandOptions(program);

  // Wish list for smart command help:
  //    clone --branch <tab>
  //    clone --manifest <tab>
  //    init --manifest <tab>
  //    install --manifest <tab>
  //    switch <tab>
  //    make-branch foo <tab>
  // Consider turning on caching if add expensive completions.

  tabtab.start();
}


export function shellCompletion(program: commander.Command) {
  gProgram = program;
  childProcess.execFileSync(
    "npx",
    ["tabtab", "install", "fab", "--stdout", "--name=fab"],
    { cwd: path.join(__dirname, ".."), stdio: "inherit" }
  );
}

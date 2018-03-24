// Not doing much type checking here as we are using command internals and
// tabtab does not have up to date typings.

import childProcess = require("child_process");
import path = require("path");
import program = require("commander");
const tabtab: TabTab = require("tabtab")({ name: "fab", cache: false });
// Mine
const core = require("./core");
import repo = require("./repo");


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
    return done(null, completeOptions(data.lastPartial, program.options));

  done(null, program.commands
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


export function addCommandOptions() {
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


export function complete() {
  addCommandOptions();

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


export function shellCompletion() {
  childProcess.execFileSync(
    "npx",
    ["tabtab", "install", "fab", "--stdout", "--name=fab"],
    { cwd: path.join(__dirname, ".."), stdio: "inherit" }
  );
}

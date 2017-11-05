// Not doing much type checking here as we are using command internals and
// tabtab does not have up to date typings.

import childProcess = require("child_process");
import path = require("path");
import program = require("commander");
const tab = require('tabtab')({ name: "fab", cache: false });


interface TabData {
  line: string;
  words: number;
  point: number;
  partial: number;
  last: string;
  lastPartial: string;
  prev: string;
};

interface TabDone { (error: Error | null, completions?: string[]): void; };


// First level hander
tab.on('fab', function(data: TabData, done: TabDone) {
  // strip --debug to avoid breaking count?
  // console.log(data);
  // return;

  // Only offer to complete first word in this callback
  if (data.words > 1)
    return(done(null, []));

  // Overkill for the options since we only have a few
  let completions: string[] = [];
  if (/^--\w?/.test(data.lastPartial)) {
    completions.push("--help");
    program.options.map((option: any) => {
      completions.push(option.long);
    });
  } else if (/^-\w?/.test(data.lastPartial)) {
    program.options.map((option: any) => {
      completions.push(option.short);
    })
  } else {
    program.commands
      .filter((cmd: any) => {
        return !cmd._noHelp;
      })
      .map((cmd: any) => {
        completions.push(cmd._name);
      });
    }
  // In particular, some options may have undefined short|long forms
  completions = completions.filter((e) => {
    return (e !== undefined);
  });
  done(null, completions);
});


export function complete() {
  tab.start();
};


export function shellCompletion() {
  childProcess. execFileSync(
    "npx",
    ["tabtab", "install", "fab", "--stdout", "--name=fab"],
    { cwd: path.join(__dirname, '..'), stdio: "inherit" }
  );
};

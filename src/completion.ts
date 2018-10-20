// // Not doing much type checking here as we are using command internals and
// // tabtab does not have up to date typings.

import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
// Mine
// import * as repo from "./repo";

export interface CompletionEnv {
  COMP_CWORD: number;
  COMP_LINE: string;
  COMP_POINT: number;
}

const gDebug = (process.env.FAB_COMPLETION_LOG !== undefined);


function trace(param: string | object) {
  if (gDebug) {
      // Reopening for each log (KISS!)
      const stream = fs.createWriteStream(process.env.FAB_COMPLETION_LOG!, { flags: 'a+' });
    if (typeof param === "string") {
      stream.write(`${param}\n`);
    } else if (typeof param === "object") {
      stream.write(`${JSON.stringify(param)}\n`);
    } else {
      stream.write(`Unexpected trace parameter type: ${typeof param}`);
    }
  }
}


export function splitLine(line: string) {
  // TODO: quoted strings
  trace(`Length is ${line.split(" ").length - 1}`);
  return line.split(" ");
}


function parseEnv(): CompletionEnv {
  return {
    COMP_CWORD: Number(process.env.COMP_CWORD!),
    COMP_LINE: process.env.COMP_LINE!,
    COMP_POINT: Number(process.env.COMP_POINT!),
  };
}

function complete(program: commander.Command) {
  const env = parseEnv();
  trace(env);
}


export function completion(program: commander.Command) {
  // Follow description of `npm completion` and output script unless in plumbing mode, performing completion.
  if (process.env.COMP_CWORD === undefined || process.env.COMP_LINE === undefined || process.env.COMP_POINT === undefined) {
    const completionScript = fs.readFileSync(path.join(__dirname, "../../resources/fab_completion.sh"));
    process.stdout.write(completionScript);
  } else {
    complete(program);
  }
}

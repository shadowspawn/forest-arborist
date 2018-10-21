// // Not doing much type checking here as we are using command internals and
// // tabtab does not have up to date typings.

import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
import { Z_PARTIAL_FLUSH } from "zlib";
// Mine
// import * as repo from "./repo";

export interface CompletionEnv {
  COMP_CWORD: number; // index of word with cursor, but index of an array we do not have
  COMP_LINE: string;
  COMP_POINT: number;
  // commandName: string | undefined;
  partial: string; // Word being completed. May be blank.
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
  // To emulate the command line parsing we should parse quoted strings,
  // but simple split covers all our current usage so KISS.
  return line.split(" ");
}


function processEnv(): CompletionEnv {
  const COMP_CWORD = Number(process.env.COMP_CWORD!);
  const COMP_LINE = process.env.COMP_LINE!;
  const COMP_POINT = Number(process.env.COMP_POINT!);

  const args = splitLine(COMP_LINE.substr(0, COMP_POINT));
  const partial = args[args.length - 1];

  return { COMP_CWORD, COMP_LINE, COMP_POINT, partial };
}


function getOptionNames(partial: string, options: any): string[] {
  let optionNames: string[] = [];
  if (/^--\w?/.test(partial)) {
    optionNames = options.map((option: any) => {
      return option.long;
    });
  } else if (/^-\w?/.test(partial)) {
    optionNames = options.map((option: any) => {
      return option.short;
    });
  }
  optionNames = optionNames.filter((e) => {
    return (e !== undefined);
  });

  return optionNames;
}


function getCommandNames(program: commander.Command) {
  return program.commands
    .filter((cmd: any) => {
      return !cmd._noHelp;
    })
    .map((cmd: any) => {
      return cmd._name;
    });
}


function complete(program: commander.Command) {
  const env: CompletionEnv = processEnv();
  trace(env);
  const candidates: string[] = [];

  if (env.partial.startsWith("-")) {
    candidates.push(...getOptionNames(env.partial, program.options));
  } else {
    candidates.push(...getCommandNames(program));
  }

  const matches = candidates.filter((word) => {
    return (env.partial.length === 0) || word.startsWith(env.partial);
  });
  if (matches.length > 0) {
    if (gDebug) trace(`offer: ${matches.join(", ")}`);
    // Make separate console calls to simplify testing.
    matches.forEach((word) => {
      console.log(word);
    });
  }
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

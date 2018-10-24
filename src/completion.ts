import * as childProcess from "child_process";
import * as commander from "commander"; // NB: accessing undocumented commander internals.
import * as fs from "fs";
import * as path from "path";
import * as shellQuote from "shell-quote";
// Mine
import * as core from "./core";
import * as repo from "./repo";
import { quote } from "shell-quote";

export interface CompletionContext {
  readonly compLine: string; // COMP_LINE
  readonly compPoint: number;// COMP_POINT
  readonly partial: string; // Word being completed. May be blank.
  readonly lookingForOption: boolean;
  readonly commandName: string | undefined; // e.g. "git clone f" gives clone
  suggest(...possible: string[]): void;  // logs possible(s), and skips ones that do not match partial
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


function findCommand(commandName: string, program: commander.Command): commander.Command | undefined {
  return program.commands.find((cmd: commander.Command) => {
    return commandName === cmd.name() && !cmd._noHelp;
  });
}


// Use shell-quote to do the heavy lifting for quotes et al. If it wasn't for COMP_POINT, we could just use process.args.
// Incomplete quoted strings in progress are not handled, but that is a weird state to ask for tab completion anyway!

export function splitIntoArgs(line: string) {
  let tokens = shellQuote.parse(line);
  if (line.endsWith(" ")) {
    tokens.push("");
  }
  return tokens;
}

function processEnv(): CompletionContext {
  // Not using COMP_CWORD.
  const compLine = process.env.COMP_LINE!;
  const compPoint = Number(process.env.COMP_POINT!);

  const lineToPoint = compLine.substr(0, compPoint);
  const args = splitIntoArgs(lineToPoint);
  trace(args);
  const partial = args[args.length - 1];

  // Look for command earlier in line.
  // This is a very simplistic approach ignoring:
  // - there may be just arguments and not commands (probably ok)
  // - options could take parameters
  let commandName = args.slice(1, -1).find((word) => {
    return !word.startsWith("-");
  });

  const lookingForOption = partial.startsWith("-") && lineToPoint.indexOf(" -- ") === -1;

  const suggest = (...possible: string[]) => {
    possible.filter((suggestion) => {
      return (partial.length === 0) || suggestion.startsWith(partial);
    }).forEach((suggestion) => {
      if (gDebug) {
        trace(`suggest: ${suggestion}`);
      }
      console.log(suggestion);
    });
  };

  return { compLine, compPoint, partial, commandName, lookingForOption, suggest };
}


function getOptionNames(partial: string, options: any): string[] {
  let optionNames: string[] = [];
  if (partial.startsWith("--")) {
    optionNames = options.map((option: any) => {
      return option.long;
    });
  } else if (partial.startsWith("-")) {
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
  // (Not including aliases, by design.)
  return program.commands
    .filter((cmd: any) => {
      return !cmd._noHelp;
    })
    .map((cmd: commander.Command) => {
      return cmd.name();
    });
}


function complete(program: commander.Command) {
  const context: CompletionContext = processEnv();
  trace(context);

  // Not currently handled:
  // - arguments for options

  // Build event name.
  let completionEvent = "completion:";
  if (context.commandName !== undefined) {
    completionEvent = `${completionEvent}${context.commandName}:`;
  }
  if (context.lookingForOption) {
    completionEvent = `${completionEvent}--`;
  }
  // Look for custom handler.
  if (program.listenerCount(completionEvent) > 0) {
    trace(`emit: ${completionEvent}`);
    program.emit(completionEvent, context);
    return;
  }

  // Handle it ourselves.
  if (context.commandName === undefined) {
    if (context.lookingForOption) {
      context.suggest(...getOptionNames(context.partial, program.options));
    } else {
      context.suggest(...getCommandNames(program));
    }
  } else {
    if (context.lookingForOption) {
      const command = findCommand(context.commandName, program);
      if (command !== undefined) {
        context.suggest(...getOptionNames(context.partial, command.options));
      }
      if (context.partial.startsWith("--")) {
        context.suggest("--help");
      }
    } else {
      // nothing we can suggest for command arguments
    }
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

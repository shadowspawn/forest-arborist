import * as commander from "commander"; // NB: accessing undocumented commander internals.
import * as events from 'events';
import * as fs from "fs";
import * as path from "path";
import * as process from 'process';
import * as shellQuote from "shell-quote";
// Mine
import * as util from "./util";

export interface CompletionContext {
  readonly compLine: string; // COMP_LINE
  readonly compPoint: number;// COMP_POINT
  readonly partial: string; // Word being completed. May be blank.
  readonly lookingForOption: boolean;
  readonly commandName: string | undefined; // e.g. "git clone f" gives clone
  suggest(...possible: string[]): void;  // logs possible(s), and skips ones that do not match partial
}

const gDebug = (process.env.FAB_COMPLETION_LOG !== undefined);


function trace(param: unknown) {
  if (gDebug) {
    // Reopening for each log (KISS!)
    const stream = fs.createWriteStream(util.getStringOrThrow(process.env.FAB_COMPLETION_LOG), { flags: 'a+' });
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
  const visibleCommands = program.createHelp().visibleCommands(program);
  return visibleCommands.find((cmd: commander.Command) => {
    return commandName === cmd.name();
  });
}


// Use shell-quote to do the heavy lifting for quotes et al. If it wasn't for COMP_POINT, we could just use process.args.
// Incomplete quoted strings in progress are not handled, but that is a weird state to ask for tab completion anyway!

export function splitIntoArgs(line: string): string[] {
  const tokens = shellQuote.parse(line);
  if (line.endsWith(" ")) {
    tokens.push("");
  }

  // Parse can return {op} and {comment}, but not going to expand those.
  return tokens.map((arg) => {
    if (typeof arg === "string") {
      return arg;
    } else {
      return JSON.stringify(arg);
    }
  });
}

function processEnv(): CompletionContext {
  // Not using COMP_CWORD.
  const compLine = util.getStringOrThrow(process.env.COMP_LINE, "COMP_LINE");
  const compPoint = Number(util.getStringOrThrow(process.env.COMP_POINT, "COMP_POINT"));

  const lineToPoint = compLine.substr(0, compPoint);
  const args = splitIntoArgs(lineToPoint);
  trace(args);
  const partial = args[args.length - 1];

  // Look for command earlier in line.
  // This is a very simplistic approach ignoring:
  // - there may be just arguments and not commands (probably ok)
  // - options could take parameters
  const commandName = args.slice(1, -1).find((word) => {
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


function getOptionNames(partial: string, options: commander.Option[]): string[] {
  let optionNames: string[] = [];
  if (partial.startsWith("--")) {
    optionNames = options
      .filter((option) => {
        return option.long !== undefined;
      })
      .map((option) => {
        return option.long as string; // lint: excluded undefined in filter
      });
  } else if (partial.startsWith("-")) {
    optionNames = options
      .filter((option) => {
        return option.short !== undefined;
      })
      .map((option) => {
        return option.short as string; // lint: excluded undefined in filter
      });
  }
  optionNames = optionNames.filter((e) => {
    return (e !== undefined);
  });

  return optionNames;
}


function getCommandNames(program: commander.Command) {
  // (Not including aliases, by design.)
  return program.createHelp().visibleCommands(program)
    .map((cmd: commander.Command) => {
      return cmd.name();
    });
}


function complete(program: commander.Command) {
  const context: CompletionContext = processEnv();
  trace(context);

  // Not currently handled specially
  // - arguments to commands
  // - arguments to options

  // Build event name.
  let completionEvent = "completion:";
  if (context.lookingForOption) {
    completionEvent = `${completionEvent}--`;
  }

  // Work out what to suggest.
  if (context.commandName === undefined) {
    const programEventEmitter = program as (commander.Command & events.EventEmitter);
    if (programEventEmitter.listenerCount(completionEvent) > 0) {
      programEventEmitter.emit(completionEvent, context);
    } else if (context.lookingForOption) {
      context.suggest(...getOptionNames(context.partial, program.createHelp().visibleOptions(program)));
    } else {
      context.suggest(...getCommandNames(program));
    }
  } else {
    const command = findCommand(context.commandName, program) as (commander.Command & events.EventEmitter);
    if (command !== undefined && command.listenerCount(completionEvent) > 0) {
      command.emit(completionEvent, context);
    } else if (context.lookingForOption) {
      if (command !== undefined) {
        context.suggest(...getOptionNames(context.partial, command.createHelp().visibleOptions(command)));
      }
    } else {
      // nothing we can suggest for command arguments
    }
  }
}


export function completion(program: commander.Command): void {
  // Follow description of `npm completion` and output script unless in plumbing mode, performing completion.
  if (process.env.COMP_CWORD === undefined || process.env.COMP_LINE === undefined || process.env.COMP_POINT === undefined) {
    const completionScript = fs.readFileSync(path.join(__dirname, "../../resources/fab_completion.sh"));
    process.stdout.write(completionScript);
  } else {
    complete(program);
  }
}

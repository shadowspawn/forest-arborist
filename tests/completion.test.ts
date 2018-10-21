// Test the command line completion

import * as commander from "commander";
// Mine
import * as completion from "../src/completion";


function setEnv(line: string) {
  // Set COMP_POINT using ^ placeholder in line. (cursor point)
  let point = line.indexOf("^");
  if (point >= 0) {
    line = line.substring(0, point) + line.substring(point + 1);
  } else {
    point = line.length;
  }
  process.env.COMP_POINT = point.toString();
  process.env.COMP_LINE = line;
  process.env.COMP_CWORD = (completion.splitLine(line).length - 1).toString();
}


function clearEnv() {
  process.env.COMP_POINT = undefined;
  process.env.COMP_LINE = undefined;
  process.env.COMP_CWORD = undefined;

}


describe("completion", () => {
  let logSpy: jest.SpyInstance;
  let program: commander.Command;

  beforeAll(() => {
    logSpy = jest.spyOn(global.console, 'log');
    logSpy.mockReturnValue(undefined);

    program = new commander.Command();
    program.command("alpha");
    program.command("betaOne");
    program.command("betaTwo");
    program.command("secret", undefined, { noHelp: true });
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  beforeEach(() => {
    logSpy.mockClear();
  });

  test("command: <all>", () => {
    setEnv("fab ");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith("alpha");
    expect(logSpy).toHaveBeenCalledWith("betaOne");
    expect(logSpy).toHaveBeenCalledWith("betaTwo");
  });

  test("command: matching", () => {
    setEnv("fab b");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("betaOne");
    expect(logSpy).toHaveBeenCalledWith("betaTwo");
  });

  test("command: no matches", () => {
    setEnv("fab UNRECOGNISED");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(0);
  });

  test("command: ignoring after cursor", () => {
    setEnv("fab a^lphabet");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("alpha");
  });

  // global options
  // - short
  // - long
  // - command after global option

  // command options
  // - short
  // - long

});

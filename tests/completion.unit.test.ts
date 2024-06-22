// Test the command line completion

import * as commander from "@commander-js/extra-typings";
import * as process from "process";
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
  process.env.COMP_CWORD = (
    completion.splitIntoArgs(line).length - 1
  ).toString();
}

describe("completion", () => {
  let logSpy: jest.SpyInstance;
  let program: commander.Command;

  beforeAll(() => {
    logSpy = jest.spyOn(global.console, "log");
    logSpy.mockReturnValue(undefined);

    program = new commander.Command();
    program.option("-g, --global");
    program.option("--debug");
    program.command("alpha <foo>").option("-s, --short").option("--long");
    program.command("betaOne");
    program.command("betaTwo");
    program.command("secret", { hidden: true });
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  beforeEach(() => {
    logSpy.mockClear();
  });

  test("partial command: <all>", () => {
    setEnv("fab ");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(4);
    expect(logSpy).toHaveBeenCalledWith("alpha");
    expect(logSpy).toHaveBeenCalledWith("betaOne");
    expect(logSpy).toHaveBeenCalledWith("betaTwo");
    expect(logSpy).toHaveBeenCalledWith("help");
  });

  test("partial command: matching", () => {
    setEnv("fab b");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("betaOne");
    expect(logSpy).toHaveBeenCalledWith("betaTwo");
  });

  test("partial command: no matches", () => {
    setEnv("fab UNRECOGNISED");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(0);
  });

  test("partial command: ignoring after cursor", () => {
    setEnv("fab a^lphabet");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("alpha");
  });

  test("global option: short", () => {
    setEnv("fab -");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("-g");
    expect(logSpy).toHaveBeenCalledWith("-h");
  });

  test("global option: long", () => {
    setEnv("fab --");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith("--debug");
    expect(logSpy).toHaveBeenCalledWith("--global");
    expect(logSpy).toHaveBeenCalledWith("--help");
  });

  test("global option: long matching", () => {
    setEnv("fab --gl");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("--global");
  });

  test("global option: after global option", () => {
    setEnv("fab --debug --gl");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("--global");
  });

  test("partial command: after global option", () => {
    setEnv("fab --debug a");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("alpha");
  });

  test("command: argument", () => {
    setEnv("fab alpha ");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(0);
  });

  test("command: short option", () => {
    setEnv("fab alpha -");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith("-s");
    expect(logSpy).toHaveBeenCalledWith("-h"); // bonus item
  });

  test("command: long option", () => {
    setEnv("fab alpha --");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith("--short");
    expect(logSpy).toHaveBeenCalledWith("--long");
    expect(logSpy).toHaveBeenCalledWith("--help"); // bonus item
  });

  test("command: option matching", () => {
    setEnv("fab alpha --lo");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("--long");
  });

  test("command: options disabled", () => {
    setEnv("fab alpha -- --lo");
    completion.completion(program);
    expect(logSpy).toHaveBeenCalledTimes(0);
  });
});

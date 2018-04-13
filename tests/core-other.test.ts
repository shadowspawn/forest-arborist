// Parts of the CLI that are not worth having own file

import fs = require("fs");
import path = require("path");
import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import command = require("../src/command");


describe("core other:", () => {
  const startDir = process.cwd();
  const tempFolder = tmp.dirSync({ unsafeCleanup: true });
  let program: command.Command;

  beforeAll(() => {
    process.chdir(tempFolder.name);
    cc.makeGitForestFlavours();
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
    program = command.makeProgram();
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("root (no forest)", () => {
    expect(() => {
      program.parse(["node", "fab", "root"]);
    }).toThrow();
  });

  test("root (nested)", () => {
    process.chdir("nested");
    const expectedRoot = process.cwd();
    process.chdir("free"); // Make it more interesting
    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "root"]);
    expect(spy).toHaveBeenCalledWith(expectedRoot);
    spy.mockRestore();
  });

  test("root (sibling)", () => {
    process.chdir("sibling");
    const expectedRoot = process.cwd();
    process.chdir("free"); // Make it more interesting
    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "root"]);
    expect(spy).toHaveBeenCalledWith(expectedRoot);
    spy.mockRestore();
  });

  test("main (no forest)", () => {
    expect(() => {
      program.parse(["node", "fab", "main"]);
    }).toThrow();
  });

  test("main (nested)", () => {
    const expectedMain = path.join(process.cwd(), "nested");
    process.chdir(path.join("nested", "free")); // Make it more interesting
    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "main"]);
    expect(spy).toHaveBeenCalledWith(expectedMain);
    spy.mockRestore();
  });

  test("main (sibling)", () => {
    process.chdir("sibling");
    const expectedMain = path.join(process.cwd(), "main");
    process.chdir("free"); // Make it more interesting
    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "main"]);
    expect(spy).toHaveBeenCalledWith(expectedMain);
    spy.mockRestore();
  });

  test("unexpected-command", () => {
    // Unexpected command fails, by setting return status rather than throwing.
    program.parse(["node", "fab", "unexpected-command"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  test("implicit help", () => {
    // Does not fail as such.
    program.parse(["node", "fab"]);
    expect(process.exitCode).toBe(0);
  });

});

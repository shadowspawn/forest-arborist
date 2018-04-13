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
    // Move to xx and add sibling too for easy variation setup, ex branches and source. Lighter than suite.
    fs.mkdirSync("nested");
    process.chdir("nested");
    cc.makeNestedGitForest();
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
    process.chdir(path.join("nested", "free"));
    // ToDo: test output
    program.parse(["node", "fab", "root"]);
  });

  // ToDo: root sibling

  test("main (no forest)", () => {
    expect(() => {
      program.parse(["node", "fab", "main"]);
    }).toThrow();
  });

  // ToDo: main nested

  // ToDo: main sibling

});

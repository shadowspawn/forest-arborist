// Partly a placeholder,  developing patterns for testing command (i.e. proxy for CLI)

import tmp = require("tmp");
// Mine
import command = require("../src/command");


describe("cli proxy:", () => {
  const startDir = process.cwd();
  let program: command.Command;

  beforeAll(() => {
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
      // process.chdir(tempFolder.name);
      program = command.makeProgram();
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("root", () => {
    const tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    expect(() => {
      program.root();
    }).toThrow();
  });

});

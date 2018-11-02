// See also system.test.ts for other init tests.

import * as childProcess from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
// Mine
import * as command from "../src/command";
import * as core from "../src/core";
import * as util from "../src/util";


describe("core init", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  test("no repo", () => {
    expect(() => {
      command.fab(["init", "--nested"]);
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  test("empty git repo", () => {
    // Check we don"t fall over in empty repo
    childProcess.execFileSync("git", ["init"]);

    command.fab(["init", "--nested"]);
    expect(fs.existsSync(core.fabRootFilename)).toBe(true);
    expect(fs.existsSync(core.manifestPath({}))).toBe(true);
    // Not too worried about root and manifest contents!
  });

  test("--manifest", () => {
    // Check manifest self consistent
    childProcess.execFileSync("git", ["init"]);

    const manifest = "custom";
    command.fab(["init", "--nested", "--manifest", manifest]);
    expect(fs.existsSync(core.fabRootFilename)).toBe(true);
    expect(fs.existsSync(core.manifestPath({ manifest }))).toBe(true);

    const rootObject = core.readRootFile();
    expect(rootObject.seedPath).toEqual(".");
    expect(rootObject.manifest).toEqual(manifest);
  });

  test("re-init should fail", () => {
    childProcess.execFileSync("git", ["init"]);

    command.fab(["init", "--nested"]);
    expect(() => {
      command.fab(["init", "--nested"]);
    }).toThrow(util.suppressTerminateExceptionMessage);
  });

});

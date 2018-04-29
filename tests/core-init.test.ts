// See also system.test.ts for other init tests.

import * as childProcess from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
// Mine
import * as cc from "./core-common";
import * as command from "../src/command";
import * as core from "../src/core";
// import * as coreInit from "../src/core-init";
import * as dvcsUrl from "../src/dvcs-url";
import * as repo from "../src/repo";
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
      command.fab(["init"]);
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  test("empty git repo", () => {
    // Check we don"t fall over in empty repo
    childProcess.execFileSync("git", ["init"]);
    expect(fs.existsSync(".git")).toBe(true);

    command.fab(["init"]);
    expect(fs.existsSync(core.fabRootFilename)).toBe(true);
    expect(fs.existsSync(core.manifestPath({}))).toBe(true);
    // Not too worried about root and manifest contents!
  });

  test("--manifest", () => {
    // Check manifest self consistent
    childProcess.execFileSync("git", ["init"]);
    expect(fs.existsSync(".git")).toBe(true);

    const manifest = "custom";
    command.fab(["init", "--manifest", manifest]);
    expect(fs.existsSync(core.fabRootFilename)).toBe(true);
    expect(fs.existsSync(core.manifestPath({ manifest }))).toBe(true);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toEqual(manifest);
  });


  // Uncovered:
  // - hg

});

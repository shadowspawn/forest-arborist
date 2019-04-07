// See also repo.int.unit.ts for unit tests.

import * as childProcess from "child_process";
import * as fs from "fs";
import * as tmp from "tmp";
// Mine
import * as repo from "../src/repo";
import * as util from "../src/util";
import * as cc from "./core-common";


describe("repo", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.DirResult;
  const testOrigin = "git@ex.com:path/to/main.git";

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    process.chdir(tempFolder.name);

    fs.mkdirSync("notRepo");
    childProcess.execFileSync("git", ["init", "emptyGitRepo"]);
    childProcess.execFileSync("hg", ["init", "emptyHgRepo"]);
    cc.makeOneGitRepo("hasOrigin", testOrigin);
    cc.makeOneGitRepo("detached", testOrigin);
    cc.commitAndDetach("detached");
  });

  afterAll(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("isGitRepository", () => {
    expect(repo.isGitRepository("notRepo")).toBe(false);
    expect(repo.isGitRepository("doesNotExist")).toBe(false);
    expect(repo.isGitRepository("emptyGitRepo")).toBe(true);
    expect(repo.isGitRepository("emptyHgRepo")).toBe(false);
  });

  test("isHgRepository", () => {
    expect(repo.isHgRepository("notRepo")).toBe(false);
    expect(repo.isGitRepository("doesNotExist")).toBe(false);
    expect(repo.isHgRepository("emptyGitRepo")).toBe(false);
    expect(repo.isHgRepository("emptyHgRepo")).toBe(true);
  });

  test("getOrigin", () => {
    expect(() => {
      repo.getOrigin("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    expect(() => {
      repo.getOrigin("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    // We have local only repos, so no origin.
    expect(repo.getOrigin("emptyGitRepo", "git")).toBeUndefined();
    expect(repo.getOrigin("emptyHgRepo", "hg")).toBeUndefined();

    expect(repo.getOrigin("hasOrigin", "git")).toBe(testOrigin);
  });

  test("getBranch", () => {
    expect(() => {
      repo.getBranch("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    expect(() => {
      repo.getBranch("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    expect(repo.getBranch("emptyGitRepo", "git")).toBe("master");
    expect(repo.getBranch("detached", "git")).toBeUndefined();
    expect(repo.getBranch("emptyHgRepo", "hg")).toBe("default");
  });

  test("getRevision", () => {
    // Basic checks, throw on no repo
    expect(() => {
      repo.getRevision("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    expect(() => {
      repo.getRevision("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);

    expect(repo.getRevision("detached", "git")).not.toBeUndefined();
    expect(repo.getRevision("emptyGitRepo", "git")).toBeUndefined();

    expect(repo.getRevision("emptyHgRepo", "hg")).toBe("0000000000000000000000000000000000000000");
  });
});

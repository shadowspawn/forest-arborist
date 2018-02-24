import childProcess = require("child_process");
import fs = require("fs");
import tmp = require("tmp");
// Mine
import repo = require("../src/repo");
import util = require("../src/util");
//
// const cc = require("./core-common");


describe("repo:", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);

    fs.mkdirSync("notRepo");
    childProcess.execFileSync("git", ["init", "gitRepo"]);
    childProcess.execFileSync("hg", ["init", "hgRepo"]);
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("isGitRepository", () => {
    expect(repo.isGitRepository("notRepo")).toBe(false);
    expect(repo.isGitRepository("gitRepo")).toBe(true);
    expect(repo.isGitRepository("hgRepo")).toBe(false);
    expect(repo.isGitRepository("doesNotExist")).toBe(false);
  });

  test("isHgRepository", () => {
    expect(repo.isHgRepository("notRepo")).toBe(false);
    expect(repo.isHgRepository("gitRepo")).toBe(false);
    expect(repo.isHgRepository("hgRepo")).toBe(true);
    expect(repo.isGitRepository("doesNotExist")).toBe(false);
  });

  test("getRepoTypeForLocalPath", () => {
    expect(() => {
      repo.getRepoTypeForLocalPath("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    expect(repo.getRepoTypeForLocalPath("gitRepo")).toEqual("git");
    expect(repo.getRepoTypeForLocalPath("hgRepo")).toEqual("hg");
    expect(() => {
      repo.getRepoTypeForLocalPath("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  test("getOrigin", () => {
    expect(() => {
      repo.getOrigin("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    // We have local only repos, so no origin.
    expect(repo.getOrigin("gitRepo")).toBeUndefined();
    expect(repo.getOrigin("hgRepo")).toBeUndefined();
    expect(() => {
      repo.getOrigin("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    // Add some real origins?
  });

  test("getBranch", () => {
    expect(() => {
      repo.getBranch("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    // We have local only repos, so no origin.
    expect(repo.getBranch("gitRepo")).toBe("master");
    expect(repo.getBranch("hgRepo")).toBe("default");
    expect(() => {
      repo.getBranch("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    // Add some real origins?
  });

  test("getRevision", () => {
    // Test the failure modes
    expect(() => {
      repo.getRevision("notRepo");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    expect(() => {
      repo.getRevision("doesNotExist");
    }).toThrowError(util.suppressTerminateExceptionMessage);
    // Add some real revisions?
  });
});

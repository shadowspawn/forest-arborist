// Sanity check that command line still working, not deep testing.

import childProcess = require("child_process");
import path = require("path");
import tmp = require("tmp");
// Mine
import coreClone = require("../src/core-clone");
import util = require("../src/util");
//
import cc = require("./core-common");


function quietCallFab(args: string[]) {
  util.muteCall(() => {
    const result = childProcess.spawnSync("fab", args);
    expect(result.status).toEqual(0);
  });
}


function quietCallFabExpectFail(args: string[]) {
  util.muteCall(() => {
    const result = childProcess.spawnSync("fab", args);
    expect(result.status).not.toEqual(0);
  });
}


describe("command-line sanity check (of EXTERNAL COMMAND):", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult; // [sic]
  let suite: cc.RepoSuiteResult;
  const preparedRepo = "ref";

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
    // Get out a clean repo to work with
    util.muteCall(() => {
      coreClone.doClone(
        path.join(suite.remotesDir, "main-nested"),
        preparedRepo, {}
      );
    });
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  it("fab clone", () => {
    quietCallFab(["clone", path.join(suite.remotesDir, "main-nested"), "clone-test"]);
  });

  it("fab init", () => {
    cc.makeOneGitRepo("init-test");
    process.chdir("init-test");
    quietCallFab(["init"]);
  });

  it("fab install", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested"), "install-test"]);
    process.chdir("install-test");
    quietCallFab(["install"]);
  });

  it("fab status", () => {
    process.chdir(preparedRepo);
    quietCallFab(["status"]);
  });

  it("fab pull", () => {
    process.chdir(preparedRepo);
    quietCallFab(["pull"]);
  });

  it("fab root", () => {
    process.chdir(preparedRepo);
    quietCallFab(["root"]);
  });

  it("fab for-each", () => {
    process.chdir(preparedRepo);
    quietCallFab(["for-each", "pwd"]);
  });

  it("fab for-free", () => {
    process.chdir(preparedRepo);
    quietCallFab(["for-free", "pwd"]);
  });

  it("for-free --keepgoing", () => {
    process.chdir(preparedRepo);
    quietCallFabExpectFail(["for-each", "fab", "bogusCommand"]);
    quietCallFab(["for-each", "--keepgoing", "bogusCommand"]);
  });

  it("fab switch", () => {
    process.chdir(preparedRepo);
    quietCallFab(["switch", "develop"]);
  });

  it("fab make-branch", () => {
    process.chdir(preparedRepo);
    quietCallFab(["make-branch", "feature/test"]);
  });

  // saves snapshot to use in recreate and restore
  it("fab snapshot", () => {
    process.chdir(preparedRepo);
    quietCallFab(["snapshot", "--output", "snapshot"]);
  });

  it("fab recreate", () => {
    quietCallFab(["recreate", path.join(preparedRepo, "snapshot"), "recreate-test"]);
  });

  it("fab restore", () => {
    process.chdir(preparedRepo);
    quietCallFab(["restore", "snapshot"]);
  });
});

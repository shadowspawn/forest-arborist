// Sanity check that command line still working, not deep testing.

import childProcess = require("child_process");
import path = require("path");
import tmp = require("tmp");
// Mine
import coreClone = require("../src/core-clone");
import util = require("../src/util");
//
import cc = require("./core-common");

function fabEntry() {
  return path.join(path.dirname(__dirname), 'dist', 'command.js');
}

function callFab(args: string[]) {
  // Bit tricky calling fab externally on Windows. The execFileSync
  // we use for git and hg does not work for fab. This invocation of
  // spawnSync with shell does the trick.
  let nodeArgs = [fabEntry()];
  nodeArgs.concat(args);
  const result = childProcess.spawnSync("node", nodeArgs, { shell: true });
  expect(result.status).toEqual(0);
}


function callFabExpectFail(args: string[]) {
  let nodeArgs = [fabEntry()];
  nodeArgs.concat(args);
  const result = childProcess.spawnSync("node", args, { shell: true });
  expect(result.status).not.toEqual(0);
}


describe("command-line sanity check:", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult; // [sic]
  let suite: cc.RepoSuiteResult;
  const preparedRepo = "ref";

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
    // Get out a clean repo to work with
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      preparedRepo, {}
    );
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

  test("fab clone", () => {
    callFab(["clone", path.join(suite.remotesDir, "main-nested"), "clone-test"]);
  });

  test("fab init", () => {
    cc.makeOneGitRepo("init-test");
    process.chdir("init-test");
    callFab(["init"]);
  });

  test("fab install", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested"), "install-test"]);
    process.chdir("install-test");
    callFab(["install"]);
  });

  test("fab status", () => {
    process.chdir(preparedRepo);
    callFab(["status"]);
  });

  test("fab pull", () => {
    process.chdir(preparedRepo);
    callFab(["pull"]);
  });

  test("fab main", () => {
    process.chdir(preparedRepo);
    callFab(["main"]);
  });

  test("fab root", () => {
    process.chdir(preparedRepo);
    callFab(["root"]);
  });

  test("fab for-each", () => {
    process.chdir(preparedRepo);
    callFab(["for-each", "pwd"]);
  });

  test("fab for-free", () => {
    process.chdir(preparedRepo);
    callFab(["for-free", "pwd"]);
  });

  test("for-free --keepgoing", () => {
    process.chdir(preparedRepo);
    callFabExpectFail(["for-each", "fab", "bogusCommand"]);
    callFab(["for-each", "--keepgoing", "bogusCommand"]);
  });

  test("fab switch", () => {
    process.chdir(preparedRepo);
    callFab(["switch", "develop"]);
  });

  test("fab make-branch", () => {
    process.chdir(preparedRepo);
    callFab(["make-branch", "feature/test"]);
  });

  // saves snapshot to use in recreate and restore
  test("fab snapshot", () => {
    process.chdir(preparedRepo);
    callFab(["snapshot", "--output", "snapshot"]);
  });

  test("fab recreate", () => {
    callFab(["recreate", path.join(preparedRepo, "snapshot"), "recreate-test"]);
  });

  test("fab restore", () => {
    process.chdir(preparedRepo);
    callFab(["restore", "snapshot"]);
  });
});

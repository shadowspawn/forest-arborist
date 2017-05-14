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
  if (process.platform === "win32") {
    pending("Need to work out call syntax for external fab on Windows");
  } else {
    util.muteCall(() => {
      childProcess.execFileSync("fab", args);
    });
  }
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
    // pending does not stop errors from not.toThrow, so do by hand.
    if (process.platform === "win32") {
      pending("Need to work out call syntax for external fab on Windows");
      return;
    }

    process.chdir(preparedRepo);
    expect(()=> {
      quietCallFab(["for-each", "fab", "bogusCommand"]); // (Can use "false" on Mac/Lin, but use ourselves to cover Win!)
    }).toThrow();
    // This is weak but simple, as we are suppressing errors for keepgoing.
    expect(()=> {
      quietCallFab(["for-each", "--keepgoing", "bogusCommand"]);
    }).not.toThrow();
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

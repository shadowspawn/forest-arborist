import childProcess = require("child_process");
import fs = require("fs");
import path = require("path");
import tmp = require("tmp");
// Mine
import core = require("../src/core");
import coreClone = require("../src/core-clone");
import util = require("../src/util");
// //
import cc = require("./core-common");


describe("core clone:", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let suite: cc.RepoSuiteResult;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
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

  test("nested source", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      undefined, {}
    );
    cc.expectSuiteRepoLayout({ rootDir: "main-nested", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("nested source destination", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      "dest-nested", {}
    );
    cc.expectSuiteRepoLayout({ rootDir: "dest-nested", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("nested source destination --branch", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      "branch-nested", { branch: "develop" }
    );
    cc.expectSuiteRepoLayout({ rootDir: "branch-nested", mainDir: ".", freeBranch: "develop", pinnedRevision: suite.pinnedRevision });
  });

  test("nested source destination --manifest", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      "sub-nested", { manifest: "sub" }
    );
    cc.expectSuiteRepoLayout({ rootDir: "branch-nested", mainDir: ".", freeBranch: "develop", manifest: "sub", pinnedRevision: suite.pinnedRevision });
    // Look for the extra repo in the sub manifest
    expect(util.dirExistsSync(path.join("sub-nested", "sub"))).toBe(true);

    // Check root has manifest
    process.chdir("sub-nested");
    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toEqual("sub");
  });

  test("sibling source", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-sibling"),
      undefined, {}
    );
    cc.expectSuiteRepoLayout({ rootDir: "main-sibling", mainDir: "main-sibling", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("sibling source destination", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-sibling"),
      "dest-sibling", {}
    );
    cc.expectSuiteRepoLayout({ rootDir: "dest-sibling", mainDir: "main-sibling", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });
});


describe("core install:", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let suite: cc.RepoSuiteResult;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
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

  test("nested", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested")]);
    process.chdir("main-nested");
    coreClone.doInstall({});
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("nested on branch", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested"), "branch-nested"]);
    process.chdir("branch-nested");
    childProcess.execFileSync("git", ["checkout", "--quiet", "develop"]);
    coreClone.doInstall({});
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "develop", pinnedRevision: suite.pinnedRevision });
  });

  test("nested --manifest", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested"), "sub-nested"]);
    process.chdir("sub-nested");
    coreClone.doInstall({ manifest: "sub" });
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
    // Look for the extra repo in the sub manifest
    expect(util.dirExistsSync("sub")).toBe(true);

    // Check root has manifest
    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toEqual("sub");
  });

  test("sibling", () => {
    fs.mkdirSync("sibling");
    process.chdir("sibling");
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-sibling")]);
    process.chdir("main-sibling");
    coreClone.doInstall({});
    cc.expectSuiteRepoLayout({ rootDir: "..", mainDir: "main-sibling", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });
});

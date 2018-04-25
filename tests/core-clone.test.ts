import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as cc from "./core-common";
import * as command from "../src/command";
import * as core from "../src/core";
// import * as coreClone from "../src/core-clone";
import * as util from "../src/util";


describe("core clone", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let suite: cc.RepoSuiteResult;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
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

  test("nested source", () => {
    command.fab(["clone", path.join(suite.remotesDir, "main-nested")]);
    cc.expectSuiteRepoLayout({ rootDir: "main-nested", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("nested source destination", () => {
    command.fab(["clone", path.join(suite.remotesDir, "main-nested"), "dest-nested"]);
    cc.expectSuiteRepoLayout({ rootDir: "dest-nested", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("nested source destination --branch", () => {
    command.fab(["clone", "--branch", "develop", path.join(suite.remotesDir, "main-nested"), "branch-nested"]);
    cc.expectSuiteRepoLayout({ rootDir: "branch-nested", mainDir: ".", freeBranch: "develop", pinnedRevision: suite.pinnedRevision });
  });

  test("nested source destination --manifest", () => {
    command.fab(["clone", "--manifest", "sub", path.join(suite.remotesDir, "main-nested"), "sub-nested"]);
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
    command.fab(["clone", path.join(suite.remotesDir, "main-sibling")]);
    cc.expectSuiteRepoLayout({ rootDir: "main-sibling-forest", mainDir: "main-sibling", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("sibling source destination", () => {
    command.fab(["clone", path.join(suite.remotesDir, "main-sibling"), "dest-sibling"]);
    cc.expectSuiteRepoLayout({ rootDir: "dest-sibling", mainDir: "main-sibling", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });
});


describe("core install", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let suite: cc.RepoSuiteResult;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
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

  test("nested", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested")]);
    process.chdir("main-nested");
    command.fab(["install"]);
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  test("nested on branch", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested"), "branch-nested"]);
    process.chdir("branch-nested");
    childProcess.execFileSync("git", ["checkout", "--quiet", "develop"]);
    command.fab(["install"]);
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "develop", pinnedRevision: suite.pinnedRevision });
  });

  test("nested --manifest", () => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(suite.remotesDir, "main-nested"), "sub-nested"]);
    process.chdir("sub-nested");
    command.fab(["install", "--manifest", "sub"]);
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
    command.fab(["install"]);
    cc.expectSuiteRepoLayout({ rootDir: "..", mainDir: "main-sibling", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
  });

  // Uncovered:
  // - clone with no fab manifest
  // - clone source not hg or git
  // - hg

});

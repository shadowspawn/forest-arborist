import * as fsX from "fs-extra";
// Mine
import * as coreClone from "../src/core-clone";
import * as util from "../src/util";


describe("cloneEntry", () => {
  const execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
  const ensureDirSyncSpy = jest.spyOn(fsX, "ensureDirSync");

  beforeAll(() => {
    ensureDirSyncSpy.mockImplementation(() => {
      // do nothing
    });
    execCommandSyncSpy.mockImplementation(() => {
      // do nothing
    });
  });

  afterAll(() => {
    ensureDirSyncSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    ensureDirSyncSpy.mockReset();
    execCommandSyncSpy.mockReset();
  });

  test("cloneEntry free #git", () => {
    coreClone.cloneEntry({ repoType: "git", origin: "origin-repo" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["clone", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

  test("cloneEntry free #hg", () => {
    coreClone.cloneEntry({ repoType: "hg", origin: "origin-repo" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["clone", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

  test("cloneEntry free on branch #git", () => {
    coreClone.cloneEntry({ repoType: "git", origin: "origin-repo" }, "target", "develop" );
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["clone", "--branch", "develop", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

  test("cloneEntry free on branch #hg", () => {
    coreClone.cloneEntry({ repoType: "hg", origin: "origin-repo" }, "target", "develop" );
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["clone", "--updaterev", "develop", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

  test("cloneEntry pinned #git", () => {
    coreClone.cloneEntry({ repoType: "git", origin: "origin-repo", pinRevision: "DEADBEEF" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["clone", "--no-checkout", "origin-repo", "target"], { suppressContext: true }],
      ["git", ["checkout", "--quiet", "DEADBEEF"], { "cwd": "target" }],
    ]);
  });

  test("cloneEntry pinned #hg", () => {
    coreClone.cloneEntry({ repoType: "hg", origin: "origin-repo", pinRevision: "DEADBEEF" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["clone", "--noupdate", "origin-repo", "target"], { suppressContext: true }],
      ["hg", ["update", "--rev", "DEADBEEF"], { "cwd": "target" }],
    ]);
  });

  test("cloneEntry locked #git", () => {
    coreClone.cloneEntry({ repoType: "git", origin: "origin-repo", lockBranch: "locked" }, "target", "ignoredBranch");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["clone", "--branch", "locked", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

  test("cloneEntry locked #hg", () => {
    coreClone.cloneEntry({ repoType: "hg", origin: "origin-repo", lockBranch: "locked" }, "target", "ignoredBranch");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["clone", "--updaterev", "locked", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

});

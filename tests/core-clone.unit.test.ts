// Test the core-clone routines generate the expected shell commands.
// See also system tests.

import * as fsX from "fs-extra";
// Mine
import * as coreClone from "../src/core-clone";
import * as util from "../src/util";


describe("cloneEntry", () => {
  let execCommandSyncSpy: jest.SpyInstance;
  let ensureDirSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
    execCommandSyncSpy.mockReturnValue(undefined);
    ensureDirSyncSpy = jest.spyOn(fsX, "ensureDirSync"); // Implementation detail to make paths for hg like git does.
    ensureDirSyncSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    ensureDirSyncSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    ensureDirSyncSpy.mockClear();
    execCommandSyncSpy.mockClear();
  });

  test("cloneEntry free skipped #git", () => {
    coreClone.cloneEntry({ repoType: "git", origin: "origin-repo" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["clone", "origin-repo", "target"], { suppressContext: true }],
    ]);
  });

  test("cloneEntry free skipped #hg", () => {
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


describe("checkoutEntry", () => {
  let execCommandSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
    execCommandSyncSpy.mockReturnValue(undefined);
  });

  afterAll(() => {
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    execCommandSyncSpy.mockClear();
  });

  test("checkoutEntry free #git", () => {
    coreClone.checkoutEntry({ repoType: "git", origin: "origin-repo" }, "target");
    // skip free
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

  test("checkoutEntry free #hg", () => {
    coreClone.checkoutEntry({ repoType: "hg", origin: "origin-repo" }, "target");
    // skip free
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

  test("checkoutEntry free on branch #git", () => {
    coreClone.checkoutEntry({ repoType: "git", origin: "origin-repo" }, "target", "develop");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["checkout", "develop"], { cwd: "target" }],
    ]);
  });

  test("checkoutEntry free on branch #hg", () => {
    coreClone.checkoutEntry({ repoType: "hg", origin: "origin-repo" }, "target", "develop");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["update", "--rev", "develop"], { cwd: "target" }],
    ]);
  });

  test("checkoutEntry pinned #git", () => {
    coreClone.checkoutEntry({ repoType: "git", origin: "origin-repo", pinRevision: "DEADBEEF" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["-c", "advice.detachedHead=false", "checkout", "DEADBEEF"], { cwd: "target" }],
    ]);
  });

  test("checkoutEntry pinned #hg", () => {
    coreClone.checkoutEntry({ repoType: "hg", origin: "origin-repo", pinRevision: "DEADBEEF" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["update", "--rev", "DEADBEEF"], { cwd: "target" }],
    ]);
  });

  test("checkoutEntry locked #git", () => {
    coreClone.checkoutEntry({ repoType: "git", origin: "origin-repo", lockBranch: "locked" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["checkout", "locked"], { cwd: "target" }],
    ]);
  });

  test("checkoutEntry locked #hg", () => {
    coreClone.checkoutEntry({ repoType: "hg", origin: "origin-repo", lockBranch: "locked" }, "target");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["update", "--rev", "locked"], { cwd: "target" }],
    ]);
  });

});

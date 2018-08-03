// Test the core-branch routines generate the expected shell commands.

// Mine
import * as core from "../src/core";
import * as coreBranch from "../src/core-branch";
import * as util from "../src/util";


describe("core branch", () => {
  // Spy heavy!
  let cdRootDirectorySpy: jest.SpyInstance;
  let readManifestSpy: jest.SpyInstance;
  let execCommandSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
    cdRootDirectorySpy.mockReturnValue(undefined);
    execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
    execCommandSyncSpy.mockReturnValue(undefined);
    readManifestSpy = jest.spyOn(core, "readManifest");
    // readManifestSpy custom per test
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockClear();
    readManifestSpy.mockReset();
    execCommandSyncSpy.mockClear();
  });

  // switch

  test("switch branch #git", () => {
    readManifestSpy.mockReturnValue(
      { dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main" }
    );
    coreBranch.doSwitch("b");
    expect(readManifestSpy).toHaveBeenCalledWith({ fromRoot: true, addSeedToDependencies: true }); // just checking once
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], { cwd: "g"});
  });

  test("switch branch #hg", () => {
    readManifestSpy.mockReturnValue(
      { dependencies: { "h": { repoType: "hg" } }, rootDirectory: ".", mainPathFromRoot: "." }
    );
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["update", "b"], { cwd: "h"});
  });

  test("switch branch #mixed", () => {
    // Light check that gets called for each.
    readManifestSpy.mockReturnValue({
      dependencies: {
        "g": { repoType: "git" },
        "h": { repoType: "hg" },
      }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], { cwd: "g"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["update", "b"], { cwd: "h"});
  });

  test("switch does not do locked and pinned #mixed", () => {
    readManifestSpy.mockReturnValue({
      dependencies: {
        "g": { repoType: "git", lockBranch: "lockedBranch" },
        "h": { repoType: "hg", pinRevision: "DEADBEEF" },
      }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doSwitch("never");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

  test("make-branch does not do locked and pinned #mixed", () => {
    // Light check that gets called for each.
    readManifestSpy.mockReturnValue({
      dependencies: {
        "g": { repoType: "git", lockBranch: "lockedBranch" },
        "h": { repoType: "hg", pinRevision: "DEADBEEF" },
      }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doMakeBranch("never");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

  // make-branch

  test("make-branch branch #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doMakeBranch("b");
    expect(readManifestSpy).toHaveBeenCalledWith({ fromRoot: true, addSeedToDependencies: true }); // just checking once
    expect(execCommandSyncSpy.mock.calls).toEqual([["git", ["checkout", "-b", "b"], { cwd: "g"}]]);
  });

  test("make-branch branch #hg", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "h": { repoType: "hg" } }, rootDirectory: ".", mainPathFromRoot: "."
    });
    coreBranch.doMakeBranch("b");
    expect(execCommandSyncSpy.mock.calls).toEqual([["hg", ["branch", "b"], { cwd: "h"}]]);
  });

  test("make-branch branch start-point #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doMakeBranch("b", "start-point");
    expect(execCommandSyncSpy.mock.calls).toEqual([["git", ["checkout", "-b", "b", "start-point"], { cwd: "g"}]]);
  });

  test("make-branch branch start-point #hg", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "h": { repoType: "hg" } }, rootDirectory: ".", mainPathFromRoot: "."
    });
    coreBranch.doMakeBranch("b", "start-point");
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["update", "start-point"], { cwd: "h"}],
      ["hg", ["branch", "b"], { cwd: "h"}],
    ]);
  });

  test("make-branch branch --publish #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doMakeBranch("b", undefined, { publish: true });
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["git", ["checkout", "-b", "b"], { cwd: "g"}],
      ["git", ["push", "--set-upstream", "origin", "b"], { cwd: "g"}],
    ]);
  });

  test("make-branch branch --publish #hg]", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "h": { repoType: "hg" } }, rootDirectory: ".", mainPathFromRoot: "."
    });
    coreBranch.doMakeBranch("b", undefined, { publish: true });
    expect(execCommandSyncSpy.mock.calls).toEqual([
      ["hg", ["branch", "b"], { cwd: "h"}],
      ["hg", ["commit", "--message", "Create branch"], { cwd: "h"}],
      ["hg", ["push", "--branch", "b", "--new-branch"], { cwd: "h"}],
    ]);
  });

  test("make-branch branch #mixed", () => {
    // Light check that gets called for each.
    readManifestSpy.mockReturnValue({
      dependencies: {
        "g": { repoType: "git" },
        "h": { repoType: "hg" },
      }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    coreBranch.doMakeBranch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "-b", "b"], { cwd: "g"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["branch", "b"], { cwd: "h"});
  });

});

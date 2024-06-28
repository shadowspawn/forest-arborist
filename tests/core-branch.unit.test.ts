// Test the core-branch routines generate the expected shell commands.

import * as fs from "fs";
// Mine
import * as core from "../src/core";
import * as coreBranch from "../src/core-branch";
import * as repo from "../src/repo";
import * as util from "../src/util";

describe("core branch", () => {
  // Spy heavy!
  let cdRootDirectorySpy: jest.SpyInstance;
  let readManifestSpy: jest.SpyInstance;
  let execCommandSyncSpy: jest.SpyInstance;
  let execCommandSpy: jest.SpyInstance;
  let getRepoTypeForLocalPathSpy: jest.SpyInstance; // Needed for switch
  let existsSyncSpy: jest.SpyInstance; // Needed for switch when manifest changes

  beforeAll(() => {
    cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
    cdRootDirectorySpy.mockReturnValue(undefined);
    execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
    execCommandSyncSpy.mockReturnValue(undefined);
    execCommandSpy = jest.spyOn(util, "execCommand");
    execCommandSpy.mockReturnValue(undefined);
    getRepoTypeForLocalPathSpy = jest.spyOn(repo, "getRepoTypeForLocalPath");
    getRepoTypeForLocalPathSpy.mockImplementation((repoPath: string) => {
      if (repoPath === "h" || repoPath == ".") {
        return "hg";
      } else {
        return "git";
      }
    });
    readManifestSpy = jest.spyOn(core, "readManifest");
    // readManifestSpy is defined per test
    existsSyncSpy = jest.spyOn(fs, "existsSync");
    existsSyncSpy.mockReturnValue(false); // default, override as needed
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
    execCommandSpy.mockRestore();
    getRepoTypeForLocalPathSpy.mockRestore();
    existsSyncSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockClear();
    readManifestSpy.mockReset();
    execCommandSyncSpy.mockClear();
    execCommandSpy.mockClear();
    getRepoTypeForLocalPathSpy.mockClear();
    existsSyncSpy.mockClear();
  });

  // switch

  test("switch branch #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { g: { repoType: "git" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(readManifestSpy).toHaveBeenCalledWith({ fromRoot: true }); // just checking once
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "main",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "g",
    });
  });

  test("switch branch #hg", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { h: { repoType: "hg" } },
      rootDirectory: ".",
      seedPathFromRoot: ".",
    });
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["update", "b"], {
      cwd: ".",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["update", "b"], {
      cwd: "h",
    });
  });

  test("switch branch #mixed", () => {
    // Light check that gets called for each.
    readManifestSpy.mockReturnValue({
      dependencies: {
        g: { repoType: "git" },
        h: { repoType: "hg" },
      },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(3);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "main",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "g",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["update", "b"], {
      cwd: "h",
    });
  });

  test("switch does not do locked and pinned #mixed", () => {
    readManifestSpy.mockReturnValue({
      dependencies: {
        g: { repoType: "git", lockBranch: "lockedBranch" },
        h: { repoType: "hg", pinRevision: "DEADBEEF" },
      },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(1);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "main",
    });
  });

  test("switch branch #git, manifest changes: repo removed, repo added but not cloned", () => {
    readManifestSpy
      .mockReturnValueOnce({
        dependencies: { before: { repoType: "git" } },
        rootDirectory: "..",
        seedPathFromRoot: "main",
      })
      .mockReturnValueOnce({
        dependencies: { after: { repoType: "git" } },
        rootDirectory: "..",
        seedPathFromRoot: "main",
      });
    existsSyncSpy.mockReturnValueOnce(false); // new repo missing
    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(1);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "main",
    });
  });

  test("switch branch #git, manifest changes: new repos cloned", () => {
    readManifestSpy
      .mockReturnValueOnce({ rootDirectory: "..", seedPathFromRoot: "main" })
      .mockReturnValueOnce({
        dependencies: {
          afterFree: { repoType: "git" },
          afterLocked: { repoType: "git", lockBranch: "lock" },
          afterPinned: { repoType: "git", pinRevision: "v1.2" },
        },
        rootDirectory: "..",
        seedPathFromRoot: "main",
      });
    existsSyncSpy.mockReturnValue(true); // new repos exist

    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(4);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "main",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "afterFree",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith(
      "git",
      ["checkout", "lock"],
      { cwd: "afterLocked" },
    );
    expect(execCommandSyncSpy).toHaveBeenCalledWith(
      "git",
      ["-c", "advice.detachedHead=false", "checkout", "v1.2"],
      { cwd: "afterPinned" },
    );
  });

  test("switch branch #git, manifest changes dependent repository type", () => {
    readManifestSpy
      .mockReturnValueOnce({
        dependencies: {
          toFree: { repoType: "git", pinRevision: "v1.2" },
          toLocked: { repoType: "git" },
          toPinned: { repoType: "git", lockBranch: "lock" },
        },
        rootDirectory: "..",
        seedPathFromRoot: "main",
      })
      .mockReturnValueOnce({
        dependencies: {
          toFree: { repoType: "git" },
          toLocked: { repoType: "git", lockBranch: "lock" },
          toPinned: { repoType: "git", pinRevision: "v1.2" },
        },
        rootDirectory: "..",
        seedPathFromRoot: "main",
      });

    coreBranch.doSwitch("b");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(4);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "main",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "b"], {
      cwd: "toFree",
    });
    expect(execCommandSyncSpy).toHaveBeenCalledWith(
      "git",
      ["checkout", "lock"],
      { cwd: "toLocked" },
    );
    expect(execCommandSyncSpy).toHaveBeenCalledWith(
      "git",
      ["-c", "advice.detachedHead=false", "checkout", "v1.2"],
      { cwd: "toPinned" },
    );
  });

  // make-branch

  test("make-branch does not do locked and pinned #mixed", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: {
        g: { repoType: "git", lockBranch: "lockedBranch" },
        h: { repoType: "hg", pinRevision: "DEADBEEF" },
        main: { repoType: "git" },
      },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    await coreBranch.doMakeBranch("b");
    expect(execCommandSpy).toHaveBeenCalledTimes(1);
    expect(execCommandSpy.mock.calls).toEqual([
      [
        "git",
        ["checkout", "-b", "b"],
        expect.objectContaining({ cwd: "main" }),
      ],
    ]);
  });

  test("make-branch branch #git", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { main: { repoType: "git" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    await coreBranch.doMakeBranch("b");
    expect(readManifestSpy).toHaveBeenCalledWith({
      fromRoot: true,
      addSeedToDependencies: true,
    }); // just checking once
    expect(execCommandSpy.mock.calls).toEqual([
      [
        "git",
        ["checkout", "-b", "b"],
        expect.objectContaining({ cwd: "main" }),
      ],
    ]);
  });

  test("make-branch branch #hg", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { ".": { repoType: "hg" } },
      rootDirectory: ".",
      seedPathFromRoot: ".",
    });
    await coreBranch.doMakeBranch("b");
    expect(execCommandSpy.mock.calls).toEqual([
      ["hg", ["branch", "b"], expect.objectContaining({ cwd: "." })],
    ]);
  });

  test("make-branch branch start-point #git", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { main: { repoType: "git" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    await coreBranch.doMakeBranch("b", "start-point");
    expect(execCommandSpy.mock.calls).toEqual([
      [
        "git",
        ["checkout", "-b", "b", "start-point"],
        expect.objectContaining({ cwd: "main" }),
      ],
    ]);
  });

  test("make-branch branch start-point #hg", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { ".": { repoType: "hg" } },
      rootDirectory: ".",
      seedPathFromRoot: ".",
    });
    await coreBranch.doMakeBranch("b", "start-point");
    expect(execCommandSpy.mock.calls).toEqual([
      ["hg", ["update", "start-point"], expect.objectContaining({ cwd: "." })],
      ["hg", ["branch", "b"], expect.objectContaining({ cwd: "." })],
    ]);
  });

  test("make-branch branch --publish #git", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { main: { repoType: "git" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    await coreBranch.doMakeBranch("b", undefined, { publish: true });
    expect(execCommandSpy.mock.calls).toEqual([
      [
        "git",
        ["checkout", "-b", "b"],
        expect.objectContaining({ cwd: "main" }),
      ],
      [
        "git",
        ["push", "--set-upstream", "origin", "b"],
        expect.objectContaining({ cwd: "main" }),
      ],
    ]);
  });

  test("make-branch branch --publish #hg]", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { ".": { repoType: "hg" } },
      rootDirectory: ".",
      seedPathFromRoot: ".",
    });
    await coreBranch.doMakeBranch("b", undefined, { publish: true });
    expect(execCommandSpy.mock.calls).toEqual([
      ["hg", ["branch", "b"], expect.objectContaining({ cwd: "." })],
      [
        "hg",
        ["commit", "--message", "Create branch"],
        expect.objectContaining({ cwd: "." }),
      ],
      [
        "hg",
        ["push", "--branch", "b", "--new-branch"],
        expect.objectContaining({ cwd: "." }),
      ],
    ]);
  });

  test("make-branch branch #mixed", async () => {
    // Light check that gets called for each.
    readManifestSpy.mockReturnValue({
      dependencies: {
        g: { repoType: "git" },
        h: { repoType: "hg" },
        main: { repoType: "git" },
      },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
    await coreBranch.doMakeBranch("b");
    expect(execCommandSpy).toHaveBeenCalledTimes(3);
    expect(execCommandSpy).toHaveBeenCalledWith(
      "git",
      ["checkout", "-b", "b"],
      expect.objectContaining({ cwd: "main" }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "git",
      ["checkout", "-b", "b"],
      expect.objectContaining({ cwd: "g" }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "hg",
      ["branch", "b"],
      expect.objectContaining({
        cwd: "h",
      }),
    );
  });
});

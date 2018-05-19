// Test the core-pull routines generate the expected shell commands.

// Mine
import * as core from "../src/core";
import * as corePull from "../src/core-pull";
import * as repo from "../src/repo";
import * as util from "../src/util";

describe("core branch", () => {
  // Spy heavy!
  let cdRootDirectorySpy: jest.SpyInstance;
  let readManifestSpy: jest.SpyInstance;
  let getBranchSpy: jest.SpyInstance;
  let execCommandSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
    cdRootDirectorySpy.mockReturnValue(undefined);
    getBranchSpy = jest.spyOn(repo, "getBranch");
    // getBranchSpy custom as needed
    execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
    execCommandSyncSpy.mockReturnValue(undefined);
    readManifestSpy = jest.spyOn(core, "readManifest");
    // readManifestSpy custom per test
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    getBranchSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockClear();
    readManifestSpy.mockReset();
    getBranchSpy.mockReset();
    execCommandSyncSpy.mockClear();
  });

  test("pull #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    getBranchSpy.mockReturnValue("master");

    corePull.doPull();
    expect(readManifestSpy).toHaveBeenCalledWith({ fromRoot: true, addMainToDependencies: true }); // just checking once
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["pull"], { cwd: "g"});
  });

  test("pull in locked #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "g": { repoType: "git", lockBranch: "locked" } }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    getBranchSpy.mockReturnValue("locked");

    corePull.doPull();
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["pull"], { cwd: "g"});
  });

  test("pull in detached #git", () => {
    readManifestSpy.mockReturnValue({
      dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main"
    });
    getBranchSpy.mockReturnValue(undefined);

    corePull.doPull();
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

  test("pull does not do pinned #mixed", () => {
    readManifestSpy.mockReturnValue({
      dependencies: {
        "g": { repoType: "git", pinRevision: "DEADBEEF" },
        "h": { repoType: "hg", pinRevision: "DEADBEEF" },
      }, rootDirectory: "..", mainPathFromRoot: "main"
    });

    corePull.doPull();
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

});

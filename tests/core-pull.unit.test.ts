// Mine
import * as core from "../src/core";
import * as corePull from "../src/core-pull";
import * as repo from "../src/repo";
import * as util from "../src/util";

describe("core branch", () => {
  // Spy heavy!
  const cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
  const readManifestSpy = jest.spyOn(core, "readManifest");
  const getBranchSpy = jest.spyOn(repo, "getBranch");
  const execCommandSyncSpy = jest.spyOn(util, "execCommandSync");

  beforeAll(() => {
    cdRootDirectorySpy.mockImplementation(() => {
      // do nothing
    });
    execCommandSyncSpy.mockImplementation(() => {
      // do nothing
    });
    // readManifestSpy custom per test
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    getBranchSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockReset();
    readManifestSpy.mockReset();
    getBranchSpy.mockReset();
    execCommandSyncSpy.mockReset();
  });

  test("pull #git", () => {
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main" };
    });
    getBranchSpy.mockImplementation((repoPath: string, repoTypeParam?: repo.RepoType) => {
      return "master";
    });

    corePull.doPull();
    expect(readManifestSpy).toHaveBeenCalledWith({ fromRoot: true, addMainToDependencies: true }); // just checking once
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["pull"], { cwd: "g"});
  });

  test("pull in locked #git", () => {
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: { "g": { repoType: "git", lockBranch: "locked" } }, rootDirectory: "..", mainPathFromRoot: "main" };
    });
    getBranchSpy.mockImplementation((repoPath: string, repoTypeParam?: repo.RepoType) => {
      return "locked";
    });

    corePull.doPull();
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["pull"], { cwd: "g"});
  });

  test("pull in detached #git", () => {
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: { "g": { repoType: "git" } }, rootDirectory: "..", mainPathFromRoot: "main" };
    });
    getBranchSpy.mockImplementation((repoPath: string, repoTypeParam?: repo.RepoType) => {
      return undefined;
    });

    corePull.doPull();
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

  test("pull does not do pinned #mixed", () => {
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: {
        "g": { repoType: "git", pinRevision: "DEADBEEF" },
        "h": { repoType: "hg", pinRevision: "DEADBEEF" },
      }, rootDirectory: "..", mainPathFromRoot: "main" };
    });

    corePull.doPull();
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

});

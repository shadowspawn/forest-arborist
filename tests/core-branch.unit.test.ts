// Mine
import * as core from "../src/core";
import * as coreBranch from "../src/core-branch";
import * as util from "../src/util";


describe("core branch", () => {
  let cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
  const readManifestSpy = jest.spyOn(core, "readManifest");
  const execCommandSyncSpy = jest.spyOn(util, "execCommandSync");

  beforeAll(() => {
    cdRootDirectorySpy.mockImplementation(() => {
      // do nothing
    });
    execCommandSyncSpy.mockImplementation(() => {
      // do nothing
    });
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockReset();
    readManifestSpy.mockReset();
    execCommandSyncSpy.mockReset();
  });

  test("switch free sanity check", () => {
    // Light check that gets called for each.
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: {
        "g": { repoType: "git" },
        "h": { repoType: "hg" },
      }, rootDirectory: "..", mainPathFromRoot: "main" };
    });
    coreBranch.doSwitch("z");
    expect(readManifestSpy).toHaveBeenCalledWith({ fromRoot: true, addMainToDependencies: true });
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
  });

  test("switch free git", () => {
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: { "g": { repoType: "git" } }, rootDirectory: ".", mainPathFromRoot: "." };
    });
    coreBranch.doSwitch("x");
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["checkout", "x"], { cwd: "g"});
  });

  test("switch free hg", () => {
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: { "h": { repoType: "hg" } }, rootDirectory: "..", mainPathFromRoot: "main" };
    });
    coreBranch.doSwitch("y");
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["update", "y"], { cwd: "h"});
  });

  test("switch does not do locked and pinned", () => {
    // Light check that gets called for each.
    readManifestSpy.mockImplementation((options: core.ReadManifestOptions): core.Manifest => {
      return { dependencies: {
        "g": { repoType: "git", lockBranch: "lockedBranch" },
        "h": { repoType: "hg", pinRevision: "DEADBEEF" },
      }, rootDirectory: "..", mainPathFromRoot: "main" };
    });
    coreBranch.doSwitch("a");
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(0);
  });

});

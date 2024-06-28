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
  let execCommandSpy: jest.SpyInstance;

  beforeAll(() => {
    cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
    cdRootDirectorySpy.mockReturnValue(undefined);
    getBranchSpy = jest.spyOn(repo, "getBranch");
    // getBranchSpy custom as needed
    execCommandSpy = jest.spyOn(util, "execCommand");
    execCommandSpy.mockReturnValue(undefined);
    readManifestSpy = jest.spyOn(core, "readManifest");
    // readManifestSpy custom per test
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    getBranchSpy.mockRestore();
    execCommandSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockClear();
    readManifestSpy.mockReset();
    getBranchSpy.mockReset();
    execCommandSpy.mockClear();
  });

  test("pull #git", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { g: { repoType: "git" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
      mainPathFromRoot: "main",
    });
    getBranchSpy.mockReturnValue("trunk");

    await corePull.doPull();
    expect(readManifestSpy).toHaveBeenCalledWith({
      fromRoot: true,
      addSeedToDependencies: true,
    }); // just checking once
    expect(execCommandSpy).toHaveBeenCalledWith(
      "git",
      ["pull"],
      expect.objectContaining({
        cwd: "g",
      }),
    );
  });

  test("pull in locked #git", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { g: { repoType: "git", lockBranch: "locked" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
      mainPathFromRoot: "main",
    });
    getBranchSpy.mockReturnValue("locked");

    await corePull.doPull();
    expect(execCommandSpy).toHaveBeenCalledWith(
      "git",
      ["pull"],
      expect.objectContaining({
        cwd: "g",
      }),
    );
  });

  test("pull in detached #git", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: { g: { repoType: "git" } },
      rootDirectory: "..",
      seedPathFromRoot: "main",
      mainPathFromRoot: "main",
    });
    getBranchSpy.mockReturnValue(undefined);

    await corePull.doPull();
    expect(execCommandSpy).toHaveBeenCalledTimes(0);
  });

  test("pull does not do pinned #mixed", async () => {
    readManifestSpy.mockReturnValue({
      dependencies: {
        g: { repoType: "git", pinRevision: "DEADBEEF" },
        h: { repoType: "hg", pinRevision: "DEADBEEF" },
      },
      rootDirectory: "..",
      seedPathFromRoot: "main",
      mainPathFromRoot: "main",
    });

    await corePull.doPull();
    expect(execCommandSpy).toHaveBeenCalledTimes(0);
  });
});

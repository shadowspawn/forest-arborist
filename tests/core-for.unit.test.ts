// Mine
import * as core from "../src/core";
import * as coreFor from "../src/core-for";
import * as util from "../src/util";


describe("core for", () => {
  // Spy heavy!
  let cdRootDirectorySpy: jest.SpyInstance;
  let readManifestSpy: jest.SpyInstance;
  let execCommandSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
    cdRootDirectorySpy.mockReturnValue(undefined);
    execCommandSyncSpy = jest.spyOn(util, "execCommandSync");
    // custom
    readManifestSpy = jest.spyOn(core, "readManifest");
    readManifestSpy.mockReturnValue({
      dependencies: {
        "g": { repoType: "git" },
        "h": { repoType: "hg" },
        "locked": { repoType: "git", lockBranch: "lockedBranch" },
        "pinned": { repoType: "hg", pinRevision: "DEADBEEF" },
      }, rootDirectory: "..", seedPathFromRoot: "main"
    });
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    execCommandSyncSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockClear();
    readManifestSpy.mockClear();
    execCommandSyncSpy.mockReset();
  });

  test("for-each", () => {
    coreFor.doForEach("command", [], {});
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(4);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("command", [], { cwd: "g"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("command", [], { cwd: "h"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("command", [], { cwd: "locked"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("command", [], { cwd: "pinned"});
  });

  test("for-free", () => {
    coreFor.doForFree("command", [], {});
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("command", [], { cwd: "g"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("command", [], { cwd: "h"});
  });

  test("git (for)", () => {
    coreFor.doForGit(["command"], {});
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["command"], { cwd: "g"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("git", ["command"], { cwd: "locked"});
  });

  test("hg (for)", () => {
    coreFor.doForHg(["command"], {});
    expect(execCommandSyncSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["command"], { cwd: "h"});
    expect(execCommandSyncSpy).toHaveBeenCalledWith("hg", ["command"], { cwd: "pinned"});
  });

  test("throw", () => {
    execCommandSyncSpy.mockImplementation(() => {
      throw "x";
    });
    expect(() => {
      coreFor.doForFree("command", [], {});
    }).toThrow();
    expect(() => {
      coreFor.doForFree("command", [], { keepgoing: true });
    }).not.toThrow();
  });

});

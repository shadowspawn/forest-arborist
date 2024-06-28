// Mine
import * as core from "../src/core";
import * as coreFor from "../src/core-for";
import * as util from "../src/util";

describe("core for", () => {
  // Spy heavy!
  let cdRootDirectorySpy: jest.SpyInstance;
  let readManifestSpy: jest.SpyInstance;
  let execCommandSpy: jest.SpyInstance;

  beforeAll(() => {
    cdRootDirectorySpy = jest.spyOn(core, "cdRootDirectory");
    cdRootDirectorySpy.mockReturnValue(undefined);
    execCommandSpy = jest.spyOn(util, "execCommand");
    execCommandSpy.mockReturnValue(undefined);
    // custom
    readManifestSpy = jest.spyOn(core, "readManifest");
    readManifestSpy.mockReturnValue({
      dependencies: {
        g: { repoType: "git" },
        h: { repoType: "hg" },
        locked: { repoType: "git", lockBranch: "lockedBranch" },
        pinned: { repoType: "hg", pinRevision: "DEADBEEF" },
      },
      rootDirectory: "..",
      seedPathFromRoot: "main",
    });
  });

  afterAll(() => {
    cdRootDirectorySpy.mockRestore();
    readManifestSpy.mockRestore();
    execCommandSpy.mockRestore();
  });

  beforeEach(() => {
    cdRootDirectorySpy.mockClear();
    readManifestSpy.mockClear();
    execCommandSpy.mockClear();
  });

  test("for-each", async () => {
    await coreFor.doForEach("command", []);
    expect(execCommandSpy).toHaveBeenCalledTimes(4);
    expect(execCommandSpy).toHaveBeenCalledWith(
      "command",
      [],
      expect.objectContaining({
        cwd: "g",
      }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "command",
      [],
      expect.objectContaining({
        cwd: "h",
      }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "command",
      [],
      expect.objectContaining({
        cwd: "locked",
      }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "command",
      [],
      expect.objectContaining({
        cwd: "pinned",
      }),
    );
  });

  test("for-free", async () => {
    await coreFor.doForFree("command", []);
    expect(execCommandSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSpy).toHaveBeenCalledWith(
      "command",
      [],
      expect.objectContaining({
        cwd: "g",
      }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "command",
      [],
      expect.objectContaining({
        cwd: "h",
      }),
    );
  });

  test("git (for)", async () => {
    await coreFor.doForGit(["command"]);
    expect(execCommandSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSpy).toHaveBeenCalledWith(
      "git",
      ["command"],
      expect.objectContaining({
        cwd: "g",
      }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "git",
      ["command"],
      expect.objectContaining({
        cwd: "locked",
      }),
    );
  });

  test("hg (for)", async () => {
    await coreFor.doForHg(["command"]);
    expect(execCommandSpy).toHaveBeenCalledTimes(2);
    expect(execCommandSpy).toHaveBeenCalledWith(
      "hg",
      ["command"],
      expect.objectContaining({
        cwd: "h",
      }),
    );
    expect(execCommandSpy).toHaveBeenCalledWith(
      "hg",
      ["command"],
      expect.objectContaining({
        cwd: "pinned",
      }),
    );
  });
});

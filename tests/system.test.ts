// System tests with shared setup of full playground.

import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as command from "../src/command";
import * as core from "../src/core";
import * as util from "../src/util";
import * as sandpit from "./sandpit";


describe("system (full functionality)", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let pinnedRevision: string;
  let nestedRoot: string;
  let siblingRoot: string;
  let remotes: string;

  beforeAll(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    pinnedRevision = sandpit.makePlayground(tempFolder.name);
    process.chdir(tempFolder.name);
    nestedRoot = path.join(process.cwd(), "nested");
    siblingRoot = path.join(process.cwd(), "sibling");
    remotes = path.join(tempFolder.name, "remotes"); // avoid resolving to /private on mac
    process.chdir(startDir);
});

  afterAll(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("unexpected command throws", () => {
    expect(() => {
      command.fab(["unexpected-command"]);
    }).toThrow(util.suppressTerminateExceptionMessage);
  });

  test("playground init of nested", () => {
    process.chdir(nestedRoot);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual(".");
    expect(manifestObject.mainPathFromRoot).toEqual(".");

    const dependencies = manifestObject.dependencies;
    expect(dependencies["free"]).toEqual(       { repoType: "git", origin: path.join(remotes, "nested", "free") });
    expect(dependencies["libs/pinned"]).toEqual({ repoType: "git", origin: path.join(remotes, "libs", "pinned"), pinRevision: pinnedRevision });
    expect(dependencies["libs/locked"]).toEqual({ repoType: "git", origin: path.join(remotes, "libs", "locked"), lockBranch: "lockedBranch" });

  });

  test("playground init of sibling", () => {
    process.chdir(siblingRoot);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual("main");
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual("..");
    expect(manifestObject.mainPathFromRoot).toEqual("main");

    const dependencies = manifestObject.dependencies;
    expect(dependencies["free"]).toEqual(       { repoType: "git", origin: path.join(remotes, "sibling", "free") });
    expect(dependencies["libs/pinned"]).toEqual({ repoType: "git", origin: path.join(remotes, "libs", "pinned"), pinRevision: pinnedRevision });
    expect(dependencies["libs/locked"]).toEqual({ repoType: "git", origin: path.join(remotes, "libs", "locked"), lockBranch: "lockedBranch" });

  });


  describe ("test display commands", () => {
    let spy: jest.SpyInstance;

    beforeAll(() => {
      spy = jest.spyOn(global.console, 'log');
    });

    afterAll(() => {
      spy.mockRestore();
    });

    test("root (no forest) throws", () => {
      expect(() => {
        command.fab(["root"]);
      }).toThrow();
    });

    test("root from nested root", () => {
      process.chdir("nested");
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("root from nested forest", () => {
      process.chdir(path.join("nested", "libs"));
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("root from sibling root", () => {
      process.chdir("sibling");
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(siblingRoot);
      });

    test("root from sibling main", () => {
      process.chdir(path.join("sibling", "main"));
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(siblingRoot);
      });

    test("root from sibling forest", () => {
      process.chdir(path.join("sibling", "libs"));
      command.fab(["root"]);
      expect(spy).toHaveBeenLastCalledWith(siblingRoot);
      });

    test("main from nested forest", () => {
      process.chdir(path.join("nested", "libs"));
      command.fab(["main"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("main from nested forest", () => {
      process.chdir(path.join("nested", "libs"));
      command.fab(["main"]);
      expect(spy).toHaveBeenLastCalledWith(nestedRoot);
      });

    test("main from sibling forest", () => {
      process.chdir(path.join("sibling", "libs"));
      command.fab(["main"]);
      expect(spy).toHaveBeenLastCalledWith(path.join(siblingRoot, "main"));
      });

  });

});

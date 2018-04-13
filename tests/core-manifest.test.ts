// This file tests the "fab manifest" command options (not the base manifest operations).

import childProcess = require("child_process");
import fs = require("fs");
import path = require("path");
import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import command = require("../src/command");
import core = require("../src/core");
import coreInit = require("../src/core-init");
import coreManifest = require("../src/core-manifest");
import util = require("../src/util");


describe("core manifest, no forest:", () => {
  test("no forest", () => {
    const startDir = process.cwd();
    const tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);

    expect(() => {
      // quick check, use the internal routine.
      coreManifest.doManifest({ });
    }).toThrow();

    process.chdir(startDir);
  });
});


describe("core manifest:", () => {
  const startDir = process.cwd();
  const tempFolder = tmp.dirSync({ unsafeCleanup: true });
  let program: command.Command;

  beforeAll(() => {
    process.chdir(tempFolder.name);
    cc.makeNestedGitForest();
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
    program = command.makeProgram(); // Reminder, one parse only as changes state!
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("show", () => {
    const manifestPath = path.resolve(process.cwd(), core.manifestPath({ }));
    process.chdir("free"); // test one option from somewhere in tree other than main

    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "manifest"]);
    expect(console.log).toHaveBeenCalledWith(manifestPath);
    spy.mockRestore();
  });

  test("list", () => {
    // Bit specific copy of implementation, but want to test list. Make fuzzier if necessary.
    const manifestObject = core.readManifest({ });
    delete manifestObject.tipsForManualEditing;
    const listing = (JSON.stringify(manifestObject, undefined, "  "));

    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "manifest", "--list"]);
    expect(console.log).toHaveBeenCalledWith(listing);
    spy.mockRestore();
  });

  test("edit", () => {
    // Using knowledge of implementation, but hopefully worth it so we can test edit!
    const manifestPath = path.resolve(process.cwd(), core.manifestPath({ }));
    const holdEditorName = process.env["EDITOR"];
    const editorName = "dummy-editor-not-called";
    process.env["EDITOR"] = editorName;
    const spy = jest.spyOn(childProcess, 'execFileSync');
    spy.mockImplementation(() => {
      // dummy out editor!
    });
    coreManifest.doManifest({ edit: true });
    expect(spy).toHaveBeenCalledWith(editorName, [manifestPath], { stdio: "inherit"});
    spy.mockRestore();
    util.restoreEnvVar("EDITOR", holdEditorName);
  });

  test("delete folder-does-not-exist", () => {
    expect(() => {
      program.parse(["node", "fab", "manifest", "--delete", "folder-does-not-exist"]);
    }).toThrow();
  });

  test("delete (cwd)", () => {
    const manifestBefore = core.readManifest({ });
    delete(manifestBefore.dependencies["locked"]);
    process.chdir("locked");
    program.parse(["node", "fab", "manifest", "--delete"]);
    process.chdir(tempFolder.name);
    const manifestAfter = core.readManifest({ });
    expect(manifestBefore).toEqual(manifestAfter);
  });

  test("delete named-depend", () => {
    const manifestBefore = core.readManifest({ });
    delete(manifestBefore.dependencies["pinned"]);
    program.parse(["node", "fab", "manifest", "--delete", "pinned"]);
    const manifestAfter = core.readManifest({ });
    expect(manifestBefore).toEqual(manifestAfter);
  });

  test("delete missing-depend", () => {
    // Already deleted above
    expect(() => {
      program.parse(["node", "fab", "manifest", "--delete", "pinned"]);
    }).toThrow();
  });

  test("add", () => {
    const manifestBefore = core.readManifest({ });
    manifestBefore.dependencies["pinned"] = coreInit.makeDependencyEntry({ mainRepoPath: ".", repoPath: "pinned" });
    program.parse(["node", "fab", "manifest", "--add", "pinned"]);
    const manifestAfter = core.readManifest({ });
    expect(manifestBefore).toEqual(manifestAfter);
  });

  test("custom manifest name", () => {
    const customManifestPath = path.resolve(process.cwd(), core.manifestPath({ manifest: "custom" }));
    fs.unlinkSync(path.resolve(process.cwd(), core.manifestPath({ })));
    coreInit.doInit({ manifest: "custom" });

    const spy = jest.spyOn(global.console, 'log');
    program.parse(["node", "fab", "manifest"]);
    expect(console.log).toHaveBeenCalledWith(customManifestPath);
    spy.mockRestore();
  });

});

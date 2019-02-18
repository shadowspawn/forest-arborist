// This file tests the "fab manifest" command options (not the base manifest operations).

import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
// Mine
import * as command from "../src/command";
import * as core from "../src/core";
import * as coreInit from "../src/core-init";
import * as util from "../src/util";
import * as cc from "./core-common";


describe("core manifest", () => {
  const startDir = process.cwd();
  const tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
  const nestedRoot = path.join(tempFolder.name, "nested");

  beforeAll(() => {
    process.chdir(tempFolder.name);
    cc.makeNestedGitForest();
  });

  afterAll(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  beforeEach(() => {
    process.chdir(nestedRoot);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("no forest", () => {
    process.chdir(tempFolder.name);

    expect(() => {
      command.fab(["manifest"]);
    }).toThrow();
  });

  test("show", () => {
    const manifestPath = path.resolve(process.cwd(), core.manifestPath({ }));
    process.chdir("free"); // test one option from somewhere in tree other than seed

    const spy = jest.spyOn(global.console, 'log');
    command.fab(["manifest"]);
    expect(console.log).toHaveBeenCalledWith(manifestPath);
    spy.mockRestore();
  });

  test("list", () => {
    // Bit specific copy of implementation, but want to test list. Make fuzzier if necessary.
    const manifestObject = core.readManifest({ });
    const listing = (JSON.stringify(manifestObject, undefined, "  "));

    const spy = jest.spyOn(global.console, 'log');
    command.fab(["manifest", "--list"]);
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
    spy.mockReturnValue(Buffer.alloc(0));
    // spy.mockImplementation(() => {
      // dummy out editor!
    // });
    command.fab(["manifest", "--edit"]);
    expect(spy).toHaveBeenCalledWith(editorName, [manifestPath], { stdio: "inherit"});
    spy.mockRestore();
    util.restoreEnvVar("EDITOR", holdEditorName);
  });

  test("delete folder-does-not-exist", () => {
    expect(() => {
      command.fab(["manifest", "--delete", "folder-does-not-exist"]);
    }).toThrow();
  });

  test("delete (cwd)", () => {
    const manifestBefore = core.readManifest({ });
    delete(manifestBefore.dependencies["locked"]);
    process.chdir("locked");
    command.fab(["manifest", "--delete"]);
    process.chdir(nestedRoot);
    const manifestAfter = core.readManifest({ });
    expect(manifestBefore).toEqual(manifestAfter);
  });

  test("delete named-depend", () => {
    const manifestBefore = core.readManifest({ });
    delete(manifestBefore.dependencies["pinned"]);
    command.fab(["manifest", "--delete", "pinned"]);
    const manifestAfter = core.readManifest({ });
    expect(manifestBefore).toEqual(manifestAfter);
  });

  test("delete missing-depend", () => {
    // Already deleted above
    expect(() => {
      command.fab(["manifest", "--delete", "pinned"]);
    }).toThrow();
  });

  test("add", () => {
    const manifestBefore = core.readManifest({ });
    manifestBefore.dependencies["pinned"] = coreInit.makeDependencyEntry({ seedRepoPath: ".", repoPath: "pinned" });
    command.fab(["manifest", "--add", "pinned"]);
    const manifestAfter = core.readManifest({ });
    expect(manifestBefore).toEqual(manifestAfter);

    // Block adding seed
    expect(() => {
      command.fab(["manifest", "--add"]);
    }).toThrow();

    // Check we detect easy wrong syntax
    expect(() => {
      command.fab(["manifest", "add"]);
    }).toThrow();
  });

  test("custom manifest name", () => {
    const customManifestPath = path.resolve(process.cwd(), core.manifestPath({ manifest: "custom" }));
    fs.unlinkSync(path.resolve(process.cwd(), core.manifestPath({ })));
    coreInit.doInit({ root: ".", manifest: "custom" });

    const spy = jest.spyOn(global.console, 'log');
    command.fab(["manifest"]);
    expect(console.log).toHaveBeenCalledWith(customManifestPath);
    spy.mockRestore();
  });

});

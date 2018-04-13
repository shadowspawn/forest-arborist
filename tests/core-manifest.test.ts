// This file tests the "fab manifest" command options (not the base manifest operations).

import childProcess = require("child_process");
import path = require("path");
import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import core = require("../src/core");
import coreManifest = require("../src/core-manifest");


describe("core manifest, no forest:", () => {
  test("no forest", () => {
    const startDir = process.cwd();
    const tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);

    expect(() => {
      coreManifest.doManifest({ });
    }).toThrow();

    process.chdir(startDir);
  });
});


describe("core manifest:", () => {
  const startDir = process.cwd();
  const tempFolder = tmp.dirSync({ unsafeCleanup: true });

  beforeAll(() => {
    process.chdir(tempFolder.name);
    cc.makeNestedGitForest();
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  test("show", () => {
    const manifestPath = path.resolve(process.cwd(), core.manifestPath({ }));
    process.chdir("free"); // test one option from somewhere in tree other than main

    const spy = jest.spyOn(global.console, 'log');
    coreManifest.doManifest({ });
    expect(console.log).toHaveBeenCalledWith(manifestPath);
    spy.mockReset();
    spy.mockRestore();
  });

  test("list", () => {
    const manifestObject = core.readManifest({ });
    delete manifestObject.tipsForManualEditing;
    const listing = (JSON.stringify(manifestObject, undefined, "  "));

    const spy = jest.spyOn(global.console, 'log');
    coreManifest.doManifest({ list: true });
    expect(console.log).toHaveBeenCalledWith(listing);
    spy.mockReset();
    spy.mockRestore();
  });

  test("edit", () => {
    // Using knowledge of implementation, but lets us test edit!
    const manifestPath = path.resolve(process.cwd(), core.manifestPath({ }));
    const editorName = "dummy-editor-not-called";
    process.env["EDITOR"] = editorName;
    const spy = jest.spyOn(childProcess, 'execFileSync');
    spy.mockImplementation(() => {
      // dummy out editor!
    });
    coreManifest.doManifest({ edit: true });
    expect(spy).toHaveBeenCalledWith(editorName, [manifestPath], { stdio: "inherit"});
    spy.mockReset();
    spy.mockRestore();
  });

});

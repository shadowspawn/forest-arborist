// Testing the internal routines which do not correspond to command-line fab commands.
// (The 000 in the name is to run the utility functions before the commands.)

import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as tmp from "tmp";
import * as core from "../src/core";
import * as util from "../src/util";
// Mine
import * as cc from "./core-common";


describe("core", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  test("manifestPath", () => {
    expect(util.normalizeToPosix(core.manifestPath({}))).toEqual(".fab/manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ manifest: "custom" }))).toEqual(".fab/custom_manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ mainPath: "main" }))).toEqual("main/.fab/manifest.json");
    expect(util.normalizeToPosix(core.manifestPath({ mainPath: "main", manifest: "custom" }))).toEqual("main/.fab/custom_manifest.json");
  });

  test("cdRootDirectoy", () => {
    // Not a fab context
    expect(() => {
      core.cdRootDirectory();
    }).toThrow();

    // Main, but no root.
    fs.mkdirSync(".fab");
    expect(() => {
      core.cdRootDirectory();
    }).toThrow();

    // Make it a fake context
    fs.closeSync(fs.openSync(core.fabRootFilename, "w"));
    expect(() => {
      core.cdRootDirectory();
    }).not.toThrow();
    // expect(process.cwd()).toBe(tempFolder.name);
  });

  test("rootFile", () => {
    const testRootOptions: core.WriteRootFileOptions = { rootFilePath: core.fabRootFilename, mainPath: ".", manifest: "foo" };
    core.writeRootFile(testRootOptions);
    const rootContents = core.readRootFile();
    expect(rootContents.mainPath).toEqual(testRootOptions.mainPath);
    expect(rootContents.manifest).toEqual(testRootOptions.manifest);
  });

  test("readManifest", () => {
    expect(core.manifestList(".")).toBeUndefined(); // List manifests when folder missing.

    // simple main repo
    fs.mkdirSync(".fab");
    expect(core.manifestList(".")).toEqual(0); // List manifests empty folder.
    fs.closeSync(fs.openSync(path.join(".fab", "notAManifest"), "w"));
    expect(core.manifestList(".")).toEqual(0); // List manifests no matching manifests.
    cc.makeOneGitRepo(".", "git://host.xz/path1");
    childProcess.execFileSync("git", ["init"]);

    // missing manifest
    expect(() => {
      core.readManifest({ mainPath: "." });
    }).toThrow();
    expect(() => {
      core.readManifest({ mainPath: ".", manifest: "willNotFindThis" });
    }).toThrow();

    // Nested forest
    const dependencies1: any  = {};
    dependencies1["git"] = { repoType: "git" };
    dependencies1["hg"] = { repoType: "hg" };
    dependencies1["silly"] = { repoType: "silly" };
    dependencies1["relativeOrigin"] = { repoType: "git", origin: "./relativeOrigin" };
    const manifestWriteNested = {
      dependencies: dependencies1,
      rootDirectory: ".",
      mainPathFromRoot: "."
    };
    fs.writeFileSync(core.manifestPath({ manifest: "nested1" }), JSON.stringify(manifestWriteNested));
    expect(core.manifestList(".")).toEqual(1);  // First manifest

    // discard unrecognised repo tyeps
    const manifestReadNested1 = core.readManifest({ mainPath: ".", manifest: "nested1" });
    expect(manifestReadNested1.dependencies["git"]).not.toBeUndefined();
    expect(manifestReadNested1.dependencies["hg"]).not.toBeUndefined();
    // drop unrecognised repo types
    expect(manifestReadNested1.dependencies["silly"]).toBeUndefined();
    // main repo not present by default
    expect(manifestReadNested1.dependencies["."]).toBeUndefined();
    // absolute origin
    expect(manifestReadNested1.dependencies["relativeOrigin"].origin).toEqual("git://host.xz/path1/relativeOrigin");

    // add main repo on request
    const manifestReadNested2 = core.readManifest({ mainPath: ".", manifest: "nested1", addMainToDependencies: true });
    expect(manifestReadNested2.dependencies["."]).not.toBeUndefined();

    // fromRoot
    const rootOptions3: core.WriteRootFileOptions = { rootFilePath: core.fabRootFilename, mainPath: ".", manifest: "nested1" };
    core.writeRootFile(rootOptions3);
    const manifestReadNested3 = core.readManifest({ fromRoot: true });
    expect(manifestReadNested3.dependencies["git"]).not.toBeUndefined();

    // tipToAddToIgnore. Only informational, not exercising code and not checking detail.
    const rootOptions4: core.WriteRootFileOptions = { rootFilePath: core.fabRootFilename, mainPath: ".", manifest: "nested4", tipToAddToIgnore: true };
    core.writeRootFile(rootOptions4);

    // Default manifest name, and list
    fs.writeFileSync(core.manifestPath({ }), JSON.stringify(manifestWriteNested));
    expect(core.manifestList(".")).toEqual(2); // Added default manifest
  });

});

// Testing the internal routines which do not correspond to command-line fab commands.
// (The 000 in the name is to run the utility functions before the commands.)

import * as childProcess from "child_process";
import * as fsX from "fs-extra";
import * as path from "path";
import * as process from "process";
import * as tmp from "tmp";
// Mine
import * as cc from "./core-common";
import * as core from "../src/core";
import * as util from "../src/util";

describe("core", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.DirResult;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  test("manifestPath", () => {
    expect(util.normalizeToPosix(core.manifestPath({}))).toEqual(
      ".fab/manifest.json",
    );
    expect(
      util.normalizeToPosix(core.manifestPath({ manifest: "custom" })),
    ).toEqual(".fab/custom_manifest.json");
    expect(
      util.normalizeToPosix(core.manifestPath({ seedPath: "main" })),
    ).toEqual("main/.fab/manifest.json");
    expect(
      util.normalizeToPosix(
        core.manifestPath({ seedPath: "main", manifest: "custom" }),
      ),
    ).toEqual("main/.fab/custom_manifest.json");
  });

  test("cdRootDirectoy", () => {
    // Not a fab context
    expect(() => {
      core.cdRootDirectory();
    }).toThrow();

    // Seed, but no root.
    fsX.mkdirSync(".fab");
    expect(() => {
      core.cdRootDirectory();
    }).toThrow();

    // Make it a fake context
    fsX.closeSync(fsX.openSync(core.fabRootFilename, "w"));
    expect(() => {
      core.cdRootDirectory();
    }).not.toThrow();
    // expect(process.cwd()).toBe(tempFolder.name);
  });

  test("rootFile v1", () => {
    // v1 and v2 wrote mainPath not seedPath
    const testRootObject = { mainPath: "bar", manifest: "foo" };
    const filename = core.fabRootFilename;
    fsX.writeJsonSync(filename, testRootObject, { spaces: 2 });
    const rootContents = core.readRootFile();
    expect(rootContents.seedPath).toEqual(testRootObject.mainPath);
    expect(rootContents.manifest).toEqual(testRootObject.manifest);
  });

  test("rootFile", () => {
    const testRootOptions: core.WriteRootFileOptions = {
      rootFilePath: core.fabRootFilename,
      seedPath: ".",
      manifest: "foo",
    };
    core.writeRootFile(testRootOptions);
    const rootContents = core.readRootFile();
    expect(rootContents.seedPath).toEqual(testRootOptions.seedPath);
    expect(rootContents.manifest).toEqual(testRootOptions.manifest);
  });

  test("readManifest v1", () => {
    childProcess.execFileSync("git", ["init", "-b", "trunk", "-q"]);
    // v1 and v2 wrote mainPathFromRoot not seedPathFromRoot
    const testManifestObject = {
      dependencies: [],
      rootDirectory: "root",
      mainPathFromRoot: "main",
    };
    // Failing test with relative path. Sigh, something skanky somewhere! Make absolute.
    const fabManifest = path.resolve(
      process.cwd(),
      core.manifestPath({ seedPath: "." }),
    );
    fsX.mkdirpSync(path.dirname(fabManifest));
    fsX.writeJsonSync(fabManifest, testManifestObject, { spaces: 2 });
    const manifestContents = core.readManifest({ seedPath: "." });
    expect(manifestContents.rootDirectory).toEqual(
      testManifestObject.rootDirectory,
    );
    expect(manifestContents.seedPathFromRoot).toEqual(
      testManifestObject.mainPathFromRoot,
    );
  });

  test("readManifest", () => {
    expect(core.manifestList(".")).toBeUndefined(); // List manifests when folder missing.

    // simple seed repo
    fsX.mkdirSync(".fab");
    expect(core.manifestList(".")).toEqual(0); // List manifests empty folder.
    fsX.closeSync(fsX.openSync(path.join(".fab", "notAManifest"), "w"));
    expect(core.manifestList(".")).toEqual(0); // List manifests no matching manifests.
    cc.makeOneGitRepo(".", "git://host.xz/path1");
    // childProcess.execFileSync("git", ["init"]);

    // missing manifest
    expect(() => {
      core.readManifest({ seedPath: "." });
    }).toThrow();
    expect(() => {
      core.readManifest({ seedPath: ".", manifest: "willNotFindThis" });
    }).toThrow();

    // Nested forest
    const dependencies1: core.Dependencies = {};
    dependencies1["git"] = { repoType: "git" };
    dependencies1["hg"] = { repoType: "hg" };
    dependencies1["silly"] = {
      repoType: "silly",
    } as unknown as core.DependencyEntry; // Deliberately assigning bogus value to repoType
    dependencies1["relativeOrigin"] = {
      repoType: "git",
      origin: "./relativeOrigin",
    };
    const manifestWriteNested = {
      dependencies: dependencies1,
      rootDirectory: ".",
      seedPathFromRoot: ".",
      mainPathFromRoot: ".",
    };
    fsX.writeFileSync(
      core.manifestPath({ manifest: "nested1" }),
      JSON.stringify(manifestWriteNested),
    );
    expect(core.manifestList(".")).toEqual(1); // First manifest

    // discard unrecognised repo tyeps
    const manifestReadNested1 = core.readManifest({
      seedPath: ".",
      manifest: "nested1",
    });
    expect(manifestReadNested1.dependencies["git"]).not.toBeUndefined();
    expect(manifestReadNested1.dependencies["hg"]).not.toBeUndefined();
    // drop unrecognised repo types
    expect(manifestReadNested1.dependencies["silly"]).toBeUndefined();
    // seed repo not present by default
    expect(manifestReadNested1.dependencies["."]).toBeUndefined();
    // absolute origin
    expect(manifestReadNested1.dependencies["relativeOrigin"].origin).toEqual(
      "git://host.xz/path1/relativeOrigin",
    );

    // add seed repo on request
    const manifestReadNested2 = core.readManifest({
      seedPath: ".",
      manifest: "nested1",
      addSeedToDependencies: true,
    });
    expect(manifestReadNested2.dependencies["."]).not.toBeUndefined();

    // fromRoot
    const rootOptions3: core.WriteRootFileOptions = {
      rootFilePath: core.fabRootFilename,
      seedPath: ".",
      manifest: "nested1",
    };
    core.writeRootFile(rootOptions3);
    const manifestReadNested3 = core.readManifest({ fromRoot: true });
    expect(manifestReadNested3.dependencies["git"]).not.toBeUndefined();

    // tipToAddToIgnore. Only informational, not exercising code and not checking detail.
    const rootOptions4: core.WriteRootFileOptions = {
      rootFilePath: core.fabRootFilename,
      seedPath: ".",
      manifest: "nested4",
      tipToAddToIgnore: true,
    };
    core.writeRootFile(rootOptions4);

    // Default manifest name, and list
    fsX.writeFileSync(
      core.manifestPath({}),
      JSON.stringify(manifestWriteNested),
    );
    expect(core.manifestList(".")).toEqual(2); // Added default manifest
  });
});

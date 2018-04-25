import * as childProcess from "child_process";
import * as tmp from "tmp";
// Mine
import * as cc from "./core-common";
import * as command from "../src/command";
import * as core from "../src/core";
// import * as coreInit from "../src/core-init";
import * as dvcsUrl from "../src/dvcs-url";
import * as repo from "../src/repo";
import * as util from "../src/util";


describe("core init", () => {
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

  test("no repo", () => {
    expect(() => {
      command.fab(["init"]);
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  test("empty git repo", () => {
    // Check we don"t fall over in empty repo
    childProcess.execFileSync("git", ["init"]);
    expect(util.dirExistsSync(".git")).toBe(true);

    command.fab(["init"]);
    expect(util.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(util.fileExistsSync(core.manifestPath({}))).toBe(true);
    // Not too worried about root and manifest contents!
  });

  test("--manifest", () => {
    // Check manifest self consistent
    childProcess.execFileSync("git", ["init"]);
    expect(util.dirExistsSync(".git")).toBe(true);

    const manifest = "custom";
    command.fab(["init", "--manifest", manifest]);
    expect(util.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(util.fileExistsSync(core.manifestPath({ manifest }))).toBe(true);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toEqual(manifest);
  });

  test("nested", () => {
    // Check cross referencing for nested setup.
    const sub = "child";
    childProcess.execFileSync("git", ["init"]);
    childProcess.execFileSync("git", ["init", sub]);

    command.fab(["init"]);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual(".");
    expect(manifestObject.mainPathFromRoot).toEqual(".");

    expect(manifestObject.dependencies[sub]).not.toBeUndefined();

    // Check repeat init fails
    process.exitCode = 0;
    command.fab(["init"]);
    expect(process.exitCode).not.toBe(0);
    process.exitCode = 0;
  });

  test("sibling (--root)", () => {
    // Check cross referencing for sibling setup.
    const sibling = "sibling";
    childProcess.execFileSync("git", ["init", "main"]);
    childProcess.execFileSync("git", ["init", sibling]);
    process.chdir("main");

    command.fab(["init", "--root", ".."]);

    process.chdir("..");
    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual("main");
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual("..");
    expect(manifestObject.mainPathFromRoot).toEqual("main");

    expect(manifestObject.dependencies[sibling]).not.toBeUndefined();
  });

  test("pinned", () => {
    // Auto detect pinned revision
    childProcess.execFileSync("git", ["init"]);
    childProcess.execFileSync("git", ["init", "boost"]);
    const revision = cc.commitAndDetach("boost");

    command.fab(["init"]);

    const manifestObject = core.readManifest({ fromRoot: true });
    const dependencies = manifestObject.dependencies;
    const entry = dependencies.boost;

    // After all that...
    expect(entry.lockBranch).toBeUndefined();
    expect(entry.pinRevision).not.toBeUndefined();
    expect(entry.pinRevision).toEqual(revision);
  });

  test("locked", () => {
    // Auto detect locked when branches differ
    childProcess.execFileSync("git", ["init"]);
    childProcess.execFileSync("git", ["init", "locked"]);
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"], { cwd: "locked" });
    childProcess.execFileSync("git", ["checkout", "-b", "locked"], { cwd: "locked" });

    command.fab(["init"]);

    const manifestObject = core.readManifest({ fromRoot: true });
    const dependencies = manifestObject.dependencies;
    const entry = dependencies["locked"];
    expect(entry.pinRevision).toBeUndefined();
    expect(entry.lockBranch).not.toBeUndefined();
    expect(entry.lockBranch).toEqual("locked");
  });

  test("free", () => {
    // Auto detect free
    childProcess.execFileSync("git", ["init"]);
    childProcess.execFileSync("git", [
      "remote", "add", "origin", "git@example.com:path/to/main.git",
    ]);
    childProcess.execFileSync("git", ["init", "boost"]);
    childProcess.execFileSync("git", [
      "remote", "add", "origin", "git@example.com:path/to/boost.git",
    ], { cwd: "boost" });

    command.fab(["init"]);

    // Want to check that raw manifest has free and relative dependency.
    const fabManifest = core.manifestPath({ mainPath: "." });
    const manifestObject = util.readJson(fabManifest, []);
    const dependencies = manifestObject.dependencies;
    const entry = dependencies.boost;
    expect(entry.pinRevision).toBeUndefined();
    expect(entry.lockBranch).toBeUndefined();
    expect(entry.origin).not.toBeUndefined();
    expect(dvcsUrl.isRelativePath(entry.origin)).toBe(true);
  });

  // Uncovered:
  // - hg

});

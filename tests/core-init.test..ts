import childProcess = require("child_process");
import tmp = require("tmp");
// Mine
import core = require("../src/core");
import fsX = require("../src/fsExtra");
import repo = require("../src/repo");
import util = require("../src/util");
//
import cc = require("./core-common");
import coreInit = require("../src/core-init");


describe("core init:", () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  test("no repo", () => {
    expect(() => {
      coreInit.doInit({});
    }).toThrowError(util.suppressTerminateExceptionMessage);
  });

  test("empty git repo", () => {
    // Check we don"t fall over in empty repo
    childProcess.execFileSync("git", ["init"]);
    expect(fsX.dirExistsSync(".git")).toBe(true);

    coreInit.doInit({});
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(fsX.fileExistsSync(core.manifestPath({}))).toBe(true);
    // Not too worried about root and manifest contents!
  });

  test("--manifest", () => {
    // Check manigest self consistent
    childProcess.execFileSync("git", ["init"]);
    expect(fsX.dirExistsSync(".git")).toBe(true);

    const manifest = "custom";
    coreInit.doInit({ manifest });
    expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);
    expect(fsX.fileExistsSync(core.manifestPath({ manifest }))).toBe(true);

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toEqual(manifest);
  });

  test("nested", () => {
    // Check cross referencing for nested setup.
    const sub = "child";
    childProcess.execFileSync("git", ["init"]);
    childProcess.execFileSync("git", ["init", sub]);

    coreInit.doInit({});

    const rootObject = core.readRootFile();
    expect(rootObject.mainPath).toEqual(".");
    expect(rootObject.manifest).toBeUndefined();

    const manifestObject = core.readManifest({ fromRoot: true });
    expect(manifestObject.rootDirectory).toEqual(".");
    expect(manifestObject.mainPathFromRoot).toEqual(".");

    expect(manifestObject.dependencies[sub]).not.toBeUndefined();
  });

  test("sibling (--root)", () => {
    // Check cross referencing for sibling setup.
    const sibling = "sibling";
    childProcess.execFileSync("git", ["init", "main"]);
    childProcess.execFileSync("git", ["init", sibling]);
    process.chdir("main");

    coreInit.doInit({ root: ".." });

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
    cc.configureTestRepo(".");
    childProcess.execFileSync("git", ["init", "boost"]);
    cc.configureTestRepo("boost");
    process.chdir("boost");
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
    const revision = repo.getRevision(".");
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Second empty but real commit"]);
    childProcess.execFileSync("git", ["checkout", "--quiet", revision]);
    process.chdir("..");

    coreInit.doInit({});

    const manifestObject = core.readManifest({ fromRoot: true });
    const dependencies = manifestObject.dependencies;
    const entry = dependencies.boost;

    // After all that...
    expect(entry.lockBranch).toBeUndefined();
    expect(entry.pinRevision).not.toBeUndefined();
    expect(entry.pinRevision).toEqual(revision);
  });

  test("locked", () => {
    // Auto detect locked, little bit fragile with empty repos but KISS.
    childProcess.execFileSync("git", ["init"]);
    childProcess.execFileSync("git", ["init", "boost"]);

    coreInit.doInit({});

    const manifestObject = core.readManifest({ fromRoot: true });
    const dependencies = manifestObject.dependencies;
    const entry = dependencies.boost;
    expect(entry.pinRevision).toBeUndefined();
    expect(entry.lockBranch).not.toBeUndefined();
    expect(entry.lockBranch).toEqual("master");
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

    coreInit.doInit({});

    // Want to check that raw manifest has free and relative dependency.
    const fabManifest = core.manifestPath({ mainPath: "." });
    const manifestObject = util.readJson(fabManifest, []);
    const dependencies = manifestObject.dependencies;
    const entry = dependencies.boost;
    expect(entry.pinRevision).toBeUndefined();
    expect(entry.lockBranch).toBeUndefined();
    expect(entry.origin).not.toBeUndefined();
    expect(util.isRelativePath(entry.origin)).toBe(true);
  });
});

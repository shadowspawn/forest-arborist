import childProcess = require("child_process");
import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import command = require("../src/command");
import coreBranch = require("../src/core-branch");
import repo = require("../src/repo");
import util = require("../src/util");


describe("core branch:", () => {
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

  test("make-branch", () => {
    cc.makeNestedGitForest();
    process.chdir("nested");

    expect(repo.getBranch(".")).toEqual("master");
    expect(repo.getBranch("free")).toEqual("master");

    // make-branch X, check just affects free
    command.fab(["make-branch", "one"]);
    expect(repo.getBranch(".")).toEqual("one");
    expect(repo.getBranch("free")).toEqual("one");
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toEqual("master");

    // make-branch X, check from current branch
    cc.configureTestRepo(".");
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
    const oneRevision = repo.getRevision(".");
    command.fab(["make-branch", "two"]);
    expect(repo.getRevision(".")).toEqual(oneRevision);

    // make-branch X Y, check from specified start
    command.fab(["make-branch", "three", "master"]);
    expect(repo.getRevision(".")).not.toEqual(oneRevision);
  });

  test("switch", () => {
    cc.makeNestedGitForest();
    process.chdir("nested");

    coreBranch.doMakeBranch("one");
    coreBranch.doMakeBranch("two");
    expect(repo.getBranch(".")).toEqual("two");
    expect(repo.getBranch("free")).toEqual("two");

    command.fab(["switch", "one"]);
    expect(repo.getBranch(".")).toEqual("one");
    expect(repo.getBranch("free")).toEqual("one");
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toEqual("master");
  });

// Uncovered:
// - hg
// - --publish

});

import childProcess = require("child_process");
import tmp = require("tmp");
// Mine
import coreBranch = require("../src/core-branch");
import repo = require("../src/repo");
import util = require("../src/util");
//
import cc = require("./core-common");


describe("core branch:", () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  afterAll(() => {
    process.chdir(startDir);
  });

  test("make-branch", () => {
    cc.makeNestedGitForest();

    expect(repo.getBranch(".")).toEqual("master");
    expect(repo.getBranch("free")).toEqual("master");

    // make-branch X, check just affects free
    coreBranch.doMakeBranch("one");
    expect(repo.getBranch(".")).toEqual("one");
    expect(repo.getBranch("free")).toEqual("one");
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toEqual("master");

    // make-branch X, check from current branch
    cc.configureTestRepo(".");
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
    const oneRevision = repo.getRevision(".");
    coreBranch.doMakeBranch("two");
    expect(repo.getRevision(".")).toEqual(oneRevision);

    // make-branch X Y, check from specified start
    coreBranch.doMakeBranch("three", "master");
    expect(repo.getRevision(".")).not.toEqual(oneRevision);

    // make-branch X --publish ????
  });


  test("switch", () => {
    cc.makeNestedGitForest();
    coreBranch.doMakeBranch("one");
    coreBranch.doMakeBranch("two");
    expect(repo.getBranch(".")).toEqual("two");
    expect(repo.getBranch("free")).toEqual("two");

    coreBranch.doSwitch("one");
    expect(repo.getBranch(".")).toEqual("one");
    expect(repo.getBranch("free")).toEqual("one");
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toEqual("master");
  });
});

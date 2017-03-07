import childProcess = require("child_process");
import tmp = require("tmp");
// Mine
import coreBranch = require("../src/core-branch");
import repo = require("../src/repo");
import util = require("../src/util");
//
import cc = require("./core-common");


function quietDoMakeBranch(branch: string, startPoint?: string, publish?: boolean) {
  util.muteCall(() => {
    coreBranch.doMakeBranch(branch, startPoint, publish);
  });
}


function quietDoSwitch(branch: string) {
  util.muteCall(() => {
    coreBranch.doSwitch(branch);
  });
}


describe("core branch:", () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  it("make-branch", () => {
    cc.makeOneOfEachGitRepo();

    expect(repo.getBranch(".")).toEqual("master");
    expect(repo.getBranch("free")).toEqual("master");

    // make-branch X, check just affects free
    quietDoMakeBranch("one");
    expect(repo.getBranch(".")).toEqual("one");
    expect(repo.getBranch("free")).toEqual("one");
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toEqual("master");

    // make-branch X, check from current branch
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
    const oneRevision = repo.getRevision(".");
    quietDoMakeBranch("two");
    expect(repo.getRevision(".")).toEqual(oneRevision);

    // make-branch X Y, check from specified start
    quietDoMakeBranch("three", "master");
    expect(repo.getRevision(".")).not.toEqual(oneRevision);

    // make-branch X --publish ????
  });


  it("switch", () => {
    cc.makeOneOfEachGitRepo();
    quietDoMakeBranch("one");
    quietDoMakeBranch("two");
    expect(repo.getBranch(".")).toEqual("two");
    expect(repo.getBranch("free")).toEqual("two");

    quietDoSwitch("one");
    expect(repo.getBranch(".")).toEqual("one");
    expect(repo.getBranch("free")).toEqual("one");
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toEqual("master");
  });
});

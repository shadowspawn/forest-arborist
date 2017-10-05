import tmp = require("tmp");
// Mine
import coreFor = require("../src/core-for");
import repo = require("../src/repo");
import util = require("../src/util");
//
import cc = require("./core-common");


function quietDoFor(cmd: string, args: string[], options: coreFor.ForOptions) {
  util.muteCall(() => {
    coreFor.doForEach(cmd, args, options);
  });
}


describe("core for:", () => {
  const startDir = process.cwd();
  let tempFolder;

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    cc.makeOneOfEachGitRepo();
  });

  afterEach(() => {
    process.chdir(startDir);
  });


  it("for-free", () => {
    const freeBranch = "freeBranch";
    quietDoFor("git", ["checkout", "--quiet", "-b", freeBranch], { freeOnly: true });
    expect(repo.getBranch(".")).toEqual(freeBranch);
    expect(repo.getBranch("free")).toBe(freeBranch);
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toBe("master");
  });

  it("for-each", () => {
    const eachBranch = "eachBranch";
    quietDoFor("git", ["checkout", "--quiet", "-b", eachBranch], {});
    expect(repo.getBranch(".")).toEqual(eachBranch);
    expect(repo.getBranch("free")).toEqual(eachBranch);
    expect(repo.getBranch("pinned")).toEqual(eachBranch);
    expect(repo.getBranch("locked")).toEqual(eachBranch);
  });

  it("for-free --keepgoing", () => {
    // throw on errors
    expect(() => {
      quietDoFor("fab", ["bogusCommand"], { });
    }).toThrow();

    // keepgoing
    expect(() => {
      quietDoFor("fab", ["bogusCommand"], { keepgoing: true });
    }).not.toThrow();
  });
});

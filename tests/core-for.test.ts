import tmp = require("tmp");
// Mine
import coreFor = require("../src/core-for");
import repo = require("../src/repo");
import util = require("../src/util");
//
import cc = require("./core-common");


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


  test("for-free", () => {
    const freeBranch = "freeBranch";
    coreFor.doForEach("git", ["checkout", "--quiet", "-b", freeBranch], { freeOnly: true });
    expect(repo.getBranch(".")).toEqual(freeBranch);
    expect(repo.getBranch("free")).toBe(freeBranch);
    expect(repo.getBranch("pinned")).toBeUndefined();
    expect(repo.getBranch("locked")).toBe("master");
  });

  test("for-each", () => {
    const eachBranch = "eachBranch";
    coreFor.doForEach("git", ["checkout", "--quiet", "-b", eachBranch], {});
    expect(repo.getBranch(".")).toEqual(eachBranch);
    expect(repo.getBranch("free")).toEqual(eachBranch);
    expect(repo.getBranch("pinned")).toEqual(eachBranch);
    expect(repo.getBranch("locked")).toEqual(eachBranch);
  });

  test("for-free --keepgoing", () => {
    // throw on errors
    expect(() => {
      coreFor.doForEach("fab", ["bogusCommand"], {});
    }).toThrow();

    // keepgoing
    expect(() => {
      coreFor.doForEach("fab", ["bogusCommand"], { keepgoing: true });
    }).not.toThrow();
  });
});

import childProcess = require("child_process");
import path = require("path");
import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import command = require("../src/command");
import core = require("../src/core");
import coreClone = require("../src/core-clone");
// import coreSnapshot = require("../src/core-snapshot");
import repo = require("../src/repo");
import util = require("../src/util");


interface RevisionMap {
  [index: string]: string;
}


describe("core snapshot:", () => {
  const startDir = process.cwd();
  const tempFolder = tmp.dirSync({ unsafeCleanup: true, keep: true });
  let suite: cc.RepoSuiteResult;

  beforeAll(() => {
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
  });

  afterAll(() => {
    process.chdir(startDir);
    tempFolder.removeCallback();
  });

  beforeEach(() => {
    process.chdir(tempFolder.name);
  });

  afterEach(() => {
    // process.chdir(startDir);
  });

  function testLots(folderName: string) {
    // Separate tests would be nice for seeing test names but complicate state, KISS.

    process.chdir(folderName);
    const pinnedRepo = path.join("Libs", "pinned");

    const manifestObject = core.readManifest({ fromRoot: true, addMainToDependencies: true });
    const forestRepos = manifestObject.dependencies;
    // Unpin so can tell difference between restore and pin.
    childProcess.execFileSync("git", ["checkout", "--quiet", "master"], { cwd: pinnedRepo });

    command.fab(["snapshot", "--output", "ss"]);

    // Note before revisions, and commit and push new revision so different from before.
    const beforeRevisions: RevisionMap = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      beforeRevisions[repoPath] = repo.getRevision(repoPath);
      // Unpin
      childProcess.execFileSync("git", ["checkout", "--quiet", "master"], { cwd: repoPath });
      // New revision
      childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Change"], { cwd: repoPath });
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      cc.configureTestRepo(repoPath);
      childProcess.execFileSync("git", ["push", "--quiet"], { cwd: repoPath });
    });

    command.fab(["restore", "ss"]);

    // Check restored revisions.
    Object.keys(forestRepos).forEach((repoPath) => {
      expect(repo.getRevision(repoPath)).toEqual(beforeRevisions[repoPath]);
    });

    // Exit snapshot state.
    command.fab(["restore"]);

    // Check no longer on snapshot.
    expect(repo.getRevision(pinnedRepo)).toEqual(forestRepos[pinnedRepo].pinRevision);
    Object.keys(forestRepos).forEach((repoPath) => {
      // console.log(`${repoPath} ${repo.getRevision(repoPath)} ${beforeRevisions[repoPath]}`);
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
    });

    process.chdir(tempFolder.name);
    const recreated = folderName.concat("-recreated");
    command.fab(["recreate", path.join(folderName, "ss"), recreated]);
    process.chdir(recreated);

    // Check restored revisions.
    Object.keys(forestRepos).forEach((repoPath) => {
      expect(repo.getRevision(repoPath)).toEqual(beforeRevisions[repoPath]);
    });

    // Exit snapshot state.
    command.fab(["restore"]);

    // Check no longer on snapshot.
    expect(repo.getRevision(pinnedRepo)).toEqual(forestRepos[pinnedRepo].pinRevision);
    Object.keys(forestRepos).forEach((repoPath) => {
      // console.log(`${repoPath} ${repo.getRevision(repoPath)} ${beforeRevisions[repoPath]}`);
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
    });
  }

  test("snapshot + restore + recreate (nested)", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      "nested", {}
    );
  testLots("nested");
  });

  test("snapshot + restore + recreate (sibling)", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-sibling"),
      "sibling", {}
    );
    testLots("sibling");
  });

});

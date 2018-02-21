import childProcess = require("child_process");
import path = require("path");
import tmp = require("tmp");
// Mine
import core = require("../src/core");
import coreClone = require("../src/core-clone");
import coreSnapshot = require("../src/core-snapshot");
import repo = require("../src/repo");
import util = require("../src/util");
//
import cc = require("./core-common");


interface RevisionMap {
    [index: string]: string;
}


describe("core snapshot:", () => {
  const startDir = process.cwd();
  let tempFolder: tmp.SynchrounousResult;
  let suite: cc.RepoSuiteResult;

  beforeAll(() => {
  });

  afterAll(() => {
  });

  beforeEach(() => {
    tempFolder = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tempFolder.name);
    suite = cc.makeGitRepoSuite();
  });

  afterEach(() => {
    process.chdir(startDir);
  });

  test("restore", () => {
    // Get out a clean repo to work with
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      "test-restore", {}
    );
    process.chdir("test-restore");
    const manifestObject = core.readManifest({ fromRoot: true, addMainToDependencies: true });
    const forestRepos = manifestObject.dependencies;

    // Make snapshot
    coreSnapshot.doSnapshot({ output: "ss" });

    // Note revisions and make sure now on a different revision.
    const beforeRevisions: RevisionMap = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      beforeRevisions[repoPath] = repo.getRevision(repoPath);
      cc.configureTestRepo(repoPath);
      childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Change"], { cwd: repoPath });
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
    });

    coreSnapshot.doRestore("ss");

    // Check restored revisions.
    Object.keys(forestRepos).forEach((repoPath) => {
      expect(repo.getRevision(repoPath)).toEqual(beforeRevisions[repoPath]);
    });

    // Get out of snapshot. Pinned revision stays same, others should move forward.
    coreSnapshot.doRestore();
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
    Object.keys(forestRepos).forEach((repoPath) => {
      if (forestRepos[repoPath].pinRevision === undefined) {
        expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      }
    });
  });

  test("recreate", () => {
    // Get out a clean repo to work with
    coreClone.doClone(
      path.join(suite.remotesDir, "main-nested"),
      "test-recreate-source", {}
    );
    process.chdir("test-recreate-source");
    const manifestObject = core.readManifest({ fromRoot: true, addMainToDependencies: true });
    const forestRepos = manifestObject.dependencies;

    // Make snapshot
    coreSnapshot.doSnapshot({ output: "ss" });
    const ss = path.resolve(process.cwd(), "ss");

    // Note revisions and make sure now on a different revision.
    const beforeRevisions: RevisionMap = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      beforeRevisions[repoPath] = repo.getRevision(repoPath);
      // Get unpinned
      childProcess.execFileSync("git", ["checkout", "--quiet", "master"], { cwd: repoPath });
      // Add revision
      cc.configureTestRepo(repoPath);
      childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Change"], { cwd: repoPath });
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      // Push to remote so so we can see if recreate is bring back old forest state.
      childProcess.execFileSync("git", ["push", "--quiet"], { cwd: repoPath });
    });

    process.chdir(tempFolder.name);
    coreSnapshot.doRecreate(ss, "test-recreate-dest");
    process.chdir("test-recreate-dest");

    // Check restored revisions.
    Object.keys(forestRepos).forEach((repoPath) => {
      expect(repo.getRevision(repoPath)).toEqual(beforeRevisions[repoPath]);
    });

    // Get out of snapshot. Pinned revision stays same, others should move forward.
    coreSnapshot.doRestore();
    cc.expectSuiteRepoLayout({ rootDir: ".", mainDir: ".", freeBranch: "master", pinnedRevision: suite.pinnedRevision });
    Object.keys(forestRepos).forEach((repoPath) => {
      childProcess.execFileSync("git", ["pull"]);
      if (forestRepos[repoPath].pinRevision === undefined) {
        expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      }
    });
  });
});

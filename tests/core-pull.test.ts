import childProcess = require("child_process");
import path = require("path");
import tmp = require("tmp");
// Mine
import cc = require("./core-common");
import command = require("../src/command");
import core = require("../src/core");
import coreClone = require("../src/core-clone");
import repo = require("../src/repo");
import util = require("../src/util");


interface RevisionMap {
  [index: string]: string;
}


describe("core pull:", () => {
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

  test("sibling", () => {
    coreClone.doClone(
      path.join(suite.remotesDir, "main-sibling"),
      "sibling", {}
    );
    process.chdir("sibling");

    const pinnedRepo = path.join("Libs", "pinned");
    const pinnedRepoPosix = util.normalizeToPosix(pinnedRepo);

    const manifestObject = core.readManifest({ fromRoot: true, addMainToDependencies: true });
    const forestRepos = manifestObject.dependencies;
    // Unpin so can tell difference between restore and pin.
    childProcess.execFileSync("git", ["checkout", "--quiet", "master"], { cwd: pinnedRepo });

    const beforeRevisions: RevisionMap = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      beforeRevisions[repoPath] = repo.getRevision(repoPath);
    });

    process.chdir(tempFolder.name);
    coreClone.doClone(
      path.join(suite.remotesDir, "main-sibling"),
      "sibling2", {}
    );
    process.chdir("sibling2");

    // Push new revisions
    const afterRevisions: RevisionMap = {};
    Object.keys(forestRepos).forEach((repoPath) => {
      // Unpin
      childProcess.execFileSync("git", ["checkout", "--quiet", "master"], { cwd: repoPath });
      // New revision
      childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Change"], { cwd: repoPath });
      expect(repo.getRevision(repoPath)).not.toEqual(beforeRevisions[repoPath]);
      childProcess.execFileSync("git", ["push", "--quiet"], { cwd: repoPath });
      afterRevisions[repoPath] = repo.getRevision(repoPath);
    });
    // Pinned should not move
    afterRevisions["Libs/pinned"] = beforeRevisions["Libs/pinned"];

    // At last, try pull!
    process.chdir(path.join(tempFolder.name, "sibling"));
    command.fab(["pull"]);

    // Check everything got updated as expected.
    Object.keys(forestRepos).forEach((repoPath) => {
      console.log(`${repoPath} ${repo.getRevision(repoPath)} ${afterRevisions[repoPath]}`);
      expect(repo.getRevision(repoPath)).toEqual(afterRevisions[repoPath]);
    });
  });

  // Uncovered:
  // - skip if on git detached head
  // - hg
  // - pull causing merge

});

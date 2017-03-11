import childProcess = require("child_process");
import fs = require("fs");
import path = require("path");
// Mine
import core = require("../src/core");
import coreInit = require("../src/core-init");
import fsX = require("../src/fsExtra");
import repo = require("../src/repo");
import util = require("../src/util");


export const suiteDependencies: string[] = ["free", path.join("Libs", "pinned"), path.join("Libs", "locked")];


export function quietDoInit(options: coreInit.InitOptions) {
  util.muteCall(() => {
    coreInit.doInit(options);
  });
};


export function configureTestRepo(repoPath: string) {
  childProcess.execFileSync("git", ["config", "user.email", "noreply@no.reply"], { cwd: repoPath });
  childProcess.execFileSync("git", ["config", "user.name", "Unit Test"], { cwd: repoPath });
  childProcess.execFileSync("git", ["config", "push.default", "simple"], { cwd: repoPath });
}


export function makeOneGitRepo(repoPath: string, origin?: string) {
  const startingDir = process.cwd();
  childProcess.execFileSync("git", ["init", repoPath]);
  process.chdir(repoPath);
  configureTestRepo(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  childProcess.execFileSync("git", ["remote", "add", "origin", origin]);

  process.chdir(startingDir);
};


// Nested, direct construction of a sandpit.
export function makeOneOfEachGitRepo() {
  const rootDir = process.cwd();

  makeOneGitRepo(".", "git@ex.com:path/to/main.git");
  makeOneGitRepo("free", "git@ex.com:path/to/free.git");

  makeOneGitRepo("pinned", "git@ex.com:path/to/pinned.git");
  process.chdir("pinned");
  const oldRevision = repo.getRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Second empty but real commit"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", oldRevision]);
  process.chdir(rootDir);

  // locked
  makeOneGitRepo("locked", "git@ex.com:a/b/c/locked.git");

  // fab init
  process.chdir(rootDir);
  quietDoInit({});

  process.chdir(rootDir);
};


export interface RepoSuiteResult {
  remotesDir: string;
  pinnedRevision: string;
};


export function makeGitRepoSuite() {
  const startDir = process.cwd();

  // Make remote empty bare repos
  fs.mkdirSync("remotes");
  process.chdir("remotes");
  const remotesDir = process.cwd();
  const allRemoteRepos = ["main-nested", "main-sibling"].concat(suiteDependencies);
  allRemoteRepos.forEach((repoPath) => {
    // Want a bare master, but not an empty one!
    const tempRepo = repoPath.concat("-tmp");
    childProcess.execFileSync("git", ["init", tempRepo]);
    configureTestRepo(tempRepo);
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"], { cwd: tempRepo });
    childProcess.execFileSync("git", ["branch", "--quiet", "develop"], { cwd: tempRepo });
    childProcess.execFileSync("git", ["clone", "--bare", "--quiet", tempRepo, repoPath]);
  });
  process.chdir(startDir);

  function initAndPushMain(options: coreInit.InitOptions) {
    // Setting up two branches and two manifests
    // default manifest
    quietDoInit(options);
    childProcess.execFileSync("git", ["add", core.manifestPath({})]);
    childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);

    // custom manifest (and creating an extra repo)
    const manifest = "sub";
    const customOptions = { root: options.root, manifest };
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "free"), "sub"]);
    quietDoInit(customOptions);
    childProcess.execFileSync("git", ["add", core.manifestPath({ manifest })]);
    childProcess.execFileSync("git", ["commit", "-m", "fab initialised with custom manifest"]);

    // push!
    childProcess.execFileSync("git", ["push", "--quiet"]);

    //  create matching develop branch
    childProcess.execFileSync("git", ["checkout", "--quiet", "develop"]);
    childProcess.execFileSync("git", ["merge", "--quiet", "master"]);
    childProcess.execFileSync("git", ["push", "--quiet"]);
  }

  // Set up main-nested
  fs.mkdirSync("sandpit");
  process.chdir("sandpit");
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "main-nested")]);
  process.chdir("main-nested");
  const nestedRootDir = process.cwd();
  suiteDependencies.forEach((repoPath) => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, repoPath), repoPath]);
  });

  // Create the extra revision in pinned and rollback
  process.chdir("Libs/pinned");
  const pinnedRevision = repo.getRevision(".");
  configureTestRepo(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Second empty but real commit"]);
  childProcess.execFileSync("git", ["push", "--quiet"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", pinnedRevision]);

  process.chdir(nestedRootDir);
  initAndPushMain({});
  process.chdir(startDir);

  // Set up main-sibling in client layout
  process.chdir("sandpit");
  fs.mkdirSync("sibling");
  process.chdir("sibling");
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "main-sibling")]);
  suiteDependencies.forEach((repoPath) => {
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, repoPath), repoPath]);
  });
  childProcess.execFileSync("git", ["checkout", "--quiet", pinnedRevision],
    { cwd: path.join("Libs", "pinned") }
  );
  //
  process.chdir("main-sibling");
  initAndPushMain({ root: ".." });
  process.chdir(startDir);

  return { remotesDir, pinnedRevision };
};


export interface ExpectSuiteRepoLayoutOptions {
  rootDir: string;
  mainDir: string;
  freeBranch: string;
  pinnedRevision: string;
  manifest?: string;
};


export function expectSuiteRepoLayout(options: ExpectSuiteRepoLayoutOptions) {
  const startDir2 = process.cwd();

  // Check root
  expect(fsX.dirExistsSync(options.rootDir)).toBe(true);
  process.chdir(options.rootDir);
  expect(fsX.fileExistsSync(core.fabRootFilename)).toBe(true);

  // Check main
  expect(fsX.dirExistsSync(options.mainDir)).toBe(true);
  expect(repo.getBranch(options.mainDir)).toEqual(options.freeBranch);
  expect(fsX.fileExistsSync(
    core.manifestPath({ manifest: options.manifest, mainPath: options.mainDir }))).toBe(true);

  // check dependencies
  suiteDependencies.forEach((repoPath) => {
    expect(fsX.dirExistsSync(repoPath)).toBe(true);
  });
  expect(repo.getBranch("free")).toEqual(options.freeBranch);
  expect(repo.getBranch(path.join("Libs", "locked"))).toEqual("master");
  expect(repo.getBranch(path.join("Libs", "pinned"))).toBeUndefined();
  expect(repo.getRevision(path.join("Libs", "pinned"))).toEqual(options.pinnedRevision);

  process.chdir(startDir2);
};

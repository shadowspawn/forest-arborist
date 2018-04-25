
import * as childProcess from "child_process";
import * as fs from "fs";
import * as path from "path";
// Mine
import * as core from "../src/core";
import * as coreInit from "../src/core-init";
import * as repo from "../src/repo";


const suiteDependencies: string[] = ["free", path.join("Libs", "pinned"), path.join("Libs", "locked")];


export function commitAndDetach(repoPath: string) {
  const startingDir = process.cwd();
  process.chdir(repoPath);
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  const revision = repo.getRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Second empty but real commit"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", revision]);
  process.chdir(startingDir);
  return revision;
}


export function makeOneGitRepo(repoPath: string, origin?: string) {
  const startingDir = process.cwd();
  childProcess.execFileSync("git", ["init", repoPath]);
  process.chdir(repoPath);
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"]);
  if (origin)
    childProcess.execFileSync("git", ["remote", "add", "origin", origin]);

  process.chdir(startingDir);
}


// Nested, direct construction of a sandpit.
export function makeNestedGitForest() {
  const startingDir = process.cwd();
  makeOneGitRepo("nested", "git@ex.com:path/to/main.git");
  process.chdir("nested");
  makeOneGitRepo("free", "git@ex.com:path/to/free.git");

  makeOneGitRepo("pinned", "git@ex.com:path/to/pinned.git");
  commitAndDetach("pinned");

  // locked (because origin path different)
  makeOneGitRepo("locked", "git@ex.com:a/b/c/locked.git");

  // fab init
  coreInit.doInit({});
  process.chdir(startingDir);
}


// Sibling, direct construction of a sandpit.
export function makeSiblingGitForest() {
  const startingDir = process.cwd();
  fs.mkdirSync("sibling");
  process.chdir("sibling");
  makeOneGitRepo("main", "git@ex.com:path/to/main.git");
  makeOneGitRepo("free", "git@ex.com:path/to/free.git");

  makeOneGitRepo("pinned", "git@ex.com:path/to/pinned.git");
  commitAndDetach("pinned");

  // locked (because origin path different)
  makeOneGitRepo("locked", "git@ex.com:a/b/c/locked.git");

  // fab init
  process.chdir("main");
  coreInit.doInit({ root: ".." });
  process.chdir(startingDir);
}


export interface RepoSuiteResult {
  remotesDir: string;
  pinnedRevision: string;
}


// Main point of suite is the remotes which include fab control files so can be cloned.

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
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"], { cwd: tempRepo });
    childProcess.execFileSync("git", ["branch", "--quiet", "develop"], { cwd: tempRepo });
    childProcess.execFileSync("git", ["clone", "--bare", "--quiet", tempRepo, repoPath]);
  });
  process.chdir(startDir);

  function initAndPushMain(options: coreInit.InitOptions) {
    // Setting up two branches and two manifests
    // default manifest
    coreInit.doInit(options);
    childProcess.execFileSync("git", ["add", core.manifestPath({})]);
    childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);

    // custom manifest (and creating an extra repo)
    const manifest = "sub";
    childProcess.execFileSync("git", ["clone", "--quiet", path.join(remotesDir, "free"), "sub"]);
    coreInit.doInit({ root: options.root, manifest });
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
  process.chdir(path.join("Libs", "pinned"));
  const pinnedRevision = repo.getRevision(".");
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
}


export interface ExpectSuiteRepoLayoutOptions {
  rootDir: string;
  mainDir: string;
  freeBranch: string;
  pinnedRevision: string;
  manifest?: string;
}


export function expectSuiteRepoLayout(options: ExpectSuiteRepoLayoutOptions) {
  const startDir2 = process.cwd();
  process.chdir(options.rootDir);

  // Check root
  expect(fs.existsSync(core.fabRootFilename)).toBe(true);

  // Check main
  expect(repo.getBranch(options.mainDir)).toEqual(options.freeBranch);
  expect(fs.existsSync(
    core.manifestPath({ manifest: options.manifest, mainPath: options.mainDir }))).toBe(true);

  // check dependencies
  suiteDependencies.forEach((repoPath) => {
    expect(fs.existsSync(repoPath)).toBe(true);
  });
  expect(repo.getBranch("free")).toEqual(options.freeBranch);
  expect(repo.getBranch(path.join("Libs", "locked"))).toEqual("master");
  expect(repo.getBranch(path.join("Libs", "pinned"))).toBeUndefined();
  expect(repo.getRevision(path.join("Libs", "pinned"))).toEqual(options.pinnedRevision);

  process.chdir(startDir2);
}

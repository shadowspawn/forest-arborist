import * as childProcess from "child_process";
import * as fs from "fs";
import * as fsX from "fs-extra";
import * as path from "path";
// Mine
import * as core from "../src/core";
import * as coreInit from "../src/core-init";
import * as repo from "../src/repo";


function makeRemotes(absoluteRemotesPath: string) {
  const startDir = process.cwd();

  // Set up git repos for sibling
  const gitRemotesDir = path.join(absoluteRemotesPath, "git");
  console.log(gitRemotesDir);
  fsX.ensureDirSync(gitRemotesDir);
  process.chdir(gitRemotesDir);
  const gitRemoteRepos = [
    "main",
    "free",
    path.join("libs", "pinned"),
    path.join("libs", "locked"),
  ];
  gitRemoteRepos.forEach((repoPath) => {
    // For ease of use, want a bare repo, but not an empty one!
    const workRepo = repoPath.concat("-work");
    const bareRepo = repoPath.concat(".git");
    childProcess.execFileSync("git", ["init", workRepo]);
    childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Empty but real commit"], { cwd: workRepo });
    childProcess.execFileSync("git", ["clone", "--bare", "--quiet", workRepo, bareRepo]);
    fsX.removeSync(workRepo);
  });

  const hgRemotesDir = path.join(absoluteRemotesPath, "hg");
  fsX.ensureDirSync(hgRemotesDir);
  process.chdir(hgRemotesDir);
  const hgRemoteRepos = [
    path.join("main"),
    path.join("free"),
    path.join("libs", "pinned"),
    path.join("libs", "locked"),
  ];
  // Empty repos are much less problematic with hg than with git
  hgRemoteRepos.forEach((repoPath) => {
    fsX.ensureDirSync(path.dirname(repoPath));
    childProcess.execFileSync("hg", ["init", repoPath]);
    const dummyFile = ".dummy";
    fs.writeFileSync(path.join(repoPath, dummyFile), "x");
    childProcess.execFileSync("hg", ["add", dummyFile], { cwd: repoPath });
    childProcess.execFileSync("hg", ["commit", "-m", "First commit"], { cwd: repoPath });
    childProcess.execFileSync("hg", ["update", "null"], { cwd: repoPath });
  });

  process.chdir(startDir);
}


export function makePlayground(playgroundDestination: string) {
  const startDir = process.cwd();

  const playgroundDir = path.resolve(process.cwd(), playgroundDestination);
  fsX.ensureDirSync(playgroundDestination);

  makeRemotes(path.join(playgroundDir, "remotes"));
  const gitRemotesDir = path.join(playgroundDir, "remotes", "git");
  const hgRemotesDir = path.join(playgroundDir, "remotes", "hg");

  // Sibling
  console.log("\nCreating sibling git forest\n");
  const siblingRoot = path.join(playgroundDir, "sibling");
  fs.mkdirSync(siblingRoot);
  process.chdir(siblingRoot);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(gitRemotesDir, "main")]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(gitRemotesDir, "free")]);

  // Slim manifest
  process.chdir(path.join(siblingRoot, "main"));
  coreInit.doInit({ root: "..", manifest: "slim" });

  // Get libs
  process.chdir(path.join(siblingRoot));
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(gitRemotesDir, "libs", "locked"), path.join("libs", "locked")]);
  childProcess.execFileSync("git", ["clone", "--quiet", path.join(gitRemotesDir, "libs", "pinned"), path.join("libs", "pinned")]);

  // Setup pinned
  process.chdir(path.join(siblingRoot, "libs", "pinned"));
  const gitPinnedRevision = repo.getExistingRevision(".");
  childProcess.execFileSync("git", ["commit", "--allow-empty", "-m", "Another empty but real commit"]);
  childProcess.execFileSync("git", ["push", "--quiet"]);
  childProcess.execFileSync("git", ["checkout", "--quiet", gitPinnedRevision]);

  // Setup locked
  process.chdir(path.join(siblingRoot, "libs", "locked"));
  childProcess.execFileSync("git", ["checkout", "--quiet", "-b", "lockedBranch"]);
  childProcess.execFileSync("git", ["push", "--quiet", "--set-upstream", "origin", "lockedBranch"]);

  // Setup main
  process.chdir(path.join(siblingRoot, "main"));
  coreInit.doInit({ root: ".." });
  childProcess.execFileSync("git", ["add", ".fab"]);
  childProcess.execFileSync("git", ["commit", "-m", "fab initialised"]);
  childProcess.execFileSync("git", ["push", "--quiet"]);

  // Nested
  console.log("\nCreating nested hg forest\n");
  const nestedRoot = path.join(playgroundDir, "nested");
  fs.mkdirSync(nestedRoot);
  process.chdir(nestedRoot);
  childProcess.execFileSync("hg", ["clone", "--quiet", path.join(hgRemotesDir, "main"), "."]);
  childProcess.execFileSync("hg", ["clone", "--quiet", path.join(hgRemotesDir, "free"), "free"]);

  // Slim manifest
  process.chdir(nestedRoot);
  coreInit.doInit({ root: ".", manifest: "slim" });

  // Get libs
  process.chdir(nestedRoot);
  fsX.ensureDirSync("libs");
  childProcess.execFileSync("hg", ["clone", "--quiet", path.join(hgRemotesDir, "libs", "locked"), path.join("libs", "locked")]);
  childProcess.execFileSync("hg", ["clone", "--quiet", path.join(hgRemotesDir, "libs", "pinned"), path.join("libs", "pinned")]);

  // Setup pinned
  process.chdir(path.join(nestedRoot, "libs", "pinned"));
  const hgPinnedRevision = repo.getExistingRevision(".");
  fs.writeFileSync(".dummy", "Hello, world");
  childProcess.execFileSync("hg", ["add", ".dummy"]);
  childProcess.execFileSync("hg", ["commit", "-m", "simple commit"]);
  childProcess.execFileSync("hg", ["update", "--rev", hgPinnedRevision]);
  childProcess.execFileSync("hg", ["push"]);

  // Setup locked
  process.chdir(path.join(nestedRoot, "libs", "locked"));
  childProcess.execFileSync("hg", ["branch", "lockedBranch"]);
  childProcess.execFileSync("hg", ["commit", "-m", "commit on branch"]);
  childProcess.execFileSync("hg", ["push", "--new-branch"]);

  // Setup main
  process.chdir(path.join(nestedRoot));
  coreInit.doInit({ root: "." });
  childProcess.execFileSync("hg", ["add", ".fab"]);
  fs.writeFileSync(".hgignore", core.fabRootFilename);
  childProcess.execFileSync("hg", ["add", ".hgignore"]);
  childProcess.execFileSync("hg", ["commit", "-m", "fab initialised"]);
  childProcess.execFileSync("hg", ["push"]);

  process.chdir(startDir);
  return { gitPinnedRevision, hgPinnedRevision };
}
